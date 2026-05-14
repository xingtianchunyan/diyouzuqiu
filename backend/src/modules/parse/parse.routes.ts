import type { FastifyPluginAsync } from 'fastify'
import pdfParseModule from 'pdf-parse-new'
import * as mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { callQwenChat } from '../../lib/ai/qwen.client.js'
import { extractJsonObjectFromText, JsonExtractionError, validateWorkExtraction } from '../../lib/ai/json.js'

const pdfParse = pdfParseModule

function normalizeToYmd(dateValue: string): string | null {
  const trimmed = (dateValue || '').trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

function tryGetFromJsonLd(html: string): string | null {
  const $ = cheerio.load(html)
  const scripts = $('script[type="application/ld+json"]')

  const pickDate = (val: unknown): string | null => {
    if (typeof val === 'string') return normalizeToYmd(val)
    if (Array.isArray(val)) {
      for (const item of val) {
        const found = pickDate(item)
        if (found) return found
      }
    }
    return null
  }

  const visit = (node: unknown): string | null => {
    if (!node) return null
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item)
        if (found) return found
      }
      return null
    }
    if (typeof node !== 'object') return null

    const obj = node as Record<string, unknown>
    const published = pickDate(obj.datePublished)
    if (published) return published
    const created = pickDate(obj.dateCreated)
    if (created) return created

    const graph = obj['@graph']
    if (graph) return visit(graph)

    for (const value of Object.values(obj)) {
      const found = visit(value)
      if (found) return found
    }
    return null
  }

  for (const el of scripts.toArray()) {
    const raw = $(el).text()
    if (!raw.trim()) continue
    try {
      const parsed = JSON.parse(raw)
      const found = visit(parsed)
      if (found) return found
    } catch {
      continue
    }
  }

  return null
}

function extractParagraphsFromHtml(html: string): string {
  const $ = cheerio.load(html)
  $('br').replaceWith('\n')
  const paragraphs = $('p')
    .toArray()
    .map((p) => $(p).text().replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  const text = $.root().text()
  return text.replace(/\n\s*\n/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim()
}

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/parse', async (request, reply) => {
    const { url, targetType: rawTargetType } = request.query as { url?: string; targetType?: string }
    const targetType = rawTargetType || ''

    if (!url) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'URL is required' } })
    }

    let title = ''
    let content = ''
    let date = ''
    let description = ''

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        redirect: 'follow',
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText || ''}`.trim())
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      description = $('meta[name="description"]').attr('content') || ''

      const doc = new JSDOM(html, { url })
      const reader = new Readability(doc.window.document)
      const article = reader.parse()

      const publishedTimeCandidates = [
        $('meta[property="article:published_time"]').attr('content'),
        $('meta[property="og:published_time"]').attr('content'),
        $('meta[name="date"]').attr('content'),
        $('meta[name="pubdate"]').attr('content'),
        $('meta[name="publish_date"]').attr('content'),
        $('meta[name="publication_date"]').attr('content'),
        $('meta[itemprop="datePublished"]').attr('content'),
        $('meta[itemprop="dateCreated"]').attr('content'),
        $('time[datetime]').first().attr('datetime')
      ].filter(Boolean) as string[]

      for (const candidate of publishedTimeCandidates) {
        const normalized = normalizeToYmd(candidate)
        if (normalized) {
          date = normalized
          break
        }
      }

      if (!date) {
        const jsonLdDate = tryGetFromJsonLd(html)
        if (jsonLdDate) date = jsonLdDate
      }

      if (article && (article.content || article.textContent)) {
        title = article.title || $('title').text() || $('h1').first().text()
        if (article.content) {
          content = extractParagraphsFromHtml(article.content)
        } else {
          content = (article.textContent || '').replace(/\n\s*\n/g, '\n\n').trim()
        }
      } else {
        title = $('title').text() || $('h1').first().text()
        $('script, style, nav, header, footer, aside, iframe, noscript').remove()
        $('br').replaceWith('\n')
        const paragraphs = $('body p')
          .toArray()
          .map((p) => $(p).text().replace(/\s+/g, ' ').trim())
          .filter(Boolean)
        if (paragraphs.length > 0) {
          content = paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
        } else {
          content = $('body').text().replace(/\n\s*\n/g, '\n\n').trim()
        }
      }
    } catch (err: any) {
      app.log.error({ err, url })
      if (err?.name === 'AbortError') {
        return reply.code(504).send({ error: { code: 'FETCH_TIMEOUT', message: 'URL fetch timeout' } })
      }
      return reply.code(500).send({ error: { code: 'FETCH_ERROR', message: err?.message || 'Failed to fetch or parse URL' } })
    }

    let finalTitle = title.trim()
    let finalContent = content.trim()
    let finalDate = date || ''
    let finalDescription = description.trim()

    if (targetType) {
      if (targetType !== 'WORK') {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Unsupported targetType for parsing' } })
      }

      const prompt = `你将收到一段文本。仅输出一个JSON对象，且只允许包含3个键：title,date,content。\n- title: 文集/诗集标题\n- date: YYYY-MM-DD 或 空字符串\n- content: 原文正文，保留换行与分段\n不要输出解释、不要输出代码块标记。\n\n文本：\n${content.substring(0, 8000)}`

      try {
        const llmResponse = await callQwenChat(
          [
            { role: 'system', content: '你是信息抽取器。输出必须是严格JSON。' },
            { role: 'user', content: prompt }
          ],
          { json: true, temperature: 0, maxTokens: 1200 }
        )

        const extracted = validateWorkExtraction(extractJsonObjectFromText(llmResponse))
        finalTitle = extracted.title
        finalDate = extracted.date
        finalContent = extracted.content
      } catch (err: any) {
        if (err instanceof JsonExtractionError) {
          return reply.code(500).send({ error: { code: err.code, message: err.message } })
        }
        if (err?.name === 'AbortError') {
          return reply.code(504).send({ error: { code: 'LLM_TIMEOUT', message: 'LLM request timeout' } })
        }
        return reply.code(500).send({ error: { code: 'LLM_ERROR', message: err?.message || 'LLM request failed' } })
      }
    }

    return {
      title: finalTitle,
      content: finalContent,
      date: finalDate,
      description: finalDescription
    }
  })

  app.post('/parse', async (request, reply) => {
    let title = ''
    let content = ''
    let date = ''
    let description = ''
    let targetType = ''

    if (request.isMultipart()) {
      const data = await request.file()
      
      if (data?.fields?.targetType) {
        const field = data.fields.targetType as any
        targetType = field.value || ''
      }
      
      if (data?.filename) {
        const filename = data.filename.toLowerCase()
        title = data.filename.split('.').slice(0, -1).join('.') || data.filename

        const chunks = []
        for await (const chunk of data.file) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)

        try {
          if (filename.endsWith('.pdf')) {
            const pdfData = await pdfParse(buffer)
            content = pdfData.text
          } else if (filename.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer })
            content = result.value
          } else {
            content = buffer.toString('utf-8')
          }
        } catch (err: any) {
          app.log.error(err)
          return reply.code(500).send({ error: { code: 'PARSE_ERROR', message: err?.message || 'Failed to parse file' } })
        }
      } else {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
      }
    } else {
      const body = request.body as { url?: string; targetType?: string }
      targetType = body?.targetType || ''
      
      if (!body || !body.url) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'URL is required' } })
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000)

        const response = await fetch(body.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          },
          redirect: 'follow',
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId))
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText || ''}`.trim())
        }
        
        const html = await response.text()
        const $ = cheerio.load(html)
        
        description = $('meta[name="description"]').attr('content') || ''
        
        // Use Readability for better content extraction
        const doc = new JSDOM(html, { url: body.url })
        const reader = new Readability(doc.window.document)
        const article = reader.parse()
        
        const publishedTimeCandidates = [
          $('meta[property="article:published_time"]').attr('content'),
          $('meta[property="og:published_time"]').attr('content'),
          $('meta[name="date"]').attr('content'),
          $('meta[name="pubdate"]').attr('content'),
          $('meta[name="publish_date"]').attr('content'),
          $('meta[name="publication_date"]').attr('content'),
          $('meta[itemprop="datePublished"]').attr('content'),
          $('meta[itemprop="dateCreated"]').attr('content'),
          $('time[datetime]').first().attr('datetime')
        ].filter(Boolean) as string[]

        for (const candidate of publishedTimeCandidates) {
          const normalized = normalizeToYmd(candidate)
          if (normalized) {
            date = normalized
            break
          }
        }

        if (!date) {
          const jsonLdDate = tryGetFromJsonLd(html)
          if (jsonLdDate) date = jsonLdDate
        }

        if (article && (article.content || article.textContent)) {
          title = article.title || $('title').text() || $('h1').first().text()
          if (article.content) {
            content = extractParagraphsFromHtml(article.content)
          } else {
            content = (article.textContent || '').replace(/\n\s*\n/g, '\n\n').trim()
          }
        } else {
          // Fallback to cheerio if Readability fails
          title = $('title').text() || $('h1').first().text()
          $('script, style, nav, header, footer, aside, iframe, noscript').remove()
          $('br').replaceWith('\n')
          const paragraphs = $('body p')
            .toArray()
            .map((p) => $(p).text().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
          if (paragraphs.length > 0) {
            content = paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
          } else {
            content = $('body').text().replace(/\n\s*\n/g, '\n\n').trim()
          }
        }
      } catch (err: any) {
        app.log.error({ err, url: body.url })
        if (err?.name === 'AbortError') {
          return reply.code(504).send({ error: { code: 'FETCH_TIMEOUT', message: 'URL fetch timeout' } })
        }
        return reply.code(500).send({ error: { code: 'FETCH_ERROR', message: err?.message || 'Failed to fetch or parse URL' } })
      }
    }

    let finalTitle = title.trim()
    let finalContent = content.trim()
    let finalDate = date || ''
    let finalDescription = description.trim()

    if (targetType === 'WORK' || targetType === 'CHRONICLE') {
      try {
        let prompt = ''
        if (targetType === 'WORK') {
          prompt = `请从以下文本中提取文集/诗集关键信息。强制输出纯JSON，严禁输出任何解释或多余文字。
要求格式：
{
  "title": "string",
  "date": "YYYY-MM-DD 或 null",
  "content": "string（必须保留原文分段、换行、小标题等排版结构）"
}

文本：
${content.substring(0, 8000)}`
        } else {
          return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Unsupported targetType for parsing' } })
        }
        const llmResponse = await callQwenChat([
          { role: 'system', content: '你是一个精准的文本提取助手，专门用于从凌乱的文本中提取结构化信息。' },
          { role: 'user', content: prompt }
        ], { json: true })
        
        let jsonStr = llmResponse.trim()
        const match = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonStr = match[1].trim()
        }
        
        const parsedJson = JSON.parse(jsonStr)
        if (parsedJson.title) finalTitle = parsedJson.title
        if (parsedJson.content) {
          if (targetType === 'WORK') {
            finalContent = parsedJson.content
          } else {
            finalDescription = parsedJson.content
            finalContent = '' // 或者保持，取决于前端期望
          }
        }
        if (parsedJson.date) finalDate = parsedJson.date
      } catch (err: any) {
        app.log.warn(`LLM extraction failed: ${err.message}`)
        // Fallback to raw extracted values
      }
    }

    return {
      title: finalTitle,
      content: finalContent,
      date: finalDate,
      description: finalDescription
    }
  })
}
