/**
 * 文件选择策略
 *
 * 统一所有上传入口的 accept 规则、校验规则与错误提示。
 * 页面/组件不再自行拼接 accept 字符串。
 */

import { shouldUseExplicitMimeList, type CapabilityContext } from './capabilities'

export type FilePickerScenario = 'media' | 'chronicleAttachment' | 'avatar' | 'knowledgeDoc'

export interface FileTypeRule {
  /** accept 属性值 */
  accept: string
  /** 用于前端校验的 MIME 白名单 */
  mimeTypes: string[]
  /** 用于前端校验的扩展名白名单（含点号） */
  extensions: string[]
  /** 是否多选 */
  multiple: boolean
  /** 默认最大文件大小（字节），0 表示不限制，由调用方或后端控制 */
  maxSizeBytes: number
  /** i18n 键：上传入口标签 */
  labelKey: string
  /** i18n 键：提示文本 */
  hintKey: string
  /** i18n 键：文件类型错误提示 */
  invalidTypeKey: string
  /** i18n 键：文件过大错误提示 */
  tooLargeKey: string
}

const IMAGE_MIME_EXPLICIT = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
const VIDEO_MIME_EXPLICIT = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v']

const COMMON_DOC_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown'
]

const COMMON_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md']

function buildMediaRule(ctx?: CapabilityContext): FileTypeRule {
  const explicit = shouldUseExplicitMimeList('media', ctx)

  if (explicit) {
    return {
      accept: [...IMAGE_MIME_EXPLICIT, ...VIDEO_MIME_EXPLICIT].join(','),
      mimeTypes: [...IMAGE_MIME_EXPLICIT, ...VIDEO_MIME_EXPLICIT],
      extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
      multiple: true,
      maxSizeBytes: 0,
      labelKey: 'upload.mediaLabel',
      hintKey: 'upload.mediaHintExplicit',
      invalidTypeKey: 'upload.invalidMediaType',
      tooLargeKey: 'upload.fileTooLarge'
    }
  }

  return {
    accept: 'image/*,video/*',
    mimeTypes: ['image/*', 'video/*'],
    extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
    multiple: true,
    maxSizeBytes: 0,
    labelKey: 'upload.mediaLabel',
    hintKey: 'upload.mediaHint',
    invalidTypeKey: 'upload.invalidMediaType',
    tooLargeKey: 'upload.fileTooLarge'
  }
}

function buildChronicleAttachmentRule(ctx?: CapabilityContext): FileTypeRule {
  const explicit = shouldUseExplicitMimeList('chronicleAttachment', ctx)

  if (explicit) {
    return {
      accept: [...IMAGE_MIME_EXPLICIT, ...VIDEO_MIME_EXPLICIT].join(','),
      mimeTypes: [...IMAGE_MIME_EXPLICIT, ...VIDEO_MIME_EXPLICIT],
      extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
      multiple: false,
      maxSizeBytes: 0,
      labelKey: 'upload.chronicleAttachmentLabel',
      hintKey: 'upload.chronicleAttachmentHintExplicit',
      invalidTypeKey: 'upload.invalidMediaType',
      tooLargeKey: 'upload.fileTooLarge'
    }
  }

  return {
    accept: 'image/*,video/*',
    mimeTypes: ['image/*', 'video/*'],
    extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
    multiple: false,
    maxSizeBytes: 0,
    labelKey: 'upload.chronicleAttachmentLabel',
    hintKey: 'upload.chronicleAttachmentHint',
    invalidTypeKey: 'upload.invalidMediaType',
    tooLargeKey: 'upload.fileTooLarge'
  }
}

function buildAvatarRule(): FileTypeRule {
  return {
    accept: 'image/png,image/jpeg,image/webp',
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    multiple: false,
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    labelKey: 'upload.avatarLabel',
    hintKey: 'upload.avatarHint',
    invalidTypeKey: 'upload.invalidAvatarType',
    tooLargeKey: 'upload.avatarTooLarge'
  }
}

function buildKnowledgeDocRule(): FileTypeRule {
  return {
    accept: COMMON_DOC_MIME.join(','),
    mimeTypes: COMMON_DOC_MIME,
    extensions: COMMON_DOC_EXTENSIONS,
    multiple: false,
    maxSizeBytes: 0,
    labelKey: 'upload.knowledgeDocLabel',
    hintKey: 'upload.knowledgeDocHint',
    invalidTypeKey: 'upload.invalidKnowledgeDocType',
    tooLargeKey: 'upload.fileTooLarge'
  }
}

export function getFilePickerRule(scenario: FilePickerScenario, ctx?: CapabilityContext): FileTypeRule {
  switch (scenario) {
    case 'media':
      return buildMediaRule(ctx)
    case 'chronicleAttachment':
      return buildChronicleAttachmentRule(ctx)
    case 'avatar':
      return buildAvatarRule()
    case 'knowledgeDoc':
      return buildKnowledgeDocRule()
    default:
      // exhaustive check
      throw new Error(`Unknown file picker scenario: ${scenario}`)
  }
}

/**
 * 校验单个文件是否符合规则。
 * 返回错误 i18n 键 + 参数，或 null 表示通过。
 */
export interface FileValidationError {
  key: string
  params?: Record<string, string | number>
}

export function validateFile(file: File, rule: FileTypeRule): FileValidationError | null {
  if (rule.maxSizeBytes > 0 && file.size > rule.maxSizeBytes) {
    return {
      key: rule.tooLargeKey,
      params: { name: file.name, max: `${(rule.maxSizeBytes / 1024 / 1024).toFixed(1)} MB` }
    }
  }

  const lowerName = file.name.toLowerCase()
  const extMatch = rule.extensions.some(ext => lowerName.endsWith(ext))
  const mimeMatch = rule.mimeTypes.some(mime => {
    if (mime.endsWith('/*')) {
      return file.type.startsWith(mime.replace('/*', '/'))
    }
    return file.type === mime
  })

  if (!extMatch && !mimeMatch) {
    return { key: rule.invalidTypeKey, params: { name: file.name } }
  }

  return null
}
