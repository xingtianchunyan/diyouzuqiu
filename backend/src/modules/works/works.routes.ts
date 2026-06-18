import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { validateBody, validateQuery, z } from '../../lib/validate.js'

const workQuerySchema = z.object({
  type: z.enum(['ARTICLE', 'POEM']).optional(),
  authorId: z.string().optional(),
  q: z.string().optional(),
  year: z.string().optional()
})

const createWorkSchema = z.object({
  type: z.enum(['ARTICLE', 'POEM']),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000),
  authorId: z.string().optional(),
  authorName: z.string().max(200).optional(),
  year: z.number().int().optional(),
  date: z.string().date().optional()
})

const updateWorkSchema = z.object({
  type: z.enum(['ARTICLE', 'POEM']).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(100_000).optional(),
  authorId: z.string().optional(),
  authorName: z.string().max(200).optional(),
  year: z.number().int().optional(),
  date: z.string().date().optional()
})

export const worksRoutes: FastifyPluginAsync = async (app) => {
  // GET /works
  app.get('/works', { preValidation: [app.authenticate, validateQuery(workQuerySchema)] }, async (request, reply) => {
    const { type, authorId, q, year } = (request as any).validatedQuery as {
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
        authorName: true,
        year: true,
        date: true,
        createdAt: true,
        createdByUserId: true,
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
  app.post('/works', { preValidation: [app.authenticate, validateBody(createWorkSchema)] }, async (request, reply) => {
    const { type, title, content, authorId, authorName, year, date } = (request as any).validatedBody as {
      type: 'ARTICLE' | 'POEM'
      title: string
      content: string
      authorId?: string
      authorName?: string
      year?: number
      date?: string
    }

    try {
      const work = await prisma.work.create({
        data: {
          type,
          title,
          content,
          authorMemberId: authorName ? null : authorId,
          authorName: authorName?.trim() || null,
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
  app.get('/works/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
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

  // PUT /works/:id
  app.put('/works/:id', { preValidation: [app.authenticate, validateBody(updateWorkSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string; memberId?: string }

    const work = await prisma.work.findUnique({ where: { id } })
    if (!work) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Work not found' } })
    }

    const isAdmin = user.role === 'ADMIN'
    const isUploader = work.createdByUserId === user.id
    const isExclusivelyTagged = work.authorMemberId && work.authorMemberId === user.memberId

    if (!isAdmin && !isUploader && !isExclusivelyTagged) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions to update work' } })
    }

    const { type, title, content, authorId, authorName, year, date } = (request as any).validatedBody as {
      type?: 'ARTICLE' | 'POEM'
      title?: string
      content?: string
      authorId?: string
      authorName?: string
      year?: number
      date?: string
    }

    const data: any = {}
    if (type !== undefined) data.type = type
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content
    if (authorName !== undefined) {
      data.authorName = authorName?.trim() || null
      data.authorMemberId = null
    } else if (authorId !== undefined) {
      data.authorMemberId = authorId || null
      data.authorName = null
    }
    if (year !== undefined) data.year = year
    if (date !== undefined) data.date = date ? new Date(date) : null

    try {
      const updated = await prisma.work.update({
        where: { id },
        data,
        include: {
          authorMember: { select: { id: true, displayName: true } }
        }
      })
      return updated
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update work' } })
    }
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
