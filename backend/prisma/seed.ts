import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { validatePassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@diyou.test'
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD is not set; skipping admin seed.')
    return
  }

  const validation = validatePassword(adminPassword)
  if (!validation.valid) {
    console.error(`ADMIN_PASSWORD does not meet the password policy: ${validation.message}`)
    process.exit(1)
  }

  // Only seed when the database is empty, so restarting the container does not
  // overwrite an admin password that may have been changed through the app.
  const existingUser = await prisma.user.findFirst()
  if (existingUser) {
    console.log('Database already contains users; skipping admin seed to avoid overwriting passwords.')
    return
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log(`Admin user created: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
