<script setup lang="ts">
const props = defineProps<{
  label: string
  as?: 'h2' | 'h3'
}>()
</script>

<template>
  <component :is="props.as ?? 'h2'" class="month-group-heading">
    {{ props.label }}
  </component>
</template>

<style scoped>
.month-group-heading {
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  color: var(--text);
  padding-left: 0.25rem;
}
</style>
