import crypto from 'crypto'
import { prisma } from './prisma.js'

const FAILURE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const CAPTCHA_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CAPTCHA_THRESHOLD = 3

function now() {
  return Date.now()
}

async function cleanup() {
  const failureCutoff = new Date(now() - FAILURE_WINDOW_MS)
  const ttlCutoff = new Date(now())
  await prisma.loginAttempt.deleteMany({ where: { lastFailureAt: { lt: failureCutoff } } })
  await prisma.captcha.deleteMany({ where: { expiresAt: { lt: ttlCutoff } } })
}

// Lightweight periodic cleanup (every 5 minutes)
setInterval(cleanup, 5 * 60 * 1000).unref()

export async function recordFailure(ip: string) {
  const cutoff = new Date(now() - FAILURE_WINDOW_MS)
  await prisma.loginAttempt.deleteMany({ where: { lastFailureAt: { lt: cutoff } } })

  await prisma.loginAttempt.upsert({
    where: { ip },
    update: { failures: { increment: 1 }, lastFailureAt: new Date() },
    create: { ip, failures: 1, lastFailureAt: new Date() }
  })
}

export async function clearFailures(ip: string) {
  await prisma.loginAttempt.deleteMany({ where: { ip } })
}

export async function requiresCaptcha(ip: string): Promise<boolean> {
  const record = await prisma.loginAttempt.findUnique({ where: { ip } })
  if (!record) return false
  if (now() - record.lastFailureAt.getTime() > FAILURE_WINDOW_MS) return false
  return record.failures >= CAPTCHA_THRESHOLD
}

export async function failureCount(ip: string): Promise<number> {
  const record = await prisma.loginAttempt.findUnique({ where: { ip } })
  if (!record) return 0
  if (now() - record.lastFailureAt.getTime() > FAILURE_WINDOW_MS) return 0
  return record.failures
}

export async function createCaptcha() {
  const a = crypto.randomInt(1, 11)
  const b = crypto.randomInt(1, 11)
  const answer = String(a + b)
  const id = crypto.randomUUID()

  await prisma.captcha.create({
    data: { id, answer, expiresAt: new Date(now() + CAPTCHA_TTL_MS) }
  })

  return {
    id,
    question: `${a} + ${b} = ?`
  }
}

export async function verifyCaptcha(id: string | undefined, answer: string | undefined): Promise<boolean> {
  if (!id || !answer) return false
  const record = await prisma.captcha.findUnique({ where: { id } })
  if (!record) return false
  if (now() > record.expiresAt.getTime()) {
    await prisma.captcha.delete({ where: { id } }).catch(() => {})
    return false
  }
  const ok = record.answer === String(answer).trim()
  if (ok) {
    await prisma.captcha.delete({ where: { id } }).catch(() => {})
  }
  return ok
}
