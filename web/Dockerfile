# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app

# The root package-lock.json is the single source of truth for this monorepo.
# Copy root lockfile plus the frontend workspace manifest before installing.
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci -w frontend

# Copy frontend source and build
COPY frontend ./frontend
RUN npm run -w frontend build

# Production image: Caddy serves the static frontend
FROM caddy:2-alpine

# The official Caddy image defaults to the non-root 'caddy' user, so
# explicitly switch to root before running permission-changing commands.
USER root

# Create non-root user directories and set permissions
RUN mkdir -p /config/caddy /data/caddy /srv && \
    chown -R caddy:caddy /srv /config /data

COPY --from=builder --chown=caddy:caddy /app/frontend/dist /srv
COPY --chown=caddy:caddy web/Caddyfile /etc/caddy/Caddyfile

# Run as non-root user
USER caddy

EXPOSE 80 443
