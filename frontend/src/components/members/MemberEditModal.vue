<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { membersService, type Member } from '../../api/services/members.service'
import { useFamiliesStore } from '../../stores/families'
import OrganicDropdown from '../base/OrganicDropdown.vue'

const props = defineProps<{
  member: Member | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', member: Member): void
}>()

const { t } = useI18n()
const familiesStore = useFamiliesStore()

const loading = ref(false)
const error = ref<string | null>(null)
const creatingFamily = ref(false)
const newFamilyLabel = ref('')

const form = ref<{
  displayName: string
  team: 'RED' | 'BLUE' | ''
  familyId: string
  isCaptain: boolean
}>({
  displayName: '',
  team: '',
  familyId: '',
  isCaptain: false
})

const teamOptions = [
  { label: 'None', value: '' },
  { label: 'Red Team', value: 'RED' },
  { label: 'Blue Team', value: 'BLUE' }
]

const familyOptions = computed(() => [
  { label: 'No Family', value: '' },
  ...familiesStore.families.map(f => ({ label: f.label, value: f.id }))
])

watch(() => props.member, (member) => {
  if (member) {
    form.value = {
      displayName: member.displayName,
      team: member.team || '',
      familyId: member.familyId || '',
      isCaptain: member.isCaptain || false
    }
    familiesStore.fetchFamilies()
  }
}, { immediate: true })

const createFamily = async () => {
  const label = newFamilyLabel.value.trim()
  if (!label) return
  try {
    creatingFamily.value = true
    const family = await familiesStore.createFamily(label)
    form.value.familyId = family.id
    newFamilyLabel.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || 'Failed to create family'
  } finally {
    creatingFamily.value = false
  }
}

const handleSubmit = async () => {
  if (!props.member) return
  if (!form.value.displayName.trim()) {
    error.value = 'Display name is required'
    return
  }

  loading.value = true
  error.value = null

  try {
    const res = await membersService.updateMember(props.member.id, {
      displayName: form.value.displayName.trim(),
      team: form.value.team || undefined,
      familyId: form.value.familyId || undefined,
      isCaptain: form.value.isCaptain
    })
    emit('updated', res.data)
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || 'Failed to update member'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div v-if="member" class="modal-overlay" @click="emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ t('people.editMember') || 'Edit Member' }}</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">DISPLAY NAME *</label>
            <input v-model="form.displayName" type="text" class="form-input" required />
          </div>

          <div class="form-group">
            <label class="form-label">TEAM</label>
            <OrganicDropdown v-model="form.team" :options="teamOptions" placeholder="None" />
          </div>

          <div class="form-group">
            <label class="form-label">FAMILY</label>
            <OrganicDropdown v-model="form.familyId" :options="familyOptions" placeholder="No Family" />
            <div v-if="!form.familyId" class="family-creator">
              <input
                v-model="newFamilyLabel"
                type="text"
                class="form-input"
                placeholder="Or type a new family name..."
                @keydown.enter.prevent="createFamily"
              />
              <button
                type="button"
                class="action-btn"
                :disabled="!newFamilyLabel.trim() || creatingFamily"
                @click="createFamily"
              >
                <span v-if="creatingFamily">...</span>
                <span v-else>+ Create</span>
              </button>
            </div>
          </div>

          <div class="form-group inline">
            <label class="form-label">CAPTAIN</label>
            <label class="checkbox-label">
              <input v-model="form.isCaptain" type="checkbox" />
              <span>Is captain</span>
            </label>
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

.form-group.inline {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
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

.family-creator {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  align-items: center;
}

.family-creator .form-input {
  flex: 1;
  margin: 0;
}

.family-creator .action-btn {
  white-space: nowrap;
  padding: 0.6rem 1rem;
  font-size: 0.7rem;
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  cursor: pointer;
  transition: all 0.3s ease;
}

.family-creator .action-btn:hover:not(:disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.family-creator .action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--sans);
  font-size: 1rem;
  color: var(--text-h);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--text-h);
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
