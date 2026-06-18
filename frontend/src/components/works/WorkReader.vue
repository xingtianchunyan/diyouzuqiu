<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { Work } from '../../api/services/works.service'
import MarkdownRenderer from '../editor/MarkdownRenderer.vue'

const props = defineProps<{
  work: Work | null
  loading?: boolean
  canDelete?: (item: Work) => boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'delete', work: Work): void
}>()

const metaLine = computed(() => {
  if (!props.work) return ''
  const parts: string[] = []
  const author = props.work.authorMember?.displayName || props.work.authorName
  if (author) parts.push(author)
  else if (props.work.authorMemberId) parts.push(props.work.authorMemberId)
  if (props.work.date) parts.push(props.work.date.substring(0, 10))
  return parts.join(' · ')
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.work,
  (val) => {
    if (val) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="props.work || props.loading" class="reader-overlay" @click="emit('close')">
      <div class="reader" @click.stop>
        <header class="reader-topbar">
          <button type="button" class="close-btn" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="topbar-center">
            <div class="topbar-type" v-if="props.work">{{ props.work.type }}</div>
          </div>
          <div class="topbar-right">
            <RouterLink
              v-if="props.work"
              :to="`/works/${props.work.id}`"
              class="reader-link-btn"
              title="打开独立页面"
              @click.stop
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </RouterLink>
            <button 
              v-if="props.work && props.canDelete && props.canDelete(props.work)" 
              class="reader-delete-btn"
              @click.stop="emit('delete', props.work)"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </header>

        <div v-if="props.loading" class="reader-loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>

        <article v-else-if="props.work" class="reader-body">
          <div class="reader-header">
            <h1 class="reader-title">{{ props.work.title }}</h1>
            <div v-if="metaLine" class="reader-meta">{{ metaLine }}</div>
          </div>

          <div class="reader-content">
            <MarkdownRenderer :markdown="props.work?.content || ''" />
            <p v-if="!props.work?.content" class="reader-paragraph reader-empty">No content.</p>
          </div>
        </article>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.reader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
  z-index: 2200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 2rem 1rem 4rem 1rem;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

:root[data-theme="dark"] .reader-overlay {
  background: rgba(18, 18, 18, 0.92);
}

.reader {
  width: 100%;
  max-width: 860px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
}

.reader-topbar {
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  padding: 0.75rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 1;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-h);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.close-btn:hover {
  background: var(--surface-hover);
  border-color: var(--border);
}

.close-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.topbar-center {
  display: flex;
  justify-content: center;
}

.topbar-right {
  display: flex;
  justify-content: flex-end;
}

.reader-delete-btn,
.reader-link-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reader-link-btn:hover {
  color: var(--text-h);
  background: var(--surface-hover);
}

.reader-delete-btn:hover {
  color: var(--error, #d32f2f);
  background: var(--surface-hover);
}

.topbar-type {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.reader-body {
  padding: 2.25rem 2.25rem 3rem 2.25rem;
}

@media (max-width: 640px) {
  .reader-overlay {
    padding: 0;
  }
  .reader {
    border-radius: 0;
    min-height: 100vh;
  }
  .reader-body {
    padding: 1.75rem 1.25rem 2.5rem 1.25rem;
  }
}

.reader-header {
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.75rem;
  text-align: center;
}

.reader-title {
  font-family: var(--serif);
  font-size: 2.4rem;
  line-height: 1.25;
  font-weight: 400;
  color: var(--text-h);
  margin: 0 0 0.9rem 0;
}

@media (max-width: 640px) {
  .reader-title {
    font-size: 2rem;
  }
}

.reader-meta {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.reader-content {
  font-family: var(--sans);
  font-size: 1.08rem;
  line-height: 1.9;
  color: var(--text);
}

.reader-paragraph {
  margin: 0 0 1.25rem 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.reader-empty {
  color: var(--text-muted);
}

.reader-loading {
  padding: 4rem 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-strong);
  border-top-color: var(--text-h);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
