import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { saveMediaFile, getAbsoluteStoragePath } from '../../lib/storage.js'
import fs from 'fs'
import path from 'path'

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.post('/media', { preValidation: [app.authenticate] }, async (request, reply) => {
    // We expect multipart form data
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } })
    }

    // Try to get metadata from fields if any
    let meta: any = {}
    if (data.fields.meta && 'value' in data.fields.meta) {
      try {
        meta = JSON.parse(data.fields.meta.value as string)
      } catch (err) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid meta JSON' } })
      }
    }

    const takenAt = meta.takenAt ? new Date(meta.takenAt) : null
    const year = meta.year || (takenAt ? takenAt.getFullYear() : new Date().getFullYear())
    const month = takenAt ? takenAt.getMonth() + 1 : new Date().getMonth() + 1
    const personTagIds: string[] = meta.personTagIds || []

    const ext = path.extname(data.filename).toLowerCase()
    let type: string = 'PHOTO'
    if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      type = 'VIDEO'
    }

    const mimeType = data.mimetype

    // 1. Create initial DB record to get an ID
    const user = request.user
    const media = await prisma.mediaAsset.create({
      data: {
        type,
        originalFilename: data.filename,
        storagePath: '', // Will update later
        mimeType,
        sizeBytes: 0,    // Will update later
        takenAt,
        year,
        createdByUserId: user.id,
      }
    })

    try {
      // 2. Save file
      const { storagePath, sha256, sizeBytes } = await saveMediaFile(data, media.id, year, month)

      // 3. Update DB record
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

  app.get('/media', async (request, reply) => {
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

  app.get('/media/:id', async (request, reply) => {
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

  app.put('/media/:id', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { takenAt?: string | null; year?: number | null; personTagIds?: string[] }

    const media = await prisma.mediaAsset.findUnique({ where: { id } })
    if (!media) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Media not found' } })
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

  app.get('/media/:id/file', async (request, reply) => {
    const { id } = request.params as { id: string }
    const media = await prisma.mediaAsset.findUnique({ where: { id } })
    
    if (!media || !media.storagePath) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } })
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
