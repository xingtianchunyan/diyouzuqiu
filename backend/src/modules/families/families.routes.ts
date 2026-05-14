import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const familiesRoutes: FastifyPluginAsync = async (app) => {
  // GET /families
  app.get('/families', { preValidation: [app.authenticate] }, async (request, reply) => {
    const families = await prisma.family.findMany({
      select: { id: true, label: true },
      orderBy: { createdAt: 'asc' }
    })
    return families
  })

  // POST /families (ADMIN)
  app.post('/families', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { label } = request.body as { label?: string }
    if (!label) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Label is required' } })
    }
    
    try {
      const family = await prisma.family.create({
        data: { label },
        select: { id: true, label: true }
      })
      return reply.code(201).send(family)
    } catch (err: any) {
      if (err.code === 'P2002') {
        return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Family label already exists' } })
      }
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create family' } })
    }
  })
}
