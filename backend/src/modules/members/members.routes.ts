import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { saveAvatarFile } from '../../lib/storage.js'
import { validateBody, validateQuery, z } from '../../lib/validate.js'

const memberQuerySchema = z.object({
  team: z.enum(['RED', 'BLUE']).optional(),
  familyId: z.string().optional()
})

const createMemberSchema = z.object({
  displayName: z.string().min(1).max(100),
  team: z.enum(['RED', 'BLUE']).optional(),
  familyId: z.string().optional()
})

const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  team: z.enum(['RED', 'BLUE']).optional().nullable(),
  familyId: z.string().optional().nullable(),
  isCaptain: z.boolean().optional()
})

export const membersRoutes: FastifyPluginAsync = async (app) => {
  // GET /members
  app.get('/members', { preValidation: [app.authenticate, validateQuery(memberQuerySchema)] }, async (request, reply) => {
    const { team, familyId } = (request as any).validatedQuery as { team?: 'RED' | 'BLUE'; familyId?: string }
    
    const members = await prisma.member.findMany({
      where: {
        ...(team && { team }),
        ...(familyId && { familyId })
      },
      select: {
        id: true,
        displayName: true,
        team: true,
        familyId: true,
        avatarUrl: true,
        isCaptain: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    return members
  })

  // POST /members (ADMIN)
  app.post('/members', { preValidation: [app.requireAdmin, validateBody(createMemberSchema)] }, async (request, reply) => {
    const { displayName, team, familyId } = (request as any).validatedBody as {
      displayName: string
      team?: 'RED' | 'BLUE'
      familyId?: string
    }

    try {
      const member = await prisma.member.create({
        data: {
          displayName,
          team,
          familyId: familyId || null
        }
      })
      return reply.code(201).send(member)
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create member' } })
    }
  })

  // GET /members/:id
  app.get('/members/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    console.log('GET /members/:id received id:', id)
    
    try {
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              mediaTags: true,
              works: true,
              matchRelations: true
            }
          }
        }
      })
      
      if (!member) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found' } })
      }
      
      return {
        ...member,
        mediaCount: member._count.mediaTags,
        worksCount: member._count.works,
        matchesCount: member._count.matchRelations
      }
    } catch (e: any) {
      console.error('Error fetching member:', e)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch member' } })
    }
  })

  // PUT /members/:id
  app.put('/members/:id', { preValidation: [app.authenticate, validateBody(updateMemberSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { displayName, team, familyId, isCaptain } = (request as any).validatedBody
    const user = request.user

    const data: any = {}

    if (user.role === 'ADMIN') {
      if (displayName !== undefined) data.displayName = displayName
      if (team !== undefined) data.team = team || null
      if (familyId !== undefined) data.familyId = familyId || null
      if (isCaptain !== undefined) data.isCaptain = isCaptain
    } else {
      if (user.memberId !== id) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only edit your own profile' } })
      }
      if (displayName !== undefined) data.displayName = displayName
    }

    if (Object.keys(data).length === 0) {
      return { success: true }
    }

    const member = await prisma.member.update({
      where: { id },
      data
    })

    return member
  })

  // POST /members/:id/avatar
  app.post('/members/:id/avatar', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user

    if (user.role !== 'ADMIN' && user.memberId !== id) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only edit your own avatar' } })
    }

    const file = await request.file()
    if (!file) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    }

    let avatarUrl: string
    try {
      const result = await saveAvatarFile(file, id)
      avatarUrl = result.avatarUrl
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'INVALID_AVATAR', message: err.message || 'Failed to process avatar' } })
    }

    const member = await prisma.member.update({
      where: { id },
      data: { avatarUrl }
    })

    return member
  })
}
