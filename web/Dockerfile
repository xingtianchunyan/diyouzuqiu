# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Production image: Caddy serves the static frontend
FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
COPY web/Caddyfile /etc/caddy/Caddyfile
