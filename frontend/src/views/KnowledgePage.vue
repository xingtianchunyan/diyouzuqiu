<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { knowledgeService } from '../api/services/knowledge.service'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const plannerDocs = ref<any[]>([])
const loading = ref(false)

const showModal = ref(false)
const selectedDoc = ref<any>(null)

const loadData = async () => {
  loading.value = true
  try {
    const res = await knowledgeService.getKnowledgeList()
    plannerDocs.value = res.data.map((d: any) => ({
      id: d.id,
      type: d.category === 'PLANNER_CHAT' ? '对话记录' : '上传文件',
      title: d.title,
      content: d.content,
      date: new Date(d.createdAt).toLocaleDateString()
    }))
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const openDoc = (doc: any) => {
  selectedDoc.value = doc
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedDoc.value = null
}

const renderMarkdown = (text: string) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text) as string)
}
</script>

<template>
  <div class="knowledge-page page-container">
    <div class="editorial-header">
      <div class="label-micro animate-slide-up">KNOWLEDGE BASE</div>
      <h1 class="editorial-title delay-1 animate-slide-up">策划知识库</h1>
      <p class="editorial-subtitle delay-2 animate-slide-up">管理与查看年会策划的知识资产（文件与对话）</p>
    </div>

    <div class="divider-y delay-3 animate-slide-up"></div>

    <div class="content-area delay-5 animate-slide-up">
      <div v-if="loading" class="loading-state">加载中...</div>

      <div v-else class="doc-grid">
        <div 
          v-for="(item, idx) in plannerDocs" 
          :key="idx" 
          class="doc-card"
          @click="openDoc(item)"
        >
          <div class="doc-type">{{ item.type }}</div>
          <h3 class="doc-title">{{ item.title }}</h3>
          <div class="doc-date">{{ item.date }}</div>
        </div>
        <div v-if="plannerDocs.length === 0" class="empty-state">暂无策划知识</div>
      </div>
    </div>

    <!-- Modal for viewing details -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="label-micro">{{ selectedDoc?.type }}</span>
            <h2 class="modal-title">{{ selectedDoc?.title }}</h2>
          </div>
          <button class="btn-icon" @click="closeModal" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body markdown-body" v-html="renderMarkdown(selectedDoc?.content)"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.doc-card {
  border: 1px solid var(--border);
  padding: 1.5rem;
  background: var(--surface);
  transition: transform 0.3s, border-color 0.3s;
  cursor: pointer;
}

.doc-card:hover {
  transform: translateY(-2px);
  border-color: var(--text-primary);
}

.doc-type {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.doc-title {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.doc-date {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  animation: modal-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-fade-in {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  font-family: var(--font-serif);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.btn-icon:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Markdown styling inside modal */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: var(--text-primary);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-body :deep(p) {
  margin-bottom: 1em;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 1em;
}

.markdown-body :deep(pre) {
  background: var(--surface-hover);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  border: 1px solid var(--border);
}
</style>
