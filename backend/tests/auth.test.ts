import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

describe('Auth API', () => {
  let app: FastifyInstance
  const adminEmail = process.env.ADMIN_EMAIL!
  const adminPassword = process.env.ADMIN_PASSWORD!

  beforeAll(async () => {
    app = await buildApp()
  })

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('POST /api/v1/auth/login rejects missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/v1/auth/login rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: 'wrong' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/auth/login succeeds with admin credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe(adminEmail)
    expect(body.user.role).toBe('ADMIN')
  })

  it('GET /api/v1/me requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/me returns current user with token', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    const { token } = login.json()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe(adminEmail)
  })
})
