# One Connected Mind

Dulitha Kariyapperuma's portfolio: an interactive 3D brain, a photography
site, and the infrastructure behind them — built as a way to learn proxies,
load balancing, routing and applied AI on something real.

| | |
|---|---|
| **Landing** | A cortical surface mesh in three.js. Orbit it, pick a hemisphere, read three short lessons with the research behind each claim. |
| **Programming** | DCK CORP OS: a portfolio you use like a desktop — draggable windows, a project explorer, a working terminal, and a certification archive. |
| **Photography** | Blurryblue Photography: 35 photographs, an animated wall, a filterable grid, and search by description rather than keyword. |
| **Assistant** | Answers questions about the site from an indexed knowledge file. Streams. Admits what it does not know. |
| **Cluster** | nginx edge proxy, three web replicas, two API replicas. One command. |

---

## Quick start

**Just the site** — no Docker, no API:

```bash
npm install
npm run dev
```

**The whole cluster** — proxy, replicas, search, assistant:

```bash
docker compose up --build
```

<http://localhost:8080>

**The site plus AI, without Docker** — two terminals:

```bash
npm --prefix services/api install && npm --prefix services/api run dev
```

```bash
npm run dev
```

---

## Checks

```bash
npx tsc --noEmit             # types
node scripts/check-brain.mjs # mesh bounds, indices, region overlays
npm run build                # production build
```

## Before you deploy

The domain is substituted at build time, because Open Graph needs absolute
URLs and a hard-coded one goes stale:

```bash
SITE_URL=https://your-domain.com npm run build
```

That fills the canonical, `og:url` and `og:image` tags and emits
`robots.txt` and `sitemap.xml`. The default is in `vite.config.ts`.

Regenerate the share card after changing the tagline or the photograph:

```bash
python3 scripts/make-og-image.py
```

---

## Layout

```
src/                     the React app
  components/            BrainScene, the photography wall, AskPanel, PhotoSearch
  dck/                   DCK CORP OS — the programming portfolio desktop
  lib/                   gallery data, brain regions, API client
  pages/                 Landing, Photography
services/api/            the AI service — search and the assistant
  src/                   server, embeddings, vector index, RAG
  scripts/build-index.mjs rebuild the vector index
  data/                  the committed index
infra/edge/nginx.conf    the reverse proxy, load balancer and router
infra/web/               the static-serving replica image
docs/                    how the infrastructure and the AI work
```

**[docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** — what the edge does,
and commands to watch it do it: load balancing rotating, a backend dying and
recovering, the cache going MISS then HIT, the rate limiter tripping.

**[docs/AI.md](docs/AI.md)** — embeddings and cosine similarity from first
principles, why there is no vector database, and how the assistant is kept
from inventing things.

**[docs/DCK-OS.md](docs/DCK-OS.md)** — the desktop portfolio: its windows,
terminal commands and certification archive, and what to customise.

---

## Performance notes

The build is split so nothing downloads before it is needed:

| Chunk | Size | When |
|---|---|---|
| `index.js` | 217 kB | always |
| `three.js` | 844 kB | when the 3D brain mounts |
| `Photography.js` + CSS | 62 kB | only on the photography route |
| `DckOs.js` + CSS | 74 kB | only on the programming route |
| `motion.js` | 151 kB | with either portfolio |

Content-hashed filenames are what make a one-year `immutable` cache header
safe, and the edge sets exactly that for `/assets/`. `index.html` is never
cached, because it names those hashed files.

Webfonts follow the same rule. Space Grotesk and IBM Plex Mono are requested
from `index.html` because every page uses them. Barlow Condensed and DM Sans
belong to the programming desktop alone, so `DckOs.tsx` requests them on
mount — not from an `@import` in its stylesheet, which would not start the
download until the route's CSS had been fetched and parsed.

Every page passes WCAG AA contrast (4.5:1 for body text, 3:1 for large),
measured by compositing each element's real backdrop rather than reading one
`background-color`.

---

## Content and scope

The photography is real and complete. The three projects in DCK CORP OS are
explicitly marked concept studies, not client work, and use remote Unsplash
images — replace them in `src/dck/DckOs.tsx`. The four certifications in
`src/dck/data/certifications.ts` are sample records and are labelled as
unverified. The experiments on the landing page are implemented
demonstrations, not invented client work.

Content and citations live in `src/pages/Landing.tsx`. What the assistant is
allowed to say lives in `services/api/src/knowledge.js`.

Left and right entrances are a visual metaphor, not personality types. Both
practices involve interacting networks across both hemispheres. The lesson
order is narrative, not a sequence of isolated activations. Photography
examples apply general neuroscience rather than photography-specific
imaging. Einstein played the violin; that is not evidence it caused
relativity.

Sources checked 19 October 2026: MIT code-comprehension research; University
of Utah on lateralization; Beaty et al., PNAS (2018); Caltech's Einstein
Papers Project; the Nobel Prize biography and the Nobel Prize Museum's Cajal
exhibition. Each link sits beside the claim it supports.

## Attribution

Cortical model: BrainBrowser's `brain-surface.obj.gz`. See
`public/models/NOTICE.txt` and `LICENSE.txt`. Overlays are approximate
coordinate-based teaching aids, not atlas parcellations, scans or measured
activation. The cerebellum marker is schematic and not part of the source
mesh. `python3 scripts/prepare-cortex.py` rebuilds `cortex.bin`.

Embedding model: `Xenova/all-MiniLM-L6-v2` via Transformers.js, Apache 2.0,
running locally.
