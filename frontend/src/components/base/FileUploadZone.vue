<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  accept?: string
  multiple?: boolean
  maxSizeBytes?: number
  label?: string
  hint?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', files: File[]): void
  (e: 'error', message: string): void
}>()

const dragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

const acceptList = computed(() => {
  if (!props.accept) return []
  return props.accept.split(',').map(s => s.trim()).filter(Boolean)
})

function validateFiles(files: File[]): File[] | string {
  if (props.maxSizeBytes) {
    const oversized = files.find(f => f.size > props.maxSizeBytes!)
    if (oversized) return t('upload.fileTooLarge', { name: oversized.name })
  }
  if (acceptList.value.length) {
    const invalid = files.find(f => {
      const lower = f.name.toLowerCase()
      return !acceptList.value.some(ext => lower.endsWith(ext.replace(/^\./, '')) || lower.endsWith(ext))
    })
    if (invalid) return t('upload.invalidFileType', { name: invalid.name })
  }
  return files
}

function handleFiles(files: File[]) {
  if (props.disabled) return
  const result = validateFiles(files)
  if (typeof result === 'string') {
    emit('error', result)
    return
  }
  selectedFiles.value = props.multiple ? [...selectedFiles.value, ...result] : result
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
        :accept="accept"
        :multiple="multiple"
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
        <div class="drop-label">{{ label || t('upload.dropzoneLabel') }}</div>
        <div v-if="hint" class="drop-hint">{{ hint }}</div>
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
