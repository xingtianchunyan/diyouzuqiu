import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'

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

  app.post('/', async (request, reply) => {
    const { email, password, role, memberId } = request.body as any
    if (!email || !password) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return reply.code(400).send({ error: { code: 'USER_EXISTS', message: 'Email already exists' } })
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

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { email, password, role, memberId } = request.body as any

    const data: any = {}
    if (email) data.email = email
    if (password) data.password = await bcrypt.hash(password, 10)
    if (role) data.role = role
    if (memberId !== undefined) data.memberId = memberId || null

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { member: { select: { id: true, displayName: true } } }
    })

    return { id: user.id, email: user.email, role: user.role, memberId: user.memberId, member: user.member }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    // Prevent deleting self
    if (request.user.id === id) {
      return reply.code(400).send({ error: { code: 'FORBIDDEN', message: 'Cannot delete yourself' } })
    }
    await prisma.user.delete({ where: { id } })
    return { success: true }
  })
}
