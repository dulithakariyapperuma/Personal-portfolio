// ---------------------------------------------------------------------------
// Client for the API service.
//
// Every call is a same-origin request to /api/*. The app never knows the
// backend's address, how many replicas exist, or which one answered — the
// edge proxy decides all of that. That indirection is what lets the cluster
// be rebuilt, scaled or rolled without the front end changing a line.
//
// In `npm run dev` the Vite dev server proxies /api to the API service; in
// the cluster nginx does. Same URL either way.
// ---------------------------------------------------------------------------

export type PhotoHit = {
  id: string;
  title: string;
  category: string;
  alt: string;
  src: string;
  fullSrc: string;
  srcSet: string;
  width: number;
  height: number;
  score: number;
};

export type SearchResponse = {
  query: string;
  count: number;
  tookMs: number;
  servedBy: string;
  results: PhotoHit[];
};

export type ChatSource = { id: string; topic: string; text: string; score: number };

export type ChatEvent =
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'text'; text: string }
  | { type: 'notice'; text: string }
  | { type: 'error'; text: string }
  | { type: 'done'; provider: string };

export class ApiOffline extends Error {}

/** Semantic photograph search. Throws ApiOffline when the cluster is not up. */
export async function searchPhotos(
  query: string,
  options: { limit?: number; category?: string; signal?: AbortSignal } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.limit) params.set('limit', String(options.limit));
  if (options.category && options.category !== 'All') params.set('category', options.category);

  let response: Response;
  try {
    response = await fetch(`/api/search?${params}`, { signal: options.signal });
  } catch {
    throw new ApiOffline('Search service is not reachable.');
  }
  if (response.status === 429) throw new Error('Too many searches — give it a second.');
  if (!response.ok) throw new ApiOffline(`Search service returned ${response.status}.`);
  return response.json();
}

/**
 * Streams an answer from the assistant.
 *
 * Reads Server-Sent Events off the response body rather than using
 * EventSource, because EventSource cannot issue a POST — and the question
 * belongs in a body, not a URL that ends up in proxy logs.
 */
export async function* askAssistant(
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch {
    throw new ApiOffline('The assistant is not reachable.');
  }

  if (response.status === 429) throw new Error('One question at a time — try again in a moment.');
  if (!response.ok || !response.body) throw new ApiOffline(`Assistant returned ${response.status}.`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let split: number;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          yield JSON.parse(line.slice(5).trim()) as ChatEvent;
        } catch {
          /* a partial frame; the next read completes it */
        }
      }
    }
  }
}

export type ClusterStats = {
  instance: string;
  uptimeSeconds: number;
  requests: { total: number; search: number; chat: number; errors: number };
  model: string;
  modelReady: boolean;
  chatProvider: string;
  index: { model: string; dimensions: number; builtAt: string; photos: number; passages: number };
  memoryMb: number;
};

export async function clusterStats(signal?: AbortSignal): Promise<ClusterStats> {
  const response = await fetch('/api/stats', { signal, cache: 'no-store' });
  if (!response.ok) throw new ApiOffline(`Stats returned ${response.status}.`);
  return response.json();
}
