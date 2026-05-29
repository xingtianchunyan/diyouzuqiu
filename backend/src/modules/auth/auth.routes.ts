import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any

    if (!email || !password) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Email and password are required' } })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } })
    }

    const token = app.jwt.sign({ id: user.id, role: user.role, email: user.email, memberId: user.memberId })
    // Return token and basic user info
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId
      }
    }
  })

  // Refresh token endpoint
  app.post('/auth/refresh', async (request, reply) => {
    const auth = request.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No Authorization was found in request.headers' } })
    }

    const rawToken = auth.slice('Bearer '.length).trim()
    let payload: any
    try {
      payload = app.jwt.verify(rawToken, { ignoreExpiration: true })
    } catch (err) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, memberId: true }
    })
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ id: user.id, role: user.role, email: user.email, memberId: user.memberId })
    return { token }
  })

  // Logout (client-side deletes token, but we can provide an empty endpoint or blacklist if needed)
  app.post('/auth/logout', { preValidation: [app.authenticate] }, async (request, reply) => {
    return { message: 'Logged out successfully' }
  })

  app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, role: true, memberId: true }
    })
    
    if (!user) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    
    return user
  })
}
