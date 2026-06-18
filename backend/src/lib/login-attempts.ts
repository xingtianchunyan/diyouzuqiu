import crypto from 'crypto'

interface AttemptRecord {
  failures: number
  lastFailureAt: number
}

interface CaptchaRecord {
  answer: string
  expiresAt: number
}

const FAILURE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const CAPTCHA_TTL_MS = 5 * 60 * 1000 // 5 minutes
const CAPTCHA_THRESHOLD = 3

const attempts = new Map<string, AttemptRecord>()
const captchas = new Map<string, CaptchaRecord>()

function now() {
  return Date.now()
}

function cleanup() {
  const t = now()
  for (const [ip, record] of attempts) {
    if (t - record.lastFailureAt > FAILURE_WINDOW_MS) {
      attempts.delete(ip)
    }
  }
  for (const [id, record] of captchas) {
    if (t > record.expiresAt) {
      captchas.delete(id)
    }
  }
}

// Lightweight periodic cleanup (every 5 minutes)
setInterval(cleanup, 5 * 60 * 1000).unref()

export function recordFailure(ip: string) {
  const record = attempts.get(ip)
  if (!record) {
    attempts.set(ip, { failures: 1, lastFailureAt: now() })
  } else {
    record.failures += 1
    record.lastFailureAt = now()
  }
}

export function clearFailures(ip: string) {
  attempts.delete(ip)
}

export function requiresCaptcha(ip: string): boolean {
  const record = attempts.get(ip)
  if (!record) return false
  if (now() - record.lastFailureAt > FAILURE_WINDOW_MS) return false
  return record.failures >= CAPTCHA_THRESHOLD
}

export function failureCount(ip: string): number {
  const record = attempts.get(ip)
  if (!record) return 0
  if (now() - record.lastFailureAt > FAILURE_WINDOW_MS) return 0
  return record.failures
}

export function createCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  const answer = String(a + b)
  const id = crypto.randomUUID()
  captchas.set(id, { answer, expiresAt: now() + CAPTCHA_TTL_MS })
  return {
    id,
    question: `${a} + ${b} = ?`
  }
}

export function verifyCaptcha(id: string | undefined, answer: string | undefined): boolean {
  if (!id || !answer) return false
  const record = captchas.get(id)
  if (!record) return false
  if (now() > record.expiresAt) {
    captchas.delete(id)
    return false
  }
  const ok = record.answer === String(answer).trim()
  if (ok) {
    captchas.delete(id)
  }
  return ok
}
