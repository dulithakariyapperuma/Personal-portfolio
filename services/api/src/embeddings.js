// ---------------------------------------------------------------------------
// Embeddings.
//
// An embedding turns a piece of text into a list of numbers — here 384 of
// them — positioned so that texts meaning similar things land near each
// other. "a couple laughing in the surf" and "joyful beach moment" share
// almost no words, but their vectors point in nearly the same direction.
// That is the whole trick behind semantic search.
//
// The model is all-MiniLM-L6-v2, quantised to 8 bits: about 25 MB, runs on
// the CPU, needs no API key and costs nothing per query.
// ---------------------------------------------------------------------------

import { env, pipeline } from '@huggingface/transformers';

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const DIMENSIONS = 384;

if (process.env.MODEL_CACHE) {
  env.cacheDir = process.env.MODEL_CACHE;
}

let extractorPromise = null;

/**
 * Loads the model once and reuses it. The first call pays ~5 s of start-up;
 * every call after that is a few milliseconds. This is why the API service
 * is a long-lived process and not a serverless function.
 */
export function getExtractor() {
  extractorPromise ??= pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' });
  return extractorPromise;
}

/**
 * Embeds a batch of strings into unit-length vectors.
 *
 * `pooling: 'mean'` averages the per-token vectors into one vector for the
 * whole string. `normalize: true` scales it to length 1, which is what lets
 * cosine similarity collapse into a plain dot product below.
 */
export async function embed(texts) {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  return output.tolist();
}

export async function embedOne(text) {
  const [vector] = await embed([text]);
  return vector;
}

/**
 * Cosine similarity of two unit vectors — just the dot product, since both
 * already have length 1. Returns roughly -1 (opposite) to 1 (identical).
 */
export function similarity(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i] * b[i];
  return total;
}
