import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import crypto from 'crypto'
import { validateBody, validateQuery, z } from '../../lib/validate.js'
import { parseDocument } from '../../lib/documentParser.js'
import { callQwenChat, type ChatMessage } from '../planner/qwen.client.js'
import { extractJsonObjectFromText, JsonExtractionError, validateAnnualPlan } from '../../lib/ai/json.js'

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

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(5000)
})

const knowledgeChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  plannerProjectId: z.string().optional()
})

const plannerConstraintsSchema = z.object({
  peopleCount: z.number().int().min(1).max(100_000).optional(),
  budget: z.number().int().min(0).max(1_000_000_000).optional(),
  date: z.string().max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  durationHours: z.number().int().min(1).max(168).optional(),
  style: z.string().max(200).optional(),
  mustHave: z.array(z.string().max(200)).max(50).optional(),
  avoid: z.array(z.string().max(200)).max(50).optional(),
  notes: z.string().max(2000).optional()
})

const generatePlanSchema = z.object({
  docIds: z.array(z.string().min(1)).max(20).optional(),
  constraints: plannerConstraintsSchema.optional()
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

async function searchKnowledgeChunks(queryWords: string[], plannerProjectId?: string, limit: number = 5) {
  if (queryWords.length === 0) {
    const fallback = await prisma.knowledgeChunk.findMany({
      where: {
        knowledgeDoc: {
          ...(plannerProjectId ? { plannerProjectId } : {})
        }
      },
      include: {
        knowledgeDoc: { select: { title: true, category: true } }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
    return fallback.map((c: any) => ({
      title: `[${c.knowledgeDoc.category}] ${c.knowledgeDoc.title}`,
      content: c.content
    }))
  }

  const knowledgeChunkOR = queryWords.map((w: string) => ({ content: { contains: w } }))
  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      OR: knowledgeChunkOR,
      knowledgeDoc: {
        ...(plannerProjectId ? { plannerProjectId } : {})
      }
    },
    include: {
      knowledgeDoc: { select: { title: true, category: true } }
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return chunks.map((c: any) => ({
    title: `[${c.knowledgeDoc.category}] ${c.knowledgeDoc.title}`,
    content: c.content
  }))
}

function looksLikePlanRequest(content: string): boolean {
  const lower = content.toLowerCase()
  const keywords = ['生成方案', '策划', '计划', '生成活动策划', '出方案', 'plan', 'proposal']
  return keywords.some(k => lower.includes(k))
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

  // POST /knowledge/chat
  // Body: { messages: ChatMessage[], plannerProjectId?: string }
  app.post('/knowledge/chat', {
    preValidation: [app.authenticate, validateBody(knowledgeChatSchema)],
    config: {
      rateLimit: { max: 20, timeWindow: '1 minute' }
    }
  }, async (request, reply) => {
    const { messages, plannerProjectId } = (request as any).validatedBody as { messages: ChatMessage[]; plannerProjectId?: string }
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''

    const words = lastUserMessage
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .filter(w => w.length >= 2)
      .sort((a, b) => b.length - a.length)
      .slice(0, 5)

    const docs = await searchKnowledgeChunks(words, plannerProjectId, 5)
    const isPlanRequest = looksLikePlanRequest(lastUserMessage)

    const systemPrompt = `你是一个专业的活动策划与档案管理专家。请基于下面的本地知识库内容回答用户问题。
如果用户要求生成活动策划方案，请输出一个严格的 JSON 对象（不要包含 markdown 代码块），结构为：
{
  "plan": "用 Markdown 编写的详细策划案",
  "budget": "用 Markdown 编写的预算明细表",
  "prizes": "用 Markdown 编写的奖品清单",
  "speech": "用 Markdown 编写的各环节主持词"
}
如果用户只是普通提问，请使用自然、专业的 Markdown 文本回复。

参考的本地知识库内容：
${docs.map((d: any) => `[${d.title}]\n${d.content.substring(0, 1000)}`).join('\n\n')}`

    try {
      const response = await callQwenChat(
        [{ role: 'system', content: systemPrompt }, ...messages],
        { json: isPlanRequest, enableSearch: true, maxTokens: isPlanRequest ? 2600 : 1536 }
      )

      // Persist conversation as a knowledge doc
      const title = (lastUserMessage || '知识库对话').slice(0, 30)
      const conversationMarkdown = messages
        .map((m) => `**${m.role === 'user' ? '用户' : '助手'}**：${m.content}`)
        .join('\n\n')

      const doc = await prisma.knowledgeDoc.create({
        data: {
          title,
          content: `${conversationMarkdown}\n\n**助手**：${response}`,
          category: 'PLANNER_CHAT',
          plannerProjectId,
          createdByUserId: request.user.id
        }
      })
      await createKnowledgeChunks(doc.id, doc.content)

      return { response }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to chat with AI' } })
    }
  })

  // POST /knowledge/generate-plan
  // Body: { docIds?: string[], constraints?: PlannerConstraints }
  app.post('/knowledge/generate-plan', {
    preValidation: [app.authenticate, validateBody(generatePlanSchema)],
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' }
    }
  }, async (request, reply) => {
    const { docIds, constraints } = (request as any).validatedBody as { docIds?: string[]; constraints?: any }

    let referenceDocs: { title: string; content: string }[] = []

    if (docIds && docIds.length > 0) {
      const docs = await prisma.knowledgeDoc.findMany({
        where: { id: { in: docIds } },
        select: { title: true, content: true }
      })
      referenceDocs = docs.map((d: any) => ({ title: d.title, content: d.content }))
    } else if (constraints) {
      const keywords = [
        constraints.location,
        constraints.style,
        '年会',
        '流程',
        '预算',
        '主持词',
        '奖项'
      ].filter(Boolean) as string[]
      const chunks = await searchKnowledgeChunks(keywords, undefined, 5)
      referenceDocs = chunks
    } else {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Either docIds or constraints is required' } })
    }

    const systemPrompt = `你是一个专业的活动策划与项目经理。请根据用户提供的参考文档和约束条件，生成一份完整、专业的活动策划方案。
必须严格按照以下 JSON 结构输出，所有字段都使用丰富、专业的 Markdown 格式：
{
  "plan": "详细策划案...",
  "budget": "预算明细表...",
  "prizes": "奖品采购清单...",
  "speech": "各环节主持词..."
}`

    const userPrompt = `参考文档内容：
${referenceDocs.map((d, i) => `[文档${i + 1}: ${d.title}]\n${d.content.substring(0, 3000)}`).join('\n\n')}

${constraints ? `约束条件：
${Object.entries(constraints)
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
  .join('\n')}` : ''}

请直接输出 JSON，不要包含任何额外说明或 markdown 代码块。`

    const citations = referenceDocs.map((d, i) => ({
      docId: `doc-${i}`,
      title: d.title,
      snippets: [d.content.substring(0, 300)]
    }))

    try {
      const qwenResponse = await callQwenChat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { json: true, enableSearch: true, temperature: 0, maxTokens: 2600 }
      )
      const plan = validateAnnualPlan(extractJsonObjectFromText(qwenResponse))
      return { plan, citations }
    } catch (error: any) {
      if (error instanceof JsonExtractionError) {
        return reply.code(500).send({ error: { code: error.code, message: error.message } })
      }
      request.log.error(error)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate plan' } })
    }
  })
}
