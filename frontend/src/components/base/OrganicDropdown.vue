<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface DropdownOption {
  label: string
  value: any
}

const props = withDefaults(defineProps<{
  modelValue: any
  options: DropdownOption[]
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
}>(), {
  placeholder: 'Select an option...',
  multiple: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Handle click outside to close the dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

// Determine if an option is currently selected
const isSelected = (val: any) => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val)
  }
  return props.modelValue === val
}

const selectOption = (option: DropdownOption) => {
  if (props.multiple) {
    const currentValues = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = currentValues.indexOf(option.value)
    
    if (index === -1) {
      currentValues.push(option.value)
    } else {
      currentValues.splice(index, 1)
    }
    emit('update:modelValue', currentValues)
    emit('change', currentValues)
  } else {
    if (props.modelValue !== option.value) {
      emit('update:modelValue', option.value)
      emit('change', option.value)
    }
    isOpen.value = false // Auto close on single select
  }
}

// Compute the display text for the trigger button
const displayText = computed(() => {
  if (props.multiple) {
    if (!Array.isArray(props.modelValue) || props.modelValue.length === 0) return props.placeholder
    const selectedLabels = props.options
      .filter(opt => props.modelValue.includes(opt.value))
      .map(opt => opt.label)
    return selectedLabels.length > 0 ? selectedLabels.join(', ') : props.placeholder
  } else {
    if (props.modelValue === '' || props.modelValue === null || props.modelValue === undefined) {
      return props.placeholder
    }
    const selected = props.options.find(opt => opt.value === props.modelValue)
    return selected ? selected.label : props.placeholder
  }
})
</script>

<template>
  <div class="organic-dropdown" ref="dropdownRef" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <!-- Trigger Button -->
    <div class="dropdown-trigger" @click="toggleDropdown">
      <span class="display-text" :class="{ 'is-placeholder': !multiple && (modelValue === '' || modelValue == null) }">
        {{ displayText }}
      </span>
      <div class="arrow-icon" :class="{ 'is-rotated': isOpen }">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <!-- Soft halo effect underneath the line -->
      <div class="trigger-halo"></div>
    </div>

    <!-- Dropdown Menu / Bubble -->
    <transition name="spring-bubble">
      <div v-if="isOpen" class="dropdown-menu">
        <!-- The Pointer / Tail of the comic bubble -->
        <div class="bubble-pointer"></div>
        
        <div class="options-container">
          <div 
            v-for="(option, index) in options" 
            :key="index"
            class="option-item"
            :class="{ 'is-selected': isSelected(option.value) }"
            @click="selectOption(option)"
          >
            <div class="option-content">
              <span v-if="multiple" class="checkbox">
                <svg v-if="isSelected(option.value)" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <span class="option-label">{{ option.label }}</span>
            </div>
            <!-- Decorative particle/dot on hover -->
            <div class="hover-particle"></div>
          </div>
          
          <div v-if="options.length === 0" class="option-empty">
            No options available
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ==========================================================================
   HOW TO MODIFY CONTENT AND STYLES:
   - Colors: Update var(--bubble-bg) and var(--bubble-text) below.
   - Animation: Adjust the `cubic-bezier` inside `.spring-bubble-enter-active`
   - Organic Shape: Modify `border-radius` in `.dropdown-menu`
   ========================================================================== */

.organic-dropdown {
  position: relative;
  width: 100%;
  font-family: var(--sans);
  
  /* Dropdown Bubble Theme Variables */
  --bubble-bg: var(--surface);
  --bubble-border: var(--border-strong);
  --bubble-text: var(--text-h);
  --bubble-hover-bg: var(--bg);
  --bubble-selected-bg: var(--text-h);
  --bubble-selected-text: var(--surface);
  --bubble-shadow: rgba(0, 0, 0, 0.08) 0px 10px 30px -5px, rgba(0, 0, 0, 0.04) 0px 5px 15px -3px;
}

/* Elevate the entire dropdown container when open to prevent clipping by sibling stacking contexts */
/* Elevate the entire dropdown container when open to prevent clipping by sibling stacking contexts */
.organic-dropdown.is-open {
  z-index: 9999;
}

/* --- TRIGGER BUTTON --- */
.dropdown-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-strong);
  transition: border-color 0.3s ease;
  user-select: none;
  z-index: 2;
}

.organic-dropdown:not(.is-disabled) .dropdown-trigger:hover {
  border-color: var(--brand);
}

.organic-dropdown.is-open .dropdown-trigger {
  border-color: var(--brand);
}

.display-text {
  font-size: 1.1rem;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1rem;
}

.display-text.is-placeholder {
  color: var(--text-muted);
}

.arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), color 0.3s ease;
}

.arrow-icon.is-rotated {
  transform: rotate(180deg);
  color: var(--brand);
}

/* Soft Halo underneath the trigger on hover/open */
.trigger-halo {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--brand);
  opacity: 0;
  filter: blur(4px);
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.organic-dropdown:not(.is-disabled) .dropdown-trigger:hover .trigger-halo,
.organic-dropdown.is-open .trigger-halo {
  opacity: 0.6;
}

.organic-dropdown.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* --- DROPDOWN BUBBLE MENU --- */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px); /* Space for the pointer */
  left: 0;
  width: 100%;
  min-width: 200px;
  background: var(--bubble-bg);
  border: 1px solid var(--bubble-border);
  box-shadow: var(--bubble-shadow);
  z-index: 100;
  
  /* ORGANIC SHAPE: Hand-drawn / Cloud-like irregular border-radius */
  border-radius: 25px 8px 30px 10px / 10px 25px 8px 30px;
  
  /* Adding a very subtle wavy filter for a slightly gooey/torn look */
  backdrop-filter: blur(10px);
}

/* The Comic Bubble Tail / Pointer */
.bubble-pointer {
  position: absolute;
  top: -8px;
  left: 20px;
  width: 16px;
  height: 16px;
  background: var(--bubble-bg);
  border-top: 1px solid var(--bubble-border);
  border-left: 1px solid var(--bubble-border);
  
  /* Organic pointer shape */
  border-radius: 4px 0 12px 0;
  transform: rotate(45deg);
  z-index: -1;
}

.options-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.75rem 0.5rem;
  
  /* Hide scrollbar for a cleaner look */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.options-container::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
.options-container::-webkit-scrollbar-thumb {
  background-color: var(--border-strong);
  border-radius: 4px;
}

/* --- OPTIONS ITEMS --- */
.option-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  cursor: pointer;
  color: var(--bubble-text);
  border-radius: 15px 5px 20px 8px / 8px 20px 5px 15px; /* Organic inner shape */
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 2;
  transition: transform 0.3s ease;
}

.option-label {
  font-size: 0.95rem;
}

/* Multiple Selection Checkbox Style */
.checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-strong);
  border-radius: 6px 4px 7px 3px; /* Organic checkbox */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

/* Hover Feedback */
.option-item:hover {
  background: var(--bubble-hover-bg);
}

.option-item:hover .option-content {
  transform: translateX(6px); /* Slight shift right */
}

/* Hover decorative particle */
.hover-particle {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--brand);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.option-item:hover .hover-particle {
  transform: translateY(-50%) scale(1);
  opacity: 1;
  left: 8px;
}

/* Selected State */
.option-item.is-selected {
  background: var(--bubble-selected-bg);
  color: var(--bubble-selected-text);
  font-weight: 500;
}

.option-item.is-selected .checkbox {
  background: var(--surface);
  border-color: var(--surface);
  color: var(--text-h);
}

.option-item.is-selected .hover-particle {
  background: var(--surface);
}

.option-empty {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
}

/* ==========================================================================
   ANIMATIONS: Spring Easing
   ========================================================================== */

/* Enter: Scale up from button with a spring bounce */
.spring-bubble-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top center;
}

/* Leave: Smooth fade and slight scale down */
.spring-bubble-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}

.spring-bubble-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-15px);
}

.spring-bubble-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-5px);
}
</style>
