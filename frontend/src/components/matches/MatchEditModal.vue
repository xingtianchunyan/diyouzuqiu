<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { matchesService, type Match, type MatchDetail } from '../../api/services/matches.service'
import { useMembersStore } from '../../stores/members'
import OrganicDropdown from '../base/OrganicDropdown.vue'

const props = defineProps<{
  match: Match | MatchDetail | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', match: Match | MatchDetail): void
}>()

const { t } = useI18n()
const membersStore = useMembersStore()

const loading = ref(false)
const error = ref<string | null>(null)

const form = ref<{
  playedAt: string
  redScore: number
  blueScore: number
  mvpMemberId: string
  notes: string
  participantIds: string[]
}>({
  playedAt: '',
  redScore: 0,
  blueScore: 0,
  mvpMemberId: '',
  notes: '',
  participantIds: []
})

const toLocalDatetime = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const memberOptions = computed(() => [
  { label: t('common.none'), value: '' },
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

const participantOptions = computed(() => [
  ...membersStore.members.map(m => ({ label: `${m.displayName} (${m.team || t('common.team.none')})`, value: m.id }))
])

watch(() => props.match, (match) => {
  if (match) {
    const detail = match as MatchDetail
    form.value = {
      playedAt: toLocalDatetime(match.playedAt),
      redScore: match.redScore,
      blueScore: match.blueScore,
      mvpMemberId: match.mvpMemberId || '',
      notes: (detail.notes as string) || '',
      participantIds: detail.participants?.map(p => p.memberId) || []
    }
    membersStore.fetchMembers()
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!props.match) return
  if (!form.value.playedAt) {
    error.value = t('errors.playedAtRequired')
    return
  }
  loading.value = true
  error.value = null

  try {
    const participants = form.value.participantIds.map(id => {
      const member = membersStore.members.find(m => m.id === id)
      return { memberId: id, side: member?.team || 'RED' }
    })

    const res = await matchesService.updateMatch(props.match.id, {
      playedAt: new Date(form.value.playedAt).toISOString(),
      redScore: form.value.redScore,
      blueScore: form.value.blueScore,
      mvpMemberId: form.value.mvpMemberId || undefined,
      notes: form.value.notes || undefined,
      participantIds: participants
    })
    emit('updated', res.data)
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || t('errors.updateMatchFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="match" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ t('matches.editTitle') }}</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">{{ t('matches.form.playedAt') }}</label>
            <input v-model="form.playedAt" type="datetime-local" class="form-input" required />
          </div>

          <div class="score-row">
            <div class="form-group flex-1">
              <label class="form-label">{{ t('matches.form.redScore') }}</label>
              <input v-model.number="form.redScore" type="number" class="form-input" required min="0" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">{{ t('matches.form.blueScore') }}</label>
              <input v-model.number="form.blueScore" type="number" class="form-input" required min="0" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('matches.form.mvp') }}</label>
            <OrganicDropdown v-model="form.mvpMemberId" :options="memberOptions" :placeholder="t('common.none')" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('matches.form.participants') }}</label>
            <OrganicDropdown v-model="form.participantIds" :options="participantOptions" :multiple="true" :placeholder="t('matches.form.selectParticipants')" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('matches.form.notes') }}</label>
            <textarea v-model="form.notes" class="form-textarea" rows="3"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="editorial-btn secondary" @click="emit('close')">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="editorial-btn" :disabled="loading">
              <span v-if="loading">{{ t('common.loading') }}</span>
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
  max-width: 520px;
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

.score-row {
  display: flex;
  gap: 1.5rem;
}

.flex-1 {
  flex: 1;
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
