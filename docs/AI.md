# The AI layer

Two features, one model, no API key, no cost per request.

- **Semantic photo search** — describe a photograph and get it back, even
  when none of your words appear in its description.
- **A portfolio assistant** — answers questions about the site from an
  indexed set of passages, and says so when a question is not covered.

Both run on `all-MiniLM-L6-v2`, quantised to 8 bits: about 25 MB, running
on the CPU inside the API container. It is roughly a thousandth the size of
the models people mean by "AI" in 2026, and for this job it is the right
tool, not a compromise.

---

## Embeddings, concretely

An embedding turns text into a list of numbers — 384 of them here —
positioned so that similar meanings land near each other.

```
"a couple laughing in the surf"   → [0.031, -0.114, 0.077, … ]
"joyful beach moment"             → [0.028, -0.109, 0.081, … ]
"a quantum physics textbook"      → [-0.204, 0.088, -0.015, … ]
```

The first two share no words at all, but their vectors point in nearly the
same direction. Measure the angle between two vectors and you have a
measure of how related the meanings are. That is the whole idea.

**Cosine similarity** is that measurement. Because every vector is
normalised to length 1 when it is created, it collapses to a dot product:

```js
let total = 0;
for (let i = 0; i < a.length; i++) total += a[i] * b[i];
```

384 multiplications. That is the entire search engine.

---

## How search works end to end

**Once, offline** (`npm --prefix services/api run build:index`):

1. Read the 35 photographs from the app's own gallery data.
2. For each, build a sentence: `"A little closer. Couples photography. A
   couple laughing together in white outfits at the edge of the surf."`
3. Embed all 35. Write the vectors to `services/api/data/photo-index.json`.

**Per query** (`GET /api/search?q=…`):

1. Embed the query — about 10 ms.
2. Dot product against all 35 stored vectors — microseconds.
3. Drop anything below a similarity of 0.2, sort, return the top matches.

```
$ curl -s 'localhost:8080/api/search?q=golden+hour+by+the+sea' | …

0.383  Ocean calm           A woman standing in bright shallow water…
0.328  The last light       A warm hanging lantern against an evening sky…
0.317  Colors by the coast  A woman in a patterned dress in shallow sea water…
```

Not one of those descriptions contains "golden", "hour" or "sea".

### The score floor is doing real work

Cosine similarity always returns *something*. Ask for "a quantum physics
textbook" and the closest photograph is still the closest photograph. The
0.2 floor is what turns a confident wrong answer into an honest "nothing
close enough" — and it is the single most important line in the file.

### Why a for-loop and not a vector database

48 vectors × 384 dimensions is about 18,000 multiply-adds per query. A JSON
file and a loop is not a shortcut here; it is correct. Vector databases
(pgvector, Qdrant, Pinecone) exist because brute force stops being free
somewhere around a million vectors, where approximate nearest-neighbour
indexes like HNSW trade a little accuracy for a lot of speed. At 48, an
index would be slower than the scan.

Knowing *when* you need one is worth more than knowing how to use one.

### What would make it better

Right now it searches the *descriptions*, so the quality of the alt text is
the quality of the search — literally. The next step up is CLIP, which
embeds images and text into the same space and searches what is actually in
the pixels. `Xenova/clip-vit-base-patch32` runs in the same library; the
index builder would embed the image files instead of the sentences, and
nothing else in the code would change.

That is also a nice accessibility argument: better alt text makes the site
work better for screen readers *and* makes search better. The same work
pays twice.

---

## How the assistant works

Retrieval-augmented generation, in three steps:

```
  question
     │
     ├─ retrieve   embed it, pull the closest passages from the index
     │
     ├─ augment    build a prompt containing ONLY those passages
     │
     └─ generate   hand it to a model, stream the answer back
```

Everything it is allowed to say lives in `services/api/src/knowledge.js`.
That is the point: a portfolio assistant that invents a client, a date or a
credential is worse than no assistant. Grounding it in a file you wrote
means the worst case is "I don't know".

### Three generators, one of which costs money

Set `CHAT_PROVIDER` in `services/api/.env`:

| Value | What it does | Cost |
|---|---|---|
| `none` *(default)* | returns the retrieved passages directly | free, offline |
| `ollama` | a model on your own machine | free, needs ~2 GB RAM |
| `anthropic` | the Claude API | **billed per request** |

`none` is the default deliberately. It is less fluent, but it answers, it
never invents anything, and it shows you exactly how much of a RAG system's
usefulness comes from retrieval rather than generation. The answer is: most
of it.

To try a local model, free:

```bash
brew install ollama && ollama pull llama3.2
# then in services/api/.env:
CHAT_PROVIDER=ollama
```

If a configured provider fails — Ollama not running, key rejected, network
down — the service falls back to the retrieval-only answer instead of
showing an error. Same instinct as `proxy_cache_use_stale` at the edge:
degrade, don't fail.

### Streaming

Answers arrive as Server-Sent Events, so the first words appear while the
rest is still being written. Three things have to agree for that to work:

- the server never buffers the response,
- nginx has `proxy_buffering off` on `/api/chat` specifically,
- the client reads the body as a stream rather than awaiting `.json()`.

Get any one wrong and the whole answer lands at once after ten seconds. The
`X-Accel-Buffering: no` header exists for precisely this.

And when the visitor closes the panel, the request aborts, the server sees
the dropped connection, and generation stops. On a paid provider that is
the difference between a feature and a bill.

---

## Rebuilding the index

After adding photographs or editing the knowledge file:

```bash
npm --prefix services/api run build:index
docker compose up -d --build api1 api2
```

The index is committed, so a fresh clone and `docker compose up` works with
no model run at all.
