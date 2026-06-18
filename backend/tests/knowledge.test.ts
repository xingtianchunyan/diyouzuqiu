import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Knowledge API', () => {
  let app: FastifyInstance
  let token: string
  let docId: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('GET /api/v1/knowledge returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/knowledge' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /api/v1/knowledge creates a doc', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Test Knowledge',
        content: 'Some useful content.'
      }
    })
    expect(res.statusCode).toBe(201)
    docId = res.json().id
  })

  it('GET /api/v1/knowledge?q=useful filters docs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/knowledge?q=useful'
    })
    expect(res.statusCode).toBe(200)
    const docs = res.json()
    expect(docs.some((d: any) => d.id === docId)).toBe(true)
  })

  it('POST /api/v1/knowledge rejects missing fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/knowledge',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '' }
    })
    expect(res.statusCode).toBe(400)
  })
})
