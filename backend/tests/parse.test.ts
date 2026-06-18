import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Parse API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('POST /api/v1/parse extracts WeChat article metadata', async () => {
    const html = `<html>
      <head><title>Test</title></head>
      <body>
        <div id="js_content">
          <h2 class="rich_media_title">Article Title</h2>
          <p id="publish_time">2024年12月01日</p>
          <span id="js_name">Author Name</span>
          <p>First paragraph.</p>
          <p>Second paragraph.</p>
          <img data-src="https://example.com/img.jpg" alt="img"/>
        </div>
      </body>
    </html>`

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/parse',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      payload: { html }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.title).toBe('Article Title')
    expect(body.date).toBe('2024-12-01')
    expect(body.author).toBe('Author Name')
    expect(body.content).toContain('First paragraph')
    expect(body.content).not.toContain('img.jpg')
  })

  it('POST /api/v1/parse rejects missing url and html', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/parse',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/v1/parse rejects SSRF to cloud metadata', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/parse',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      payload: { url: 'http://169.254.169.254/latest/meta-data/' }
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_URL')
  })
})
