# ---------------------------------------------------------------------------
# Multi-stage build.
#
# Stage 1 has Node, the source, and ~300 MB of node_modules. Stage 2 has
# nginx and the built files — nothing else. The toolchain never ships, so the
# image that runs in production is small and has very little to attack.
# ---------------------------------------------------------------------------

# ---- Stage 1: build ----
FROM node:24-alpine AS build
WORKDIR /app

# Copy the lockfile first and install on its own layer. Docker caches layers
# by their inputs, so editing a component does not reinstall node_modules.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public

RUN npx tsc --noEmit && npx vite build

# Pre-compress so nginx can serve .gz off disk (gzip_static) instead of
# burning CPU compressing the same 844 kB three.js chunk on every request.
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \) \
      -exec gzip -9 -k {} \;

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine AS serve

# Files placed in /etc/nginx/templates are run through envsubst at container
# start, which is how ${WEB_INSTANCE} becomes web1 / web2 / web3.
COPY infra/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV WEB_INSTANCE=web
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
