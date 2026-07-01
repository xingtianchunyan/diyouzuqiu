<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFilePickerRule, validateFile, type FilePickerScenario, type FileTypeRule } from '../../platform/file-picker-policy'

const { t } = useI18n()

const props = defineProps<{
  accept?: string
  multiple?: boolean
  maxSizeBytes?: number
  label?: string
  hint?: string
  disabled?: boolean
  /** 使用平台策略层的场景配置 */
  scenario?: FilePickerScenario
}>()

const emit = defineEmits<{
  (e: 'select', files: File[]): void
  (e: 'error', message: string): void
}>()

const dragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

const rule = computed<FileTypeRule | null>(() => {
  if (!props.scenario) return null
  return getFilePickerRule(props.scenario)
})

const acceptValue = computed(() => {
  if (props.accept) return props.accept
  return rule.value?.accept ?? '*'
})

const multipleValue = computed(() => {
  if (props.multiple !== undefined) return props.multiple
  return rule.value?.multiple ?? false
})

const maxSizeValue = computed(() => {
  if (props.maxSizeBytes !== undefined) return props.maxSizeBytes
  return rule.value?.maxSizeBytes ?? 0
})

const labelValue = computed(() => {
  if (props.label) return props.label
  if (rule.value?.labelKey) return t(rule.value.labelKey)
  return t('upload.dropzoneLabel')
})

const hintValue = computed(() => {
  if (props.hint) return props.hint
  if (rule.value?.hintKey) return t(rule.value.hintKey)
  return ''
})

function validateFiles(files: File[]): string | null {
  if (maxSizeValue.value > 0) {
    const oversized = files.find(f => f.size > maxSizeValue.value)
    if (oversized) return t('upload.fileTooLarge', { name: oversized.name })
  }

  for (const file of files) {
    if (rule.value) {
      const err = validateFile(file, rule.value)
      if (err) return t(err.key, err.params ?? { name: file.name })
    } else if (props.accept) {
      // 兼容旧 accept 扩展名校验
      const acceptList = props.accept.split(',').map(s => s.trim()).filter(Boolean)
      if (acceptList.length) {
        const lower = file.name.toLowerCase()
        const valid = acceptList.some(ext => {
          const clean = ext.replace(/^\./, '')
          return lower.endsWith(clean) || lower.endsWith(ext)
        })
        if (!valid) return t('upload.invalidFileType', { name: file.name })
      }
    }
  }

  return null
}

function handleFiles(files: File[]) {
  if (props.disabled) return
  const error = validateFiles(files)
  if (error) {
    emit('error', error)
    return
  }
  selectedFiles.value = multipleValue.value ? [...selectedFiles.value, ...files] : files
  emit('select', selectedFiles.value)
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length) handleFiles(files)
  if (target) target.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length) handleFiles(files)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (!props.disabled) dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function openPicker() {
  inputRef.value?.click()
}

function clearFiles() {
  selectedFiles.value = []
  emit('select', [])
}

defineExpose({ clearFiles })
</script>

<template>
  <div class="file-upload-zone">
    <div
      class="drop-zone"
      :class="{ active: dragOver, disabled }"
      @click="openPicker"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <input
        ref="inputRef"
        type="file"
        :accept="acceptValue"
        :multiple="multipleValue"
        class="hidden-input"
        @change="onFileChange"
        :disabled="disabled"
      />
      <div class="drop-content">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div class="drop-label">{{ labelValue }}</div>
        <div v-if="hintValue" class="drop-hint">{{ hintValue }}</div>
      </div>
    </div>

    <div v-if="selectedFiles.length" class="file-list">
      <div v-for="(file, idx) in selectedFiles" :key="idx" class="file-chip">
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
      </div>
      <button type="button" class="clear-btn" @click.stop="clearFiles">{{ t('common.clear') }}</button>
    </div>
  </div>
</template>

<style scoped>
.file-upload-zone {
  width: 100%;
}

.drop-zone {
  border: 1.5px dashed var(--border);
  border-radius: 8px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  color: var(--text-secondary);
}

.drop-zone:hover,
.drop-zone.active {
  border-color: var(--text-primary);
  background: rgba(255, 255, 255, 0.03);
}

.drop-zone.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hidden-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.drop-label {
  font-family: var(--sans);
  font-size: 0.95rem;
  color: var(--text-h);
}

.drop-hint {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.file-list {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.file-name {
  color: var(--text-h);
}

.file-size {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.clear-btn:hover {
  color: var(--text-h);
}
</style>
