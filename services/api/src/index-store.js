// ---------------------------------------------------------------------------
// The vector "database".
//
// 35 photographs and 13 passages is 48 vectors of 384 numbers. Comparing a
// query against all of them is about 18,000 multiply-adds — microseconds.
// A real vector database (pgvector, Qdrant, Pinecone) exists because that
// brute-force scan stops being free somewhere around a million vectors,
// where approximate nearest-neighbour indexes like HNSW take over. At this
// size, a JSON file and a for-loop is not a shortcut; it is the right answer.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { embedOne, similarity } from './embeddings.js';

const here = dirname(fileURLToPath(import.meta.url));
const indexFile = resolve(here, '../data/photo-index.json');

let store = null;

export function loadIndex() {
  if (store) return store;
  try {
    store = JSON.parse(readFileSync(indexFile, 'utf8'));
  } catch (error) {
    throw new Error(
      `Vector index missing at ${indexFile}. Build it with: npm --prefix services/api run build:index\n${error.message}`,
    );
  }
  return store;
}

export function indexInfo() {
  const data = loadIndex();
  return {
    model: data.model,
    dimensions: data.dimensions,
    builtAt: data.builtAt,
    photos: data.photos.length,
    passages: data.knowledge.length,
  };
}

export function allPhotos() {
  return loadIndex().photos.map(({ vector, ...photo }) => photo);
}

/**
 * Ranks every photograph against the query and returns the best matches.
 *
 * `minScore` matters more than it looks. Cosine similarity always returns
 * *something*, so without a floor a nonsense query still gets a confident
 * top result. Rejecting weak matches is what makes the search feel honest.
 */
export async function searchPhotos(query, { limit = 12, minScore = 0.2, category = null } = {}) {
  const data = loadIndex();
  const queryVector = await embedOne(query);

  const pool = category && category !== 'All'
    ? data.photos.filter((photo) => photo.category === category)
    : data.photos;

  return pool
    .map(({ vector, ...photo }) => ({
      ...photo,
      score: Number(similarity(queryVector, vector).toFixed(4)),
    }))
    .filter((photo) => photo.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * The retrieval half of retrieval-augmented generation: find the passages
 * most likely to contain the answer, and hand only those to the model.
 */
export async function retrieveKnowledge(question, { limit = 4, minScore = 0.12 } = {}) {
  const data = loadIndex();
  const queryVector = await embedOne(question);

  return data.knowledge
    .map(({ vector, ...entry }) => ({
      ...entry,
      score: Number(similarity(queryVector, vector).toFixed(4)),
    }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
