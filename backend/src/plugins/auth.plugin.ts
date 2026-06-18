import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; role: string; email: string; memberId: string | null; tokenVersion: number }
    user: { id: string; role: string; email: string; memberId: string | null; tokenVersion: number }
  }
}

function unauthorized(reply: FastifyReply, message = 'Invalid or expired token') {
  return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message } })
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '1h'
    },
    cookie: {
      cookieName: 'token',
      signed: false
    }
  })

  async function verifyTokenVersion(request: FastifyRequest) {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, role: true, tokenVersion: true }
    })
    if (!user || user.tokenVersion !== request.user.tokenVersion) {
      return null
    }
    return user
  }

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return unauthorized(reply)
    }

    const user = await verifyTokenVersion(request)
    if (!user) {
      return unauthorized(reply, 'Token has been revoked')
    }
  })

  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return unauthorized(reply)
    }

    if (request.user.role !== 'ADMIN') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } })
    }

    const user = await verifyTokenVersion(request)
    if (!user) {
      return unauthorized(reply, 'Token has been revoked')
    }
  })
})
