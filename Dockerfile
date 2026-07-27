# syntax=docker/dockerfile:1.7

# ── Stage 1: build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (devDeps needed for the Angular SSR build)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build-time public URL
ENV APP_URL=

# Copy sources and Angular config
COPY set-env.js ./
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public ./public
COPY src ./src

# Generate environment.ts then build the SSR bundle
RUN node set-env.js \
 && npm run build -- --configuration=production

# ── Stage 2: runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# Copy the compiled SSR bundle from the builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000

# server.ts is the compiled Express + Angular SSR entrypoint
CMD ["node", "dist/suma-matriculas/server/server.mjs"]
