import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
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

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: true,
})

await app.register(fastifyMultipart, {
  limits: {
    fileSize: 1024 * 1024 * 500 // 500MB
  }
})

// Optional: you can register fastifyStatic if you want to use reply.sendFile()
// But we can also use stream pipeline. Let's use fastifyStatic for easy range request handling.
// It requires a root directory, but we can set it to the storage root.
import { STORAGE_ROOT } from './lib/storage.js'
await app.register(fastifyStatic, {
  root: STORAGE_ROOT,
  prefix: '/static-storage/', // not exposed to public by default, we will just use reply.sendFile()
  decorateReply: true,
  serve: false // don't serve automatically, we'll manually use reply.sendFile()
})

await app.register(authPlugin)

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

// Route for serving avatars manually
app.get('/static-storage/avatars/:file', async (request, reply) => {
  const { file } = request.params as { file: string }
  return reply.sendFile(`avatars/${file}`)
})

registerHealthModule(app)

const port = Number(process.env.PORT ?? 3000)

if (process.env.NODE_ENV !== 'production') {
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

await app.listen({ port, host: '0.0.0.0' })
