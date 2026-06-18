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

  it('POST /api/v1/auth/logout revokes the token', async () => {
    // Create a disposable user so we do not invalidate the shared admin token for parallel tests
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    const adminToken = adminLogin.json().token

    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'logouttest@test.com', password: 'Initial123', role: 'MEMBER' }
    })
    expect(create.statusCode).toBe(200)

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'logouttest@test.com', password: 'Initial123' }
    })
    const { token: userToken } = login.json()

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(logout.statusCode).toBe(200)

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(me.statusCode).toBe(401)
  })

  it('POST /api/v1/auth/change-password revokes old token', async () => {
    // Login as admin first to create a disposable user
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    const adminToken = adminLogin.json().token

    // Create a dedicated user so we do not invalidate the shared admin token for other tests
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'pwdtest@test.com', password: 'Initial123', role: 'MEMBER' }
    })
    expect(userRes.statusCode).toBe(200)

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'pwdtest@test.com', password: 'Initial123' }
    })
    const userToken = login.json().token

    const change = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { currentPassword: 'Initial123', newPassword: 'NewPass123' }
    })
    expect(change.statusCode).toBe(200)

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(me.statusCode).toBe(401)
  })

  it('GET /api/v1/auth/captcha returns a math challenge', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/captcha' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBeDefined()
    expect(body.question).toMatch(/\d+ \+ \d+ = \?/)
  })

  it('POST /api/v1/auth/login sets secure HttpOnly SameSite=Strict cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    expect(res.statusCode).toBe(200)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    expect(cookie).toContain('token=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Path=/')
  })

  it('GET /api/v1/me accepts token from cookie', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword }
    })
    const setCookie = login.headers['set-cookie']
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { cookie }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().email).toBe(adminEmail)
  })

  it('POST /api/v1/auth/login requires captcha after 3 failures from same IP', async () => {
    const ip = '192.0.2.10'

    // Two failures: still no captcha
    for (let i = 0; i < 2; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: ip,
        payload: { email: adminEmail, password: 'wrong' }
      })
      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
    }

    // Third failure triggers captcha requirement on next attempt
    const third = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: ip,
      payload: { email: adminEmail, password: 'wrong' }
    })
    expect(third.statusCode).toBe(401)

    const fourth = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: ip,
      payload: { email: adminEmail, password: adminPassword }
    })
    expect(fourth.statusCode).toBe(403)
    expect(fourth.json().error.code).toBe('CAPTCHA_REQUIRED')

    // Fetch a captcha and solve it
    const captchaRes = await app.inject({ method: 'GET', url: '/api/v1/auth/captcha', remoteAddress: ip })
    const { id, question } = captchaRes.json()
    const [a, b] = question.replace(' = ?', '').split(' + ').map(Number)
    const answer = String(a + b)

    const success = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: ip,
      payload: { email: adminEmail, password: adminPassword, captchaId: id, captchaAnswer: answer }
    })
    expect(success.statusCode).toBe(200)
    expect(success.json().user.email).toBe(adminEmail)
  })

  it('POST /api/v1/auth/login rate limits to 5 attempts per minute per IP', async () => {
    const ip = '192.0.2.20'
    const attempts: number[] = []

    for (let i = 0; i < 7; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: ip,
        payload: { email: adminEmail, password: 'wrong' }
      })
      attempts.push(res.statusCode)
    }

    expect(attempts.filter((c) => c === 401 || c === 403).length).toBeGreaterThanOrEqual(5)
    expect(attempts).toContain(429)
  })
})
