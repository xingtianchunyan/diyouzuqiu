<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { knowledgeService, type KnowledgeDoc, type ChatMessage } from '../api/services/knowledge.service'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ChatPanel from '../components/knowledge/ChatPanel.vue'
import UploadDocModal from '../components/knowledge/UploadDocModal.vue'
import GeneratePlanModal from '../components/knowledge/GeneratePlanModal.vue'
import PlanResultView from '../components/knowledge/PlanResultView.vue'

const { t } = useI18n()

type CategoryFilter = 'ALL' | 'PLANNER_FILE' | 'PLANNER_CHAT'

const docs = ref<KnowledgeDoc[]>([])
const loading = ref(false)
const searchQuery = ref('')
const activeCategory = ref<CategoryFilter>('ALL')

const showDocModal = ref(false)
const selectedDoc = ref<KnowledgeDoc | null>(null)
const chatMode = ref(false)

const showUploadModal = ref(false)
const showGenerateModal = ref(false)
const showPlanResult = ref(false)
const planResult = ref<any>(null)

const categories: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: t('knowledge.category.all') },
  { key: 'PLANNER_FILE', label: t('knowledge.category.files') },
  { key: 'PLANNER_CHAT', label: t('knowledge.category.chats') }
]

const filteredDocs = computed(() => {
  let list = docs.value
  if (activeCategory.value !== 'ALL') {
    list = list.filter(d => d.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
  }
  return list
})

function typeLabel(category: string) {
  if (category === 'PLANNER_FILE') return t('knowledge.type.file')
  if (category === 'PLANNER_CHAT') return t('knowledge.type.chat')
  return t('knowledge.type.general')
}

function categoryIcon(category: string) {
  if (category === 'PLANNER_FILE') return '📄'
  if (category === 'PLANNER_CHAT') return '💬'
  return '📁'
}

function summary(content: string) {
  return content.replace(/[#*`_]/g, '').slice(0, 120) + (content.length > 120 ? '...' : '')
}

function renderMarkdown(text: string) {
  return DOMPurify.sanitize(marked.parse(text) as string)
}

async function loadData() {
  loading.value = true
  try {
    const params: any = {}
    if (activeCategory.value !== 'ALL') params.category = activeCategory.value
    if (searchQuery.value.trim()) params.q = searchQuery.value
    const res = await knowledgeService.getKnowledgeList(params)
    docs.value = res.data
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadData, 300)
})
watch(activeCategory, loadData)

function openDoc(doc: KnowledgeDoc) {
  selectedDoc.value = doc
  chatMode.value = doc.category === 'PLANNER_CHAT'
  showDocModal.value = true
}

function closeDocModal() {
  showDocModal.value = false
  selectedDoc.value = null
  chatMode.value = false
}

function newChat() {
  selectedDoc.value = null
  chatMode.value = true
  activeCategory.value = 'PLANNER_CHAT'
  showDocModal.value = true
}

function parseChatContent(content: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  const lines = content.split('\n')
  let currentRole: 'user' | 'assistant' | null = null
  let currentContent: string[] = []

  function flush() {
    if (currentRole && currentContent.length) {
      messages.push({ role: currentRole, content: currentContent.join('\n').replace(/^\*\*.*?\*\*：\s?/, '') })
    }
    currentRole = null
    currentContent = []
  }

  for (const line of lines) {
    if (line.startsWith('**用户**')) {
      flush()
      currentRole = 'user'
      currentContent.push(line)
    } else if (line.startsWith('**助手**')) {
      flush()
      currentRole = 'assistant'
      currentContent.push(line)
    } else if (currentRole) {
      currentContent.push(line)
    }
  }
  flush()
  return messages
}

const chatInitialMessages = computed<ChatMessage[]>(() => {
  if (!selectedDoc.value || !chatMode.value) return []
  return parseChatContent(selectedDoc.value.content)
})

function onPlanGenerated(plan: any) {
  planResult.value = plan
  showPlanResult.value = true
  showDocModal.value = false
}
</script>

<template>
  <div class="knowledge-page">
    <aside class="knowledge-sidebar">
      <div class="sidebar-header">
        <div class="label-micro">{{ t('knowledge.kicker') }}</div>
        <h1 class="sidebar-title">{{ t('knowledge.title') }}</h1>
      </div>

      <nav class="category-nav">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="category-btn"
          :class="{ active: activeCategory === cat.key }"
          @click="activeCategory = cat.key"
        >
          {{ cat.label }}
        </button>
      </nav>
    </aside>

    <main class="knowledge-main">
      <div class="knowledge-toolbar">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="t('knowledge.searchPlaceholder')"
        />
        <div class="toolbar-actions">
          <button class="action-btn" @click="newChat">{{ t('knowledge.newChat') }}</button>
          <button class="action-btn" @click="showUploadModal = true">{{ t('knowledge.uploadDoc') }}</button>
          <button class="action-btn" @click="showGenerateModal = true">{{ t('knowledge.generatePlan') }}</button>
        </div>
      </div>

      <div class="content-area">
        <div v-if="loading" class="loading-state">{{ t('common.loading') }}</div>

        <div v-else class="doc-grid">
          <div
            v-for="doc in filteredDocs"
            :key="doc.id"
            class="doc-card"
            @click="openDoc(doc)"
          >
            <div class="doc-meta">
              <span class="doc-icon">{{ categoryIcon(doc.category) }}</span>
              <span class="doc-type">{{ typeLabel(doc.category) }}</span>
            </div>
            <h3 class="doc-title">{{ doc.title }}</h3>
            <p class="doc-summary">{{ summary(doc.content) }}</p>
            <div class="doc-date">{{ new Date(doc.createdAt).toLocaleDateString() }}</div>
          </div>
          <div v-if="filteredDocs.length === 0" class="empty-state">{{ t('knowledge.empty') }}</div>
        </div>
      </div>
    </main>

    <!-- Doc / Chat Modal -->
    <Transition name="fade">
      <div v-if="showDocModal" class="drawer-overlay" @click.self="closeDocModal">
        <div class="drawer" :class="{ chat: chatMode }">
          <div v-if="!chatMode" class="doc-detail">
            <div class="drawer-header">
              <div>
                <span class="label-micro">{{ selectedDoc ? typeLabel(selectedDoc.category) : '' }}</span>
                <h2 class="drawer-title">{{ selectedDoc?.title }}</h2>
              </div>
              <button class="btn-icon" @click="closeDocModal" :aria-label="t('common.close')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="drawer-body markdown-body" v-html="renderMarkdown(selectedDoc?.content || '')"></div>
          </div>

          <ChatPanel
            v-else
            :title="selectedDoc?.title"
            :initial-messages="chatInitialMessages"
            @close="closeDocModal"
            @plan="onPlanGenerated"
          />
        </div>
      </div>
    </Transition>

    <!-- Plan Result Modal -->
    <Transition name="fade">
      <div v-if="showPlanResult" class="drawer-overlay" @click.self="showPlanResult = false">
        <div class="drawer plan-drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">{{ t('knowledge.generatedPlan') }}</h2>
            <button class="btn-icon" @click="showPlanResult = false" :aria-label="t('common.close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="drawer-body plan-body">
            <PlanResultView v-if="planResult" :plan="planResult" />
          </div>
        </div>
      </div>
    </Transition>

    <UploadDocModal
      :show="showUploadModal"
      @close="showUploadModal = false"
      @uploaded="loadData"
    />

    <GeneratePlanModal
      :show="showGenerateModal"
      :docs="docs.filter(d => d.category === 'PLANNER_FILE')"
      @close="showGenerateModal = false"
    />
  </div>
</template>

<style scoped>
.knowledge-page {
  display: flex;
  min-height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
}

.knowledge-sidebar {
  width: 240px;
  border-right: 1px solid var(--border);
  padding: 2rem 1.5rem;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-header {
  margin-bottom: 2rem;
}

.sidebar-title {
  margin: 0.5rem 0 0;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-h);
}

.category-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-btn {
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 0.75rem;
  color: var(--text-secondary);
  font-family: var(--sans);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.category-btn:hover,
.category-btn.active {
  background: var(--surface-hover);
  color: var(--text-h);
}

.knowledge-main {
  flex: 1;
  padding: 2rem;
  min-width: 0;
}

.knowledge-toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  background: transparent;
  border: 1px solid var(--border);
  padding: 0.75rem 1rem;
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 0.95rem;
  outline: none;
}

.search-input:focus {
  border-color: var(--text-h);
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  padding: 0.6rem 1rem;
  font-family: var(--sans);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.action-btn:hover {
  border-color: var(--text-primary);
  background: var(--surface-hover);
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.doc-card {
  border: 1px solid var(--border);
  padding: 1.25rem;
  background: var(--surface);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}

.doc-card:hover {
  transform: translateY(-2px);
  border-color: var(--text-primary);
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.doc-icon {
  font-size: 1.1rem;
}

.doc-type {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.doc-title {
  margin: 0 0 0.75rem;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  line-height: 1.4;
  color: var(--text-h);
}

.doc-summary {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
}

.doc-date {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 5rem 1rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.loading-state {
  text-align: center;
  padding: 5rem;
  color: var(--text-muted);
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(4px);
}

.drawer {
  width: 100%;
  max-width: 700px;
  background: var(--surface);
  border-left: 1px solid var(--border-strong);
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.2);
}

.drawer.chat,
.drawer.plan-drawer {
  max-width: 900px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.drawer-title {
  margin: 0.5rem 0 0;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--text-h);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
}

.btn-icon:hover {
  color: var(--text-h);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.7;
}

.plan-body {
  padding: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: var(--text-h);
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}

.markdown-body :deep(p) {
  margin-bottom: 0.75em;
}

.markdown-body :deep(pre) {
  background: var(--surface-hover);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .knowledge-page {
    flex-direction: column;
  }

  .knowledge-sidebar {
    width: 100%;
    height: auto;
    position: static;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 1rem;
  }

  .category-nav {
    flex-direction: row;
    gap: 0.5rem;
  }

  .knowledge-main {
    padding: 1rem;
  }

  .knowledge-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }
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
