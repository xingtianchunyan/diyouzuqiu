import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { escapeHtml, deepEscapeHtml } from '../src/lib/xss.js'

describe('XSS output filtering', () => {
  it('escapeHtml encodes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(escapeHtml("'")).toBe('&#39;')
    expect(escapeHtml('&')).toBe('&amp;')
  })

  it('deepEscapeHtml recursively escapes string fields', () => {
    const input = {
      id: '1',
      name: '<b>name</b>',
      nested: { value: '<script>' },
      list: ['<a>', { title: '&' }],
      count: 42,
      active: true,
      date: new Date('2024-01-01T00:00:00.000Z')
    }
    const out = deepEscapeHtml(input)
    expect(out.name).toBe('&lt;b&gt;name&lt;/b&gt;')
    expect(out.nested.value).toBe('&lt;script&gt;')
    expect(out.list[0]).toBe('&lt;a&gt;')
    expect((out.list[1] as any).title).toBe('&amp;')
    expect(out.count).toBe(42)
    expect(out.active).toBe(true)
    expect(out.date).toBeInstanceOf(Date)
  })
})

describe('XSS API integration', () => {
  let app: FastifyInstance
  let token: string
  const adminEmail = process.env.ADMIN_EMAIL!
  const adminPassword = process.env.ADMIN_PASSWORD!

  beforeAll(async () => {
    app = await buildApp()
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    token = login.json().token
  })

  it('GET /api/v1/members escapes XSS in displayName', async () => {
    const payload = '<script>alert(1)</script>'
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: payload, team: 'RED' }
    })
    expect(create.statusCode).toBe(201)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const member = res.json().find((m: any) => m.displayName.includes('&lt;script&gt;'))
    expect(member).toBeDefined()
    expect(member.displayName).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('GET /api/v1/works escapes XSS in title and content', async () => {
    const title = '<img src=x onerror=alert(1)>'
    const content = '<body onload=alert(2)>'
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/works',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'ARTICLE', title, content }
    })
    expect(create.statusCode).toBe(201)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/works',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const work = res.json().find((w: any) => w.title.includes('&lt;img'))
    expect(work).toBeDefined()
    expect(work.title).toBe('&lt;img src=x onerror=alert(1)&gt;')
  })
})
