import { describe, it, expect, beforeAll } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { loginAsAdmin } from './helpers.js'

describe('Matches API', () => {
  let app: FastifyInstance
  let token: string
  let matchId: string
  let memberId: string

  beforeAll(async () => {
    app = await buildApp()
    const auth = await loginAsAdmin(app)
    token = auth.token

    const memberRes = await app.inject({
      method: 'POST',
      url: '/api/v1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: 'Match Player', team: 'RED' }
    })
    memberId = memberRes.json().id
  })

  it('GET /api/v1/matches requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/matches' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/matches creates a match', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matches',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        playedAt: '2024-12-01T10:00:00.000Z',
        redScore: 3,
        blueScore: 2,
        participantIds: [{ memberId, side: 'RED' }]
      }
    })
    expect(res.statusCode).toBe(201)
    matchId = res.json().id
  })

  it('GET /api/v1/matches/:id returns the match', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/matches/${matchId}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().redScore).toBe(3)
    expect(res.json().participants).toHaveLength(1)
  })

  it('PUT /api/v1/matches/:id updates the match', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/matches/${matchId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { redScore: 4 }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().redScore).toBe(4)
  })

  it('DELETE /api/v1/matches/:id removes the match', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/matches/${matchId}`,
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
  })
})
