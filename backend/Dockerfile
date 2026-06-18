# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app

# Install workspace root + backend dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci -w backend

# Copy backend source and build
COPY backend ./backend
RUN npm run -w backend db:generate
RUN npm run -w backend build

# Production image
FROM node:24-alpine
WORKDIR /app

# Copy runtime files
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/dist ./dist

# Ensure data directories exist
RUN mkdir -p /data/db /data/storage

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/db/diyou.db
ENV STORAGE_ROOT=/data/storage
ENV JWT_SECRET=change_me_in_production

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
