<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { knowledgeService, type ChatMessage } from '../api/services/knowledge.service'
import { parseService } from '../api/services/parse.service'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const { t } = useI18n()

const inputMessage = ref('')
const loading = ref(false)
const fileLoading = ref(false)
const STORAGE_KEY = 'planner_chat_history'

const defaultMessages: (ChatMessage & { isSystem?: boolean, parsedPlan?: any })[] = [
  { role: 'assistant', content: '您好！我是年会策划 AI 助手。请告诉我您对本次年会的期望（例如：参与人数、预算、地点、风格、必须包含的环节等）。您也可以通过底部的附件按钮上传过往的文档供我参考。' }
]

const messages = ref<(ChatMessage & { isSystem?: boolean, parsedPlan?: any })[]>([...defaultMessages])
const messagesContainer = ref<HTMLElement | null>(null)

// Initialize from localStorage
onMounted(() => {
  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached) {
    try {
      messages.value = JSON.parse(cached)
    } catch (e) {
      // Invalid cache: ignore and use default messages
    }
  }
})

// Save to localStorage when messages change
watch(messages, (newVal) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
}, { deep: true })

const clearHistory = () => {
  if (confirm('确定要清空当前对话记录吗？')) {
    messages.value = [...defaultMessages]
    localStorage.removeItem(STORAGE_KEY)
  }
}

const resultTabs = [
  { id: 'plan', label: '策划案' },
  { id: 'budget', label: '预算表' },
  { id: 'prizes', label: '奖品清单' },
  { id: 'speech', label: '主持词' }
]
const activeResultTab = ref('plan')

const modeTabs = [
  { id: 'chat', label: '自由对话' },
  { id: 'form', label: '结构化表单' }
]
const activeMode = ref<'chat' | 'form'>('chat')

const plannerForm = ref({
  peopleCount: '',
  budget: '',
  date: '',
  location: '',
  durationHours: '',
  style: '',
  mustHave: '',
  avoid: '',
  notes: ''
})
const formLoading = ref(false)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const renderMarkdown = (text: string) => {
  return DOMPurify.sanitize(marked.parse(text) as string)
}

const parsePotentialJson = (text: string) => {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '')
    }
    const parsed = JSON.parse(cleanText)
    if (parsed.plan && parsed.budget && parsed.prizes && parsed.speech) {
      return parsed
    }
  } catch (e) {
    // Not valid JSON
  }
  return null
}

const saveToKnowledge = async (msgContent: string) => {
  if (!msgContent) return
  
  try {
    // Determine a brief title from content
    const briefTitle = msgContent.substring(0, 20).replace(/\n/g, ' ') + '...'
    await knowledgeService.createKnowledge({
      title: `对话记录: ${briefTitle}`,
      content: msgContent,
      category: 'PLANNER_CHAT'
    })
    alert('已成功存入知识库！')
  } catch (err: any) {
    alert(`存入知识库失败: ${err.message}`)
  }
}

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || loading.value) return

  inputMessage.value = ''
  messages.value.push({ role: 'user', content })
  scrollToBottom()

  loading.value = true
  
  try {
    // Limit to the last 10 messages (approx 5 rounds) to prevent token overflow
    const chatHistory = messages.value
      .filter(m => !m.isSystem)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-10)

    const res = await knowledgeService.chatPlanner(chatHistory)
    const rawContent = res.data.response
    
    const parsedPlan = parsePotentialJson(rawContent)
    
    messages.value.push({ 
      role: 'assistant', 
      content: rawContent,
      parsedPlan 
    })
  } catch (err: any) {
    messages.value.push({ 
      role: 'system', 
      content: '❌ 请求失败: ' + (err.response?.data?.error?.message || err.message),
      isSystem: true
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const submitPlannerForm = async () => {
  const peopleCount = Number(plannerForm.value.peopleCount)
  const budget = Number(plannerForm.value.budget)
  if (!peopleCount || !budget || !plannerForm.value.date || !plannerForm.value.location) {
    alert('请填写参与人数、预算、日期和地点')
    return
  }

  formLoading.value = true
  try {
    const constraints = {
      peopleCount,
      budget,
      date: plannerForm.value.date,
      location: plannerForm.value.location,
      ...(plannerForm.value.durationHours ? { durationHours: Number(plannerForm.value.durationHours) } : {}),
      ...(plannerForm.value.style ? { style: plannerForm.value.style } : {}),
      ...(plannerForm.value.mustHave ? { mustHave: plannerForm.value.mustHave.split(/[\n,，]/).map(s => s.trim()).filter(Boolean) } : {}),
      ...(plannerForm.value.avoid ? { avoid: plannerForm.value.avoid.split(/[\n,，]/).map(s => s.trim()).filter(Boolean) } : {}),
      ...(plannerForm.value.notes ? { notes: plannerForm.value.notes } : {})
    }

    const res = await knowledgeService.generateAnnualPlan(constraints)
    const plan = res.data.plan
    messages.value.push({
      role: 'assistant',
      content: JSON.stringify(plan),
      parsedPlan: plan
    })
    activeMode.value = 'chat'
    scrollToBottom()
  } catch (err: any) {
    alert(`生成方案失败: ${err.response?.data?.error?.message || err.message}`)
  } finally {
    formLoading.value = false
  }
}

const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  fileLoading.value = true
  const filename = file.name
  
  try {
    // 1. Parse text from file
    const parseRes = await parseService.parse({ file })
    const content = parseRes.data.content || parseRes.data.description
    
    if (!content) throw new Error('无法提取文件内容')
    
    // 2. Save to knowledge base
    await knowledgeService.createKnowledge({ 
      title: filename, 
      content,
      category: 'PLANNER_FILE' 
    })
    
    messages.value.push({
      role: 'system',
      content: `✅ 成功将文档《${filename}》存入知识库。AI 将在后续策划中自动参考该文档。`,
      isSystem: true
    })
  } catch (err: any) {
    messages.value.push({
      role: 'system',
      content: `❌ 上传文档失败: ${err.message}`,
      isSystem: true
    })
  } finally {
    fileLoading.value = false
    scrollToBottom()
    // Reset file input
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up" style="display: flex; justify-content: space-between; width: 100%;">
        <span>AI ASSISTANT</span>
        <button class="btn-text micro" @click="clearHistory">清空对话记录</button>
      </div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('planner.title') }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">Chat with AI to formulate comprehensive event strategies</p>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div class="mode-tabs delay-4 animate-slide-up">
      <button
        v-for="tab in modeTabs"
        :key="tab.id"
        class="mode-tab"
        :class="{ active: activeMode === tab.id }"
        @click="activeMode = tab.id as 'chat' | 'form'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="chat-container delay-4 animate-slide-up">
      <!-- Chat Messages -->
      <div v-if="activeMode === 'chat'" class="chat-messages" ref="messagesContainer">
        <div 
          v-for="(msg, index) in messages" 
          :key="index" 
          class="chat-bubble-wrapper"
          :class="msg.role"
        >
          <div v-if="msg.isSystem" class="system-message">
            {{ msg.content }}
          </div>
          <div v-else class="chat-bubble">
            <div class="bubble-header">
              <span>{{ msg.role === 'user' ? 'YOU' : 'AI ASSISTANT' }}</span>
              <button 
                v-if="msg.role === 'assistant'" 
                class="btn-text micro" 
                @click="saveToKnowledge(msg.content)"
                title="存入策划知识库"
              >
                存入知识库
              </button>
            </div>
            
            <!-- Render Rich Tabs if JSON plan is parsed -->
            <div v-if="msg.parsedPlan" class="plan-result">
              <div class="tabs-nav">
                <button 
                  v-for="tab in resultTabs" 
                  :key="tab.id"
                  class="tab-btn" 
                  :class="{ active: activeResultTab === tab.id }"
                  @click="activeResultTab = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>
              <div class="plan-block-content markdown-body" v-html="renderMarkdown(msg.parsedPlan[activeResultTab])"></div>
            </div>
            
            <!-- Otherwise render normal markdown text -->
            <div v-else class="bubble-content markdown-body" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>
        
        <div v-if="loading" class="chat-bubble-wrapper assistant">
          <div class="chat-bubble">
            <div class="bubble-header">AI ASSISTANT</div>
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div v-if="activeMode === 'chat'" class="chat-input-area">
        <form @submit.prevent="sendMessage" class="chat-form">
          <label class="upload-btn" :class="{ disabled: fileLoading }" title="上传参考文档至知识库">
            <input type="file" @change="handleFileUpload" accept=".txt,.pdf,.docx,.doc" :disabled="fileLoading" hidden />
            <span v-if="fileLoading" class="spinner-small"></span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </label>
          <input 
            v-model="inputMessage" 
            type="text" 
            class="chat-input" 
            placeholder="Message AI Assistant..." 
            :disabled="loading"
          />
          <button type="submit" class="send-btn" :disabled="!inputMessage.trim() || loading">
            SEND
          </button>
        </form>
      </div>

      <!-- Structured Form -->
      <div v-else class="planner-form-area">
        <form @submit.prevent="submitPlannerForm" class="planner-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">参与人数 *</label>
              <input v-model.number="plannerForm.peopleCount" type="number" class="form-input" required min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">总预算（元） *</label>
              <input v-model.number="plannerForm.budget" type="number" class="form-input" required min="0" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日期 *</label>
              <input v-model="plannerForm.date" type="date" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">时长（小时）</label>
              <input v-model.number="plannerForm.durationHours" type="number" class="form-input" min="0" step="0.5" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">地点/场地 *</label>
            <input v-model="plannerForm.location" type="text" class="form-input" required placeholder="例如：室内球场 / 酒店宴会厅" />
          </div>

          <div class="form-group">
            <label class="form-label">风格</label>
            <input v-model="plannerForm.style" type="text" class="form-input" placeholder="例如：温馨 / 热烈 / 正式 / 轻松" />
          </div>

          <div class="form-group">
            <label class="form-label">必须包含的环节</label>
            <textarea v-model="plannerForm.mustHave" class="form-textarea" rows="3" placeholder="用逗号或换行分隔，例如：颁奖，抽奖，合影"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">禁忌与避免事项</label>
            <textarea v-model="plannerForm.avoid" class="form-textarea" rows="3" placeholder="用逗号或换行分隔"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">其他补充</label>
            <textarea v-model="plannerForm.notes" class="form-textarea" rows="3"></textarea>
          </div>

          <button type="submit" class="send-btn" :disabled="formLoading">
            <span v-if="formLoading">生成中...</span>
            <span v-else>生成年会方案</span>
          </button>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.editorial-container {
  max-width: 1000px;
  margin: 0 auto;
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chat-bubble-wrapper {
  display: flex;
  width: 100%;
}

.chat-bubble-wrapper.user {
  justify-content: flex-end;
}

.chat-bubble-wrapper.assistant {
  justify-content: flex-start;
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

.chat-bubble {
  max-width: 85%;
  padding: 1.5rem;
  background: var(--bg-hover);
  border: 1px solid var(--border);
}

.chat-bubble-wrapper.user .chat-bubble {
  background: transparent;
  border: 1px solid var(--text-h);
}

.bubble-header {
  font-family: var(--sans);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bubble-header button {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  font-size: 0.6rem;
  transition: all 0.2s;
}

.bubble-header button:hover {
  background: var(--border);
  color: var(--text-h);
}

.bubble-content {
  font-family: var(--sans);
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-p);
}

/* Chat Input */
.chat-input-area {
  padding: 1rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.chat-form {
  display: flex;
  gap: 1rem;
  align-items: center;
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
}

.upload-btn:hover:not(.disabled) {
  color: var(--text-h);
  border-color: var(--text-h);
}

.upload-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input {
  flex: 1;
  height: 44px;
  background: transparent;
  border: 1px solid var(--border);
  padding: 0 1rem;
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--text-h);
  transition: border-color 0.2s ease;
}

.chat-input:focus {
  outline: none;
  border-color: var(--text-h);
}

.send-btn {
  height: 44px;
  padding: 0 2rem;
  background: var(--text-h);
  color: var(--surface);
  border: none;
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 0.5rem 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
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

/* Document Style within Chat */
.plan-result {
  margin-top: 1rem;
}

.tabs-nav {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.tab-btn {
  background: none;
  border: none;
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem 0;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: var(--text-h);
}

.tab-btn.active {
  color: var(--text-h);
  border-bottom: 2px solid var(--text-h);
  margin-bottom: -0.5rem;
}

.plan-block-content {
  font-family: var(--sans);
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-p);
  max-height: 500px;
  overflow-y: auto;
  padding-right: 1rem;
}

/* Basic Markdown Styles */
:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--text-h);
}

:deep(.markdown-body p) {
  margin-bottom: 1em;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

:deep(.markdown-body li) {
  margin-bottom: 0.25em;
}

:deep(.markdown-body strong) {
  font-weight: 600;
  color: var(--text-h);
}

/* Mode Tabs */
.mode-tabs {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.mode-tab {
  background: none;
  border: none;
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.75rem 0;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  color: var(--text-h);
}

.mode-tab.active {
  color: var(--text-h);
  border-bottom: 2px solid var(--text-h);
  margin-bottom: -1px;
}

/* Planner Form */
.planner-form-area {
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
  overflow-y: auto;
}

.planner-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 600px;
  margin: 0 auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.planner-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.planner-form .form-label {
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.planner-form .form-input,
.planner-form .form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: 1px solid var(--border);
  padding: 0.75rem;
  font-family: var(--sans);
  font-size: 0.95rem;
  color: var(--text-h);
  outline: none;
  transition: border-color 0.2s ease;
}

.planner-form .form-input:focus,
.planner-form .form-textarea:focus {
  border-color: var(--text-h);
}

.planner-form .form-textarea {
  resize: vertical;
  line-height: 1.5;
}
</style>
