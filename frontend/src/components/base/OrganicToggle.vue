<script setup lang="ts">
import { computed } from 'vue'

export interface ToggleOption {
  label: string
  value: any
}

const props = defineProps<{
  modelValue: any
  options: ToggleOption[] // Expected to have exactly 2 options
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()

// Calculate the active index (0 or 1)
const activeIndex = computed(() => {
  return props.options.findIndex(opt => opt.value === props.modelValue)
})

const selectOption = (option: ToggleOption) => {
  if (props.disabled) return
  if (props.modelValue !== option.value) {
    emit('update:modelValue', option.value)
    emit('change', option.value)
  }
}
</script>

<template>
  <div 
    class="organic-toggle" 
    :class="{ 'is-disabled': disabled }"
    role="radiogroup"
  >
    <!-- Background Pill -->
    <div class="toggle-track">
      <!-- The sliding highlight pill -->
      <div 
        class="toggle-highlight"
        :style="{ 
          transform: `translateX(${activeIndex === 1 ? '100%' : '0%'})`,
          opacity: activeIndex !== -1 ? 1 : 0
        }"
      ></div>

      <!-- Option Buttons -->
      <div 
        v-for="(option, index) in options" 
        :key="index"
        class="toggle-option"
        :class="{ 'is-active': activeIndex === index }"
        @click="selectOption(option)"
        role="radio"
        :aria-checked="activeIndex === index"
      >
        <span class="option-label">{{ option.label }}</span>
        <!-- Decorative dot indicator that appears when active -->
        <span class="active-dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.organic-toggle {
  position: relative;
  width: 100%;
  max-width: 320px;
  font-family: var(--sans);
  
  /* Toggle Theme Variables */
  --toggle-bg: var(--surface-hover);
  --toggle-border: var(--border-strong);
  --toggle-highlight: var(--text-h);
  --toggle-text: var(--text-muted);
  --toggle-active-text: var(--surface);
}

.organic-toggle.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.toggle-track {
  position: relative;
  display: flex;
  background: var(--toggle-bg);
  border: 1px solid var(--toggle-border);
  padding: 4px;
  
  /* ORGANIC SHAPE: irregular pill */
  border-radius: 30px 10px 25px 15px / 15px 30px 10px 25px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* The Sliding Background Pill */
.toggle-highlight {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px); /* Half width minus padding */
  height: calc(100% - 8px);
  background: var(--toggle-highlight);
  
  /* Organic inner shape matching the track */
  border-radius: 20px 8px 15px 10px / 10px 20px 8px 15px;
  
  /* Q-bounce spring animation */
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
  z-index: 1;
}

.toggle-option {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  z-index: 2;
  transition: color 0.3s ease;
  color: var(--toggle-text);
}

.toggle-option:hover {
  color: var(--text-h);
}

.toggle-option.is-active {
  color: var(--toggle-active-text);
  font-weight: 500;
}

.option-label {
  font-size: 0.95rem;
  position: relative;
  top: 1px; /* Optical vertical alignment */
}

/* Tiny decorative dot */
.active-dot {
  width: 4px;
  height: 4px;
  background: var(--brand);
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle-option.is-active .active-dot {
  transform: scale(1);
}
</style>
