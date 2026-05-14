<template>
  <div class="base-tabs">
    <div class="tabs-list" ref="listRef">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ 'is-active': modelValue === tab.value }"
        @click="selectTab(tab.value, $event)"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
      </button>
      <div class="active-indicator" :style="indicatorStyle"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

export interface TabOption {
  label: string
  value: string | number
  badge?: number | string
}

const props = defineProps<{
  modelValue: string | number
  tabs: TabOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const listRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)' })

const updateIndicator = () => {
  if (!listRef.value) return
  
  const activeIndex = props.tabs.findIndex(t => t.value === props.modelValue)
  if (activeIndex === -1) return
  
  const activeTab = listRef.value.children[activeIndex] as HTMLElement
  if (activeTab) {
    indicatorStyle.value = {
      width: `${activeTab.offsetWidth}px`,
      transform: `translateX(${activeTab.offsetLeft}px)`
    }
  }
}

const selectTab = (value: string | number, event: MouseEvent) => {
  emit('update:modelValue', value)
  emit('change', value)
  
  // Smooth scroll to the tab if it's partially out of view
  const target = event.currentTarget as HTMLElement
  const list = listRef.value
  if (list && target) {
    const listRect = list.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    
    if (targetRect.left < listRect.left) {
      list.scrollBy({ left: targetRect.left - listRect.left - 16, behavior: 'smooth' })
    } else if (targetRect.right > listRect.right) {
      list.scrollBy({ left: targetRect.right - listRect.right + 16, behavior: 'smooth' })
    }
  }
}

watch(() => props.modelValue, () => {
  nextTick(() => {
    updateIndicator()
  })
})

onMounted(() => {
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
})
</script>

<style scoped>
.base-tabs {
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--border-strong);
}

.tabs-list {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  position: relative;
}

.tabs-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 16px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;
  z-index: 1;
}

.tab-item:hover {
  color: var(--text-h);
}

.tab-item.is-active {
  color: var(--brand);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-family: var(--mono);
}

.tab-item.is-active .badge {
  background: var(--brand-2);
  color: white;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background-color: var(--brand);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 2;
}
</style>
