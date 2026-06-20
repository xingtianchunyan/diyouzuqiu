import { prisma } from '../prisma.js'

export type RAGSource = 'knowledge' | 'works' | 'chronicles'

export interface RetrieveContextOptions {
  /** Keywords extracted from the user query */
  queryWords: string[]
  /** Which sources to retrieve from. Defaults to ['knowledge', 'works', 'chronicles'] */
  sources?: RAGSource[]
  /** Optional project scope for planner-related documents */
  plannerProjectId?: string
  /** Filter knowledge docs by category. If omitted, searches all knowledge docs */
  knowledgeCategories?: string[]
  /** Maximum number of context items to return */
  limit?: number
}

export interface ContextItem {
  title: string
  content: string
}

/**
 * Retrieve relevant context from the local knowledge base for AI prompts.
 *
 * TODO: 接入向量数据库 (Vector DB)
 * 当前实现为基于 SQLite 的基础关键字 LIKE 匹配。
 * 后续扩展步骤：
 * 1. 引入 Embedding 模型，在创建 Work、ChronicleEvent、KnowledgeDoc 时计算 embedding。
 * 2. 将 queryWords 转换为 embedding，在 Vector DB 中执行语义相似度检索。
 * 3. 根据相似度阈值返回 Top-K 结果。
 */
export async function retrieveContext(options: RetrieveContextOptions): Promise<ContextItem[]> {
  const {
    queryWords,
    sources = ['knowledge', 'works', 'chronicles'],
    plannerProjectId,
    knowledgeCategories,
    limit = 5
  } = options

  const hasQuery = queryWords.length > 0
  const items: ContextItem[] = []

  if (sources.includes('knowledge')) {
    const knowledgeDocWhere: any = {}
    if (knowledgeCategories && knowledgeCategories.length > 0) {
      knowledgeDocWhere.category = { in: knowledgeCategories }
    }
    if (plannerProjectId) {
      knowledgeDocWhere.plannerProjectId = plannerProjectId
    }

    let knowledgeChunks: any[]

    if (hasQuery) {
      const knowledgeChunkOR = queryWords.map((w: string) => ({ content: { contains: w } }))
      knowledgeChunks = await prisma.knowledgeChunk.findMany({
        where: {
          OR: knowledgeChunkOR,
          knowledgeDoc: knowledgeDocWhere
        },
        include: {
          knowledgeDoc: { select: { title: true, category: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Fallback: return the most recent knowledge chunks when no keywords are provided
      knowledgeChunks = await prisma.knowledgeChunk.findMany({
        where: { knowledgeDoc: knowledgeDocWhere },
        include: {
          knowledgeDoc: { select: { title: true, category: true } }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    }

    items.push(
      ...knowledgeChunks.map((c: any) => ({
        title: `[${c.knowledgeDoc.category}] ${c.knowledgeDoc.title}`,
        content: c.content
      }))
    )
  }

  if (sources.includes('works') && hasQuery) {
    const worksOR = queryWords.flatMap((w: string) => [
      { title: { contains: w } },
      { content: { contains: w } }
    ])

    const works = await prisma.work.findMany({
      where: { OR: worksOR },
      take: limit
    })

    items.push(
      ...works.map((w: any) => ({ title: `[文集] ${w.title}`, content: w.content }))
    )
  }

  if (sources.includes('chronicles') && hasQuery) {
    const chroniclesOR = queryWords.flatMap((w: string) => [
      { title: { contains: w } },
      { description: { contains: w } }
    ])

    const chronicles = await prisma.chronicleEvent.findMany({
      where: { OR: chroniclesOR },
      take: limit
    })

    items.push(
      ...chronicles.map((c: any) => ({
        title: `[大事记] ${c.title}`,
        content: c.description || ''
      }))
    )
  }

  return items.slice(0, limit)
}
