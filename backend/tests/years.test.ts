import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Years API', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('GET /api/v1/years/overview requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/years/overview' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/years/overview returns years', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/years/overview',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().years)).toBe(true)
  })

  it('GET /api/v1/years/:year returns year summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/years/2024',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.year).toBe(2024)
    expect(body).toHaveProperty('media')
    expect(body).toHaveProperty('works')
    expect(body).toHaveProperty('matches')
    expect(body).toHaveProperty('events')
  })

  it('GET /api/v1/years/:year rejects invalid year', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/years/abc',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(400)
  })
})
