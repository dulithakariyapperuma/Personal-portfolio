// Downloads the embedding model into the image at build time, so the first
// visitor does not pay for a 25 MB cold start.
import { getExtractor } from '../src/embeddings.js';
await getExtractor();
console.log('Model cached.');
