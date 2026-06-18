import type { FastifyInstance } from 'fastify'

export async function loginAsAdmin(app: FastifyInstance) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!
    }
  })
  return res.json() as { token: string; user: { id: string; role: string; email: string; memberId: string | null } }
}
