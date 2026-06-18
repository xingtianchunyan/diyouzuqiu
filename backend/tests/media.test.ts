import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

function buildMultipartPayload(boundary: string, filename: string, contentType: string, buffer: Buffer) {
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  return Buffer.concat([head, buffer, tail])
}

describe('Media API', () => {
  let app: FastifyInstance
  let token: string
  let mediaId: string
  const boundary = '----TestBoundary'

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token
  })

  it('POST /api/v1/media requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: buildMultipartPayload(boundary, 'test.txt', 'text/plain', Buffer.from('hello'))
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/media rejects invalid file type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload: buildMultipartPayload(boundary, 'test.txt', 'text/plain', Buffer.from('hello'))
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/v1/media uploads a valid image', async () => {
    const fakeJpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload: buildMultipartPayload(boundary, 'test.jpg', 'image/jpeg', fakeJpg)
    })
    expect(res.statusCode).toBe(201)
    mediaId = res.json().id
    expect(mediaId).toBeDefined()
  })

  it('GET /api/v1/media returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('GET /api/v1/media/:id returns the media', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/${mediaId}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe(mediaId)
  })

  it('GET /api/v1/media/:id/file requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/${mediaId}/file`
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/media/:id/file allows admin to access', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/${mediaId}/file`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
  })
})
