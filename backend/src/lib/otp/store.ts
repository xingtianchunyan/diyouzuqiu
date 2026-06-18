import crypto from 'crypto'

export type OtpType = 'email' | 'phone'

interface OtpRecord {
  type: OtpType
  target: string
  code: string
  attempts: number
  expiresAt: number
}

const CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 3

const otps = new Map<string, OtpRecord>()

function now() {
  return Date.now()
}

function cleanup() {
  const t = now()
  for (const [id, record] of otps) {
    if (t > record.expiresAt) {
      otps.delete(id)
    }
  }
}

// Lightweight periodic cleanup (every 5 minutes)
setInterval(cleanup, 5 * 60 * 1000).unref()

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function createOtp(type: OtpType, target: string): { id: string; code: string; expiresIn: number } {
  const id = crypto.randomUUID()
  const code = generateCode()
  otps.set(id, {
    type,
    target: target.toLowerCase().trim(),
    code,
    attempts: 0,
    expiresAt: now() + CODE_TTL_MS
  })
  return { id, code, expiresIn: CODE_TTL_MS }
}

export function verifyOtp(id: string | undefined, target: string, code: string | undefined): boolean {
  if (!id || !code) return false
  const record = otps.get(id)
  if (!record) return false

  if (now() > record.expiresAt) {
    otps.delete(id)
    return false
  }

  if (record.target !== target.toLowerCase().trim()) {
    return false
  }

  record.attempts++
  if (record.attempts > MAX_ATTEMPTS) {
    otps.delete(id)
    return false
  }

  if (record.code !== code.trim()) {
    return false
  }

  otps.delete(id)
  return true
}

export function getOtpForTest(id: string): OtpRecord | undefined {
  return otps.get(id)
}
