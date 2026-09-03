import 'dotenv/config'
import fs from 'fs'
import { prisma } from '../src/lib/prisma.js'
import { generateMediaThumbnail, getAbsoluteStoragePath } from '../src/lib/storage.js'

/**
 * One-off backfill: generate webp thumbnails for existing PHOTO media assets
 * whose thumbPath is still null. Safe to re-run; already-thumbnailed records
 * are skipped. Run from the backend directory:
 *
 *   npx tsx scripts/backfill-thumbnails.ts
 */
async function main() {
  const photos = await prisma.mediaAsset.findMany({
    where: { type: 'PHOTO', thumbPath: null },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`Found ${photos.length} photo asset(s) without a thumbnail`)

  let generated = 0
  let missingSource = 0
  let failed = 0

  for (const photo of photos) {
    if (!photo.storagePath) {
      missingSource++
      continue
    }

    const absPath = getAbsoluteStoragePath(photo.storagePath)
    if (!fs.existsSync(absPath)) {
      missingSource++
      console.warn(`[skip] ${photo.id}: source file missing (${photo.storagePath})`)
      continue
    }

    const takenAt = photo.takenAt ?? photo.createdAt
    const year = photo.year ?? takenAt.getFullYear()
    const month = takenAt.getMonth() + 1

    const thumbPath = await generateMediaThumbnail(absPath, photo.id, year, month)
    if (!thumbPath) {
      failed++
      continue
    }

    await prisma.mediaAsset.update({
      where: { id: photo.id },
      data: { thumbPath }
    })
    generated++
    console.log(`[ok] ${photo.id} -> ${thumbPath}`)
  }

  console.log(`Done. generated=${generated} missingSource=${missingSource} failed=${failed}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
