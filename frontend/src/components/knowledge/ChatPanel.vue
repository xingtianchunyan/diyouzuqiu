<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { aiService, type ChatMessage } from '../../api/services/ai.service'
import { knowledgeService } from '../../api/services/knowledge.service'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  context: 'knowledge' | 'planner'
  initialMessages?: ChatMessage[]
  plannerProjectId?: string
  title?: string
  enableHistoryCache?: boolean
  storageKey?: string
  showUpload?: boolean
  showClearHistory?: boolean
  showSaveToKnowledge?: boolean
  showHeader?: boolean
}>(), {
  context: 'knowledge',
  enableHistoryCache: false,
  storageKey: 'ai_chat_history',
  showUpload: false,
  showClearHistory: false,
  showSaveToKnowledge: false,
  showHeader: true
})

const emit = defineEmits<{
  (e: 'plan', plan: any): void
  (e: 'close'): void
}>()

const messages = ref<ChatMessage[]>(props.initialMessages ? [...props.initialMessages] : [])
const input = ref('')
const loading = ref(false)
const fileLoading = ref(false)
const scrollRef = ref<HTMLDivElement | null>(null)

const welcomeText = computed(() => {
  if (props.context === 'planner') return t('planner.greeting')
  return t('knowledge.chatWelcome')
})

const hasPlanJson = computed(() => {
  const last = messages.value[messages.value.length - 1]
  if (!last || last.role !== 'assistant') return false
  return tryParsePlan(last.content) !== null
})

function renderMarkdown(text: string) {
  return DOMPurify.sanitize(marked.parse(text) as string)
}

function tryParsePlan(text: string): any | null {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (parsed.plan && parsed.budget && parsed.prizes && parsed.speech) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function scrollToBottom() {
  nextTick(() => {
    scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' })
  })
}

function clearHistory() {
  if (confirm(t('confirm.clearChatHistory'))) {
    messages.value = []
    if (props.enableHistoryCache) {
      localStorage.removeItem(props.storageKey)
    }
  }
}

async function saveToKnowledge() {
  const last = messages.value[messages.value.length - 1]
  if (!last || last.role !== 'assistant') return
  try {
    const briefTitle = last.content.substring(0, 20).replace(/\n/g, ' ') + '...'
    await knowledgeService.createKnowledge({
      title: t('planner.savedChatTitle', { title: briefTitle }),
      content: last.content,
      category: 'PLANNER_CHAT'
    })
    alert(t('planner.saveSuccess'))
  } catch (err: any) {
    alert(t('planner.saveError', { msg: err.response?.data?.error?.message || err.message }))
  }
}

async function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileLoading.value = true
  try {
    await knowledgeService.uploadKnowledge(file, file.name)
    messages.value.push({
      role: 'system',
      content: t('planner.fileUploadSuccess', { filename: file.name })
    })
  } catch (err: any) {
    messages.value.push({
      role: 'system',
      content: t('planner.fileUploadError', { msg: err.response?.data?.error?.message || err.message })
    })
  } finally {
    fileLoading.value = false
    scrollToBottom()
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const res = await aiService.chat(messages.value, props.context, props.plannerProjectId)
    messages.value.push({ role: 'assistant', content: res.data.response })
  } catch (err: any) {
    messages.value.push({
      role: 'assistant',
      content: t('knowledge.chatError', { msg: err.response?.data?.error?.message || err.message })
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function viewPlan() {
  const last = messages.value[messages.value.length - 1]
  if (!last) return
  const plan = tryParsePlan(last.content)
  if (plan) emit('plan', plan)
}

defineExpose({ clearHistory })

onMounted(() => {
  if (props.enableHistoryCache && messages.value.length === 0) {
    const cached = localStorage.getItem(props.storageKey)
    if (cached) {
      try {
        messages.value = JSON.parse(cached)
      } catch {
        // ignore invalid cache
      }
    }
  }
})

watch(() => props.initialMessages, (val) => {
  if (val) messages.value = [...val]
})

watch(messages, (val) => {
  if (props.enableHistoryCache) {
    localStorage.setItem(props.storageKey, JSON.stringify(val))
  }
  scrollToBottom()
}, { deep: true })
</script>

<template>
  <div class="chat-panel">
    <div v-if="showHeader" class="chat-header">
      <div>
        <div class="label-micro">{{ t('knowledge.chatLabel') }}</div>
        <h3 class="chat-title">{{ title || t('knowledge.newChat') }}</h3>
      </div>
      <div class="chat-header-actions">
        <button
          v-if="showSaveToKnowledge && hasPlanJson"
          class="btn-text micro"
          @click="saveToKnowledge"
          :title="t('planner.saveToKnowledgeTooltip')"
        >
          {{ t('planner.saveToKnowledge') }}
        </button>
        <button
          v-if="showClearHistory"
          class="btn-text micro"
          @click="clearHistory"
        >
          {{ t('planner.clearHistory') }}
        </button>
        <button class="btn-icon" @click="$emit('close')" :aria-label="t('common.close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <div ref="scrollRef" class="chat-messages">
      <div v-if="messages.length === 0" class="chat-welcome">{{ welcomeText }}</div>
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="message"
        :class="msg.role"
      >
        <div v-if="msg.role === 'system'" class="system-message">
          {{ msg.content }}
        </div>
        <div v-else class="message-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
      </div>
      <div v-if="loading" class="message assistant">
        <div class="message-bubble loading-bubble">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="chat-actions" v-if="hasPlanJson">
      <button class="action-btn" @click="viewPlan">{{ t('knowledge.viewPlan') }}</button>
    </div>

    <div class="chat-input-row">
      <label
        v-if="showUpload"
        class="upload-btn"
        :class="{ disabled: fileLoading }"
        :title="t('planner.uploadDocumentTooltip')"
      >
        <input type="file" @change="handleFileUpload" accept=".txt,.pdf,.docx,.doc" :disabled="fileLoading" hidden />
        <span v-if="fileLoading" class="spinner-small"></span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
      </label>
      <textarea
        v-model="input"
        class="chat-input"
        :placeholder="t('knowledge.chatInputPlaceholder')"
        rows="2"
        @keydown.enter.prevent="sendMessage"
      ></textarea>
      <button class="send-btn" :disabled="!input.trim() || loading" @click="sendMessage">
        {{ t('knowledge.send') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 80vh;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.chat-title {
  margin: 0.25rem 0 0;
  font-size: 1.1rem;
  font-family: var(--font-serif);
  color: var(--text-h);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.4rem;
}

.btn-icon:hover {
  color: var(--text-h);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-welcome {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: auto 0;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-primary);
}

.message.user .message-bubble {
  background: var(--surface-hover);
  border: 1px solid var(--border);
}

.message.assistant .message-bubble {
  background: var(--surface);
  border: 1px solid var(--border-strong);
}

.loading-bubble {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  min-width: 3rem;
  min-height: 2rem;
}

.dot {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.chat-actions {
  padding: 0.5rem 1.25rem;
  border-top: 1px solid var(--border);
}

.chat-input-row {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 0.95rem;
  resize: none;
  outline: none;
}

.chat-input:focus {
  border-color: var(--text-h);
}

.send-btn {
  background: var(--text-h);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-family: var(--sans);
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.markdown-body :deep(pre) {
  background: var(--surface-hover);
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
}

.markdown-body :deep(p) {
  margin: 0 0 0.5rem;
}

.markdown-body :deep(p):last-child {
  margin-bottom: 0;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-header-actions .btn-text {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  font-size: 0.65rem;
  transition: all 0.2s;
}

.chat-header-actions .btn-text:hover {
  background: var(--border);
  color: var(--text-h);
}

.system-message {
  margin: 0 auto;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.upload-btn:hover:not(.disabled) {
  color: var(--text-h);
  border-color: var(--text-h);
}

.upload-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--text-h);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
