import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { validateBody, z } from '../../lib/validate.js'
import { validatePassword } from '../../lib/password.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', {
    preValidation: validateBody(loginSchema),
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { email, password } = (request as any).validatedBody as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return reply.code(401).send({ message: 'Invalid credentials' })
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
      return reply.code(401).send({ message: 'No Authorization was found in request.headers' })
    }

    const rawToken = auth.slice('Bearer '.length).trim()
    let payload: any
    try {
      payload = app.jwt.verify(rawToken, { ignoreExpiration: true })
    } catch (err) {
      return reply.code(401).send({ message: 'Invalid token' })
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
      return reply.code(404).send({ message: 'User not found' })
    }

    return user
  })

  app.post('/auth/change-password', {
    preValidation: [app.authenticate, validateBody(changePasswordSchema)]
  }, async (request, reply) => {
    const { currentPassword, newPassword } = (request as any).validatedBody as {
      currentPassword: string
      newPassword: string
    }

    const passwordCheck = validatePassword(newPassword)
    if (!passwordCheck.valid) {
      return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    return { message: 'Password changed successfully' }
  })
}
