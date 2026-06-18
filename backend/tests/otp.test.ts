import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

describe('Email OTP login', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
  })

  it('POST /api/v1/auth/otp/send returns codeId and code in test env', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { email: 'otptest@example.com' }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.codeId).toBeDefined()
    expect(body.code).toMatch(/^\d{6}$/)
    expect(body.expiresIn).toBeDefined()
  })

  it('POST /api/v1/auth/otp/login creates user and returns token', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { email: 'otpnew@example.com' }
    })
    const { codeId, code } = sendRes.json()

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/login',
      payload: { email: 'otpnew@example.com', codeId, code }
    })
    expect(loginRes.statusCode).toBe(200)
    const body = loginRes.json()
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe('otpnew@example.com')
    expect(body.user.role).toBe('MEMBER')
    expect(body.user.phone).toBeNull()

    const setCookie = loginRes.headers['set-cookie']
    expect(setCookie).toBeDefined()
  })

  it('POST /api/v1/auth/otp/login rejects wrong code', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { email: 'otpwrong@example.com' }
    })
    const { codeId } = sendRes.json()

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/login',
      payload: { email: 'otpwrong@example.com', codeId, code: '000000' }
    })
    expect(loginRes.statusCode).toBe(401)
    expect(loginRes.json().error.code).toBe('INVALID_OTP')
  })

  it('POST /api/v1/auth/otp/login rejects reused code', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { email: 'otpreuse@example.com' }
    })
    const { codeId, code } = sendRes.json()

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/login',
      payload: { email: 'otpreuse@example.com', codeId, code }
    })
    expect(first.statusCode).toBe(200)

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/login',
      payload: { email: 'otpreuse@example.com', codeId, code }
    })
    expect(second.statusCode).toBe(401)
    expect(second.json().error.code).toBe('INVALID_OTP')
  })

  it('POST /api/v1/auth/otp/send rate limits to 3 attempts per 10 minutes per IP', async () => {
    const ip = '192.0.2.100'
    const codes: number[] = []

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/send',
        remoteAddress: ip,
        payload: { email: `otpratelimit${i}@example.com` }
      })
      codes.push(res.statusCode)
    }

    expect(codes.filter((c) => c === 200).length).toBe(3)
    expect(codes).toContain(429)
  })
})
