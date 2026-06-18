import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { getAbsoluteStoragePath } from '../../lib/storage.js'
import fs from 'fs'

export const yearsRoutes: FastifyPluginAsync = async (app) => {
  // GET /years/overview
  app.get('/years/overview', { preValidation: [app.authenticate] }, async (request, reply) => {
    const [mediaYears, workYears, matchYears, chronicleYears] = await Promise.all([
      prisma.mediaAsset.groupBy({ by: ['year'] }),
      prisma.work.groupBy({ by: ['year'] }),
      prisma.match.groupBy({ by: ['playedAt'] }),
      prisma.chronicleEvent.groupBy({ by: ['year'] })
    ])

    const yearsWithData = new Set<number>()

    for (const m of mediaYears) {
      if (m.year) yearsWithData.add(m.year)
    }
    for (const w of workYears) {
      if (w.year) yearsWithData.add(w.year)
    }
    for (const m of matchYears) {
      if (m.playedAt) yearsWithData.add(m.playedAt.getFullYear())
    }
    for (const c of chronicleYears) {
      if (c.year) yearsWithData.add(c.year)
    }

    return { years: Array.from(yearsWithData).sort((a, b) => a - b) }
  })

  // GET /years/:year
  app.get('/years/:year', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { year: yearParam } = request.params as { year: string }
    const yearInt = parseInt(yearParam, 10)
    
    if (isNaN(yearInt)) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid year' } })
    }
    
    // Fetch all related data for the year concurrently
    const [media, works, matches, events] = await Promise.all([
      // Media
      prisma.mediaAsset.findMany({
        where: { year: yearInt },
        select: {
          id: true,
          type: true,
          takenAt: true,
          year: true,
          storagePath: true,
          createdByUserId: true,
          personTags: {
            include: {
              member: {
                select: {
                  displayName: true
                }
              }
            }
          }
        },
        orderBy: { takenAt: 'desc' }
      }),
      
      // Works
      prisma.work.findMany({
        where: { year: yearInt },
        select: {
          id: true,
          type: true,
          title: true,
          authorMemberId: true,
          year: true,
          createdByUserId: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Matches
      prisma.match.findMany({
        where: {
          playedAt: {
            gte: new Date(`${yearInt}-01-01T00:00:00.000Z`),
            lt: new Date(`${yearInt + 1}-01-01T00:00:00.000Z`)
          }
        },
        select: {
          id: true,
          playedAt: true,
          redScore: true,
          blueScore: true,
          mvpMemberId: true,
          createdByUserId: true,
          mvpMember: {
            select: {
              id: true,
              displayName: true
            }
          }
        },
        orderBy: { playedAt: 'asc' }
      }),
      
      // Events
      prisma.chronicleEvent.findMany({
        where: { year: yearInt },
        select: {
          id: true,
          year: true,
          happenedAt: true,
          title: true,
          description: true,
          createdByUserId: true,
          primaryMedia: {
            select: {
              id: true,
              type: true,
              takenAt: true,
              year: true
            }
          },
          members: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              team: true
            }
          },
          mediaAssets: {
            select: {
              id: true,
              type: true,
              takenAt: true,
              year: true
            }
          },
          works: {
            select: {
              id: true,
              type: true,
              title: true,
              authorMemberId: true,
              authorMember: {
                select: {
                  displayName: true
                }
              },
              year: true,
              date: true,
              createdAt: true
            }
          },
          matches: {
            select: {
              id: true,
              playedAt: true,
              redScore: true,
              blueScore: true,
              mvpMemberId: true,
              mvpMember: {
                select: {
                  id: true,
                  displayName: true
                }
              }
            }
          }
        },
        orderBy: { happenedAt: 'asc' }
      })
    ])
    
    const validMedia = []
    const missingMediaIds = []

    for (const m of media) {
      if (!m.storagePath) {
        missingMediaIds.push(m.id)
        continue
      }
      const absPath = getAbsoluteStoragePath(m.storagePath)
      if (!fs.existsSync(absPath)) {
        missingMediaIds.push(m.id)
      } else {
        validMedia.push(m)
      }
    }

    if (missingMediaIds.length > 0) {
      prisma.mediaAsset.deleteMany({ where: { id: { in: missingMediaIds } } }).catch(console.error)
    }

    return {
      year: yearInt,
      media: validMedia.map(m => ({
        id: m.id,
        type: m.type,
        takenAt: m.takenAt,
        year: m.year,
        createdByUserId: m.createdByUserId,
        personTags: m.personTags.map((pt: any) => ({
          id: pt.memberId,
          displayName: pt.member.displayName
        }))
      })),
      works: works.map((w: any) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        authorMemberId: w.authorMemberId,
        year: w.year,
        createdByUserId: w.createdByUserId
      })),
      matches,
      events
    }
  })
}
