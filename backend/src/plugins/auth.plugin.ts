import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: string; email: string; memberId: string | null }
    user: { id: string; role: string; email: string; memberId: string | null }
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'super-secret-key',
    sign: {
      expiresIn: '1h'
    }
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })

  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      if (request.user.role !== 'ADMIN') {
        reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } })
      }
    } catch (err) {
      reply.send(err)
    }
  })
})
