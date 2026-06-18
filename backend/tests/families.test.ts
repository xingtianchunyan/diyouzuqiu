import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Families API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('GET /api/v1/families requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/families' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/families returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/families',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /api/v1/families creates a family (admin only)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/families',
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'Test Family' }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().label).toBe('Test Family')
  })

  it('POST /api/v1/families rejects missing label', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/families',
      headers: { authorization: `Bearer ${token}` },
      payload: {}
    })
    expect(res.statusCode).toBe(400)
  })
})
