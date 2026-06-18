import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

describe('Admin User Management', () => {
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

  it('GET /api/v1/admin/users returns user list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /api/v1/admin/users creates a user with strong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'newuser@test.com', password: 'StrongPass1', role: 'MEMBER' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe('newuser@test.com')
  })

  it('POST /api/v1/admin/users rejects weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'weak@test.com', password: '12345678' }
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/v1/auth/change-password works with correct current password', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'pwduser@test.com', password: 'Initial123', role: 'MEMBER' }
    })
    expect(createRes.statusCode).toBe(200)

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'pwduser@test.com', password: 'Initial123' }
    })
    const userToken = loginRes.json().token

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { currentPassword: 'Initial123', newPassword: 'NewPass123' }
    })
    expect(res.statusCode).toBe(200)
  })
})
