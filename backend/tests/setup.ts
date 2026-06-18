import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

const dbPath = path.resolve(process.cwd(), 'test.db')

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = `file:${dbPath}`
process.env.JWT_SECRET = 'test-secret'
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.ADMIN_PASSWORD = 'Testpass123'
process.env.STORAGE_ROOT = path.resolve(process.cwd(), 'tests', 'storage')

function safeRemove(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    // File may be locked by a previous Prisma process; ignore and let migrate handle it
  }
}

safeRemove(dbPath)
safeRemove(`${dbPath}-journal`)
safeRemove(`${dbPath}-wal`)
safeRemove(`${dbPath}-shm`)

execSync('npx prisma migrate deploy', { stdio: 'ignore' })
execSync('npx prisma db seed', { stdio: 'ignore' })

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma.js')
  await prisma.$disconnect()
})
