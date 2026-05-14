<template>
  <div class="base-empty-state">
    <div class="icon-wrapper">
      <slot name="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      </slot>
    </div>
    
    <h3 class="title">{{ title }}</h3>
    
    <p v-if="description" class="description">
      {{ description }}
    </p>
    
    <div v-if="actionText" class="action">
      <BaseButton variant="brand" @click="$emit('action')">
        {{ actionText }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from './Button.vue'

defineProps<{
  title: string
  description?: string
  actionText?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<style scoped>
.base-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--surface);
  border-radius: 16px;
  border: 1px dashed var(--border-strong);
}

.icon-wrapper {
  color: var(--text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.title {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--text-h);
  margin: 0 0 8px 0;
}

.description {
  font-family: var(--sans);
  font-size: 14px;
  color: var(--text);
  margin: 0 0 24px 0;
  max-width: 320px;
  line-height: 1.5;
}

.action {
  margin-top: 8px;
}
</style>
