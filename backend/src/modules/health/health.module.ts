import type { FastifyInstance } from 'fastify'

export function registerHealthModule(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }))
}

