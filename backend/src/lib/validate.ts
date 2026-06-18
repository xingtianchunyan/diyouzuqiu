import type { FastifyReply, FastifyRequest, preValidationHookHandler } from 'fastify'
import { z, type ZodTypeAny } from 'zod'

export function validateBody<T extends ZodTypeAny>(schema: T): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.issues
        }
      })
    }
    ;(request as any).validatedBody = result.data
  }
}

export function validateQuery<T extends ZodTypeAny>(schema: T): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query)
    if (!result.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error.issues
        }
      })
    }
    ;(request as any).validatedQuery = result.data
  }
}

export function validateParams<T extends ZodTypeAny>(schema: T): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params)
    if (!result.success) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path parameters',
          details: result.error.issues
        }
      })
    }
    ;(request as any).validatedParams = result.data
  }
}

export { z }
