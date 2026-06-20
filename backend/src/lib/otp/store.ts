import crypto from 'crypto'
import { prisma } from '../prisma.js'

export type OtpType = 'email' | 'phone'

const CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 3

function now() {
  return Date.now()
}

function cleanup() {
  const cutoff = new Date(now())
  prisma.otpCode.deleteMany({ where: { expiresAt: { lt: cutoff } } }).catch(() => {})
}

// Lightweight periodic cleanup (every 5 minutes)
setInterval(cleanup, 5 * 60 * 1000).unref()

function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000))
}

export async function createOtp(type: OtpType, target: string): Promise<{ id: string; code: string; expiresIn: number }> {
  const id = crypto.randomUUID()
  const code = generateCode()

  await prisma.otpCode.create({
    data: {
      id,
      type,
      target: target.toLowerCase().trim(),
      code,
      attempts: 0,
      expiresAt: new Date(now() + CODE_TTL_MS)
    }
  })

  return { id, code, expiresIn: CODE_TTL_MS }
}

export async function verifyOtp(id: string | undefined, target: string, code: string | undefined): Promise<boolean> {
  if (!id || !code) return false

  const record = await prisma.otpCode.findUnique({ where: { id } })
  if (!record) return false

  if (now() > record.expiresAt.getTime()) {
    await prisma.otpCode.delete({ where: { id } }).catch(() => {})
    return false
  }

  if (record.target !== target.toLowerCase().trim()) {
    return false
  }

  const attempts = record.attempts + 1
  if (attempts > MAX_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { id } }).catch(() => {})
    return false
  }

  if (record.code !== code.trim()) {
    await prisma.otpCode.update({ where: { id }, data: { attempts } })
    return false
  }

  await prisma.otpCode.delete({ where: { id } }).catch(() => {})
  return true
}

export async function getOtpForTest(id: string) {
  return prisma.otpCode.findUnique({ where: { id } })
}
