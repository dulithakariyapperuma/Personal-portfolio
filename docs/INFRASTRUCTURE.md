# The infrastructure lab

This site does not need a cluster. A 1.2 kB HTML file and some photographs
would be happy on any static host. It runs as a cluster because the point is
to learn what each piece actually does, with something real enough that
breaking it is interesting.

Everything here is free. No cloud account, no API key, no bill.

```
                            your browser
                                 │
                            :8080 edge                 nginx
                       reverse proxy · load balancer · router
                       the ONLY container with a published port
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
        web_pool (round robin)              api_pool (least_conn)
              │                                     │
    ┌─────────┼─────────┐                   ┌───────┴───────┐
  web1      web2      web3                api1            api2
  static build, nginx                   Node · search · assistant
```

---

## Running it

```bash
docker compose up --build
```

Then open <http://localhost:8080>. First build takes a few minutes: it
compiles the site three times over and bakes a 25 MB model into the API
image. After that, start-up is seconds.

Docker Desktop is free for personal and student use. Without it, you can
still run everything as two plain processes:

```bash
npm --prefix services/api run dev     # API on :8081
npm run dev                           # site on :5173, proxies /api to it
```

That works, but you lose the proxy, the replicas and the caching — which is
most of what there is to learn here.

---

## The three jobs the edge does

People use "proxy", "load balancer" and "router" interchangeably. They are
three different jobs that happen to live in one container here.

### Reverse proxy

Your connection ends at the edge. The edge opens a *separate* connection to
a backend. Nothing you do reaches `web1` directly.

That single indirection is what buys you: TLS in one place instead of five,
compression once, caching once, rate limiting once, security headers once,
and the ability to restart any backend without a visitor noticing.

> A **forward** proxy is the mirror image — it sits in front of *clients*,
> not servers. A company filtering staff web traffic runs a forward proxy.
> Same word, opposite direction.

### Load balancer

`upstream web_pool` lists three backends. Watch it rotate:

```bash
for i in $(seq 9); do curl -sI localhost:8080/ | grep -i x-served-by; done
```

```
x-served-by: web1
x-served-by: web2
x-served-by: web3
x-served-by: web1
x-served-by: web2
x-served-by: web3
...
```

### The `zone` directive, and why this looked broken at first

The first version of this config had no `zone` in the upstream block, and
the loop above printed `web1` eight times in a row before it started
rotating. Over 30 requests the split was 10/11/9 — correct on average, and
completely unconvincing to watch.

The cause: `worker_processes auto` starts one nginx worker per CPU, eight on
this machine, and **without `zone` each worker keeps its own round-robin
counter in its own memory**. Eight workers each sent their first request to
the first backend in the list. Only once every worker had served a few
requests did the average come out even.

`zone web_pool 64k` puts the balancer state in shared memory, so all workers
advance one counter. It also makes passive health checks shared — otherwise
each worker has to independently discover that a backend is dead, and a
"removed from rotation" backend keeps getting traffic from the seven workers
that have not found out yet.

If a load balancer ever looks like it is ignoring you, check how many
workers it has before you doubt the algorithm.

Algorithms, in `infra/edge/nginx.conf` — swap the directive and re-run the
loop above:

| Directive    | Behaviour                                 | Good for |
|--------------|-------------------------------------------|----------|
| *(default)*  | round robin, strict rotation              | identical, cheap requests |
| `least_conn` | fewest open connections wins              | responses of uneven cost — the API |
| `ip_hash`    | a client always lands on the same backend | sticky sessions |
| `random two` | pick two at random, take the less loaded  | large pools, surprisingly good |

The API pool uses `least_conn` on purpose: a chat request can hold a
connection for thirty seconds while a search takes eleven milliseconds.
Strict rotation would keep handing new work to a replica already busy
streaming.

### Router

Same hostname, same port, six different destinations — chosen from the path:

| Path | Goes to | Treatment |
|------|---------|-----------|
| `/healthz` | nobody | answered by the edge itself |
| `/api/chat` | api_pool | no buffering, no cache, 300 s timeout, 1 req/s |
| `/api/*` | api_pool | cached 5 min at the edge, 10 req/s |
| `/assets/*` | web_pool | `max-age=31536000, immutable` |
| `/photography/*`, `/models/*` | web_pool | `max-age=2592000` |
| everything else | web_pool | `no-cache`, SPA fallback to index.html |

---

## Things worth trying

### Watch a backend die and come back

```bash
docker compose stop web2
for i in $(seq 12); do curl -s -o /dev/null -w '%{http_code} ' localhost:8080/; done
```

```
200 200 200 200 200 200 200 200 200 200 200 200
```

Not one 502. After two failed attempts nginx drops `web2` for ten seconds
and `web1` and `web3` absorb everything. Bring it back:

```bash
docker compose start web2
sleep 12
for i in $(seq 9); do curl -sI localhost:8080/ | grep -i x-served-by; done
```

```
web1  web3  web2  web1  web3  web2  web1  web3  web2
```

It rejoined the rotation without anyone telling it to.

This is a **passive** health check — nginx learns from real requests that
failed. Active checks, where the proxy polls `/healthz` on a timer and
removes a backend *before* a visitor hits it, are an nginx Plus feature.
Traefik, HAProxy, Envoy and Kubernetes all do them for free. Worth knowing
which one you have.

### Watch the cache work

```bash
curl -sI "localhost:8080/api/search?q=sunset" | grep -i x-cache-status   # MISS
curl -sI "localhost:8080/api/search?q=sunset" | grep -i x-cache-status   # HIT
```

A `HIT` never reaches a backend at all. For a query every visitor types,
that is the difference between running a language model and reading 4 kB
out of memory.

### Trip the rate limiter

```bash
for i in $(seq 40); do curl -so /dev/null -w "%{http_code} " "localhost:8080/api/search?q=test$i"; done
```

You will see `200`s turn into `429`s. `rate=10r/s burst=20 nodelay` means:
ten a second sustained, a spike of twenty served immediately, everything
beyond that rejected. Without it, one script can occupy both API replicas.

### See compression

```bash
curl -s -o /dev/null -w "%{size_download}\n" localhost:8080/assets/three-*.js
curl -s -o /dev/null -w "%{size_download}\n" -H 'Accept-Encoding: gzip' localhost:8080/assets/three-*.js
```

844,435 bytes against 226,341 — a 73% saving, for one directive.

### Watch load balancing in the logs

```bash
docker compose logs -f edge
```

```
172.18.0.1 200 GET /api/search?q=blue -> upstream=172.18.0.4:8081 upstream_time=0.014 total=0.015 cache=MISS
```

`upstream_time` is the backend. `total` is the backend plus everything the
edge did. The gap between them is the proxy's own cost — usually
microseconds, which is the honest answer to "doesn't a proxy slow things
down?"

### Prove the replicas are independent

```bash
curl -s localhost:8080/api/stats | python3 -m json.tool | head -8
```

Run it repeatedly. The `instance` alternates between `api1` and `api2`, and
each has its own request counter. Nothing is shared — which is exactly why
either can be killed.

---

## Why caching is split three ways

| Kind of file | Header | Reason |
|---|---|---|
| `/assets/index-DAfnEm5b.js` | one year, `immutable` | the hash is part of the name; different bytes get a different name, so a stale cache is impossible |
| `/photography/img-3927-large.webp` | one month | stable, but no hash, so the name could be reused |
| `index.html` | `no-cache` | it names the hashed files; cache it and visitors load last week's asset names forever |

Getting this wrong is the single most common static-hosting bug. Caching
`index.html` for a year is how a deploy silently fails to reach anyone.

---

## What is deliberately missing

Worth knowing you do not have these:

- **TLS.** Plain HTTP on localhost. In production the edge terminates HTTPS
  — one certificate at one place, backends stay on HTTP inside the private
  network. `mkcert` gives you a local certificate to practise with.
- **Active health checks.** Covered above.
- **Shared state.** Each API replica counts its own requests. The moment you
  need real shared state, you need Redis or a database — and the moment you
  have one, your replicas are no longer independent.
- **Metrics.** `/api/stats` is a toy. Prometheus scraping an exporter, with
  Grafana over it, is the real version and slots in as two more services.
- **Autoscaling.** Replica count is fixed at three and two. Reacting to load
  is what Kubernetes' HorizontalPodAutoscaler does, and the natural next
  step from here.

## The natural next step

Everything in `docker-compose.yml` has a Kubernetes equivalent: the web
service becomes a `Deployment` with `replicas: 3`, the edge becomes an
`Ingress`, the health checks become `readinessProbe` and `livenessProbe`,
and the fixed replica counts become a `HorizontalPodAutoscaler`. `k3d` runs
a real cluster inside Docker on a laptop, free.

The concepts transfer exactly. That is the reason to learn them here, where
`docker compose logs -f edge` tells you everything.
