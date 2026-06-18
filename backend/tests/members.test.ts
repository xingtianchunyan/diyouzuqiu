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
})
