<template>
  <div class="smart-import-panel">
    <div class="import-header">
      <h3>智能导入区域</h3>
      <p class="import-desc">支持输入网页URL自动抓取，或上传文档进行解析提取（暂不包括图片/视频 OCR）</p>
    </div>

    <div class="import-body">
      <div class="import-row">
        <input 
          type="url" 
          v-model="url" 
          class="form-input" 
          placeholder="https://... (输入网页链接)"
          @keyup.enter="handleUrlParse"
        />
        <button type="button" class="editorial-btn small" @click="handleUrlParse" :disabled="loading || !url">
          {{ loading && !file ? '解析中...' : '解析URL' }}
        </button>
      </div>
      
      <div class="import-divider"><span>OR</span></div>

      <div class="import-row file-row">
        <input 
          type="file" 
          ref="fileInput"
          @change="handleFileParse" 
          accept=".pdf,.doc,.docx,text/plain" 
          style="display: none"
        />
        <button type="button" class="editorial-btn outline small" @click="triggerFileInput" :disabled="loading">
          {{ loading && file ? '解析中...' : '选择本地文件 (PDF/Word/TXT)' }}
        </button>
        <span v-if="file" class="file-name">{{ file.name }}</span>
      </div>
    </div>
    <div v-if="error" class="import-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { parseService, type ParsedData } from '../api/services/parse.service'

const props = defineProps<{
  targetType?: string
}>()

const emit = defineEmits<{
  (e: 'parsed', data: ParsedData): void
}>()

const url = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const error = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleUrlParse = async () => {
  if (!url.value) return
  loading.value = true
  error.value = ''
  file.value = null // reset file
  try {
    const res = await parseService.parse({ url: url.value, targetType: props.targetType })
    emit('parsed', res.data)
    url.value = '' // clear after success
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'URL 解析失败，请检查链接'
  } finally {
    loading.value = false
  }
}

const handleFileParse = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  
  file.value = target.files[0]
  url.value = '' // reset url
  loading.value = true
  error.value = ''

  try {
    const res = await parseService.parse({ file: file.value, targetType: props.targetType })
    emit('parsed', res.data)
    file.value = null // clear after success
    target.value = '' // reset input
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '文件解析失败，仅支持 PDF, Word 或纯文本'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.smart-import-panel {
  background: var(--surface-hover);
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.import-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--text-h);
}
.import-desc {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.import-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.import-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.file-row {
  justify-content: flex-start;
}
.form-input {
  flex: 1;
  background: var(--surface);
}
.import-divider {
  text-align: center;
  position: relative;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 0.5rem 0;
}
.import-divider::before, .import-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 45%;
  height: 1px;
  background: var(--border);
}
.import-divider::before { left: 0; }
.import-divider::after { right: 0; }
.file-name {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import-error {
  margin-top: 1rem;
  color: #e53935;
  font-size: 0.85rem;
}
.editorial-btn.small {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}
.editorial-btn.outline {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-strong);
}
.editorial-btn.outline:hover {
  background: var(--text);
  color: var(--surface);
}
</style>