"""Convert BrainBrowser's MNI polygon example to two indexed binary surfaces.
Source and license are preserved in public/models. No runtime dependency.
Usage: python3 scripts/prepare-cortex.py
"""
import gzip, struct
from pathlib import Path
root = Path(__file__).resolve().parent.parent
items = gzip.decompress((root/'public/models/brain-surface.obj.gz').read_bytes()).decode().split()
assert items[0] == 'P'
n = int(items[6]); cursor = 7
points = [tuple(map(float, items[cursor+i*3:cursor+i*3+3])) for i in range(n)]
cursor += n*6  # positions then normals
faces = int(items[cursor]); flag = int(items[cursor+1]); cursor += 2
cursor += 4 * (1 if flag == 0 else faces if flag == 1 else n)
ends = list(map(int, items[cursor:cursor+faces])); cursor += faces
indices = list(map(int, items[cursor:cursor+ends[-1]]))
assert all(ends[i] - (ends[i-1] if i else 0) == 3 for i in range(faces))
mins = [min(p[k] for p in points) for k in range(3)]
maxs = [max(p[k] for p in points) for k in range(3)]
center = [(a+b)/2 for a,b in zip(mins,maxs)]
scale = 3.6/max(b-a for a,b in zip(mins,maxs))
triangles = [[], []]
for i in range(0, len(indices), 3):
    tri = indices[i:i+3]
    side = 0 if sum(points[j][0] for j in tri)/3 < center[0] else 1
    triangles[side].extend(tri)
out = bytearray()
for tris in triangles:
    unique = sorted(set(tris)); lookup = {v:i for i,v in enumerate(unique)}
    out += struct.pack('<II', len(unique),len(tris))
    for i in unique:
        x,y,z = points[i]
        out += struct.pack('<fff',(x-center[0])*scale,(z-center[2])*scale,-(y-center[1])*scale)
    out += struct.pack('<'+'I'*len(tris),*(lookup[i] for i in tris))
(root/'public/models/cortex.bin').write_bytes(out)
print(f'{n} vertices, {faces} triangles, {len(out):,} bytes; bounds {mins} / {maxs}')
