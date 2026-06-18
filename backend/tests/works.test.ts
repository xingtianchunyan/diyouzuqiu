import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Works API', () => {
  let app: FastifyInstance
  let token: string
  let workId: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('GET /api/v1/works requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/works' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/works returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/works',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /api/v1/works creates an article', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/works',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'ARTICLE',
        title: 'Test Article',
        content: 'This is the content.',
        date: '2024-12-01'
      }
    })
    expect(res.statusCode).toBe(201)
    workId = res.json().id
    expect(workId).toBeDefined()
  })

  it('GET /api/v1/works/:id returns the work', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/works/${workId}`
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('Test Article')
  })

  it('PUT /api/v1/works/:id updates the work', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/works/${workId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Updated Article' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('Updated Article')
  })

  it('DELETE /api/v1/works/:id removes the work', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/works/${workId}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
  })
})
