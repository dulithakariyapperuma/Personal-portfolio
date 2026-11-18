// ---------------------------------------------------------------------------
// The assistant: retrieval-augmented generation, with a swappable generator.
//
//   retrieve  — embed the question, pull the closest passages from the index
//   augment   — build a prompt containing ONLY those passages
//   generate  — hand it to a model
//
// Three generators are supported, and the default costs nothing:
//
//   none       no model at all. Returns the retrieved passages, lightly
//              stitched together. Offline, free, deterministic, and a good
//              way to see exactly how much of the answer retrieval provides.
//   ollama     a model on your own machine. Free, private, needs ~2 GB RAM.
//   anthropic  the Claude API. The best answers, and the only option that
//              bills you per request — which is why it is not the default.
//
// Every generator streams, so the transport is the same regardless.
// ---------------------------------------------------------------------------

import { retrieveKnowledge } from './index-store.js';

export const PROVIDER = (process.env.CHAT_PROVIDER || 'none').toLowerCase();

const SYSTEM_PROMPT = `You are the assistant on Dulitha Kariyapperuma's portfolio website.

Answer ONLY from the context passages provided below. If the passages do not
contain the answer, say plainly that the site does not cover it and suggest
what the visitor could look at instead. Never invent projects, clients,
dates, prices or credentials.

Be brief: two or three sentences unless asked for detail. Write plainly, in
the second person, with no bullet lists unless the question asks for one.`;

function buildContext(passages) {
  if (!passages.length) return 'No relevant passages were found.';
  return passages
    .map((passage, i) => `[${i + 1}] ${passage.topic}\n${passage.text}`)
    .join('\n\n');
}

const NOT_COVERED =
  "I do not have anything on that. This site covers the 3D brain on the landing page, " +
  "the photography and how it is made, how the website is built, and the proxy, " +
  "load-balancing and AI infrastructure behind it — ask me about any of those.";

/**
 * The no-model answer: readable, honest, and free.
 *
 * Retrieval always returns *something*, so the score floor is doing real
 * work. Below it, admitting ignorance beats confidently reciting the nearest
 * unrelated paragraph — the failure mode this whole design exists to avoid.
 */
function* composeFromPassages(passages) {
  const CONFIDENT = 0.3;
  if (!passages.length || passages[0].score < CONFIDENT) {
    yield NOT_COVERED;
    return;
  }
  yield passages[0].text;
  // Only passages that are nearly as relevant as the best one. Padding the
  // answer with weak matches is how a helpful reply turns into a wall.
  for (const passage of passages.slice(1, 3)) {
    if (passage.score < passages[0].score * 0.75) break;
    yield `\n\n${passage.text}`;
  }
}

async function* streamOllama(question, context, signal) {
  const url = `${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/chat`;
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      stream: true,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nContext passages:\n\n${context}` },
        { role: 'user', content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Ollama responded ${response.status}`);

  for await (const line of readLines(response.body)) {
    if (!line.trim()) continue;
    const payload = JSON.parse(line);
    if (payload.message?.content) yield payload.message.content;
    if (payload.done) return;
  }
}

async function* streamAnthropic(question, context, signal) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 500,
      stream: true,
      system: `${SYSTEM_PROMPT}\n\nContext passages:\n\n${context}`,
      messages: [{ role: 'user', content: question }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API responded ${response.status}: ${await response.text()}`);
  }

  // Server-sent events: "data: {...}" lines separated by blank lines.
  for await (const line of readLines(response.body)) {
    if (!line.startsWith('data:')) continue;
    const body = line.slice(5).trim();
    if (!body || body === '[DONE]') continue;
    const event = JSON.parse(body);
    if (event.type === 'content_block_delta' && event.delta?.text) {
      yield event.delta.text;
    }
  }
}

/** Turns a byte stream into newline-delimited strings. */
async function* readLines(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      yield buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
    }
  }
  if (buffer.trim()) yield buffer;
}

/**
 * Answers a question, yielding text as it arrives.
 *
 * If a configured provider fails — Ollama not running, API key rejected,
 * network down — it falls back to the retrieval-only answer rather than
 * showing the visitor an error. Degrading instead of failing is the same
 * instinct as `proxy_cache_use_stale` at the edge.
 */
export async function* answer(question, { signal } = {}) {
  const passages = await retrieveKnowledge(question);
  const context = buildContext(passages);

  yield { type: 'sources', sources: passages.map(({ vector, ...p }) => p) };

  const generate =
    PROVIDER === 'ollama' ? streamOllama :
    PROVIDER === 'anthropic' ? streamAnthropic :
    null;

  if (!generate) {
    for (const text of composeFromPassages(passages)) yield { type: 'text', text };
    yield { type: 'done', provider: 'retrieval-only' };
    return;
  }

  try {
    for await (const text of generate(question, context, signal)) {
      yield { type: 'text', text };
    }
    yield { type: 'done', provider: PROVIDER };
  } catch (error) {
    if (signal?.aborted) return;
    yield { type: 'notice', text: `${PROVIDER} unavailable (${error.message}). Falling back to the indexed passages.` };
    for (const text of composeFromPassages(passages)) yield { type: 'text', text };
    yield { type: 'done', provider: 'retrieval-only' };
  }
}
