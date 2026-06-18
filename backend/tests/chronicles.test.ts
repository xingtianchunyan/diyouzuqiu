import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Chronicles API', () => {
  let app: FastifyInstance
  let token: string
  let chronicleId: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('GET /api/v1/daily-materials requires date', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-materials',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /api/v1/daily-materials returns daily data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/daily-materials?date=2024-12-01',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('mediaAssets')
    expect(body).toHaveProperty('works')
    expect(body).toHaveProperty('matches')
  })

  it('POST /api/v1/chronicles creates a chronicle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/chronicles',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Test Chronicle',
        happenedAt: '2024-12-01T10:00:00.000Z',
        description: 'Description'
      }
    })
    expect(res.statusCode).toBe(201)
    chronicleId = res.json().id
  })

  it('GET /api/v1/chronicles returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/chronicles?year=2024',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('PUT /api/v1/chronicles/:id updates the chronicle', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/chronicles/${chronicleId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Updated Chronicle' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('Updated Chronicle')
  })
})
