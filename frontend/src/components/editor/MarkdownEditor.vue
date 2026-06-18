<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const mode = ref<'edit' | 'split' | 'preview'>('split')

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const renderedHtml = computed(() => {
  if (!content.value) return ''
  try {
    const raw = marked.parse(content.value, { async: false }) as string
    return DOMPurify.sanitize(raw)
  } catch {
    return ''
  }
})

const wordCount = computed(() => {
  const text = content.value || ''
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const en = (text.replace(/[\u4e00-\u9fa5]/g, '').match(/[a-zA-Z0-9_]+/g) || []).length
  return cn + en
})

const focusTextarea = () => {
  textareaRef.value?.focus()
}

const getSelection = () => {
  const el = textareaRef.value
  if (!el) return { start: 0, end: 0, text: '' }
  return {
    start: el.selectionStart,
    end: el.selectionEnd,
    text: content.value.slice(el.selectionStart, el.selectionEnd)
  }
}

const replaceRange = (start: number, end: number, replacement: string) => {
  const before = content.value.slice(0, start)
  const after = content.value.slice(end)
  const newValue = before + replacement + after
  emit('update:modelValue', newValue)
  return { start, end: start + replacement.length, length: replacement.length }
}

const setSelection = (start: number, end?: number) => {
  setTimeout(() => {
    textareaRef.value?.focus()
    textareaRef.value?.setSelectionRange(start, end ?? start)
  }, 0)
}

const wrapSelection = (prefix: string, suffix: string, placeholder = '') => {
  const { start, end, text } = getSelection()
  const target = text || placeholder
  const wrapped = prefix + target + suffix
  replaceRange(start, end, wrapped)
  if (text) {
    setSelection(start + wrapped.length)
  } else {
    setSelection(start + prefix.length, start + prefix.length + target.length)
  }
}

const insertAtCursor = (text: string) => {
  const { start, end } = getSelection()
  replaceRange(start, end, text)
  setSelection(start + text.length)
}

const insertHeading = (level: number) => {
  const prefix = '#'.repeat(level) + ' '
  const { start } = getSelection()
  const lineStart = content.value.lastIndexOf('\n', start - 1) + 1
  const line = content.value.slice(lineStart, start)
  const existing = line.match(/^(#{1,6})\s*/)
  let newLine: string
  if (existing) {
    newLine = prefix + line.slice(existing[0].length)
  } else {
    newLine = prefix + line
  }
  replaceRange(lineStart, start, newLine)
  setSelection(lineStart + newLine.length)
}

const toggleLinePrefix = (prefix: string) => {
  const { start, end } = getSelection()
  const before = content.value.slice(0, start)
  const after = content.value.slice(end)
  const selected = content.value.slice(start, end)
  const rangeStartLine = before.lastIndexOf('\n') + 1
  const rangeEndLine = after.indexOf('\n')
  const textBefore = content.value.slice(rangeStartLine, start)
  const textSelected = selected
  const textAfter = rangeEndLine === -1 ? after : after.slice(0, rangeEndLine)

  const block = textBefore + textSelected + textAfter
  const lines = block.split('\n')
  const allPrefixed = lines.every((line) => line.startsWith(prefix))

  const newLines = lines.map((line) => {
    if (allPrefixed) return line.slice(prefix.length)
    return prefix + line
  })

  const newBlock = newLines.join('\n')
  const newStart = rangeStartLine
  const newEnd = rangeStartLine + newBlock.length
  replaceRange(newStart, newEnd + (rangeEndLine === -1 ? 0 : 0), newBlock)
  setSelection(newStart, newEnd)
}

const insertList = (ordered: boolean) => {
  const prefix = ordered ? '1. ' : '- '
  toggleLinePrefix(prefix)
}

const insertQuote = () => toggleLinePrefix('> ')

const insertCodeBlock = () => {
  const { start, end, text } = getSelection()
  if (text.includes('\n')) {
    const wrapped = '```\n' + text + '\n```'
    replaceRange(start, end, wrapped)
    setSelection(start + wrapped.length)
  } else {
    wrapSelection('`', '`')
  }
}

const insertLink = () => {
  const { text } = getSelection()
  const label = text || '链接文字'
  const link = `[${label}](https://)`
  const { start, end } = getSelection()
  replaceRange(start, end, link)
  setSelection(start + link.length - 1, start + link.length - 1)
}

const insertImage = () => {
  insertAtCursor('\n\n![图片描述](https://)\n\n')
}

const insertHorizontalRule = () => {
  insertAtCursor('\n\n---\n\n')
}

const handleToolbar = (action: string) => {
  focusTextarea()
  switch (action) {
    case 'h1': insertHeading(1); break
    case 'h2': insertHeading(2); break
    case 'h3': insertHeading(3); break
    case 'bold': wrapSelection('**', '**', '粗体文字'); break
    case 'italic': wrapSelection('*', '*', '斜体文字'); break
    case 'strike': wrapSelection('~~', '~~', '删除线'); break
    case 'quote': insertQuote(); break
    case 'ul': insertList(false); break
    case 'ol': insertList(true); break
    case 'code': insertCodeBlock(); break
    case 'link': insertLink(); break
    case 'image': insertImage(); break
    case 'hr': insertHorizontalRule(); break
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const { start, end } = getSelection()
    if (start !== end) {
      const block = content.value.slice(start, end)
      const lines = block.split('\n')
      if (e.shiftKey) {
        const newLines = lines.map((line) =>
          line.startsWith('  ') ? line.slice(2) : line.replace(/^(- |\d+\. )/, '')
        )
        replaceRange(start, end, newLines.join('\n'))
      } else {
        replaceRange(start, end, lines.map((line) => '  ' + line).join('\n'))
      }
      setSelection(start, start + (content.value.slice(start, start + block.length).length))
    } else {
      insertAtCursor('  ')
    }
    return
  }

  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); handleToolbar('bold'); break
      case 'i': e.preventDefault(); handleToolbar('italic'); break
      case 'k': e.preventDefault(); handleToolbar('link'); break
      case '7': if (e.shiftKey) { e.preventDefault(); handleToolbar('ol') } break
      case '8': if (e.shiftKey) { e.preventDefault(); handleToolbar('ul') } break
      case '9': if (e.shiftKey) { e.preventDefault(); handleToolbar('quote') } break
    }
  }
}
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button type="button" class="tool-btn" @click="handleToolbar('h1')" title="标题 1">H1</button>
        <button type="button" class="tool-btn" @click="handleToolbar('h2')" title="标题 2">H2</button>
        <button type="button" class="tool-btn" @click="handleToolbar('h3')" title="标题 3">H3</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="tool-btn" @click="handleToolbar('bold')" title="粗体 (Ctrl+B)"><b>B</b></button>
        <button type="button" class="tool-btn" @click="handleToolbar('italic')" title="斜体 (Ctrl+I)"><i>I</i></button>
        <button type="button" class="tool-btn" @click="handleToolbar('strike')" title="删除线"><s>S</s></button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="tool-btn" @click="handleToolbar('quote')" title="引用 (Ctrl+Shift+9)">”</button>
        <button type="button" class="tool-btn" @click="handleToolbar('ul')" title="无序列表 (Ctrl+Shift+8)">☰</button>
        <button type="button" class="tool-btn" @click="handleToolbar('ol')" title="有序列表 (Ctrl+Shift+7)">1.</button>
        <button type="button" class="tool-btn" @click="handleToolbar('code')" title="代码">&lt;/&gt;</button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button type="button" class="tool-btn" @click="handleToolbar('link')" title="链接 (Ctrl+K)">🔗</button>
        <button type="button" class="tool-btn" @click="handleToolbar('image')" title="图片">🖼</button>
        <button type="button" class="tool-btn" @click="handleToolbar('hr')" title="分割线">—</button>
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <button type="button" class="tool-btn" :class="{ active: mode === 'edit' }" @click="mode = 'edit'" title="仅编辑">编辑</button>
        <button type="button" class="tool-btn" :class="{ active: mode === 'split' }" @click="mode = 'split'" title="分屏">分屏</button>
        <button type="button" class="tool-btn" :class="{ active: mode === 'preview' }" @click="mode = 'preview'" title="预览">预览</button>
      </div>
    </div>

    <div class="editor-body" :class="`mode-${mode}`">
      <textarea
        v-show="mode !== 'preview'"
        ref="textareaRef"
        v-model="content"
        class="editor-textarea"
        :rows="rows || 12"
        :placeholder="placeholder || '在这里输入 Markdown 内容...\n支持标题、加粗、列表、链接、图片等'"
        @keydown="handleKeydown"
      ></textarea>
      <div v-show="mode !== 'edit'" class="editor-preview prose" v-html="renderedHtml"></div>
    </div>

    <div class="editor-footer">
      <span class="word-count">{{ wordCount }} 字</span>
      <span class="shortcut-hint">Ctrl+B 粗体 · Ctrl+I 斜体 · Ctrl+K 链接 · Tab 缩进</span>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-strong);
  background: var(--surface-hover);
}

.toolbar-group {
  display: flex;
  gap: 0.15rem;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 0.25rem;
}

.toolbar-spacer {
  flex: 1;
}

.tool-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-h);
  padding: 0.35rem 0.55rem;
  font-family: var(--sans);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--bg);
  border-color: var(--border);
}

.tool-btn.active {
  background: var(--text-h);
  color: var(--surface);
  border-color: var(--text-h);
}

.editor-body {
  display: grid;
  min-height: 240px;
}

.editor-body.mode-edit {
  grid-template-columns: 1fr;
}

.editor-body.mode-split {
  grid-template-columns: 1fr 1fr;
}

.editor-body.mode-preview {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  .editor-body.mode-split {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}

.editor-textarea {
  width: 100%;
  box-sizing: border-box;
  border: none;
  resize: vertical;
  padding: 1rem;
  font-family: var(--mono);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-h);
  background: var(--surface);
  outline: none;
  min-height: 240px;
}

.editor-preview {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  border-left: 1px solid var(--border);
  background: var(--bg);
  min-height: 240px;
  font-family: var(--sans);
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text);
}

.editor-preview :deep(h1),
.editor-preview :deep(h2),
.editor-preview :deep(h3),
.editor-preview :deep(h4),
.editor-preview :deep(h5),
.editor-preview :deep(h6) {
  color: var(--text-h);
  margin: 1.5rem 0 0.75rem;
  font-weight: 500;
}

.editor-preview :deep(h1) { font-size: 1.8rem; }
.editor-preview :deep(h2) { font-size: 1.5rem; }
.editor-preview :deep(h3) { font-size: 1.25rem; }

.editor-preview :deep(p) {
  margin: 0 0 1rem 0;
}

.editor-preview :deep(ul),
.editor-preview :deep(ol) {
  margin: 0 0 1rem 1.25rem;
  padding-left: 1rem;
}

.editor-preview :deep(li) {
  margin-bottom: 0.35rem;
}

.editor-preview :deep(blockquote) {
  margin: 0 0 1rem;
  padding-left: 1rem;
  border-left: 3px solid var(--text-h);
  color: var(--text-muted);
}

.editor-preview :deep(pre) {
  background: var(--surface-hover);
  padding: 1rem;
  overflow-x: auto;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.editor-preview :deep(code) {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--surface-hover);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

.editor-preview :deep(pre code) {
  background: transparent;
  padding: 0;
}

.editor-preview :deep(a) {
  color: var(--brand);
  text-decoration: underline;
}

.editor-preview :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem 0;
}

.editor-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-strong);
  margin: 1.5rem 0;
}

.editor-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.editor-preview :deep(th),
.editor-preview :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem;
  text-align: left;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--border-strong);
  background: var(--surface-hover);
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: var(--mono);
}

.word-count {
  min-width: 60px;
}

.shortcut-hint {
  display: none;
}

@media (min-width: 640px) {
  .shortcut-hint {
    display: inline;
  }
}
</style>
