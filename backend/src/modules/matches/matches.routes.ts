import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const matchesRoutes: FastifyPluginAsync = async (app) => {
  // GET /matches
  app.get('/matches', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { year, memberId } = request.query as { year?: string, memberId?: string }

    let whereClause: any = {}
    if (year) {
      const yearInt = parseInt(year, 10)
      if (!isNaN(yearInt)) {
        whereClause.playedAt = {
          gte: new Date(`${yearInt}-01-01T00:00:00.000Z`),
          lt: new Date(`${yearInt + 1}-01-01T00:00:00.000Z`)
        }
      }
    }

    if (memberId) {
      whereClause.participants = {
        some: { memberId }
      }
    }

    const matches = await prisma.match.findMany({
      where: whereClause,
      select: {
        id: true,
        playedAt: true,
        redScore: true,
        blueScore: true,
        mvpMemberId: true,
        createdByUserId: true
      },
      orderBy: { playedAt: 'desc' }
    })
    
    return matches
  })

  // POST /matches (MEMBER+)
  app.post('/matches', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { playedAt, redScore, blueScore, mvpMemberId, participantIds } = request.body as {
      playedAt?: string
      redScore?: number
      blueScore?: number
      mvpMemberId?: string
      participantIds?: { memberId: string, side: 'RED' | 'BLUE' }[]
    }
    
    if (!playedAt || typeof redScore !== 'number' || typeof blueScore !== 'number') {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'playedAt, redScore, and blueScore are required' } })
    }
    
    try {
      const match = await prisma.match.create({
        data: {
          playedAt: new Date(playedAt),
          redScore,
          blueScore,
          mvpMemberId,
          createdByUserId: request.user.id,
          participants: {
            create: participantIds?.map(p => ({
              memberId: p.memberId,
              side: p.side
            })) || []
          }
        },
        select: { id: true }
      })
      
      return reply.code(201).send(match)
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create match' } })
    }
  })

  // GET /matches/:id
  app.get('/matches/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            member: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        },
        mvpMember: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    })
    
    if (!match) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Match not found' } })
    }
    
    return match
  })

  // PUT /matches/:id
  app.put('/matches/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string; memberId?: string }

    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Match not found' } })
    }

    const isAdmin = user.role === 'ADMIN'
    const isUploader = match.createdByUserId === user.id

    if (!isAdmin && !isUploader) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions to update match' } })
    }

    const { playedAt, redScore, blueScore, mvpMemberId, notes, participantIds } = request.body as {
      playedAt?: string
      redScore?: number
      blueScore?: number
      mvpMemberId?: string
      notes?: string
      participantIds?: { memberId: string; side: 'RED' | 'BLUE' }[]
    }

    const data: any = {}
    if (playedAt !== undefined) data.playedAt = new Date(playedAt)
    if (redScore !== undefined) data.redScore = redScore
    if (blueScore !== undefined) data.blueScore = blueScore
    if (mvpMemberId !== undefined) data.mvpMemberId = mvpMemberId || null
    if (notes !== undefined) data.notes = notes

    try {
      // If participants are provided, replace them
      if (participantIds) {
        await prisma.matchParticipant.deleteMany({ where: { matchId: id } })
        data.participants = {
          create: participantIds.map(p => ({
            memberId: p.memberId,
            side: p.side
          }))
        }
      }

      const updated = await prisma.match.update({
        where: { id },
        data,
        include: {
          participants: {
            include: {
              member: { select: { id: true, displayName: true } }
            }
          },
          mvpMember: { select: { id: true, displayName: true } }
        }
      })
      return updated
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update match' } })
    }
  })

  // DELETE /matches/:id
  app.delete('/matches/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string; memberId?: string }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        participants: true
      }
    })

    if (!match) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Match not found' } })
    }

    const isAdmin = user.role === 'ADMIN'
    const isUploader = match.createdByUserId === user.id
    const isExclusivelyTagged = match.participants.length === 1 && match.participants[0].memberId === user.memberId

    if (!isAdmin && !isUploader && !isExclusivelyTagged) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions to delete match' } })
    }

    try {
      await prisma.match.delete({ where: { id } })
      return { success: true }
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete match' } })
    }
  })
}
