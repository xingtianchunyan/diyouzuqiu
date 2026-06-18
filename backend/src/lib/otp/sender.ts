import type { OtpType } from './store.js'
import nodemailer from 'nodemailer'

export interface OtpSender {
  send(options: { type: OtpType; target: string; code: string }): Promise<void>
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

/**
 * Development/test sender: logs the code and does not send anything.
 * In non-production environments the API will return the code directly in the
 * response so the caller can see/use it.
 */
export const consoleSender: OtpSender = {
  async send({ type, target, code }) {
    // eslint-disable-next-line no-console
    console.log(`[OTP] type=${type} target=${target} code=${code}`)
  }
}

/**
 * SMTP sender for production email OTP.
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
export const smtpSender: OtpSender = {
  async send({ type, target, code }) {
    if (type !== 'email') {
      throw new Error('SMTP sender only supports email OTP')
    }

    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@diyou.test'

    if (!host || !user || !pass) {
      throw new Error('SMTP not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS')
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    })

    await transporter.sendMail({
      from,
      to: target,
      subject: '您的登录验证码',
      text: `您的登录验证码是：${code}，5 分钟内有效。请勿泄露给他人。`,
      html: `<p>您的登录验证码是：<strong>${code}</strong>，5 分钟内有效。请勿泄露给他人。</p>`
    })
  }
}

export function createOtpSender(): OtpSender {
  // In production, prefer SMTP when configured.
  if (isProduction() && process.env.SMTP_HOST) {
    return smtpSender
  }
  return consoleSender
}
