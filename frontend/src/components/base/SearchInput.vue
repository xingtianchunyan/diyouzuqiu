<template>
  <div class="base-search-input">
    <div class="input-wrapper" :class="{ 'is-focused': isFocused }">
      <span class="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input
        type="text"
        class="input"
        :value="modelValue"
        :placeholder="placeholder"
        @input="onInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <button 
        v-if="modelValue" 
        class="clear-btn"
        @click="clear"
        aria-label="Clear search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  debounceTime?: number
}>(), {
  modelValue: '',
  placeholder: 'Search...',
  debounceTime: 300
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
}>()

const isFocused = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('search', value)
  }, props.debounceTime)
}

const clear = () => {
  emit('update:modelValue', '')
  emit('search', '')
}
</script>

<style scoped>
.base-search-input {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.input-wrapper.is-focused {
  border-color: var(--focus);
  box-shadow: 0 0 0 2px rgba(56, 152, 236, 0.2);
}

.search-icon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  margin-right: 8px;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 15px;
  min-width: 0;
}

.input::placeholder {
  color: var(--text-muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--border-strong);
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--text-muted);
  color: var(--surface);
}
</style>
