import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import type { MultipartFile } from '@fastify/multipart'

// Base storage directory
export const STORAGE_ROOT = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.resolve(process.cwd(), 'storage')

// Ensure a directory exists
export const ensureDir = async (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Saves a stream to a temporary file, calculates SHA256,
 * and then moves it to the final destination based on year/month.
 */
export async function saveMediaFile(
  file: MultipartFile,
  id: string,
  year: number,
  month: number
): Promise<{ storagePath: string; sha256: string; sizeBytes: number }> {
  const tempDir = path.join(STORAGE_ROOT, 'temp')
  await ensureDir(tempDir)

  const tempFilePath = path.join(tempDir, `${id}_temp`)
  const hash = crypto.createHash('sha256')
  
  // Create write stream
  const writeStream = fs.createWriteStream(tempFilePath)
  
  let sizeBytes = 0

  // We can pipe and hash at the same time using streams, but for simplicity:
  for await (const chunk of file.file) {
    writeStream.write(chunk)
    hash.update(chunk)
    sizeBytes += chunk.length
  }
  
  writeStream.end()
  
  // wait for stream to finish
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve())
    writeStream.on('error', reject)
  })

  const sha256 = hash.digest('hex')

  // Calculate final path
  // Format: media/original/{yyyy}/{mm}/{id}_{sha256}.{ext}
  const ext = path.extname(file.filename) || ''
  
  const yyyy = year.toString()
  const mm = month.toString().padStart(2, '0')
  const relativeDir = path.join('media', 'original', yyyy, mm)
  const finalDir = path.join(STORAGE_ROOT, relativeDir)
  
  await ensureDir(finalDir)

  const finalFilename = `${id}_${sha256}${ext}`
  const relativeStoragePath = path.join(relativeDir, finalFilename)
  const finalFilePath = path.join(STORAGE_ROOT, relativeStoragePath)

  // Move file from temp to final
  await fs.promises.rename(tempFilePath, finalFilePath)

  // Normalize path separators to forward slashes for the database
  return {
    storagePath: relativeStoragePath.replace(/\\/g, '/'),
    sha256,
    sizeBytes
  }
}

export async function saveAvatarFile(
  file: MultipartFile,
  memberId: string
): Promise<{ avatarUrl: string }> {
  const tempDir = path.join(STORAGE_ROOT, 'temp')
  await ensureDir(tempDir)

  const tempFilePath = path.join(tempDir, `avatar_${memberId}_temp`)
  
  const writeStream = fs.createWriteStream(tempFilePath)
  for await (const chunk of file.file) {
    writeStream.write(chunk)
  }
  writeStream.end()

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve())
    writeStream.on('error', reject)
  })

  const ext = path.extname(file.filename) || '.jpg'
  // append timestamp to bypass browser cache
  const timestamp = Date.now()
  const finalFilename = `${memberId}_${timestamp}${ext}`
  const relativeDir = 'avatars'
  const finalDir = path.join(STORAGE_ROOT, relativeDir)

  await ensureDir(finalDir)

  const relativeStoragePath = path.join(relativeDir, finalFilename)
  const finalFilePath = path.join(STORAGE_ROOT, relativeStoragePath)

  await fs.promises.rename(tempFilePath, finalFilePath)

  // Assuming /static-storage/ is mounted in main.ts
  const url = `/static-storage/${relativeStoragePath.replace(/\\/g, '/')}`
  
  return { avatarUrl: url }
}

export function getAbsoluteStoragePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
  const absolute = path.resolve(STORAGE_ROOT, normalized)
  if (!absolute.startsWith(path.resolve(STORAGE_ROOT))) {
    throw new Error('Invalid storage path')
  }
  return absolute
}
