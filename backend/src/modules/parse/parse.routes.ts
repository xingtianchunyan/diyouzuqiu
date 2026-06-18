import type { FastifyPluginAsync, FastifyBaseLogger } from 'fastify'
import * as cheerio from 'cheerio'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { isAllowedUrl } from '../../lib/url.js'
import { parseDocument } from '../../lib/documentParser.js'

function normalizeToYmd(dateValue: string): string | null {
  const trimmed = (dateValue || '').trim()
  if (!trimmed) return null

  // ISO / slash / dot date anywhere in the string, e.g. 2024-12-01, 2024/12/01, 2024.12.01
  const isoMatch = trimmed.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  // Chinese WeChat date: 2024年12月01日
  const cnMatch = trimmed.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (cnMatch) {
    return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

function decodeWeChatString(raw: string): string {
  return raw
    .replace(/\\x26/g, '&')
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

function resolveUrl(base: string, relative: string): string {
  if (!relative) return ''
  if (relative.startsWith('http://') || relative.startsWith('https://') || relative.startsWith('//')) {
    return relative.startsWith('//') ? `https:${relative}` : relative
  }
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

function extractParagraphsFromHtml(html: string, baseUrl = ''): string {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  $('br').replaceWith('\n')

  // Convert images to markdown so they survive plain-text extraction
  $('img').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('data-src') || $el.attr('src') || ''
    const alt = $el.attr('alt') || ''
    if (src) {
      $el.replaceWith(`\n\n![${alt}](${resolveUrl(baseUrl, src)})\n\n`)
    } else {
      $el.remove()
    }
  })

  const paragraphs = $('p, section, h1, h2, h3, h4, h5, h6, li, blockquote')
    .toArray()
    .map((p) => {
      const $p = $(p)
      const tag = p.tagName.toLowerCase()
      if (tag === 'li') {
        const prefix = $p.parent().is('ol') ? '1. ' : '- '
        return prefix + $p.text().replace(/\s+/g, ' ').trim()
      }
      if (tag === 'blockquote') {
        return $p.text()
          .split('\n')
          .map((line) => `> ${line.trim()}`)
          .join('\n')
      }
      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1])
        return `${'#'.repeat(level)} ${$p.text().replace(/\s+/g, ' ').trim()}`
      }
      return $p.text().replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean)

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  const text = $.root().text()
  return text.replace(/\n\s*\n/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim()
}

function isWeChatUrl(url?: string): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return host.includes('mp.weixin.qq.com')
  } catch {
    return false
  }
}

function hasWeChatStructure(html: string): boolean {
  return cheerio.load(html)('#js_content').length > 0
}

function extractWeChatMeta(html: string) {
  // WeChat often stores key info in inline JS variables
  const titleMatch = html.match(/var\s+msg_title\s*=\s*htmlDecode\(['"]([\s\S]*?)['"]\)/i)
    || html.match(/var\s+msg_title\s*=\s*['"]([\s\S]*?)['"];?/i)
    || html.match(/var\s+msg_title\s*=\s*&quot;([\s\S]*?)&quot;/i)
  const authorMatch = html.match(/var\s+nickname\s*=\s*htmlDecode\(['"]([\s\S]*?)['"]\)/i)
    || html.match(/var\s+nickname\s*=\s*['"]([\s\S]*?)['"];?/i)
    || html.match(/var\s+nickname\s*=\s*&quot;([\s\S]*?)&quot;/i)
    || html.match(/var\s+sName\s*=\s*['"]([\s\S]*?)['"];?/i)
    || html.match(/var\s+sName\s*=\s*&quot;([\s\S]*?)&quot;/i)
    || html.match(/var\s+username\s*=\s*['"]([\s\S]*?)['"];?/i)
    || html.match(/var\s+username\s*=\s*&quot;([\s\S]*?)&quot;/i)
  const dateMatch = html.match(/publish_time\s*[:=]\s*htmlDecode\(['"]([\s\S]*?)['"]\)/i)
    || html.match(/publish_time\s*[:=]\s*['"](\d{4}[-/.]\d{1,2}[-/.]\d{1,2})['"];?/i)
    || html.match(/publish_time\s*[:=]\s*['"](\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)['"];?/i)
    || html.match(/publish_time\s*[:=]\s*&quot;(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})&quot;/i)
    || html.match(/publish_time\s*[:=]\s*&quot;(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)&quot;/i)

  return {
    title: titleMatch ? decodeWeChatString(titleMatch[1]) : '',
    author: authorMatch ? decodeWeChatString(authorMatch[1]) : '',
    date: dateMatch ? normalizeToYmd(dateMatch[1]) || '' : ''
  }
}

function extractWeChatContent($root: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
  // Strip non-content elements and all images
  $root.find('script, style, noscript, img, figure, svg, .js_img_placeholder, .weapp_image').remove()
  // Preserve line breaks created by <br>
  $root.find('br').replaceWith('\n')

  const out: string[] = []
  const blockTags = new Set([
    'p', 'div', 'section', 'article', 'blockquote',
    'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'
  ])

  function walk(nodes: cheerio.Cheerio<any>) {
    nodes.each((_i: number, node: any) => {
      if (node.type === 'text') {
        out.push(node.data || '')
      } else if (node.type === 'tag') {
        const tag = node.tagName.toLowerCase()
        const style = $(node).attr('style') || ''
        if (/display\s*:\s*none/i.test(style)) return

        if (tag === 'br') {
          out.push('\n')
        } else if (blockTags.has(tag)) {
          walk($(node).contents())
          out.push('\n\n')
        } else {
          walk($(node).contents())
        }
      }
    })
  }

  walk($root.contents())

  return out
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function extractWeChatDate($: cheerio.CheerioAPI, html: string, meta: { date: string }): string {
  const selectors = [
    '#publish_time',
    'em#publish_time',
    '#js_publish_time',
    '.rich_media_meta_list',
    '#js_meta',
    '.rich_media_meta_text',
    'meta[property="article:published_time"]',
    'meta[name="publish_time"]',
    'meta[name="date"]'
  ]

  for (const selector of selectors) {
    const el = $(selector).first()
    const raw = el.attr('content') || el.text() || ''
    const norm = normalizeToYmd(raw)
    if (norm) return norm
  }

  if (meta.date) {
    const norm = normalizeToYmd(meta.date)
    if (norm) return norm
  }

  // WeChat sometimes stores a Unix timestamp in `var ct = "..."`
  const ctMatch = html.match(/var\s+ct\s*=\s*['"](\d{10,13})['"];?/i)
  if (ctMatch) {
    const ts = parseInt(ctMatch[1], 10)
    const d = new Date(ts < 1e12 ? ts * 1000 : ts)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  return ''
}

function parseWeChatArticle(html: string, pageUrl: string) {
  const $ = cheerio.load(html)
  const meta = extractWeChatMeta(html)

  const title =
    $('#activity_name').text().trim() ||
    $('h2.rich_media_title').first().text().trim() ||
    $('#js_article_title').text().trim() ||
    meta.title ||
    $('title').text().trim() ||
    ''

  const author =
    $('#js_name').text().trim() ||
    $('#js_profile_qrcode .profile_meta_value').first().text().trim() ||
    $('.profile_nickname').text().trim() ||
    $('span.profile_meta_value').first().text().trim() ||
    meta.author ||
    ''

  const date = extractWeChatDate($, html, meta)

  const description = $('meta[name="description"]').attr('content') || ''

  let content = ''
  const $jsContent = $('#js_content')
  if ($jsContent.length > 0) {
    content = extractWeChatContent($jsContent, $)
  }

  return { title, content, date, author, description, isWeChat: true }
}

const MAX_REDIRECTS = 5

async function fetchHtml(url: string, log: FastifyBaseLogger, redirectCount = 0): Promise<string> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error('Too many redirects')
  }

  const allowed = await isAllowedUrl(url)
  if (!allowed) {
    throw new Error('URL is not allowed')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const isWeChat = isWeChatUrl(url)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...(isWeChat ? { Referer: 'https://mp.weixin.qq.com/' } : {})
      },
      redirect: 'manual',
      signal: controller.signal
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('Redirect without Location header')
      }
      const nextUrl = new URL(location, url).href
      return fetchHtml(nextUrl, log, redirectCount + 1)
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText || ''}`.trim())
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractReadability(html: string, url: string) {
  const $ = cheerio.load(html)
  const doc = new JSDOM(html, { url })
  const reader = new Readability(doc.window.document)
  const article = reader.parse()

  let title = ''
  let content = ''

  if (article && (article.content || article.textContent)) {
    title = article.title || $('title').text() || $('h1').first().text()
    if (article.content) {
      content = extractParagraphsFromHtml(article.content, url)
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

  return { title, content }
}

function extractDateFromHtml(html: string): string {
  const $ = cheerio.load(html)
  const candidates = [
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

  for (const candidate of candidates) {
    const normalized = normalizeToYmd(candidate)
    if (normalized) return normalized
  }

  const jsonLdDate = tryGetFromJsonLd(html)
  return jsonLdDate || ''
}

function parseHtml(html: string, url?: string) {
  if ((url && isWeChatUrl(url)) || hasWeChatStructure(html)) {
    const result = parseWeChatArticle(html, url || '')
    if (result.content || result.title) {
      return result
    }
  }

  const { title, content } = extractReadability(html, url || 'https://example.com')
  const date = extractDateFromHtml(html)
  const $ = cheerio.load(html)
  const description = $('meta[name="description"]').attr('content') || ''

  return { title, content, date, author: '', description, isWeChat: false }
}

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/parse', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { url, targetType: rawTargetType } = request.query as { url?: string; targetType?: string }
    const targetType = rawTargetType || ''

    if (!url) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'URL is required' } })
    }

    if (!(await isAllowedUrl(url))) {
      return reply.code(400).send({ error: { code: 'INVALID_URL', message: 'URL is not allowed' } })
    }

    let html = ''
    try {
      html = await fetchHtml(url, app.log)
    } catch (err: any) {
      app.log.error({ err, url })
      if (err?.name === 'AbortError') {
        return reply.code(504).send({ error: { code: 'FETCH_TIMEOUT', message: 'URL fetch timeout' } })
      }
      const message = err?.message === 'URL is not allowed' ? 'URL is not allowed' : 'Failed to fetch or parse URL'
      return reply.code(err?.message === 'URL is not allowed' ? 400 : 500).send({ error: { code: err?.message === 'URL is not allowed' ? 'INVALID_URL' : 'FETCH_ERROR', message } })
    }

    const parsed = parseHtml(html, url)

    return {
      title: parsed.title.trim(),
      content: parsed.content.trim(),
      date: parsed.date || '',
      description: parsed.description.trim(),
      author: parsed.author.trim()
    }
  })

  app.post('/parse', { preValidation: [app.authenticate] }, async (request, reply) => {
    let title = ''
    let content = ''
    let date = ''
    let description = ''
    let author = ''
    let targetType = ''
    let sourceUrl = ''

    if (request.isMultipart()) {
      const data = await request.file()

      if (data?.fields?.targetType) {
        const field = data.fields.targetType as any
        targetType = field.value || ''
      }

      if (data?.filename) {
        const chunks = []
        for await (const chunk of data.file) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)

        try {
          const parsed = await parseDocument(buffer, data.filename)
          title = parsed.title
          content = parsed.content
        } catch (err: any) {
          app.log.error(err)
          return reply.code(500).send({ error: { code: 'PARSE_ERROR', message: 'Failed to parse file' } })
        }
      } else {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
      }
    } else {
      const body = request.body as { url?: string; html?: string; targetType?: string }
      targetType = body?.targetType || ''

      if (body?.url) {
        sourceUrl = body.url
        if (!(await isAllowedUrl(body.url))) {
          return reply.code(400).send({ error: { code: 'INVALID_URL', message: 'URL is not allowed' } })
        }
        try {
          const html = await fetchHtml(body.url, app.log)
          const parsed = parseHtml(html, body.url)
          title = parsed.title
          content = parsed.content
          date = parsed.date
          description = parsed.description
          author = parsed.author
        } catch (err: any) {
          app.log.error({ err, url: body.url })
          if (err?.name === 'AbortError') {
            return reply.code(504).send({ error: { code: 'FETCH_TIMEOUT', message: 'URL fetch timeout' } })
          }
          const isDisallowed = err?.message === 'URL is not allowed'
          const message = isDisallowed ? 'URL is not allowed' : 'Failed to fetch or parse URL'
          return reply.code(isDisallowed ? 400 : 500).send({ error: { code: isDisallowed ? 'INVALID_URL' : 'FETCH_ERROR', message } })
        }
      } else if (typeof body?.html === 'string') {
        const parsed = parseHtml(body.html)
        title = parsed.title
        content = parsed.content
        date = parsed.date
        description = parsed.description
        author = parsed.author
      } else {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'URL or html is required' } })
      }
    }

    return {
      title: title.trim(),
      content: content.trim(),
      date: date || '',
      description: description.trim(),
      author: author.trim()
    }
  })
}
