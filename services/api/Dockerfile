# ---------------------------------------------------------------------------
# The API image.
#
# The model is baked in at build time rather than downloaded on first
# request. A cold replica that has to fetch 25 MB before it can answer is a
# replica that fails its readiness check and gets pulled out of rotation
# right when you scaled up because you needed it.
# ---------------------------------------------------------------------------

FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production \
    MODEL_CACHE=/app/.cache

COPY services/api/package.json services/api/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY services/api/src ./src
COPY services/api/scripts ./scripts
COPY services/api/data ./data

# Download and cache the embedding model into the image layer.
RUN node scripts/warm-model.mjs

# Run unprivileged. The node image ships a `node` user for exactly this.
RUN chown -R node:node /app
USER node

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8081/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
