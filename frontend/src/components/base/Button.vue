<template>
  <button
    :class="[
      'base-button',
      `variant-${variant}`,
      `size-${size}`,
      { 'is-loading': loading, 'is-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <span class="content" :class="{ 'opacity-0': loading }">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'warm-sand' | 'white' | 'dark-charcoal' | 'brand' | 'dark-primary'
  size?: 'sm' | 'md'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'warm-sand',
  size: 'md',
  disabled: false,
  loading: false
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: var(--sans);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  outline: none;
}

.base-button:focus-visible {
  outline: 1px solid var(--text-h);
  outline-offset: 2px;
}

.base-button.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.size-sm {
  height: 36px;
  padding: 0 1.5rem;
  font-size: 0.7rem;
}

.size-md {
  height: 48px;
  padding: 0 2rem;
  font-size: 0.8rem;
}

/* Variants */
.variant-warm-sand {
  background: var(--surface);
  color: var(--text-h);
  border-color: var(--border-strong);
}
.variant-warm-sand:hover:not(.is-disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.variant-white {
  background: transparent;
  color: var(--text-h);
  border-color: var(--text-h);
}
.variant-white:hover:not(.is-disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.variant-dark-charcoal {
  background: var(--text-h);
  color: var(--surface);
}
.variant-dark-charcoal:hover:not(.is-disabled) {
  background: transparent;
  color: var(--text-h);
  border-color: var(--text-h);
}

.variant-brand {
  background: var(--brand);
  color: #ffffff;
}
.variant-brand:hover:not(.is-disabled) {
  background: var(--brand-2);
}

.variant-dark-primary {
  background: transparent;
  color: var(--text-h);
  border-bottom: 1px solid var(--text-h);
}
.variant-dark-primary:hover:not(.is-disabled) {
  padding-left: 2.5rem;
  padding-right: 1.5rem;
}

/* Loading */
.content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.opacity-0 {
  opacity: 0;
}

.spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 1px solid currentColor;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
