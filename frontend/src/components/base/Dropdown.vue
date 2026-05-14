<template>
  <div class="base-dropdown" ref="dropdownRef">
    <div 
      class="dropdown-trigger" 
      :class="{ 'is-open': isOpen }"
      @click="toggle"
    >
      <span class="dropdown-value">
        {{ selectedLabel || placeholder }}
      </span>
      <div class="dropdown-actions">
        <button 
          v-if="modelValue && clearable" 
          class="clear-btn"
          @click.stop="clear"
          aria-label="Clear selection"
        >
          &times;
        </button>
        <span class="arrow" :class="{ 'is-up': isOpen }">▼</span>
      </div>
    </div>
    
    <div v-if="isOpen" class="dropdown-menu">
      <div 
        v-for="option in options" 
        :key="option.value ?? 'null'"
        class="dropdown-item"
        :class="{ 'is-selected': option.value === modelValue }"
        @click="select(option)"
      >
        {{ option.label }}
      </div>
      <div v-if="options.length === 0" class="dropdown-empty">
        No options
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface DropdownOption {
  label: string
  value: string | number | null
}

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  options: DropdownOption[]
  placeholder?: string
  clearable?: boolean
}>(), {
  placeholder: 'Select...',
  clearable: true,
  modelValue: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void
  (e: 'change', value: string | number | null): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option ? option.label : ''
})

const toggle = () => {
  isOpen.value = !isOpen.value
}

const select = (option: DropdownOption) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

const clear = () => {
  emit('update:modelValue', null)
  emit('change', null)
  isOpen.value = false
}

const onClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
.base-dropdown {
  position: relative;
  display: inline-block;
  width: 100%;
  font-family: var(--sans);
  color: var(--text-h);
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 16px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover, .dropdown-trigger.is-open {
  border-color: var(--brand);
}

.dropdown-value {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
}

.dropdown-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  color: var(--text-h);
}

.arrow {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.arrow.is-up {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  box-shadow: var(--shadow-whisper);
  z-index: 10;
  max-height: 240px;
  overflow-y: auto;
  padding: 8px 0;
}

.dropdown-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 15px;
}

.dropdown-item:hover {
  background: var(--bg);
}

.dropdown-item.is-selected {
  color: var(--brand);
  font-weight: 500;
  background: var(--bg);
}

.dropdown-empty {
  padding: 12px 16px;
  color: var(--text-muted);
  text-align: center;
  font-size: 14px;
}
</style>