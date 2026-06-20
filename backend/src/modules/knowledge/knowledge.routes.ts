import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import crypto from 'crypto'
import { validateBody, validateQuery, z } from '../../lib/validate.js'
import { parseDocument } from '../../lib/documentParser.js'


const KNOWLEDGE_CATEGORY = z.enum(['GENERAL', 'PLANNER_FILE', 'PLANNER_CHAT'])

const knowledgeQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: KNOWLEDGE_CATEGORY.optional(),
  plannerProjectId: z.string().optional()
})

const createKnowledgeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(100_000),
  category: KNOWLEDGE_CATEGORY.optional(),
  plannerProjectId: z.string().optional()
})

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

async function createKnowledgeChunks(docId: string, content: string) {
  const chunks = splitIntoChunks(content, 800, 60)
  const data = chunks.map((c, idx) => ({
    knowledgeDocId: docId,
    chunkIndex: idx,
    content: c,
    contentHash: sha256(c)
  }))
  if (data.length === 0) return

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

export const knowledgeRoutes: FastifyPluginAsync = async (app) => {
  // GET /knowledge
  // Query: q?=string, category?=string, plannerProjectId?=string
  app.get('/knowledge', { preValidation: [app.authenticate, validateQuery(knowledgeQuerySchema)] }, async (request, reply) => {
    const { q, category, plannerProjectId } = (request as any).validatedQuery as { q?: string; category?: string; plannerProjectId?: string }

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
  app.post('/knowledge', { preValidation: [app.authenticate, validateBody(createKnowledgeSchema)] }, async (request, reply) => {
    const { title, content, category, plannerProjectId } = (request as any).validatedBody as { title: string; content: string; category?: string; plannerProjectId?: string }

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
      await createKnowledgeChunks(doc.id, content)
    }

    return reply.code(201).send({ id: doc.id })
  })

  // POST /knowledge/upload
  // Multipart file upload. Supported: .docx, .xlsx, .pdf, .txt
  app.post('/knowledge/upload', {
    preValidation: [app.authenticate],
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Multipart file upload required' } })
    }

    const data = await (request as any).file()
    if (!data?.filename) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    }

    const filename = data.filename.toLowerCase()
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.md']
    if (!allowed.some((ext) => filename.endsWith(ext))) {
      return reply.code(400).send({ error: { code: 'INVALID_FILE_TYPE', message: 'Supported formats: docx, xlsx, pdf, txt' } })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    if (buffer.length === 0) {
      return reply.code(400).send({ error: { code: 'EMPTY_FILE', message: 'Uploaded file is empty' } })
    }

    let parsed: { title: string; content: string }
    try {
      parsed = await parseDocument(buffer, data.filename)
    } catch (err: any) {
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'PARSE_ERROR', message: 'Failed to parse document' } })
    }

    if (!parsed.content || parsed.content.length < 3) {
      return reply.code(400).send({ error: { code: 'EMPTY_CONTENT', message: 'No extractable text found in file' } })
    }

    const doc = await prisma.knowledgeDoc.create({
      data: {
        title: parsed.title.slice(0, 200),
        content: parsed.content.slice(0, 100_000),
        category: 'PLANNER_FILE',
        createdByUserId: request.user.id
      }
    })

    await createKnowledgeChunks(doc.id, parsed.content)

    return reply.code(201).send({ id: doc.id, title: doc.title })
  })

}
