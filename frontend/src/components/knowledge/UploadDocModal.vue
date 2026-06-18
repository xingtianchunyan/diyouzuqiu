<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FileUploadZone from '../base/FileUploadZone.vue'
import { knowledgeService } from '../../api/services/knowledge.service'

const { t } = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded'): void
}>()

const file = ref<File | null>(null)
const loading = ref(false)
const error = ref('')

const ACCEPT = '.docx,.xlsx,.pdf,.txt,.md'

function onSelect(files: File[]) {
  file.value = files[0] || null
  error.value = ''
}

function onError(message: string) {
  error.value = message
}

async function submit() {
  if (!file.value) return
  loading.value = true
  error.value = ''
  try {
    await knowledgeService.uploadKnowledge(file.value)
    file.value = null
    emit('uploaded')
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || t('knowledge.uploadError')
  } finally {
    loading.value = false
  }
}

function close() {
  if (loading.value) return
  file.value = null
  error.value = ''
  emit('close')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">{{ t('knowledge.uploadTitle') }}</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div class="modal-body">
          <FileUploadZone
            :accept="ACCEPT"
            :label="t('knowledge.uploadLabel')"
            :hint="t('knowledge.uploadHint')"
            :disabled="loading"
            @select="onSelect"
            @error="onError"
          />

          <div v-if="error" class="error-text">{{ error }}</div>
        </div>

        <div class="modal-footer">
          <button class="editorial-btn secondary" @click="close" :disabled="loading">{{ t('common.cancel') }}</button>
          <button class="editorial-btn" @click="submit" :disabled="!file || loading">
            <span v-if="loading">{{ t('common.importing') }}</span>
            <span v-else>{{ t('knowledge.uploadSubmit') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: var(--shadow-whisper);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-h);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.error-text {
  margin-top: 1rem;
  color: #ff6b6b;
  font-size: 0.85rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
