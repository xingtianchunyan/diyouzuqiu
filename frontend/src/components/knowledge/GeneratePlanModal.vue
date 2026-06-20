<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { type KnowledgeDoc } from '../../api/services/knowledge.service'
import { aiService, type PlannerConstraints } from '../../api/services/ai.service'
import PlanResultView from './PlanResultView.vue'

const { t } = useI18n()

const props = defineProps<{
  show: boolean
  docs: KnowledgeDoc[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const selectedIds = ref<string[]>([])
const constraints = ref<PlannerConstraints>({})
const result = ref<any>(null)
const loading = ref(false)
const error = ref('')

const toggleDoc = (id: string) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(i => i !== id)
  } else {
    selectedIds.value.push(id)
  }
}

const canSubmit = computed(() => selectedIds.value.length > 0)

async function generate() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const payload: any = { docIds: selectedIds.value }
    const c = constraints.value
    if (c.peopleCount || c.budget || c.date || c.location) {
      payload.constraints = {
        ...c,
        mustHave: c.mustHave?.filter(Boolean),
        avoid: c.avoid?.filter(Boolean)
      }
    }
    const res = await aiService.generate('knowledge', {
      docIds: payload.docIds,
      constraints: payload.constraints
    })
    result.value = res.data.plan
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || t('knowledge.generateError')
  } finally {
    loading.value = false
  }
}

function close() {
  if (loading.value) return
  selectedIds.value = []
  constraints.value = {}
  result.value = null
  error.value = ''
  emit('close')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-content" :class="{ wide: result }">
        <div class="modal-header">
          <h2 class="modal-title">{{ t('knowledge.generateTitle') }}</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="!result" class="generate-form">
            <p class="hint">{{ t('knowledge.generateHint') }}</p>

            <div class="doc-select">
              <label v-for="doc in docs" :key="doc.id" class="doc-checkbox">
                <input type="checkbox" :value="doc.id" :checked="selectedIds.includes(doc.id)" @change="toggleDoc(doc.id)" />
                <span class="doc-title">{{ doc.title }}</span>
              </label>
            </div>

            <div class="constraints-grid">
              <div class="form-group">
                <label>{{ t('planner.form.peopleCount') }}</label>
                <input v-model.number="constraints.peopleCount" type="number" class="form-input" />
              </div>
              <div class="form-group">
                <label>{{ t('planner.form.budget') }}</label>
                <input v-model.number="constraints.budget" type="number" class="form-input" />
              </div>
              <div class="form-group">
                <label>{{ t('planner.form.date') }}</label>
                <input v-model="constraints.date" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>{{ t('planner.form.location') }}</label>
                <input v-model="constraints.location" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>{{ t('planner.form.style') }}</label>
                <input v-model="constraints.style" type="text" class="form-input" />
              </div>
            </div>

            <div v-if="error" class="error-text">{{ error }}</div>

            <div class="modal-footer">
              <button class="editorial-btn secondary" @click="close" :disabled="loading">{{ t('common.cancel') }}</button>
              <button class="editorial-btn" @click="generate" :disabled="!canSubmit || loading">
                <span v-if="loading">{{ t('planner.generating') }}</span>
                <span v-else>{{ t('knowledge.generateSubmit') }}</span>
              </button>
            </div>
          </div>

          <div v-else class="result-area">
            <PlanResultView :plan="result" />
            <div class="modal-footer">
              <button class="editorial-btn secondary" @click="result = null">{{ t('knowledge.backToForm') }}</button>
              <button class="editorial-btn" @click="close">{{ t('common.close') }}</button>
            </div>
          </div>
        </div>
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
  padding: 1.5rem;
  box-shadow: var(--shadow-whisper);
  display: flex;
  flex-direction: column;
}

.modal-content.wide {
  max-width: 900px;
  height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-h);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.doc-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.doc-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.doc-title {
  color: var(--text-h);
}

.constraints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-input {
  background: transparent;
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 0.9rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--text-h);
}

.error-text {
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-shrink: 0;
}

.result-area {
  display: flex;
  flex-direction: column;
  height: 100%;
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
