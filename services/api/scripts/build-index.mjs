// ---------------------------------------------------------------------------
// Builds the vector index.
//
// Run this on your machine whenever the photographs or the knowledge file
// change:   npm --prefix services/api run build:index
//
// It reads the web app's own gallery data (Node 24 imports TypeScript
// directly, so there is no duplicate list of photographs to keep in sync),
// embeds everything once, and writes a plain JSON file. The running service
// never loads the gallery source and never embeds a photograph again — it
// only embeds incoming queries, which is why search responds in milliseconds.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIMENSIONS, MODEL_ID, embed } from '../src/embeddings.js';
import { KNOWLEDGE } from '../src/knowledge.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const outFile = resolve(here, '../data/photo-index.json');

const { PHOTOGRAPHS } = await import(
  resolve(repoRoot, 'src/lib/photographyGallery.ts')
);

/**
 * What actually gets embedded for each photograph.
 *
 * The description carries nearly all the meaning, so it is repeated after
 * the title and collection rather than being one field among many — a cheap
 * way to weight it without touching the model. Garbage in, garbage out
 * applies hard here: the quality of your alt text IS the quality of search.
 */
const photoText = (photo) =>
  `${photo.title}. ${photo.category} photography. ${photo.alt}.`;

console.log(`Model:        ${MODEL_ID} (${DIMENSIONS} dimensions)`);
console.log(`Photographs:  ${PHOTOGRAPHS.length}`);
console.log(`Knowledge:    ${KNOWLEDGE.length} passages`);
console.log('Embedding…');

const started = Date.now();

const photoVectors = await embed(PHOTOGRAPHS.map(photoText));
const knowledgeVectors = await embed(
  KNOWLEDGE.map((entry) => `${entry.topic}. ${entry.text}`),
);

// Six decimals is well past what cosine similarity can distinguish here, and
// it keeps the file at a size that is sane to commit and diff.
const round = (vector) => vector.map((value) => Number(value.toFixed(6)));

const index = {
  model: MODEL_ID,
  dimensions: DIMENSIONS,
  builtAt: new Date().toISOString(),
  photos: PHOTOGRAPHS.map((photo, i) => ({
    id: photo.id,
    title: photo.title,
    category: photo.category,
    alt: photo.alt,
    src: photo.src,
    fullSrc: photo.fullSrc,
    srcSet: photo.srcSet,
    width: photo.width,
    height: photo.height,
    vector: round(photoVectors[i]),
  })),
  knowledge: KNOWLEDGE.map((entry, i) => ({
    ...entry,
    vector: round(knowledgeVectors[i]),
  })),
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(index));

const kb = (JSON.stringify(index).length / 1024).toFixed(0);
console.log(`Wrote ${outFile} (${kb} kB) in ${Date.now() - started} ms`);
