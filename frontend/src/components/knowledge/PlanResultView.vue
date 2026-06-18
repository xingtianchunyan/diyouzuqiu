<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const { t } = useI18n()

const props = defineProps<{
  plan: {
    plan: string
    budget: string
    prizes: string
    speech: string
  }
}>()

const tabs = computed(() => [
  { key: 'plan', label: t('planner.tabs.plan') },
  { key: 'budget', label: t('planner.tabs.budget') },
  { key: 'prizes', label: t('planner.tabs.prizes') },
  { key: 'speech', label: t('planner.tabs.speech') }
])

const activeTab = ref('plan')

function render(text: string) {
  return DOMPurify.sanitize(marked.parse(text) as string)
}
</script>

<template>
  <div class="plan-result">
    <div class="plan-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="plan-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="plan-body markdown-body" v-html="render(plan[activeTab as keyof typeof plan])"></div>
  </div>
</template>

<style scoped>
.plan-result {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.plan-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding: 0 1rem;
  flex-shrink: 0;
}

.plan-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1rem;
  color: var(--text-muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  cursor: pointer;
}

.plan-tab.active {
  color: var(--text-h);
  border-bottom-color: var(--text-h);
}

.plan-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.7;
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

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--surface-hover);
}

.markdown-body :deep(pre) {
  background: var(--surface-hover);
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
