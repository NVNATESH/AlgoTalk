# syntax=docker/dockerfile:1.7
# Multi-stage build for the AlgoTalk Express+TypeScript backend.
#
# Stage 1 (builder): installs ALL deps (incl. dev), runs `tsc` to emit /dist.
# Stage 2 (runner):  fresh node:24-alpine with prod-only deps + the compiled
#                    JS from /dist. ~150 MB final image vs ~600 MB for a
#                    single-stage build.

# ---------- Stage 1: builder ----------
FROM node:24-alpine AS builder
WORKDIR /app

# Copy manifest first so the layer cache survives unrelated source edits.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Now bring in the rest and compile.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: runner ----------
FROM node:24-alpine AS runner
WORKDIR /app

# Run as non-root for defense-in-depth.
RUN addgroup -g 1001 -S nodeapp && adduser -u 1001 -S nodeapp -G nodeapp

# Production deps only.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Bring the compiled JS over from the builder.
COPY --from=builder --chown=nodeapp:nodeapp /app/dist ./dist

# Tini as PID 1 so SIGTERM from Docker actually shuts the Node process down
# instead of being swallowed.
RUN apk add --no-cache tini
USER nodeapp

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# `node --enable-source-maps` makes stack traces resolve back to .ts lines
# without dragging the typescript devDep into the runtime image.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
