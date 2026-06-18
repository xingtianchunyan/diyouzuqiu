<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { worksService, type Work } from '../api/services/works.service'
import { useAuthStore } from '../stores/auth'
import MarkdownRenderer from '../components/editor/MarkdownRenderer.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const work = ref<Work | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const id = computed(() => route.params.id as string)

const canDeleteWork = (work: Work) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (work.createdByUserId === authStore.user.id) return true
  if (authStore.user.memberId && work.authorMemberId === authStore.user.memberId) return true
  return false
}

const metaLine = computed(() => {
  if (!work.value) return ''
  const parts: string[] = []
  const author = work.value.authorMember?.displayName || work.value.authorName
  if (author) parts.push(author)
  else if (work.value.authorMemberId) parts.push(work.value.authorMemberId)
  if (work.value.date) parts.push(work.value.date.substring(0, 10))
  return parts.join(' · ')
})

const fetchWork = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await worksService.getWorkDetail(id.value)
    work.value = res.data
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || t('errors.loadWorkFailed')
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  if (!work.value) return
  if (confirm(t('confirm.deleteWork'))) {
    try {
      await worksService.deleteWork(work.value.id)
      router.push('/works')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteWorkFailed'))
    }
  }
}

onMounted(fetchWork)
watch(id, fetchWork)
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">
        <RouterLink to="/works" class="back-link">&larr; {{ t('app.menu.works') }}</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="loading-state delay-2 animate-slide-up">
      <div class="spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state delay-2 animate-slide-up">
      <p>{{ error }}</p>
    </div>

    <article v-else-if="work" class="work-article delay-2 animate-slide-up">
      <header class="article-header">
        <div class="article-type">{{ work.type === 'ARTICLE' ? t('works.articles') : t('works.poems') }}</div>
        <h1 class="article-title">{{ work.title }}</h1>
        <div v-if="metaLine" class="article-meta">{{ metaLine }}</div>
        <div class="article-actions">
          <button v-if="canDeleteWork(work)" class="minimal-btn" @click="handleDelete">{{ t('common.delete') }}</button>
        </div>
      </header>

      <div class="article-body">
        <MarkdownRenderer :markdown="work.content || ''" />
        <p v-if="!work.content" class="article-paragraph article-empty">{{ t('works.noContent') }}</p>
      </div>
    </article>
  </main>
</template>

<style scoped>
.back-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s ease;
}
.back-link:hover {
  color: var(--text-h);
}

.loading-state {
  padding: 4rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.85rem;
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
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--error);
  font-family: var(--sans);
  padding: 2rem 0;
}

.work-article {
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.article-header {
  text-align: center;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
}

.article-type {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.article-title {
  font-family: var(--serif);
  font-size: 2.4rem;
  line-height: 1.25;
  font-weight: 400;
  color: var(--text-h);
  margin: 0 0 0.9rem 0;
}

.article-meta {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.article-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.minimal-btn {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  padding: 8px 20px;
  font-size: 0.75rem;
  font-family: var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 40px;
}

.minimal-btn:hover {
  background: var(--text-h);
  color: var(--surface);
}

.article-body {
  font-family: var(--sans);
  font-size: 1.08rem;
  line-height: 1.9;
  color: var(--text);
}

.article-paragraph {
  margin: 0 0 1.25rem 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.article-empty {
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .article-title {
    font-size: 2rem;
  }
}
</style>
