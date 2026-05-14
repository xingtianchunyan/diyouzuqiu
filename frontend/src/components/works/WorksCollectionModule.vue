<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export type WorksTypeFilter = 'ALL' | 'ARTICLE' | 'POEM'

export interface WorksCollectionItem {
  id: string
  title: string
  description?: string
  count?: number
}

const props = defineProps<{
  title?: string
  subtitle?: string
  type: WorksTypeFilter
  query: string
  collectionId?: string | null
  collections?: WorksCollectionItem[]
}>()

const emit = defineEmits<{
  (e: 'update:type', value: WorksTypeFilter): void
  (e: 'update:query', value: string): void
  (e: 'update:collectionId', value: string | null): void
  (e: 'submit'): void
}>()

const { t } = useI18n()

const tabs = computed(() => [
  { label: t('app.all', 'All'), value: 'ALL' as const },
  { label: t('works.articles', 'Article'), value: 'ARTICLE' as const },
  { label: t('works.poems', 'Poem'), value: 'POEM' as const }
])

const onSelectCollection = (id: string) => {
  if (props.collectionId === id) emit('update:collectionId', null)
  else emit('update:collectionId', id)
  emit('submit')
}
</script>

<template>
  <section class="collection-module">
    <div class="module-header">
      <div class="module-kicker">{{ props.title ?? t('app.menu.works') }}</div>
      <div class="module-subtitle" v-if="props.subtitle">{{ props.subtitle }}</div>
    </div>

    <div class="module-controls">
      <div class="search-wrapper">
        <input
          :value="props.query"
          type="text"
          class="minimal-input"
          :placeholder="t('app.search') + '...'"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('submit')"
          @blur="emit('submit')"
        />
        <button type="button" class="search-btn" @click="emit('submit')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      <div class="tabs-minimal">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="tab-btn"
          :class="{ 'is-active': props.type === tab.value }"
          @click="emit('update:type', tab.value); emit('submit')"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-if="props.collections && props.collections.length > 0" class="collections-strip">
      <button
        v-for="c in props.collections"
        :key="c.id"
        type="button"
        class="collection-pill"
        :class="{ 'is-active': props.collectionId === c.id }"
        @click="onSelectCollection(c.id)"
      >
        <span class="pill-title">{{ c.title }}</span>
        <span v-if="typeof c.count === 'number'" class="pill-count">{{ c.count }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.collection-module {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.module-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.module-kicker {
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.module-subtitle {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-h);
}

.module-controls {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .module-controls {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.minimal-input {
  width: 100%;
  appearance: none;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  font-family: var(--sans);
  font-size: 1rem;
  color: var(--text-h);
  padding: 0.5rem 2rem 0.5rem 0;
  outline: none;
  transition: border-color 0.3s ease;
}

.minimal-input:focus {
  border-color: var(--brand);
}

.search-btn {
  position: absolute;
  right: 0;
  bottom: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.3s ease;
}

.search-btn:hover {
  color: var(--text-h);
}

.tabs-minimal {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0;
  padding-bottom: 0.25rem;
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--text-h);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn:hover {
  color: var(--text-h);
}

.tab-btn.is-active {
  color: var(--text-h);
  font-weight: 500;
}

.tab-btn.is-active::after {
  transform: scaleX(1);
  transform-origin: left;
}

.collections-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.collection-pill {
  flex: 1 1 auto;
  min-width: 60px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collection-pill:hover {
  border-color: var(--border-strong);
  background: var(--surface-hover);
  color: var(--text);
}

.collection-pill.is-active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}

.pill-title {
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
}

.pill-count {
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 600;
}
</style>
