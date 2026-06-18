import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { validateBody, validateParams, z } from '../../lib/validate.js'
import { validatePassword } from '../../lib/password.js'

const userIdParamsSchema = z.object({
  id: z.string().min(1)
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  memberId: z.string().optional().nullable()
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  memberId: z.string().optional().nullable()
})

const resetPasswordSchema = z.object({
  password: z.string().min(8)
})

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // All user routes require ADMIN role
  app.addHook('preHandler', app.requireAdmin)

  app.get('/', async () => {
    const users = await prisma.user.findMany({
      include: {
        member: {
          select: { id: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return users.map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      memberId: u.memberId,
      member: u.member
    }))
  })

  app.post('/', { preValidation: validateBody(createUserSchema) }, async (request, reply) => {
    const { email, password, role, memberId } = (request as any).validatedBody as {
      email: string
      password: string
      role?: 'ADMIN' | 'MEMBER'
      memberId?: string | null
    }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return reply.code(409).send({ error: { code: 'USER_EXISTS', message: 'Email already exists' } })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'MEMBER',
        memberId: memberId || null
      }
    })

    return { id: user.id, email: user.email, role: user.role, memberId: user.memberId }
  })

  app.put('/:id', { preValidation: [validateParams(userIdParamsSchema), validateBody(updateUserSchema)] }, async (request, reply) => {
    const { id } = (request as any).validatedParams as { id: string }
    const { email, password, role, memberId } = (request as any).validatedBody as {
      email?: string
      password?: string
      role?: 'ADMIN' | 'MEMBER'
      memberId?: string | null
    }

    const data: any = {}
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== id) {
        return reply.code(409).send({ error: { code: 'USER_EXISTS', message: 'Email already exists' } })
      }
      data.email = email
    }
    if (password) {
      const passwordCheck = validatePassword(password)
      if (!passwordCheck.valid) {
        return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
      }
      data.password = await bcrypt.hash(password, 10)
    }
    if (role) data.role = role
    if (memberId !== undefined) data.memberId = memberId || null

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { member: { select: { id: true, displayName: true } } }
    })

    return { id: user.id, email: user.email, role: user.role, memberId: user.memberId, member: user.member }
  })

  app.delete('/:id', { preValidation: validateParams(userIdParamsSchema) }, async (request, reply) => {
    const { id } = (request as any).validatedParams as { id: string }
    // Prevent deleting self
    if (request.user.id === id) {
      return reply.code(400).send({ error: { code: 'FORBIDDEN', message: 'Cannot delete yourself' } })
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return reply.code(400).send({ error: { code: 'FORBIDDEN', message: 'Cannot delete the last admin' } })
      }
    }

    await prisma.user.delete({ where: { id } })
    return { success: true }
  })

  app.post('/:id/reset-password', {
    preValidation: [validateParams(userIdParamsSchema), validateBody(resetPasswordSchema)]
  }, async (request, reply) => {
    const { id } = (request as any).validatedParams as { id: string }
    const { password } = (request as any).validatedBody as { password: string }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })

    return { message: 'Password reset successfully' }
  })
}
