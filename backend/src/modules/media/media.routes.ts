import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { saveMediaFile, getAbsoluteStoragePath } from '../../lib/storage.js'
import { validateBufferMimeType } from '../../lib/file-type.js'
import { validateBody, z } from '../../lib/validate.js'
import fs from 'fs'
import path from 'path'

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
const ALLOWED_MEDIA_TYPES = [...ALLOWED_PHOTO_TYPES, ...ALLOWED_VIDEO_TYPES]

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv']
const ALLOWED_EXTS = [...PHOTO_EXTS, ...VIDEO_EXTS]

function isAllowedFile(filename: string, mimetype: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) return false
  if (!ALLOWED_MEDIA_TYPES.includes(mimetype)) return false
  return true
}

const mediaMetaSchema = z.object({
  takenAt: z.string().datetime().optional(),
  year: z.number().int().optional(),
  personTagIds: z.array(z.string()).max(100).optional()
})

const updateMediaSchema = z.object({
  takenAt: z.string().datetime().optional().nullable(),
  year: z.number().int().optional().nullable(),
  personTagIds: z.array(z.string()).max(100).optional()
})

const PHOTO_MAX_SIZE = 20 * 1024 * 1024
const VIDEO_MAX_SIZE = 100 * 1024 * 1024

function canAccessMedia(
  media: { createdByUserId: string | null; personTags: { memberId: string }[] },
  user: { role: string; id: string; memberId: string | null }
): boolean {
  if (user.role === 'ADMIN') return true
  if (media.createdByUserId === user.id) return true
  if (user.memberId && media.personTags.length === 1 && media.personTags[0].memberId === user.memberId) {
    return true
  }
  return false
}

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.post('/media', { preValidation: [app.authenticate] }, async (request, reply) => {
    // We expect multipart form data
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    }

    if (!isAllowedFile(data.filename, data.mimetype)) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Only photos (${PHOTO_EXTS.join(', ')}) and videos (${VIDEO_EXTS.join(', ')}) are allowed`
        }
      })
    }

    const ext = path.extname(data.filename).toLowerCase()
    const isVideo = VIDEO_EXTS.includes(ext)
    const maxSize = isVideo ? VIDEO_MAX_SIZE : PHOTO_MAX_SIZE
    const type: string = isVideo ? 'VIDEO' : 'PHOTO'

    // Try to get metadata from fields if any
    let rawMeta: any = {}
    if (data.fields.meta && 'value' in data.fields.meta) {
      try {
        rawMeta = JSON.parse(data.fields.meta.value as string)
      } catch (err) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid meta JSON' } })
      }
    }

    const metaResult = mediaMetaSchema.safeParse(rawMeta)
    if (!metaResult.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid meta fields', details: metaResult.error.issues } })
    }
    const meta = metaResult.data

    const takenAt = meta.takenAt ? new Date(meta.takenAt) : null
    const year = meta.year ?? (takenAt ? takenAt.getFullYear() : new Date().getFullYear())
    const month = takenAt ? takenAt.getMonth() + 1 : new Date().getMonth() + 1
    const personTagIds: string[] = meta.personTagIds || []

    // Read and validate the file content before persisting anything.
    const chunks: Buffer[] = []
    let streamingSize = 0
    for await (const chunk of data.file) {
      streamingSize += chunk.length
      if (streamingSize > maxSize) {
        return reply.code(400).send({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB`
          }
        })
      }
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    if (buffer.length === 0) {
      return reply.code(400).send({ error: { code: 'EMPTY_FILE', message: 'Uploaded file is empty' } })
    }

    const contentCheck = await validateBufferMimeType(buffer, isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_PHOTO_TYPES)
    if (!contentCheck.valid) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_FILE_CONTENT',
          message: `File content does not match allowed ${isVideo ? 'video' : 'photo'} type (detected: ${contentCheck.detected || 'unknown'})`
        }
      })
    }

    const user = request.user
    const media = await prisma.mediaAsset.create({
      data: {
        type,
        originalFilename: data.filename,
        storagePath: '', // Will update later
        mimeType: data.mimetype,
        sizeBytes: 0,    // Will update later
        takenAt,
        year,
        createdByUserId: user.id,
      }
    })

    try {
      // Save file
      const { storagePath, sizeBytes } = await saveMediaFile(buffer, data.filename, media.id, year, month)

      // Update DB record
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: {
          storagePath,
          sizeBytes,
          personTags: {
            create: personTagIds.map(memberId => ({
              member: { connect: { id: memberId } }
            }))
          }
        }
      })

      return reply.code(201).send({ id: media.id })
    } catch (err) {
      // Rollback if saving fails
      await prisma.mediaAsset.delete({ where: { id: media.id } }).catch(() => {})
      throw err
    }
  })

  app.get('/media', { preValidation: [app.authenticate] }, async (request, reply) => {
    const query = request.query as { type?: string; year?: string; personId?: string }
    const where: any = {}

    if (query.type && (query.type === 'PHOTO' || query.type === 'VIDEO')) {
      where.type = query.type
    }
    if (query.year) {
      where.year = parseInt(query.year, 10)
    }
    if (query.personId) {
      where.personTags = {
        some: { memberId: query.personId }
      }
    }

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      include: {
        personTags: {
          include: {
            member: {
              select: {
                displayName: true
              }
            }
          }
        }
      }
    })

    const validAssets = []
    const missingIds = []

    for (const a of assets) {
      if (!a.storagePath) {
        missingIds.push(a.id)
        continue
      }
      const absPath = getAbsoluteStoragePath(a.storagePath)
      if (!fs.existsSync(absPath)) {
        missingIds.push(a.id)
      } else {
        validAssets.push(a)
      }
    }

    if (missingIds.length > 0) {
      // Fire and forget auto-cleanup for ghost files
      prisma.mediaAsset.deleteMany({ where: { id: { in: missingIds } } }).catch(console.error)
    }

    return validAssets.map(a => ({
      id: a.id,
      type: a.type,
      originalFilename: a.originalFilename,
      takenAt: a.takenAt?.toISOString() || null,
      year: a.year,
      createdByUserId: a.createdByUserId,
      thumbUrl: null, // Thumbnails feature for later
      personTags: a.personTags.map((pt: any) => ({
        id: pt.memberId,
        displayName: pt.member.displayName
      }))
    }))
  })

  app.get('/media/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        personTags: {
          include: { member: true }
        }
      }
    })

    if (!media) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Media not found' } })
    }

    if (!canAccessMedia(media, request.user)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to view this media' } })
    }

    return {
      id: media.id,
      type: media.type,
      takenAt: media.takenAt?.toISOString() || null,
      year: media.year,
      thumbUrl: null,
      personTags: media.personTags.map((pt: any) => ({
        id: pt.member.id,
        displayName: pt.member.displayName
      }))
    }
  })

  app.put('/media/:id', { preValidation: [app.authenticate, validateBody(updateMediaSchema)] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = (request as any).validatedBody as { takenAt?: string | null; year?: number | null; personTagIds?: string[] }
    const user = request.user

    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { personTags: true }
    })
    if (!media) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Media not found' } })
    }

    if (user.role !== 'ADMIN') {
      const isUploader = media.createdByUserId === user.id
      let isOnlyMe = false
      if (user.memberId) {
        isOnlyMe = media.personTags.length === 1 && media.personTags[0].memberId === user.memberId
      }
      if (!isUploader && !isOnlyMe) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only edit media you uploaded or that is exclusively tagged with your member profile' } })
      }
    }

    const updateData: any = {}
    if (body.takenAt !== undefined) {
      updateData.takenAt = body.takenAt ? new Date(body.takenAt) : null
    }
    if (body.year !== undefined) {
      updateData.year = body.year
    }

    if (body.personTagIds) {
      // First delete all existing tags, then add new ones
      await prisma.mediaPersonTag.deleteMany({ where: { mediaId: id } })
      updateData.personTags = {
        create: body.personTagIds.map(memberId => ({
          member: { connect: { id: memberId } }
        }))
      }
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: updateData,
      include: {
        personTags: {
          include: { member: true }
        }
      }
    })

    return {
      id: updated.id,
      type: updated.type,
      takenAt: updated.takenAt?.toISOString() || null,
      year: updated.year,
      thumbUrl: null,
      personTags: updated.personTags.map((pt: any) => ({
        id: pt.member.id,
        displayName: pt.member.displayName
      }))
    }
  })

  app.get('/media/:id/file', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { personTags: true }
    })

    if (!media || !media.storagePath) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } })
    }

    if (!canAccessMedia(media, request.user)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to view this file' } })
    }

    return reply.sendFile(media.storagePath)
  })

  // DELETE /media/:id
  app.delete('/media/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user

    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { personTags: true }
    })

    if (!media) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Media not found' } })
    }

    if (user.role !== 'ADMIN') {
      const isUploader = media.createdByUserId === user.id
      
      let isOnlyMe = false
      if (user.memberId) {
        isOnlyMe = media.personTags.length === 1 && media.personTags[0].memberId === user.memberId
      }
      
      if (!isUploader && !isOnlyMe) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only delete media you uploaded or that is exclusively tagged with your member profile' } })
      }
    }

    // Delete file
    const absPath = getAbsoluteStoragePath(media.storagePath)
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath)
    }

    await prisma.mediaAsset.delete({ where: { id } })

    return { success: true }
  })
}
