<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { worksService, type Work } from '../../api/services/works.service'
import { useMembersStore } from '../../stores/members'
import OrganicDropdown from '../base/OrganicDropdown.vue'
import OrganicToggle from '../base/OrganicToggle.vue'
import MarkdownEditor from '../editor/MarkdownEditor.vue'

const props = defineProps<{
  work: Work | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', work: Work): void
}>()

const { t } = useI18n()
const membersStore = useMembersStore()

const loading = ref(false)
const error = ref<string | null>(null)

const form = ref<{
  type: 'ARTICLE' | 'POEM'
  title: string
  authorId: string
  authorName: string
  date: string
  content: string
}>({
  type: 'ARTICLE',
  title: '',
  authorId: '',
  authorName: '',
  date: '',
  content: ''
})

const typeOptions = computed(() => [
  { label: t('works.articles'), value: 'ARTICLE' },
  { label: t('works.poems'), value: 'POEM' }
])

const memberOptions = computed(() => [
  { label: t('works.form.unknownAuthor'), value: '' },
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

watch(() => props.work, (work) => {
  if (work) {
    form.value = {
      type: work.type,
      title: work.title,
      authorId: work.authorMemberId || '',
      authorName: work.authorName || '',
      date: work.date ? work.date.slice(0, 10) : '',
      content: work.content || ''
    }
    membersStore.fetchMembers()
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!props.work) return
  if (!form.value.title || !form.value.content || !form.value.date) {
    error.value = t('errors.workRequiredFields')
    return
  }
  loading.value = true
  error.value = null

  try {
    const res = await worksService.updateWork(props.work.id, {
      type: form.value.type,
      title: form.value.title,
      content: form.value.content,
      authorId: form.value.authorName ? undefined : form.value.authorId || undefined,
      authorName: form.value.authorName?.trim() || undefined,
      date: form.value.date
    })
    emit('updated', res.data)
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || t('errors.updateWorkFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="work" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ t('works.editTitle') }}</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">{{ t('works.form.type') }}</label>
            <OrganicToggle v-model="form.type" :options="typeOptions" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('works.form.title') }}</label>
            <input v-model="form.title" type="text" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('works.form.author') }}</label>
            <OrganicDropdown
              v-model="form.authorId"
              :options="memberOptions"
              :placeholder="t('works.form.selectAuthor')"
              @change="form.authorName = ''"
            />
            <input
              v-model="form.authorName"
              type="text"
              class="form-input author-name-input"
              :placeholder="t('works.form.orNewAuthor')"
              @input="form.authorId = ''"
            />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('works.form.date') }}</label>
            <input v-model="form.date" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('works.form.content') }}</label>
            <MarkdownEditor v-model="form.content" :placeholder="t('works.form.contentPlaceholder')" />
          </div>

          <div class="form-actions">
            <button type="button" class="editorial-btn secondary" @click="emit('close')">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="editorial-btn" :disabled="loading">
              <span v-if="loading">{{ t('common.saving') }}</span>
              <span v-else>{{ t('common.save') }}</span>
            </button>
          </div>
        </form>
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.modal-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.editorial-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.form-input,
.form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  font-family: var(--sans);
  font-size: 1.1rem;
  color: var(--text-h);
  padding: 0.5rem 0;
  outline: none;
}

.form-textarea {
  resize: vertical;
  line-height: 1.5;
}

.author-name-input {
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.editorial-btn {
  flex: 1;
  background: transparent;
  color: var(--text-h);
  border: 1px solid var(--text-h);
  padding: 1rem;
  font-family: var(--sans);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.editorial-btn:hover:not(:disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.editorial-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editorial-btn.secondary {
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.editorial-btn.secondary:hover:not(:disabled) {
  background: var(--border-strong);
  color: var(--text-h);
}

.alert-error {
  color: var(--error);
  font-family: var(--sans);
  font-size: 0.85rem;
  margin-bottom: 1rem;
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
