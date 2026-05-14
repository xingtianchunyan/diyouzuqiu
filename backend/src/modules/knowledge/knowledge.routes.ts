import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import crypto from 'crypto'

function splitIntoChunks(text: string, maxChars: number, maxChunks: number): string[] {
  const normalized = (text || '').replace(/\r\n/g, '\n')
  const parts = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const part of parts) {
    const next = current ? `${current}\n\n${part}` : part
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) chunks.push(current)
    if (chunks.length >= maxChunks) return chunks
    if (part.length > maxChars) {
      for (let i = 0; i < part.length; i += maxChars) {
        chunks.push(part.slice(i, i + maxChars))
        if (chunks.length >= maxChunks) return chunks
      }
      current = ''
    } else {
      current = part
    }
  }

  if (current) chunks.push(current)
  return chunks.slice(0, maxChunks)
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  // GET /knowledge
  // Query: q?=string, category?=string, plannerProjectId?=string
  app.get('/knowledge', async (request, reply) => {
    const { q, category, plannerProjectId } = request.query as { q?: string; category?: string; plannerProjectId?: string }

    const where: any = {}
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } }
      ]
    }
    if (category) {
      where.category = category
    }
    if (plannerProjectId) {
      where.plannerProjectId = plannerProjectId
    }

    const docs = await prisma.knowledgeDoc.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return docs
  })

  // POST /knowledge
  // Body: { title: string, content: string, category?: string, plannerProjectId?: string }
  // Requires: MEMBER+ (authenticated)
  app.post('/knowledge', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { title, content, category, plannerProjectId } = request.body as { title: string; content: string; category?: string; plannerProjectId?: string }

    if (!title || !content) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Title and content are required' } })
    }

    const doc = await prisma.knowledgeDoc.create({
      data: {
        title,
        content,
        category: category || 'GENERAL',
        plannerProjectId,
        createdByUserId: request.user.id
      }
    })

    if ((category || 'GENERAL') !== 'GENERAL') {
      const chunks = splitIntoChunks(content, 800, 60)
      const data = chunks.map((c, idx) => ({
        knowledgeDocId: doc.id,
        chunkIndex: idx,
        content: c,
        contentHash: sha256(c)
      }))
      if (data.length > 0) {
        const hashes = data.map(d => d.contentHash)
        const existing = await prisma.knowledgeChunk.findMany({
          where: { contentHash: { in: hashes } },
          select: { contentHash: true }
        })
        const existingSet = new Set(existing.map(e => e.contentHash))
        const toCreate = data.filter(d => !existingSet.has(d.contentHash))
        if (toCreate.length > 0) {
          await prisma.knowledgeChunk.createMany({ data: toCreate })
        }
      }
    }

    return reply.code(201).send({ id: doc.id })
  })
}
