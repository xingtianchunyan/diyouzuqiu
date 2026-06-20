import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

  it('POST /api/v1/admin/users creates a user with phone and rejects duplicates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'phoneuser1@test.com', password: 'StrongPass1', phone: '13800138000', role: 'MEMBER' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().phone).toBe('13800138000')

    const dupEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'phoneuser2@test.com', password: 'StrongPass1', phone: '13800138000', role: 'MEMBER' }
    })
    expect(dupEmail.statusCode).toBe(409)
    expect(dupEmail.json().error.code).toBe('PHONE_EXISTS')

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'phoneuser3@test.com', password: 'StrongPass1', phone: '123', role: 'MEMBER' }
    })
    expect(invalid.statusCode).toBe(400)
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

  it('POST /api/v1/admin/users/batch imports users, members and families', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/batch',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        users: [
          { email: 'batch1@test.com', password: 'StrongPass1', role: 'MEMBER', memberName: 'Batch Member 1', team: 'RED', familyName: 'Batch Family' },
          { email: 'batch2@test.com', password: 'StrongPass1', role: 'MEMBER', memberName: 'Batch Member 2', team: 'BLUE', familyName: 'Batch Family' },
          { email: 'batch3@test.com', password: 'StrongPass1', role: 'MEMBER' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.success).toBe(true)
    expect(json.summary.total).toBe(3)
    expect(json.summary.created).toBe(3)
    expect(json.summary.createdMembers).toBe(2)
    expect(json.summary.createdFamilies).toBe(1)
    expect(json.summary.failed).toHaveLength(0)
    expect(json.generatedPasswords).toHaveLength(0)
  })

  it('POST /api/v1/admin/users/batch generates temporary passwords and rejects ADMIN role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/batch',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        users: [
          { email: 'generated1@test.com', password: '', role: 'MEMBER' },
          { email: 'generated2@test.com', password: '', memberName: 'Generated Member', team: 'RED' }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.success).toBe(true)
    expect(json.summary.created).toBe(2)
    expect(json.generatedPasswords).toHaveLength(2)
    expect(json.generatedPasswords[0].email).toBe('generated1@test.com')
    expect(json.generatedPasswords[0].password).toHaveLength(12)

    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/batch',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        users: [{ email: 'adminbatch@test.com', password: 'StrongPass1', role: 'ADMIN' }]
      }
    })
    expect(adminRes.statusCode).toBe(400)
  })

  it('POST /api/v1/admin/users/parse-excel parses xlsx file', async () => {
    const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import-users.xlsx')
    const fileBuffer = fs.readFileSync(fixturePath)
    const boundary = '----FormBoundary' + Date.now()
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="import-users.xlsx"\r\n'),
      Buffer.from('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/parse-excel',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload: body
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.rows).toHaveLength(3)
    expect(json.rows[0]).toEqual(['email', 'password', 'role', 'memberName', 'team', 'familyName'])
    expect(json.rows[1][0]).toBe('alice@test.com')
    expect(json.rows[2][5]).toBe('B Family')
  })

  it('POST /api/v1/admin/users/parse-excel rejects non-excel file', async () => {
    const boundary = '----FormBoundary' + Date.now()
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="data.csv"\r\n'),
      Buffer.from('Content-Type: text/csv\r\n\r\n'),
      Buffer.from('email,password\ralice@test.com,StrongPass1\r\n'),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ])

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/parse-excel',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`
      },
      payload: body
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_FILE_TYPE')
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

  it('POST /api/v1/admin/users/batch sanitizes CSV formula injection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/batch',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        users: [
          {
            email: 'formula1@test.com',
            password: 'StrongPass1',
            role: 'MEMBER',
            memberName: "=cmd|'/C calc'!A0",
            team: 'RED',
            familyName: '@SUM(A1:A10)'
          }
        ]
      }
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.success).toBe(true)
    expect(json.summary.created).toBe(1)

    const membersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(membersRes.statusCode).toBe(200)
    // The leading apostrophe is HTML-escaped by the global XSS output filter
    const member = membersRes.json().find((m: any) => m.displayName.startsWith("'="))
    expect(member).toBeDefined()
    expect(member.displayName).toBe("'=cmd|'/C calc'!A0")

    const familiesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/families',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(familiesRes.statusCode).toBe(200)
    const family = familiesRes.json().find((f: any) => f.label.startsWith("'@"))
    expect(family).toBeDefined()
    expect(family.label).toBe("'@SUM(A1:A10)")
  })
})
