<script setup lang="ts">
const props = defineProps<{
  activeTab: 'chronicles' | 'media' | 'works' | 'matches'
  chroniclesCount: number
  mediaCount: number
  worksCount: number
  matchesCount: number
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', val: 'chronicles' | 'media' | 'works' | 'matches'): void
}>()
</script>

<template>
  <div class="tabs-nav">
    <button
      class="tab-pill"
      :class="{ active: activeTab === 'chronicles' }"
      @click="emit('update:activeTab', 'chronicles')"
    >
      <span class="tab-label">{{ $t('person.tabs.chronicles') }}</span>
      <span class="tab-count">{{ chroniclesCount }}</span>
    </button>
    <button
      class="tab-pill"
      :class="{ active: activeTab === 'media' }"
      @click="emit('update:activeTab', 'media')"
    >
      <span class="tab-label">{{ $t('app.menu.media') }}</span>
      <span class="tab-count">{{ mediaCount }}</span>
    </button>
    <button
      class="tab-pill"
      :class="{ active: activeTab === 'works' }"
      @click="emit('update:activeTab', 'works')"
    >
      <span class="tab-label">{{ $t('app.menu.works') }}</span>
      <span class="tab-count">{{ worksCount }}</span>
    </button>
    <button
      class="tab-pill"
      :class="{ active: activeTab === 'matches' }"
      @click="emit('update:activeTab', 'matches')"
    >
      <span class="tab-label">{{ $t('person.tabs.matches') }}</span>
      <span class="tab-count">{{ matchesCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 16px;
}
.tab-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-label {
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}
.tab-count {
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 600;
}
.tab-pill:hover {
  background: var(--surface-h);
  color: var(--text);
}
.tab-pill.active {
  background: var(--text);
  color: var(--bg);
  border-color: var(--text);
}
</style>
