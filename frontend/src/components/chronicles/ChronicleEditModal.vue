<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { chroniclesService } from '../../api/services/chronicles.service'
import { useMembersStore } from '../../stores/members'
import { useMediaStore } from '../../stores/media'
import { useWorksStore } from '../../stores/works'
import { useMatchesStore } from '../../stores/matches'
import type { ChronicleEvent } from './ChroniclesList.vue'
import OrganicDropdown from '../base/OrganicDropdown.vue'
import MarkdownEditor from '../editor/MarkdownEditor.vue'

const props = defineProps<{
  chronicle: ChronicleEvent | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', chronicle: ChronicleEvent): void
}>()

const { t } = useI18n()
const membersStore = useMembersStore()
const mediaStore = useMediaStore()
const worksStore = useWorksStore()
const matchesStore = useMatchesStore()

const loading = ref(false)
const error = ref<string | null>(null)

const form = ref<{
  title: string
  happenedAt: string
  description: string
  memberIds: string[]
  photoIds: string[]
  videoIds: string[]
  articleIds: string[]
  poemIds: string[]
  matchIds: string[]
}>({
  title: '',
  happenedAt: '',
  description: '',
  memberIds: [],
  photoIds: [],
  videoIds: [],
  articleIds: [],
  poemIds: [],
  matchIds: []
})

const memberOptions = computed(() => [
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

const photoOptions = computed(() =>
  mediaStore.mediaList.filter(m => m.type === 'PHOTO').map(m => ({
    label: m.originalFilename || `Photo ${m.id.substring(0, 8)}`,
    value: m.id
  }))
)

const videoOptions = computed(() =>
  mediaStore.mediaList.filter(m => m.type === 'VIDEO').map(m => ({
    label: m.originalFilename || `Video ${m.id.substring(0, 8)}`,
    value: m.id
  }))
)

const articleOptions = computed(() =>
  worksStore.works.filter(w => w.type === 'ARTICLE').map(w => ({
    label: w.title,
    value: w.id
  }))
)

const poemOptions = computed(() =>
  worksStore.works.filter(w => w.type === 'POEM').map(w => ({
    label: w.title,
    value: w.id
  }))
)

const matchOptions = computed(() =>
  matchesStore.matches.map(m => ({
    label: `${new Date(m.playedAt).toLocaleDateString()} - Red ${m.redScore}:${m.blueScore} Blue`,
    value: m.id
  }))
)

watch(() => props.chronicle, (chronicle) => {
  if (chronicle) {
    form.value = {
      title: chronicle.title,
      happenedAt: chronicle.happenedAt ? chronicle.happenedAt.slice(0, 10) : '',
      description: chronicle.description || '',
      memberIds: chronicle.members?.map(m => m.id) || [],
      photoIds: chronicle.mediaAssets?.filter(m => m.type === 'PHOTO').map(m => m.id) || [],
      videoIds: chronicle.mediaAssets?.filter(m => m.type === 'VIDEO').map(m => m.id) || [],
      articleIds: chronicle.works?.filter(w => w.type === 'ARTICLE').map(w => w.id) || [],
      poemIds: chronicle.works?.filter(w => w.type === 'POEM').map(w => w.id) || [],
      matchIds: chronicle.matches?.map(m => m.id) || []
    }
    membersStore.fetchMembers()
    mediaStore.fetchMediaList()
    worksStore.fetchWorks()
    matchesStore.fetchMatches()
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!props.chronicle) return
  if (!form.value.title || !form.value.happenedAt) {
    error.value = 'Title and date are required'
    return
  }
  loading.value = true
  error.value = null

  try {
    const res = await chroniclesService.updateChronicle(props.chronicle.id, {
      title: form.value.title,
      happenedAt: new Date(form.value.happenedAt).toISOString(),
      description: form.value.description || undefined,
      memberIds: form.value.memberIds,
      mediaAssetIds: [...form.value.photoIds, ...form.value.videoIds],
      workIds: [...form.value.articleIds, ...form.value.poemIds],
      matchIds: form.value.matchIds
    })
    emit('updated', res.data as ChronicleEvent)
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || 'Failed to update chronicle'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="chronicle" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ t('chronicles.editTitle') || 'Edit Chronicle' }}</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">TITLE *</label>
            <input v-model="form.title" type="text" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">HAPPENED AT *</label>
            <input v-model="form.happenedAt" type="date" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">DESCRIPTION</label>
            <MarkdownEditor v-model="form.description" placeholder="输入纪事描述..." :rows="6" />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED MEMBERS</label>
            <OrganicDropdown v-model="form.memberIds" :options="memberOptions" :multiple="true" placeholder="Select members..." />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED PHOTOS</label>
            <OrganicDropdown v-model="form.photoIds" :options="photoOptions" :multiple="true" placeholder="Select photos..." />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED VIDEOS</label>
            <OrganicDropdown v-model="form.videoIds" :options="videoOptions" :multiple="true" placeholder="Select videos..." />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED ARTICLES</label>
            <OrganicDropdown v-model="form.articleIds" :options="articleOptions" :multiple="true" placeholder="Select articles..." />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED POEMS</label>
            <OrganicDropdown v-model="form.poemIds" :options="poemOptions" :multiple="true" placeholder="Select poems..." />
          </div>

          <div class="form-group">
            <label class="form-label">ASSOCIATED MATCHES</label>
            <OrganicDropdown v-model="form.matchIds" :options="matchOptions" :multiple="true" placeholder="Select matches..." />
          </div>

          <div class="form-actions">
            <button type="button" class="editorial-btn secondary" @click="emit('close')">
              {{ t('common.cancel') || 'Cancel' }}
            </button>
            <button type="submit" class="editorial-btn" :disabled="loading">
              <span v-if="loading">...</span>
              <span v-else>{{ t('common.save') || 'Save' }}</span>
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
  max-width: 560px;
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
  gap: 1.25rem;
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
