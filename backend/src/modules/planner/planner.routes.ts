import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { callQwenChat, ChatMessage } from './qwen.client.js'
import { extractJsonObjectFromText, JsonExtractionError, validateAnnualPlan } from '../../lib/ai/json.js'
import { validateBody, z } from '../../lib/validate.js'

/**
 * RAG 检索抽象函数
 * 
 * TODO: 接入向量数据库 (Vector DB) 的位置
 * 当前实现为基于 SQLite 的基础关键字 LIKE 匹配。
 * 后续扩展步骤：
 * 1. 引入 Embedding 模型（如 OpenAI text-embedding-3-small 或 Qwen embedding）。
 * 2. 在创建 Work、ChronicleEvent、KnowledgeDoc 时，计算文本的 embedding 并存入 Vector DB（如 Chroma, Milvus, pgvector）。
 * 3. 在此处，将用户的 queryWords 转换为 embedding，并在 Vector DB 中执行 Semantic Search (余弦相似度检索)。
 * 4. 根据相似度阈值（Top-K）返回最相关的文档片段。
 */
async function searchKnowledgeBase(queryWords: string[], plannerProjectId?: string, limit: number = 5) {
  let docs: any[] = []
  
  if (queryWords.length > 0) {
    const worksOR = queryWords.flatMap((w: string) => [
      { title: { contains: w } },
      { content: { contains: w } }
    ])

    const chroniclesOR = queryWords.flatMap((w: string) => [
      { title: { contains: w } },
      { description: { contains: w } }
    ])

    // 并行检索：团队档案 (Works, Chronicles) + 策划知识库 (KnowledgeDoc)
    const knowledgeChunkOR = queryWords.map((w: string) => ({ content: { contains: w } }))
    const [knowledgeChunkRes, worksRes, chroniclesRes] = await Promise.all([
      prisma.knowledgeChunk.findMany({
        where: {
          OR: knowledgeChunkOR,
          knowledgeDoc: {
            category: { in: ['PLANNER_FILE', 'PLANNER_CHAT'] },
            ...(plannerProjectId ? { plannerProjectId } : {})
          }
        },
        include: {
          knowledgeDoc: { select: { title: true, category: true } }
        },
        take: limit
      }),
      prisma.work.findMany({ where: { OR: worksOR }, take: limit }),
      prisma.chronicleEvent.findMany({ where: { OR: chroniclesOR }, take: limit })
    ])

    docs = [
      ...knowledgeChunkRes.map((c: any) => ({
        title: `[${c.knowledgeDoc.category === 'PLANNER_CHAT' ? '对话' : '文件'}] ${c.knowledgeDoc.title}`,
        content: c.content
      })),
      ...worksRes.map((w: any) => ({ title: `[文集] ${w.title}`, content: w.content })),
      ...chroniclesRes.map((c: any) => ({ title: `[大事记] ${c.title}`, content: c.description || '' }))
    ]
  } else {
    // 默认回退：只拉取最近的策划文档
    const knowledgeChunkRes = await prisma.knowledgeChunk.findMany({
      where: {
        knowledgeDoc: {
          category: { in: ['PLANNER_FILE', 'PLANNER_CHAT'] },
          ...(plannerProjectId ? { plannerProjectId } : {})
        }
      },
      include: {
        knowledgeDoc: { select: { title: true, category: true } }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
    docs = knowledgeChunkRes.map((c: any) => ({
      title: `[${c.knowledgeDoc.category === 'PLANNER_CHAT' ? '对话' : '文件'}] ${c.knowledgeDoc.title}`,
      content: c.content
    }))
  }

  // 截取合并
  return docs.slice(0, limit)
}

interface PlannerConstraints {
  peopleCount: number
  budget: number
  date: string
  location: string
  durationHours?: number
  style?: string
  mustHave?: string[]
  avoid?: string[]
  notes?: string
}

const annualPlanSchema = z.object({
  constraints: z.object({
    peopleCount: z.number().int().min(1).max(100_000),
    budget: z.number().int().min(0).max(1_000_000_000),
    date: z.string().max(100),
    location: z.string().min(1).max(200),
    durationHours: z.number().int().min(1).max(168).optional(),
    style: z.string().max(200).optional(),
    mustHave: z.array(z.string().max(200)).max(50).optional(),
    avoid: z.array(z.string().max(200)).max(50).optional(),
    notes: z.string().max(2000).optional()
  })
})

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(5000)
})

const plannerChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  plannerProjectId: z.string().optional()
})

export const plannerRoutes: FastifyPluginAsync = async (app) => {
  app.post('/planner/annual', {
    preValidation: [app.authenticate, validateBody(annualPlanSchema)],
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { constraints } = (request as any).validatedBody as { constraints: PlannerConstraints }

    // Build query for RAG
    const keywords = ['年会', '流程', '预算', '主持词', '奖项', '游戏', constraints.location, constraints.style || '']
      .filter(Boolean)
      .join(' | ')

    // Fetch relevant docs from knowledge base (RAG search)
    const words = keywords.split(' | ').filter(w => w.length > 0)
    const docs = await searchKnowledgeBase(words, undefined, 5)

    const citations = docs.map((doc: any, i: number) => ({
      docId: `doc-${i}`,
      title: doc.title,
      // Provide a snippet up to 300 chars
      snippets: [doc.content.substring(0, 300)]
    }))

    // Construct prompt
    const systemPrompt = `你是一个专业的活动策划与项目经理。你需要根据用户提供的约束条件，结合本地知识库（过往的策划、预算、奖品、主持词等）以及最新的互联网搜索结果，一次性生成一份完整、专业的年会活动方案全套文档。
请严格按照以下 JSON 结构输出，必须包含所有要求的字段。如果引用的知识库内容有帮助，请融入方案中。每个字段都应当使用丰富、专业的 Markdown 格式进行排版（如使用表格、列表、各级标题等）。

要求的 JSON 结构：
{
  "plan": "这里是用 Markdown 编写的详细策划案...",
  "budget": "这里是用 Markdown 编写的预算明细表...",
  "prizes": "这里是用 Markdown 编写的奖品采购清单...",
  "speech": "这里是用 Markdown 编写的各环节主持词（包含开场、颁奖、抽奖、结语等）..."
}`

    const userPrompt = `约束条件：
- 参与人数: ${constraints.peopleCount}
- 总预算: ${constraints.budget} RMB
- 日期: ${constraints.date}
- 地点/场地: ${constraints.location}
${constraints.durationHours ? `- 时长: ${constraints.durationHours} 小时` : ''}
${constraints.style ? `- 风格: ${constraints.style}` : ''}
${constraints.mustHave && constraints.mustHave.length > 0 ? `- 必须包含: ${constraints.mustHave.join(', ')}` : ''}
${constraints.avoid && constraints.avoid.length > 0 ? `- 禁忌/避免: ${constraints.avoid.join(', ')}` : ''}
${constraints.notes ? `- 补充说明: ${constraints.notes}` : ''}

参考的本地知识库引用内容：
${docs.map((d: any) => `[引用文档 ${d.title}]\n${d.content}`).join('\n\n')}

请直接输出上述结构的 JSON，不要包含其他 markdown 标记（如 \`\`\`json 等），或者是确保在能够被解析的结构内。`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    try {
      const qwenResponse = await callQwenChat(messages, { json: true, enableSearch: true, temperature: 0, maxTokens: 2600 })
      const plan = validateAnnualPlan(extractJsonObjectFromText(qwenResponse))

      return {
        plan,
        citations
      }
    } catch (error: any) {
      if (error instanceof JsonExtractionError) {
        return reply.code(500).send({ error: { code: error.code, message: error.message } })
      }
      request.log.error(error)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate plan from Qwen API' } })
    }
  })

  app.post('/planner/chat', {
    preValidation: [app.authenticate, validateBody(plannerChatSchema)],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { messages, plannerProjectId } = (request as any).validatedBody as { messages: ChatMessage[]; plannerProjectId?: string }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''

    // Build simple keyword query based on last message
    // Split message by space/punctuation to get some keywords, limit to 3 longest words to avoid too broad search
    const words = lastUserMessage.replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(w => w.length >= 2).sort((a, b) => b.length - a.length).slice(0, 3)

    const docs = await searchKnowledgeBase(words, plannerProjectId, 5)

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

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    try {
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

      const response = await callQwenChat(chatMessages, { enableSearch: true })
      return { response }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to chat with Qwen API' } })
    }
  })
}
