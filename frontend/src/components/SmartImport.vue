<template>
  <div class="smart-import-panel">
    <div class="import-header">
      <h3>智能导入</h3>
      <p class="import-desc">支持微信公众号链接、网页链接、粘贴网页源码或上传文档自动提取正文</p>
    </div>

    <div class="import-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="import-tab"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="import-body">
      <!-- URL -->
      <div v-if="activeTab === 'url'" class="import-section">
        <div class="import-row">
          <input
            type="url"
            v-model="url"
            class="form-input"
            placeholder="https://mp.weixin.qq.com/s/... 或任意网页链接"
            @keyup.enter="handleUrlParse"
          />
          <button
            type="button"
            class="editorial-btn small"
            @click="handleUrlParse"
            :disabled="loading || !url.trim()"
          >
            {{ loading ? '解析中...' : '解析链接' }}
          </button>
        </div>
        <small class="hint">微信公众号文章会自动识别标题、作者、发布时间和正文</small>
      </div>

      <!-- Paste HTML -->
      <div v-else-if="activeTab === 'html'" class="import-section">
        <textarea
          v-model="htmlSource"
          class="form-textarea html-paste"
          rows="6"
          placeholder="在此处粘贴网页 HTML 源码（右键网页 → 查看网页源代码 → 全选复制）"
        ></textarea>
        <button
          type="button"
          class="editorial-btn small"
          @click="handleHtmlParse"
          :disabled="loading || !htmlSource.trim()"
        >
          {{ loading ? '解析中...' : '解析源码' }}
        </button>
        <small class="hint">当链接抓取失败时，粘贴源码是最稳定的方式</small>
      </div>

      <!-- File -->
      <div v-else-if="activeTab === 'file'" class="import-section">
        <input
          type="file"
          ref="fileInput"
          @change="handleFileParse"
          accept=".pdf,.doc,.docx,text/plain"
          style="display: none"
        />
        <div class="file-row">
          <button
            type="button"
            class="editorial-btn outline small"
            @click="triggerFileInput"
            :disabled="loading"
          >
            {{ loading ? '解析中...' : '选择本地文件 (PDF / Word / TXT)' }}
          </button>
          <span v-if="file" class="file-name">{{ file.name }}</span>
        </div>
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

const tabs = [
  { label: '链接导入', value: 'url' },
  { label: '粘贴源码', value: 'html' },
  { label: '上传文件', value: 'file' }
] as const

const activeTab = ref<'url' | 'html' | 'file'>('url')
const url = ref('')
const htmlSource = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const error = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleUrlParse = async () => {
  if (!url.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await parseService.parse({ url: url.value.trim(), targetType: props.targetType })
    emit('parsed', res.data)
    url.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '链接解析失败，请尝试“粘贴源码”模式'
  } finally {
    loading.value = false
  }
}

const handleHtmlParse = async () => {
  if (!htmlSource.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await parseService.parse({ html: htmlSource.value, targetType: props.targetType })
    emit('parsed', res.data)
    htmlSource.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '源码解析失败'
  } finally {
    loading.value = false
  }
}

const handleFileParse = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  file.value = target.files[0]
  loading.value = true
  error.value = ''

  try {
    const res = await parseService.parse({ file: file.value, targetType: props.targetType })
    emit('parsed', res.data)
    file.value = null
    target.value = ''
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

.import-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}
.import-tab {
  background: transparent;
  border: none;
  padding: 0.6rem 1rem;
  font-family: var(--sans);
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}
.import-tab:hover {
  color: var(--text-h);
}
.import-tab.active {
  color: var(--text-h);
  border-bottom-color: var(--text-h);
}

.import-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.import-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.import-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.file-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.form-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 0;
  padding: 0.6rem 0.75rem;
  font-family: var(--sans);
  font-size: 1rem;
  color: var(--text-h);
  outline: none;
}
.form-input:focus {
  border-color: var(--text-h);
}
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 0;
  padding: 0.75rem;
  font-family: var(--mono);
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-h);
  resize: vertical;
  outline: none;
}
.form-textarea:focus {
  border-color: var(--text-h);
}
.html-paste {
  min-height: 140px;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--sans);
}

.file-name {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import-error {
  margin-top: 1rem;
  color: var(--error, #e53935);
  font-size: 0.85rem;
}

.editorial-btn.small {
  padding: 0.6rem 1.25rem;
  font-size: 0.8rem;
  background: transparent;
  color: var(--text-h);
  border: 1px solid var(--text-h);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.editorial-btn.small:hover:not(:disabled) {
  background: var(--text-h);
  color: var(--surface);
}
.editorial-btn.small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.editorial-btn.outline {
  border-color: var(--border-strong);
  color: var(--text);
}
.editorial-btn.outline:hover:not(:disabled) {
  background: var(--text);
  color: var(--surface);
}
</style>
