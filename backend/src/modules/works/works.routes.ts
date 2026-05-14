import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export const worksRoutes: FastifyPluginAsync = async (app) => {
  // GET /works
  app.get('/works', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { type, authorId, q, year } = request.query as {
      type?: 'ARTICLE' | 'POEM'
      authorId?: string
      q?: string
      year?: string
    }
    
    let whereClause: any = {}
    
    if (type) whereClause.type = type
    if (authorId) whereClause.authorMemberId = authorId
    if (year) {
      const yearInt = parseInt(year, 10)
      if (!isNaN(yearInt)) {
        whereClause.year = yearInt
      }
    }
    if (q) {
      whereClause.OR = [
        { title: { contains: q } },
        { content: { contains: q } }
      ]
    }
    
    const works = await prisma.work.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        title: true,
        authorMemberId: true,
        year: true,
        date: true,
        createdAt: true,
        authorMember: {
          select: {
            displayName: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    
    return works
  })

  // POST /works (MEMBER+)
  app.post('/works', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { type, title, content, authorId, year, date } = request.body as {
      type?: 'ARTICLE' | 'POEM'
      title?: string
      content?: string
      authorId?: string
      year?: number
      date?: string
    }
    
    if (!type || !title || !content) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'type, title, and content are required' } })
    }
    
    try {
      const work = await prisma.work.create({
        data: {
          type,
          title,
          content,
          authorMemberId: authorId,
          year: year || (date ? new Date(date).getFullYear() : null),
          date: date ? new Date(date) : null,
          createdByUserId: request.user.id
        },
        select: { id: true }
      })
      
      return reply.code(201).send(work)
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create work' } })
    }
  })

  // GET /works/:id
  app.get('/works/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        authorMember: { select: { id: true, displayName: true } }
      }
    })
    if (!work) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Work not found' } })
    return work
  })

  // DELETE /works/:id
  app.delete('/works/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string; memberId?: string }

    const work = await prisma.work.findUnique({
      where: { id }
    })

    if (!work) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Work not found' } })
    }

    const isAdmin = user.role === 'ADMIN'
    const isUploader = work.createdByUserId === user.id
    const isExclusivelyTagged = work.authorMemberId && work.authorMemberId === user.memberId

    if (!isAdmin && !isUploader && !isExclusivelyTagged) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions to delete work' } })
    }

    try {
      await prisma.work.delete({ where: { id } })
      return { success: true }
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete work' } })
    }
  })
}
