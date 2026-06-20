import { fileTypeFromBuffer } from 'file-type'

export interface ContentValidationResult {
  valid: boolean
  detected?: string
  expected: string[]
}

function matchesMime(mime: string, allowed: string[]): boolean {
  return allowed.some((allowedMime) => {
    if (allowedMime.endsWith('/*')) {
      return mime.startsWith(allowedMime.slice(0, -1))
    }
    return allowedMime === mime
  })
}

/**
 * Validate that the binary content of a buffer matches one of the expected MIME types.
 * This is a content-level check independent of the filename extension or the
 * Content-Type header supplied by the client.
 */
export async function validateBufferMimeType(
  buffer: Buffer,
  expectedMimeTypes: string[]
): Promise<ContentValidationResult> {
  const result = await fileTypeFromBuffer(buffer)
  if (!result) {
    return { valid: false, expected: expectedMimeTypes }
  }
  return {
    valid: matchesMime(result.mime, expectedMimeTypes),
    detected: result.mime,
    expected: expectedMimeTypes
  }
}
