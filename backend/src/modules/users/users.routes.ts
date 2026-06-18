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

const batchCreateUsersSchema = z.object({
  users: z.array(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['ADMIN', 'MEMBER']).optional(),
      memberName: z.string().optional(),
      team: z.string().optional(),
      familyName: z.string().optional()
    })
  ).min(1).max(200)
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

  app.post('/batch', { preValidation: validateBody(batchCreateUsersSchema) }, async (request, reply) => {
    const { users } = (request as any).validatedBody as {
      users: Array<{
        email: string
        password: string
        role?: 'ADMIN' | 'MEMBER'
        memberName?: string
        team?: string
        familyName?: string
      }>
    }

    const summary = await prisma.$transaction(async (tx) => {
      const existingMembers = await tx.member.findMany({
        include: { family: { select: { label: true } } }
      })
      const memberMap = new Map<string, any>(existingMembers.map((m) => [m.displayName, m]))
      const existingFamilies = await tx.family.findMany()
      const familyMap = new Map<string, any>(existingFamilies.map((f) => [f.label, f]))

      const result = {
        total: users.length,
        created: 0,
        createdMembers: 0,
        createdFamilies: 0,
        failed: [] as Array<{ row: number; email: string; reason: string }>
      }

      for (const [index, row] of users.entries()) {
        try {
          const passwordCheck = validatePassword(row.password)
          if (!passwordCheck.valid) {
            throw new Error(passwordCheck.message)
          }

          const existingUser = await tx.user.findUnique({ where: { email: row.email } })
          if (existingUser) {
            throw new Error('Email already exists')
          }

          let memberId: string | null = null
          const memberName = row.memberName?.trim()
          if (memberName) {
            let member = memberMap.get(memberName)
            if (!member) {
              const familyName = row.familyName?.trim()
              let familyId: string | null = null
              if (familyName) {
                let family = familyMap.get(familyName)
                if (!family) {
                  family = await tx.family.create({ data: { label: familyName } })
                  familyMap.set(familyName, family)
                  result.createdFamilies++
                }
                familyId = family.id
              }

              const rawTeam = row.team?.trim().toUpperCase()
              const team = rawTeam === 'RED' || rawTeam === 'BLUE' ? rawTeam : null

              member = await tx.member.create({
                data: { displayName: memberName, familyId, team }
              })
              memberMap.set(memberName, member)
              result.createdMembers++
            }
            memberId = member.id
          }

          const hashedPassword = await bcrypt.hash(row.password, 10)
          await tx.user.create({
            data: {
              email: row.email,
              password: hashedPassword,
              role: row.role || 'MEMBER',
              memberId
            }
          })

          result.created++
        } catch (err: any) {
          result.failed.push({ row: index + 1, email: row.email, reason: err.message })
        }
      }

      return result
    })

    return reply.code(200).send({ success: summary.failed.length === 0, summary })
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
