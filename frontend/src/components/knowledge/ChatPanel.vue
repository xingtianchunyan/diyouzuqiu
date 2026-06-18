<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { knowledgeService, type ChatMessage } from '../../api/services/knowledge.service'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const { t } = useI18n()

const props = defineProps<{
  initialMessages?: ChatMessage[]
  plannerProjectId?: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'plan', plan: any): void
  (e: 'close'): void
}>()

const messages = ref<ChatMessage[]>(props.initialMessages ? [...props.initialMessages] : [])
const input = ref('')
const loading = ref(false)
const scrollRef = ref<HTMLDivElement | null>(null)

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
    // Try to find JSON object in the text
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

async function sendMessage() {
  const text = input.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const res = await knowledgeService.chatKnowledge(messages.value, props.plannerProjectId)
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

watch(() => props.initialMessages, (val) => {
  if (val) messages.value = [...val]
})

watch(messages, scrollToBottom, { deep: true })
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <div>
        <div class="label-micro">{{ t('knowledge.chatLabel') }}</div>
        <h3 class="chat-title">{{ title || t('knowledge.newChat') }}</h3>
      </div>
      <button class="btn-icon" @click="$emit('close')" :aria-label="t('common.close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div ref="scrollRef" class="chat-messages">
      <div v-if="messages.length === 0" class="chat-welcome">{{ t('knowledge.chatWelcome') }}</div>
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="message"
        :class="msg.role"
      >
        <div class="message-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
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
</style>
