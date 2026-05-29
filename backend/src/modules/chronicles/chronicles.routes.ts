import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const chroniclesRoutes: FastifyPluginAsync = async (app) => {
  // GET /chronicles/daily-materials
  app.get('/daily-materials', async (request, reply) => {
    const { date } = request.query as { date?: string }
    if (!date) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Date is required' } })
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`)
    const endOfDay = new Date(`${date}T23:59:59.999Z`)

    // Query media assets
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        OR: [
          { takenAt: { gte: startOfDay, lte: endOfDay } },
          { createdAt: { gte: startOfDay, lte: endOfDay } }
        ]
      },
      select: { id: true, type: true, createdAt: true, originalFilename: true }
    })

    // Query works
    const works = await prisma.work.findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { id: true, title: true, type: true, createdAt: true }
    })

    // Query matches
    const matches = await prisma.match.findMany({
      where: { playedAt: { gte: startOfDay, lte: endOfDay } },
      select: { 
        id: true, 
        playedAt: true, 
        redScore: true, 
        blueScore: true,
        mvpMemberId: true,
        mvpMember: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    })

    return { mediaAssets, works, matches }
  })

  app.post('/chronicles', { preValidation: [app.authenticate] }, async (request, reply) => {
    const body = request.body as {
      title: string
      description?: string
      happenedAt: string
      mediaId?: string
      memberIds?: string[]
      mediaAssetIds?: string[]
      workIds?: string[]
      matchIds?: string[]
    }

    if (!body.title || !body.happenedAt) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Title and happenedAt are required' } })
    }

    const happenedAtDate = new Date(body.happenedAt)
    const year = happenedAtDate.getFullYear()

    const user = request.user

    const chronicle = await prisma.chronicleEvent.create({
      data: {
        title: body.title,
        description: body.description || null,
        happenedAt: happenedAtDate,
        year,
        mediaId: body.mediaId || null,
        createdByUserId: user.id,
        members: body.memberIds?.length ? { connect: body.memberIds.map(id => ({ id })) } : undefined,
        mediaAssets: body.mediaAssetIds?.length ? { connect: body.mediaAssetIds.map(id => ({ id })) } : undefined,
        works: body.workIds?.length ? { connect: body.workIds.map(id => ({ id })) } : undefined,
        matches: body.matchIds?.length ? { connect: body.matchIds.map(id => ({ id })) } : undefined,
      }
    })

    return reply.code(201).send(chronicle)
  })

  app.get('/chronicles', async (request, reply) => {
    const query = request.query as { year?: string; memberId?: string }
    const where: any = {}

    if (query.year) {
      where.year = parseInt(query.year, 10)
    }
    if (query.memberId) {
      where.members = { some: { id: query.memberId } }
    }

    const chronicles = await prisma.chronicleEvent.findMany({
      where,
      orderBy: { happenedAt: 'desc' },
      select: {
        id: true,
        year: true,
        happenedAt: true,
        title: true,
        description: true,
        primaryMedia: {
          select: {
            id: true,
            type: true,
            takenAt: true,
            year: true
          }
        },
        members: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            team: true
          }
        },
        mediaAssets: {
          select: {
            id: true,
            type: true,
            takenAt: true,
            year: true
          }
        },
        works: {
          select: {
            id: true,
            type: true,
            title: true,
            authorMemberId: true,
            authorMember: {
              select: {
                displayName: true
              }
            },
            year: true,
            date: true,
            createdAt: true
          }
        },
        matches: {
          select: {
            id: true,
            playedAt: true,
            redScore: true,
            blueScore: true,
            mvpMemberId: true,
            mvpMember: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    return chronicles
  })

  // DELETE /chronicles/:id
  app.delete('/chronicles/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string; memberId?: string }

    const chronicle = await prisma.chronicleEvent.findUnique({
      where: { id },
      include: {
        members: true
      }
    })

    if (!chronicle) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Chronicle event not found' } })
    }

    const isAdmin = user.role === 'ADMIN'
    const isUploader = chronicle.createdByUserId === user.id
    const isExclusivelyTagged = chronicle.members.length === 1 && chronicle.members[0].id === user.memberId

    if (!isAdmin && !isUploader && !isExclusivelyTagged) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions to delete chronicle event' } })
    }

    try {
      await prisma.chronicleEvent.delete({ where: { id } })
      return { success: true }
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete chronicle event' } })
    }
  })
}
