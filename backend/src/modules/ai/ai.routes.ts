import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { callQwenChat, type ChatMessage } from '../../lib/ai/qwen.client.js'
import { retrieveContext, type ContextItem } from '../../lib/ai/rag.service.js'
import { extractJsonObjectFromText, JsonExtractionError, validateAnnualPlan } from '../../lib/ai/json.js'
import { validateBody, z } from '../../lib/validate.js'

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(5000)
})

const aiChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  context: z.enum(['planner', 'knowledge']),
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

const aiGenerateSchema = z.object({
  context: z.enum(['planner', 'knowledge']),
  docIds: z.array(z.string().min(1)).max(20).optional(),
  constraints: plannerConstraintsSchema.optional(),
  plannerProjectId: z.string().optional()
})

function extractQueryWords(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(w => w.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
}

function looksLikePlanRequest(content: string): boolean {
  const lower = content.toLowerCase()
  const keywords = ['生成方案', '策划', '计划', '生成活动策划', '出方案', 'plan', 'proposal']
  return keywords.some(k => lower.includes(k))
}

function buildCitations(docs: ContextItem[]) {
  return docs.map((d, i) => ({
    docId: `doc-${i}`,
    title: d.title,
    snippets: [d.content.substring(0, 300)]
  }))
}

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ai/chat', {
    preValidation: [app.authenticate, validateBody(aiChatSchema)],
    config: {
      rateLimit: { max: 20, timeWindow: '1 minute' }
    }
  }, async (request, reply) => {
    const { messages, context, plannerProjectId } = (request as any).validatedBody as {
      messages: ChatMessage[]
      context: 'planner' | 'knowledge'
      plannerProjectId?: string
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    const words = extractQueryWords(lastUserMessage)

    if (context === 'planner') {
      const docs = await retrieveContext({
        queryWords: words,
        knowledgeCategories: ['PLANNER_FILE', 'PLANNER_CHAT'],
        plannerProjectId,
        limit: 5
      })

      const scopeKey = `${request.user.id}:${plannerProjectId || 'default'}`
      const memory = await prisma.plannerChatMemory.findUnique({ where: { scopeKey } })

      const systemPrompt = `你是一个专业的年会活动策划 AI 助手。你需要通过对话与用户沟通，收集举办年会所需的关键信息（人数、预算、日期、地点、风格等）。
如果信息不足，请以对话形式自然地询问用户。
当你认为已经收集到足够的信息，且用户明确要求“生成方案”或“出具方案”时，你必须输出一个严格的 JSON 对象（不要包含任何其他说明文字，也不要使用 markdown 语法块包装），格式如下：
{
  "plan": "这里是用 Markdown 编写的详细策划案...",
  "budget": "这里是用 Markdown 编写的预算明细表...",
  "prizes": "这里是用 Markdown 编写的奖品采购清单...",
  "speech": "这里是用 Markdown 编写的各环节主持词..."
}
如果你还在收集信息阶段，或者用户只是在提问，请输出普通 Markdown 文本进行回复。
已知的长期记忆摘要（如存在则优先参考，不要重复追问同类信息）：
${memory?.summary ? memory.summary.slice(0, 1200) : '(无)'}
参考的本地知识库（过往策划、表格等，请在合适时提及或利用）：
${docs.map((d: any) => `[引用文档 ${d.title}]\n${d.content.substring(0, 1000)}`).join('\n\n')}`

      const recentFacts = messages
        .filter(m => m.role === 'user')
        .slice(-6)
        .map(m => m.content.trim())
        .filter(Boolean)
        .join('\n')
        .slice(0, 1200)

      await prisma.plannerChatMemory.upsert({
        where: { scopeKey },
        update: {
          summary: recentFacts,
          plannerProjectId,
          createdByUserId: request.user.id
        },
        create: {
          scopeKey,
          summary: recentFacts,
          plannerProjectId,
          createdByUserId: request.user.id
        }
      })

      const response = await callQwenChat(
        [{ role: 'system', content: systemPrompt }, ...messages],
        { enableSearch: true }
      )
      return { response }
    }

    // context === 'knowledge'
    const docs = await retrieveContext({
      queryWords: words,
      sources: ['knowledge'],
      plannerProjectId,
      limit: 5
    })
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
  })

  app.post('/ai/generate', {
    preValidation: [app.authenticate, validateBody(aiGenerateSchema)],
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' }
    }
  }, async (request, reply) => {
    const { context, docIds, constraints, plannerProjectId } = (request as any).validatedBody as {
      context: 'planner' | 'knowledge'
      docIds?: string[]
      constraints?: any
      plannerProjectId?: string
    }

    let referenceDocs: ContextItem[] = []

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

      referenceDocs = await retrieveContext({
        queryWords: keywords,
        sources: context === 'planner' ? undefined : ['knowledge'],
        knowledgeCategories: context === 'planner' ? ['PLANNER_FILE', 'PLANNER_CHAT'] : undefined,
        plannerProjectId,
        limit: 5
      })
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

    try {
      const qwenResponse = await callQwenChat(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { json: true, enableSearch: true, temperature: 0, maxTokens: 2600 }
      )
      const plan = validateAnnualPlan(extractJsonObjectFromText(qwenResponse))
      return { plan, citations: buildCitations(referenceDocs) }
    } catch (error: any) {
      if (error instanceof JsonExtractionError) {
        return reply.code(500).send({ error: { code: error.code, message: error.message } })
      }
      request.log.error(error)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate plan' } })
    }
  })
}

// Reuse chunking helpers from the knowledge module
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
