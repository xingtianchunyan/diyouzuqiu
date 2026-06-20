# syntax=docker/dockerfile:1
FROM node:24.17.0-alpine AS builder
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

# The official Caddy image runs as root by default, but it does not guarantee
# a 'caddy' user exists. Switch to root and create the user/group if missing.
USER root

# Create the non-root user/group used to run Caddy, then prepare directories.
RUN (getent group caddy || addgroup -S caddy) && \
    (id -u caddy >/dev/null 2>&1 || adduser -S -G caddy caddy) && \
    mkdir -p /config/caddy /data/caddy /srv && \
    chown -R caddy:caddy /srv /config /data

COPY --from=builder --chown=caddy:caddy /app/frontend/dist /srv
COPY --chown=caddy:caddy web/Caddyfile /etc/caddy/Caddyfile

# Run as non-root user
USER caddy

EXPOSE 80 443
