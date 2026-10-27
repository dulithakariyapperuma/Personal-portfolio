import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIVITIES, REGIONS, regionWeight } from '../src/lib/brainRegions.ts';
const buffer = readFileSync(new URL('../public/models/cortex.bin', import.meta.url));
let offset = 0; const counts = Object.fromEntries(Object.keys(REGIONS).map(id => [id, [0,0]]));
for (let side = 0; side < 2; side++) {
  const vertices = buffer.readUInt32LE(offset), indices = buffer.readUInt32LE(offset+4); offset += 8;
  assert(vertices > 0 && indices % 3 === 0);
  for (let i = 0; i < vertices; i++) {
    const p = [0,4,8].map(k => buffer.readFloatLE(offset + i*12+k)); assert(p.every(Number.isFinite));
    for (const id of Object.keys(REGIONS)) counts[id][side] += regionWeight(id,...p);
  }
  offset += vertices*12;
  for (let i = 0; i < indices; i++) assert(buffer.readUInt32LE(offset+i*4) < vertices);
  offset += indices*4;
}
assert.equal(offset,buffer.length);
for (const [id, countsBySide] of Object.entries(counts)) {
  if (id === 'memory') assert.deepEqual(countsBySide,[0,0]); // internal markers, not a cortical mask
  else assert(countsBySide[0]+countsBySide[1] > 100, `${id} must have a visible surface overlay`);
}
for (const id of ['md','prefrontal','parietal','visual','motor']) assert(counts[id].every(n => n > 100), `${id} must be bilateral`);
assert.equal(counts.language[1],0);
for (const activity of Object.values(ACTIVITIES)) for (const id of activity.regions) assert(REGIONS[id]);
for (const region of Object.values(REGIONS)) assert(Math.hypot(...region.camera) >= 4.5);
console.log('PASS: mesh bounds, indices, bilateral overlays, internal-only memory markers, region references, camera distance.');
console.log(counts);
