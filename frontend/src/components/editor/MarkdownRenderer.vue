<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

const renderedHtml = computed(() => {
  if (!props.markdown) return ''
  try {
    const raw = marked.parse(props.markdown, { async: false }) as string
    return DOMPurify.sanitize(raw)
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="markdown-renderer" v-html="renderedHtml"></div>
</template>

<style scoped>
.markdown-renderer {
  font-family: var(--sans);
  font-size: 1.08rem;
  line-height: 1.9;
  color: var(--text);
}

.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  color: var(--text-h);
  font-weight: 500;
  margin: 1.8rem 0 1rem;
  line-height: 1.3;
}

.markdown-renderer :deep(h1) { font-size: 2rem; }
.markdown-renderer :deep(h2) { font-size: 1.6rem; }
.markdown-renderer :deep(h3) { font-size: 1.35rem; }
.markdown-renderer :deep(h4) { font-size: 1.15rem; }

.markdown-renderer :deep(p) {
  margin: 0 0 1.25rem 0;
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin: 0 0 1.25rem 1.25rem;
  padding-left: 1.25rem;
}

.markdown-renderer :deep(li) {
  margin-bottom: 0.4rem;
}

.markdown-renderer :deep(blockquote) {
  margin: 0 0 1.25rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--text-h);
  background: var(--surface-hover);
  color: var(--text-muted);
}

.markdown-renderer :deep(blockquote) p:last-child {
  margin-bottom: 0;
}

.markdown-renderer :deep(pre) {
  background: var(--surface-hover);
  padding: 1rem;
  overflow-x: auto;
  border-radius: 4px;
  margin-bottom: 1.25rem;
}

.markdown-renderer :deep(code) {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--surface-hover);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.markdown-renderer :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-renderer :deep(a) {
  color: var(--brand);
  text-decoration: underline;
}

.markdown-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.25rem 0;
}

.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-strong);
  margin: 1.8rem 0;
}

.markdown-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.25rem;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-renderer :deep(th) {
  background: var(--surface-hover);
}
</style>
