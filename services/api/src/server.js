// ---------------------------------------------------------------------------
// The API service. Two identical copies of this run behind the edge proxy.
//
// Deliberately written on node:http with no web framework. The whole point
// of the lab is to see what the proxy is doing, and a framework would hide
// exactly the parts worth looking at — headers, timeouts, streaming,
// back-pressure. It also keeps the container small and the dependency list
// honest: one package, for the model.
//
// It is stateless apart from counters, so both replicas are interchangeable
// and either can be restarted mid-traffic.
// ---------------------------------------------------------------------------

import { createServer } from 'node:http';
import { hostname } from 'node:os';

import { answer, PROVIDER } from './chat.js';
import { getExtractor, MODEL_ID } from './embeddings.js';
import { allPhotos, indexInfo, loadIndex, searchPhotos } from './index-store.js';

const PORT = Number(process.env.PORT || 8081);
const INSTANCE = process.env.API_INSTANCE || hostname();
const STARTED = Date.now();

// Per-replica counters. They reset on restart and are NOT shared between
// replicas — which is the point: hit /api/stats repeatedly through the edge
// and you will watch two different counters climb as it balances you.
const counters = { total: 0, search: 0, chat: 0, errors: 0 };

let modelReady = false;

const json = (res, status, body, extra = {}) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'x-served-by': INSTANCE,
    ...extra,
  });
  res.end(payload);
};

function handleHealth(res) {
  // Reports "starting" until the model is loaded. An orchestrator uses this
  // to hold traffic back until the replica can actually do its job —
  // readiness is not the same question as liveness.
  const ready = modelReady;
  json(res, ready ? 200 : 503, {
    ok: ready,
    role: 'api',
    instance: INSTANCE,
    status: ready ? 'ready' : 'loading-model',
    uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
  });
}

function handleStats(res) {
  json(res, 200, {
    instance: INSTANCE,
    uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
    requests: { ...counters },
    model: MODEL_ID,
    modelReady,
    chatProvider: PROVIDER,
    index: indexInfo(),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }, { 'cache-control': 'no-store' });
}

async function handleSearch(url, res) {
  const query = (url.searchParams.get('q') || '').trim();
  if (!query) return json(res, 400, { error: 'Missing ?q=' });
  if (query.length > 200) return json(res, 400, { error: 'Query too long' });

  counters.search++;
  const started = Date.now();
  const results = await searchPhotos(query, {
    limit: Math.min(Number(url.searchParams.get('limit')) || 12, 35),
    category: url.searchParams.get('category'),
  });

  json(res, 200, {
    query,
    count: results.length,
    tookMs: Date.now() - started,
    servedBy: INSTANCE,
    results,
  });
}

async function handleChat(req, res) {
  const body = await readBody(req, 8 * 1024);
  let question = '';
  try {
    question = String(JSON.parse(body || '{}').question || '').trim();
  } catch {
    return json(res, 400, { error: 'Body must be JSON' });
  }
  if (!question) return json(res, 400, { error: 'Missing "question"' });
  if (question.length > 1000) return json(res, 400, { error: 'Question too long' });

  counters.chat++;

  // Server-sent events. The client gets the first words while the model is
  // still writing the rest, which is the difference between a page that
  // feels instant and one that feels broken.
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-served-by': INSTANCE,
    'x-accel-buffering': 'no',
  });

  // If the visitor navigates away, stop generating. Without this the model
  // keeps working — and keeps costing — for a reader who has already gone.
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    for await (const event of answer(question, { signal: controller.signal })) {
      if (controller.signal.aborted) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    counters.errors++;
    res.write(`data: ${JSON.stringify({ type: 'error', text: error.message })}\n\n`);
  }
  res.end();
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  counters.total++;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname.replace(/\/$/, '') || '/';

  // The edge is the only thing that should reach this service, and it is
  // same-origin with the browser, so no CORS headers are needed in the
  // cluster. They are here for `npm run dev` against a Vite dev server on a
  // different port.
  if (process.env.ALLOW_CORS === 'true') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
  }

  try {
    if (route === '/api/health' || route === '/healthz') return handleHealth(res);
    if (route === '/api/stats') return handleStats(res);
    if (route === '/api/photos') {
      const photos = allPhotos();
      return json(res, 200, { count: photos.length, photos, servedBy: INSTANCE });
    }
    if (route === '/api/search') return await handleSearch(url, res);
    if (route === '/api/chat') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
      return await handleChat(req, res);
    }
    return json(res, 404, { error: `No route for ${route}` });
  } catch (error) {
    counters.errors++;
    console.error(`[${INSTANCE}] ${route} failed:`, error.message);
    if (!res.headersSent) json(res, 500, { error: 'Internal error' });
    else res.end();
  }
});

// A slow client must not be able to hold a connection open forever.
server.headersTimeout = 10_000;
server.requestTimeout = 310_000;   // chat streams can legitimately run long

// Shut down cleanly: stop accepting new connections, let in-flight requests
// finish. Without this, `docker compose restart` drops live responses — and
// rolling restarts with no dropped requests are the entire promise of
// running more than one replica.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[${INSTANCE}] ${signal} — draining`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}

server.listen(PORT, () => {
  console.log(`[${INSTANCE}] listening on :${PORT} — chat provider: ${PROVIDER}`);
  loadIndex();
  console.log(`[${INSTANCE}] index:`, indexInfo());
  getExtractor()
    .then(() => { modelReady = true; console.log(`[${INSTANCE}] model ready`); })
    .catch((error) => console.error(`[${INSTANCE}] model failed to load:`, error.message));
});
