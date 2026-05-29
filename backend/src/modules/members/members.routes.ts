import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { saveAvatarFile } from '../../lib/storage.js'

export const membersRoutes: FastifyPluginAsync = async (app) => {
  // GET /members
  app.get('/members', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { team } = request.query as { team?: 'RED' | 'BLUE' }
    
    const members = await prisma.member.findMany({
      where: {
        ...(team && { team })
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
  app.post('/members', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const { displayName, team } = request.body as { 
      displayName?: string
      team?: 'RED' | 'BLUE'
    }
    
    if (!displayName) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'displayName is required' } })
    }
    
    try {
      const member = await prisma.member.create({
        data: {
          displayName,
          team
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
      return reply.code(500).send({ error: e.message })
    }
  })

  // PUT /members/:id
  app.put('/members/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { displayName, team, isCaptain, avatarUrl, familyId } = request.body as any
    const user = request.user

    const data: any = {}
    
    if (user.role === 'ADMIN') {
      if (displayName !== undefined) data.displayName = displayName
      if (team !== undefined) data.team = team || null
      if (isCaptain !== undefined) data.isCaptain = isCaptain
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null
      if (familyId !== undefined) data.familyId = familyId || null
    } else {
      if (user.memberId !== id) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only edit your own profile' } })
      }
      if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null
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

    const { avatarUrl } = await saveAvatarFile(file, id)

    const member = await prisma.member.update({
      where: { id },
      data: { avatarUrl }
    })

    return member
  })
}
