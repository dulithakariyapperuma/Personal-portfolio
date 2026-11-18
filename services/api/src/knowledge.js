// ---------------------------------------------------------------------------
// The assistant's source of truth.
//
// Every fact the chat endpoint is allowed to state lives here. Nothing is
// invented at runtime: retrieval picks the relevant passages, and the model
// (when one is configured) is told to answer only from them. Edit this file
// to change what the assistant knows.
// ---------------------------------------------------------------------------

export const KNOWLEDGE = [
  {
    id: 'who',
    topic: 'About Dulitha',
    text: `Dulitha Kariyapperuma is a student who builds software and photographs people. The portfolio is organised around one idea: engineering and photography are two ways of paying attention, not two different kinds of mind. The site's tagline is "Two ways of seeing. One connected mind."`,
  },
  {
    id: 'brain',
    topic: 'The interactive brain',
    text: `The landing page renders a real cortical surface mesh in 3D with three.js and React Three Fiber. You can drag to orbit it, scroll or pinch to zoom, and choose a cyan (programming) or amber (photography) entrance. Each entrance opens three short lessons about what the brain is doing during that activity, with links to the research behind each claim. The geometry comes from BrainBrowser's example brain surface: 81,924 vertices and 163,840 triangles, packed into a 5.7 MB binary file so it loads in one request.`,
  },
  {
    id: 'brain-honesty',
    topic: 'Scientific caveats',
    text: `The region overlays on the 3D brain are approximate teaching aids based on coordinates, not anatomical atlas parcellations, brain scans, or measured activation. The left/right entrance split is a visual metaphor, not a claim about left-brained and right-brained personality types — that idea is not supported by the evidence, and the site links to the University of Utah research summary saying so. Both hemispheres participate in both activities.`,
  },
  {
    id: 'photography',
    topic: 'Blurryblue Photography',
    text: `Blurryblue Photography is Dulitha's photography practice. The gallery holds 35 photographs across three collections: Couples, Portraits, and Moments. The site shows them on an animated wall on the hero, then in a filterable grid, with a full-screen viewer that supports arrow keys and swipe. Every photograph is served as WebP in three sizes so phones do not download a 6000-pixel-wide file.`,
  },
  {
    id: 'photography-style',
    topic: 'Photographic approach',
    text: `The photography leans on natural light, coastal and outdoor settings, and candid moments between people rather than posed studio work. Blue is the recurring colour — hence the name. The statement on the site reads: "You can't create blue from other colours, but through it."`,
  },
  {
    id: 'contact',
    topic: 'Getting in touch',
    text: `You can reach Dulitha by email at the address listed in the contact section of the photography site, on Instagram as @blurryblue_photography, or via LinkedIn. The contact section on the photography page has the live links. Based in Sri Lanka.`,
  },
  {
    id: 'stack-web',
    topic: 'How the website is built',
    text: `The site is a React 19 single-page app written in TypeScript and built with Vite 7. Routing is React Router. Animation is Framer Motion. The 3D scene is three.js through React Three Fiber. The build is split into content-hashed chunks so three.js, the animation library and the photography page each download only when they are needed.`,
  },
  {
    id: 'stack-infra',
    topic: 'The infrastructure lab',
    text: `The site runs as a small cluster rather than a single server, as a way to learn infrastructure hands-on. An nginx edge container is the only thing exposed to the outside: it reverse-proxies, load balances and routes. Behind it sit three identical stateless web replicas serving the static build, and two API replicas running semantic search and the assistant. Every response carries headers showing which replica served it, so load balancing is visible rather than theoretical.`,
  },
  {
    id: 'concept-proxy',
    topic: 'What a reverse proxy does',
    text: `A reverse proxy sits in front of your servers and answers on their behalf. The visitor's connection ends at the proxy; the proxy opens its own connection to a backend. That one indirection is what buys you TLS termination in a single place, compression, caching, rate limiting, security headers, and the freedom to restart or replace backends without a visitor noticing. A forward proxy is the mirror image: it sits in front of clients, not servers.`,
  },
  {
    id: 'concept-lb',
    topic: 'How load balancing works here',
    text: `The edge holds a pool of backends and spreads requests across them. Round robin rotates strictly. least_conn sends each request to whichever backend has the fewest open connections, which is better when some responses are much slower than others — so the API pool uses it and the static pool does not. ip_hash pins a client to one backend for sticky sessions. nginx open source does passive health checks: after two failures a backend is dropped from rotation for ten seconds, then tried again with real traffic. Active polling of a health endpoint is an nginx Plus feature.`,
  },
  {
    id: 'concept-routing',
    topic: 'How routing works here',
    text: `The edge picks a destination from the URL. /api/chat streams, so buffering and caching are off and the read timeout is long. Other /api/ paths are cached at the edge for five minutes, because the same search query returns the same answer to everyone. /assets/ holds content-hashed build output and is cached for a year as immutable. Photographs and the 3D model get a month. Everything else falls through to the app, where index.html is explicitly not cached so visitors never load last week's asset filenames.`,
  },
  {
    id: 'concept-search',
    topic: 'How the semantic search works',
    text: `Each photograph's title, collection and description are turned into a 384-number vector by a small language model called all-MiniLM-L6-v2, running locally with no API key and no cost. Those vectors are computed once and saved to a file. When you search, your query is turned into a vector the same way, and the photographs are ranked by cosine similarity — how closely the two vectors point in the same direction. That is why searching "golden hour by the sea" finds sunset beach photographs that never use those words.`,
  },
  {
    id: 'concept-rag',
    topic: 'How the assistant answers',
    text: `The assistant uses retrieval-augmented generation. Your question is embedded, the most relevant passages from a hand-written knowledge file are retrieved by vector similarity, and only those passages are given to the language model as context, with an instruction to answer from them alone and to say so when the answer is not there. With no model configured it returns the retrieved passages directly — less fluent, but it still answers, offline and for free.`,
  },
];
