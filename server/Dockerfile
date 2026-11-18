# ---- deps: install once, reuse for runtime -------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# bcrypt ships prebuilt binaries for musl; keep a toolchain as a fallback.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./

# Full install (Prisma CLI is needed at runtime for `migrate deploy`).
RUN npm ci && npx prisma generate

# ---- runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# tini forwards signals so `docker stop` drains the worker cleanly;
# curl powers the healthcheck.
RUN apk add --no-cache tini curl

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
COPY src ./src
COPY app.js server.js ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && chown -R node:node /app

# node:22-alpine ships uid/gid 1000 as `node`
USER node

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/api/ready || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
