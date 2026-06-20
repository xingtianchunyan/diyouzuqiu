import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { validateBody, validateParams, z } from '../../lib/validate.js'
import { validatePassword } from '../../lib/password.js'
import { sanitizeCsvCell } from '../../lib/csv-sanitize.js'
import { parseExcelToRows } from '../../lib/documentParser.js'

function generateTemporaryPassword(length = 12): string {
  // Guarantee at least one uppercase, one lowercase and one digit.
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const all = upper + lower + digits

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)]

  let password = pick(upper) + pick(lower) + pick(digits)
  for (let i = 3; i < length; i++) {
    password += pick(all)
  }

  // Shuffle to avoid predictable positions.
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

const userIdParamsSchema = z.object({
  id: z.string().min(1)
})

const PHONE_REGEX = /^1[3-9]\d{9}$/

function phoneSchema() {
  return z.string().regex(PHONE_REGEX, 'Invalid phone number').optional().nullable()
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: phoneSchema(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
  memberId: z.string().optional().nullable()
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: phoneSchema(),
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
      password: z.string().max(128),
      role: z.enum(['MEMBER']).optional(),
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
      phone: u.phone,
      role: u.role,
      memberId: u.memberId,
      member: u.member
    }))
  })

  app.post('/', { preValidation: validateBody(createUserSchema) }, async (request, reply) => {
    const { email, password, phone, role, memberId } = (request as any).validatedBody as {
      email: string
      password: string
      phone?: string | null
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

    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } })
      if (existingPhone) {
        return reply.code(409).send({ error: { code: 'PHONE_EXISTS', message: 'Phone number already exists' } })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        password: hashedPassword,
        role: role || 'MEMBER',
        memberId: memberId || null
      }
    })

    return { id: user.id, email: user.email, phone: user.phone, role: user.role, memberId: user.memberId }
  })

  app.post('/batch', {
    preValidation: validateBody(batchCreateUsersSchema)
  }, async (request, reply) => {
    const { users } = (request as any).validatedBody as {
      users: Array<{
        email: string
        password: string
        role?: 'MEMBER'
        memberName?: string
        team?: string
        familyName?: string
      }>
    }

    const { summary, generatedPasswords } = await prisma.$transaction(async (tx) => {
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
      const generatedPasswords: Array<{ email: string; password: string }> = []

      for (const [index, row] of users.entries()) {
        try {
          // Sanitize user-visible text fields to prevent CSV/Excel formula injection
          row.memberName = sanitizeCsvCell(row.memberName) as string | undefined
          row.familyName = sanitizeCsvCell(row.familyName) as string | undefined

          let plainPassword = row.password.trim()
          let generated = false
          if (!plainPassword) {
            plainPassword = generateTemporaryPassword()
            generated = true
          }

          const passwordCheck = validatePassword(plainPassword)
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

          const hashedPassword = await bcrypt.hash(plainPassword, 10)
          await tx.user.create({
            data: {
              email: row.email,
              password: hashedPassword,
              role: row.role || 'MEMBER',
              memberId
            }
          })

          result.created++
          if (generated) {
            generatedPasswords.push({ email: row.email, password: plainPassword })
          }
        } catch (err: any) {
          result.failed.push({ row: index + 1, email: row.email, reason: err.message })
        }
      }

      return { summary: result, generatedPasswords }
    })

    return reply.code(200).send({ success: summary.failed.length === 0, summary, generatedPasswords })
  })

  app.post('/parse-excel', async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Multipart file upload required' } })
    }

    const data = await request.file()
    if (!data?.filename) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    }

    const filename = data.filename.toLowerCase()
    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      return reply.code(400).send({ error: { code: 'INVALID_FILE_TYPE', message: 'Only .xlsx and .xls files are supported' } })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length === 0) {
      return reply.code(400).send({ error: { code: 'EMPTY_FILE', message: 'Uploaded file is empty' } })
    }

    try {
      const rows = await parseExcelToRows(buffer)
      return { rows }
    } catch (err: any) {
      request.log.error(err)
      return reply.code(400).send({ error: { code: 'PARSE_ERROR', message: err?.message || 'Failed to parse Excel file' } })
    }
  })

  app.put('/:id', { preValidation: [validateParams(userIdParamsSchema), validateBody(updateUserSchema)] }, async (request, reply) => {
    const { id } = (request as any).validatedParams as { id: string }
    const { email, password, phone, role, memberId } = (request as any).validatedBody as {
      email?: string
      password?: string
      phone?: string | null
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
    if (phone !== undefined) {
      if (phone) {
        const existing = await prisma.user.findUnique({ where: { phone } })
        if (existing && existing.id !== id) {
          return reply.code(409).send({ error: { code: 'PHONE_EXISTS', message: 'Phone number already exists' } })
        }
      }
      data.phone = phone || null
    }
    if (password) {
      const passwordCheck = validatePassword(password)
      if (!passwordCheck.valid) {
        return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
      }
      data.password = await bcrypt.hash(password, 10)
      data.tokenVersion = { increment: 1 }
    }
    if (role) data.role = role
    if (memberId !== undefined) data.memberId = memberId || null

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { member: { select: { id: true, displayName: true } } }
    })

    return { id: user.id, email: user.email, phone: user.phone, role: user.role, memberId: user.memberId, member: user.member }
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
      data: { password: hashedPassword, tokenVersion: { increment: 1 } }
    })

    return { message: 'Password reset successfully' }
  })
}
