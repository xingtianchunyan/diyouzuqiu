import 'dotenv/config'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { registerHealthModule } from './modules/health/health.module.js'
import { authPlugin } from './plugins/auth.plugin.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js'
import { plannerRoutes } from './modules/planner/planner.routes.js'
import { mediaRoutes } from './modules/media/media.routes.js'
import { familiesRoutes } from './modules/families/families.routes.js'
import { membersRoutes } from './modules/members/members.routes.js'
import { matchesRoutes } from './modules/matches/matches.routes.js'
import { worksRoutes } from './modules/works/works.routes.js'
import { yearsRoutes } from './modules/years/years.routes.js'
import { chroniclesRoutes } from './modules/chronicles/chronicles.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { parseRoutes } from './modules/parse/parse.routes.js'
import { prisma } from './lib/prisma.js'
import bcrypt from 'bcryptjs'
import path from 'path'
import { STORAGE_ROOT } from './lib/storage.js'
import { deepEscapeHtml } from './lib/xss.js'

function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGIN environment variable must be set in production')
    }
    return false
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw.split(',').map(s => s.trim())
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true
  })

  await app.register(cors, {
    origin: getCorsOrigin(),
    credentials: true,
  })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // SPA 可能需要内联脚本，生产建议nonce
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允许静态资源被同源/CORS 引用
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false
  })

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
    allowList: process.env.NODE_ENV === 'test' ? ['127.0.0.1', '::1'] : undefined,
    skipOnError: false,
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded: ${context.max} requests per ${context.after}`,
        retryAfter: context.after
      }
    })
  })

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100, // 100MB global max
      files: 20
    }
  })

  await app.register(fastifyStatic, {
    root: STORAGE_ROOT,
    prefix: '/static-storage/',
    decorateReply: true,
    serve: false
  })

  await app.register(fastifyCookie)
  await app.register(authPlugin)

  app.setErrorHandler((error: any, request, reply) => {
    if (process.env.NODE_ENV !== 'production') {
      app.log.error(error)
    }
    const statusCode = error.statusCode || reply.statusCode || 500
    if (statusCode >= 500) {
      return reply.code(statusCode).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } })
    }
    return reply.code(statusCode).send(error)
  })

  // Global XSS output filtering for JSON responses.
  // AI endpoints (planner) set config.skipXssEscape = true to preserve markdown/HTML.
  app.addHook('onSend', async (request, reply, payload) => {
    if ((request.routeOptions.config as any).skipXssEscape) {
      return payload
    }
    if (payload === null || payload === undefined) {
      return payload
    }

    let data: any
    if (typeof payload === 'string') {
      const trimmed = payload.trim()
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return payload
      }
      try {
        data = JSON.parse(trimmed)
      } catch {
        return payload
      }
    } else {
      data = payload
    }

    const escaped = deepEscapeHtml(data)
    reply.type('application/json')
    return JSON.stringify(escaped)
  })

  app.register(async (api) => {
    await api.register(authRoutes)
    await api.register(familiesRoutes)
    await api.register(membersRoutes)
    await api.register(matchesRoutes)
    await api.register(mediaRoutes)
    await api.register(worksRoutes)
    await api.register(yearsRoutes)
    await api.register(knowledgeRoutes)
    await api.register(plannerRoutes)
    await api.register(chroniclesRoutes)
    await api.register(usersRoutes, { prefix: '/admin/users' })
    await api.register(parseRoutes)
  }, { prefix: '/api/v1' })

  app.get('/static-storage/avatars/:file', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { file } = request.params as { file: string }
    const safeFile = path.basename(file)
    return reply.sendFile(`avatars/${safeFile}`)
  })

  registerHealthModule(app)

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@diyou.test'
    const adminPassword = process.env.ADMIN_PASSWORD || 'diyou2024'
    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          password: hashedPassword,
          role: 'ADMIN'
        },
        create: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
    } catch (err) {
      app.log.error(err)
    }
  }

  return app
}
