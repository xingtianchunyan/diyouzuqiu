<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Work } from '../../api/services/works.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const props = withDefaults(defineProps<{
  works: Work[]
  groupBy?: 'month' | 'year'
  showAuthor?: boolean
  showGroupHeading?: boolean
  headingAs?: 'h2' | 'h3'
  canDelete?: (item: Work) => boolean
}>(), {
  showGroupHeading: true,
  showAuthor: true
})

const emit = defineEmits<{
  (e: 'select', workId: string): void
  (e: 'delete', work: Work): void
  (e: 'edit', work: Work): void
}>()

const { t } = useI18n()

const getGroupKey = (work: Work) => {
  const basis = work.date || work.createdAt
  if (props.groupBy === 'year') {
    if (work.year) return String(work.year)
    if (basis) return basis.substring(0, 4)
    return 'Unknown'
  }

  if (basis) return basis.substring(0, 7)
  if (work.year) return `${work.year}-01`
  return 'Unknown'
}

const getMetaDate = (work: Work) => {
  const basis = work.date || work.createdAt
  if (!basis) return ''
  if (props.groupBy === 'year') return basis.substring(0, 10)
  return basis.substring(5, 10)
}

const groupedWorks = computed(() => {
  const groups: Record<string, Work[]> = {}
  for (const w of props.works) {
    const key = getGroupKey(w)
    if (!groups[key]) groups[key] = []
    groups[key].push(w)
  }

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  return sortedKeys.map(label => ({
    label,
    items: groups[label].slice().sort((a, b) => {
      const da = (a.date || a.createdAt || '').localeCompare(b.date || b.createdAt || '')
      return -da
    })
  }))
})

const getTypeLabel = (work: Work) => {
  if (work.type === 'ARTICLE') return t('works.articles', 'Article')
  return t('works.poems', 'Poem')
}

</script>

<template>
  <div v-if="groupedWorks.length === 0" class="empty-archive">
    <p class="empty-text">{{ t('works.noWorks', 'No works found matching your criteria.') }}</p>
  </div>

  <div v-else class="works-grid-module">
    <section v-for="group in groupedWorks" :key="group.label" class="works-group">
      <MonthGroupHeading v-if="props.showGroupHeading" :label="group.label" :as="props.headingAs" />
      <div class="works-grid">
        <button
          v-for="work in group.items"
          :key="work.id"
          type="button"
          class="work-card"
          @click="emit('select', work.id)"
        >
          <div class="work-card-meta">
            <span class="work-type">{{ getTypeLabel(work) }}</span>
            <span v-if="getMetaDate(work)" class="work-date">{{ getMetaDate(work) }}</span>
            <div v-if="props.canDelete && props.canDelete(work)" class="work-actions">
              <button 
                class="edit-btn"
                @click.stop="emit('edit', work)"
                title="Edit"
              >
                ✎
              </button>
              <button 
                class="delete-btn"
                @click.stop="emit('delete', work)"
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
          <h3 class="work-title">{{ work.title }}</h3>
          <div v-if="props.showAuthor" class="work-author">
            <span v-if="work.authorMember">{{ work.authorMember.displayName }}</span>
            <span v-else-if="work.authorName">{{ work.authorName }}</span>
            <span v-else-if="work.authorMemberId">{{ work.authorMemberId }}</span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.works-grid-module {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
  gap: 2.5rem;
}

.works-group {
  display: flex;
  flex-direction: column;
}

.works-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .works-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

.work-card {
  text-align: left;
  width: 100%;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  padding: 1.1rem 1.1rem 1rem 1.1rem;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.work-card:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  background: var(--surface-hover);
}

.work-card:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.work-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.work-type {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.work-date {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.work-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.2s;
}

.work-card:hover .work-actions {
  opacity: 1;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  transition: color 0.2s;
}

.edit-btn:hover {
  color: var(--text-h);
}

.delete-btn:hover {
  color: var(--error, #d32f2f);
}

.work-title {
  font-family: var(--serif);
  font-size: 1.25rem;
  line-height: 1.35;
  color: var(--text-h);
  margin: 0;
  font-weight: 400;
}

.work-author {
  margin-top: 0.65rem;
  font-family: var(--sans);
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.empty-archive {
  padding: 4rem 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

.empty-text {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-muted);
  margin: 0;
}
</style>
