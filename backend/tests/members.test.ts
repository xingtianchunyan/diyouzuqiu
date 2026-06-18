import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

describe('Members API', () => {
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

  it('GET /api/v1/members requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/members' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/members returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /api/v1/members creates a member (admin only)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: 'Test Player', team: 'RED' }
    })
    expect(res.statusCode).toBe(201)
    const member = res.json()
    expect(member.displayName).toBe('Test Player')
    expect(member.team).toBe('RED')
  })

  it('POST /api/v1/members rejects missing displayName', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { team: 'BLUE' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/v1/members/:id/avatar rejects non-image file', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: 'Avatar Test', team: 'BLUE' }
    })
    const memberId = create.json().id

    const boundary = '----TestBoundary'
    const htmlFile = Buffer.from('<script>alert(1)</script>')
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="xss.html"\r\n'),
      Buffer.from('Content-Type: text/html\r\n\r\n'),
      htmlFile,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/members/${memberId}/avatar`,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload: body
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_AVATAR')
  })
})
