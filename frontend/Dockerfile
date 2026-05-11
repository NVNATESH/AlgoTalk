# syntax=docker/dockerfile:1.7
# Multi-stage build for the LearnHub Next.js 14 frontend (App Router).
#
# Uses Next's standalone output: `next.config.mjs` must set `output: 'standalone'`
# so Next emits a self-contained server bundle in .next/standalone with only
# the deps it actually imports — yields ~80 MB images instead of ~400 MB.

# ---------- Stage 1: deps ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: builder ----------
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ---------- Stage 3: runner ----------
FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodeapp && adduser -u 1001 -S nodeapp -G nodeapp
RUN apk add --no-cache tini

# Standalone output: Next emits server.js + minimal node_modules.
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/standalone ./
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/static ./.next/static
COPY --from=builder --chown=nodeapp:nodeapp /app/public ./public

USER nodeapp

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
