import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { validateBody, z } from '../../lib/validate.js'
import { validatePassword } from '../../lib/password.js'
import { clearFailures, createCaptcha, failureCount, recordFailure, requiresCaptcha, verifyCaptcha } from '../../lib/login-attempts.js'
import { createOtp, verifyOtp } from '../../lib/otp/store.js'
import { createOtpSender, smtpConfigured } from '../../lib/otp/sender.js'

const TOKEN_COOKIE_NAME = 'token'
const TOKEN_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  captchaId: z.string().optional(),
  captchaAnswer: z.string().optional()
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

const otpSendSchema = z.object({
  email: z.string().email()
})

const otpLoginSchema = z.object({
  email: z.string().email(),
  codeId: z.string().min(1),
  code: z.string().length(6)
})

const otpSender = createOtpSender()

function signUserToken(app: any, user: { id: string; role: string; email: string; memberId: string | null; tokenVersion: number }) {
  return app.jwt.sign({
    id: user.id,
    role: user.role,
    email: user.email,
    memberId: user.memberId,
    tokenVersion: user.tokenVersion
  })
}

function setTokenCookie(reply: any, token: string) {
  reply.setCookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE_MS
  })
}

async function buildLoginResponse(
  app: any,
  reply: any,
  user: { id: string; role: string; email: string; phone: string | null; memberId: string | null; tokenVersion: number }
) {
  const token = signUserToken(app, user)
  setTokenCookie(reply, token)
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      memberId: user.memberId
    }
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/captcha', async (request, reply) => {
    const captcha = await createCaptcha()
    return {
      id: captcha.id,
      question: captcha.question
    }
  })

  app.post('/auth/login', {
    preValidation: validateBody(loginSchema),
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const ip = request.ip
    const { email, password, captchaId, captchaAnswer } = (request as any).validatedBody as {
      email: string
      password: string
      captchaId?: string
      captchaAnswer?: string
    }

    if (await requiresCaptcha(ip)) {
      if (!(await verifyCaptcha(captchaId, captchaAnswer))) {
        return reply.code(403).send({
          error: {
            code: 'CAPTCHA_REQUIRED',
            message: 'Captcha required after repeated failed login attempts',
            failures: await failureCount(ip)
          }
        })
      }
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      await recordFailure(ip)
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      await recordFailure(ip)
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } })
    }

    await clearFailures(ip)
    return buildLoginResponse(app, reply, user)
  })

  app.post('/auth/refresh', { preValidation: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, phone: true, role: true, memberId: true, tokenVersion: true }
    })
    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'User not found' } })
    }

    const token = signUserToken(app, user)
    setTokenCookie(reply, token)
    return { token }
  })

  app.post('/auth/logout', { preValidation: [app.authenticate] }, async (request, reply) => {
    await prisma.user.update({
      where: { id: request.user.id },
      data: { tokenVersion: { increment: 1 } }
    })
    reply.clearCookie(TOKEN_COOKIE_NAME, { path: '/' })
    return { message: 'Logged out successfully' }
  })

  app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, phone: true, role: true, memberId: true }
    })

    if (!user) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }

    return user
  })

  app.post('/auth/change-password', {
    preValidation: [app.authenticate, validateBody(changePasswordSchema)]
  }, async (request, reply) => {
    const { currentPassword, newPassword } = (request as any).validatedBody as {
      currentPassword: string
      newPassword: string
    }

    const passwordCheck = validatePassword(newPassword)
    if (!passwordCheck.valid) {
      return reply.code(400).send({ error: { code: 'WEAK_PASSWORD', message: passwordCheck.message } })
    }

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } }
    })

    return { message: 'Password changed successfully' }
  })

  app.post('/auth/otp/send', {
    preValidation: validateBody(otpSendSchema),
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '10 minutes'
      }
    }
  }, async (request, reply) => {
    const { email } = (request as any).validatedBody as { email: string }
    const { id, code, expiresIn } = await createOtp('email', email)

    try {
      await otpSender.send({ type: 'email', target: email, code })
    } catch (err: any) {
      request.log.error({ err }, 'Failed to send OTP')
      return reply.code(500).send({ error: { code: 'SEND_FAILED', message: 'Failed to send verification code' } })
    }

    // When SMTP is not configured (dev/test) we return the code to facilitate testing.
    // When SMTP is configured the code is only delivered via the real email channel.
    if (!smtpConfigured()) {
      return { codeId: id, code, expiresIn }
    }
    return { codeId: id, expiresIn }
  })

  app.post('/auth/otp/login', {
    preValidation: validateBody(otpLoginSchema),
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { email, codeId, code } = (request as any).validatedBody as {
      email: string
      codeId: string
      code: string
    }

    if (!(await verifyOtp(codeId, email, code))) {
      return reply.code(401).send({ error: { code: 'INVALID_OTP', message: 'Invalid or expired verification code' } })
    }

    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      const autoRegisterEnabled = process.env.OTP_AUTO_REGISTER !== 'false'
      if (!autoRegisterEnabled) {
        return reply.code(401).send({ error: { code: 'USER_NOT_FOUND', message: 'No account found for this email' } })
      }

      // Auto-register new users via email OTP
      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10)
      user = await prisma.user.create({
        data: {
          email,
          password: randomPassword,
          role: 'MEMBER'
        }
      })
    }

    return buildLoginResponse(app, reply, user)
  })
}
