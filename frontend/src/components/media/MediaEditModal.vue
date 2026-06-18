<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Media, MediaMeta } from '../../api/services/media.service'
import { mediaService } from '../../api/services/media.service'
import { useMembersStore } from '../../stores/members'
import OrganicDropdown from '../base/OrganicDropdown.vue'

const props = defineProps<{
  media: Media | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', media: Media): void
}>()

const { t } = useI18n()
const membersStore = useMembersStore()

const loading = ref(false)
const error = ref<string | null>(null)

const form = ref<{
  takenAt: string
  year: number | ''
  personTagIds: string[]
}>({
  takenAt: '',
  year: '',
  personTagIds: []
})

const memberOptions = computed(() => [
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

const toLocalDatetime = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(() => props.media, (media) => {
  if (media) {
    form.value = {
      takenAt: toLocalDatetime(media.takenAt),
      year: media.year ?? '',
      personTagIds: media.personTags?.map(p => p.id) ?? []
    }
    membersStore.fetchMembers()
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!props.media) return
  loading.value = true
  error.value = null

  try {
    const payload: MediaMeta = {
      takenAt: form.value.takenAt ? new Date(form.value.takenAt).toISOString() : null,
      year: form.value.year ? Number(form.value.year) : null,
      personTagIds: form.value.personTagIds.length > 0 ? form.value.personTagIds : []
    }
    const res = await mediaService.updateMedia(props.media.id, payload)
    emit('updated', res.data)
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || 'Failed to update media'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="media" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ t('media.editTitle') || 'Edit Media' }}</h2>
          <button class="close-btn" @click="emit('close')" aria-label="Close">&times;</button>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">{{ t('upload.takenAt') || 'TAKEN AT' }}</label>
            <input v-model="form.takenAt" type="datetime-local" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('upload.year') || 'YEAR' }}</label>
            <input v-model.number="form.year" type="number" class="form-input" placeholder="YYYY" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('upload.personTags') || 'SUBJECT TAGS' }}</label>
            <OrganicDropdown v-model="form.personTagIds" :options="memberOptions" :multiple="true" placeholder="Select tags..." />
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
  max-width: 480px;
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

.form-input {
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
