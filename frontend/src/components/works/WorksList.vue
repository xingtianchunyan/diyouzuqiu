<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Work } from '../../api/services/works.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const props = defineProps<{
  worksList: Work[]
  canDelete?: (item: Work) => boolean
}>()

const emit = defineEmits<{
  (e: 'select', workId: string): void
  (e: 'delete', work: Work): void
}>()

const { t } = useI18n()

const groupedWorks = computed(() => {
  const groups: Record<string, Work[]> = {}
  
  props.worksList.forEach((work) => {
    let label = 'Unknown Date'
    if (work.date) {
      label = work.date.substring(0, 7)
    } else if (work.year) {
      label = work.year.toString()
    } else if (work.createdAt) {
      label = work.createdAt.substring(0, 7)
    }
    
    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(work)
  })

  return Object.entries(groups)
    .map(([label, items]) => ({ label, items }))
    .sort((a, b) => b.label.localeCompare(a.label))
})

const formatGroupLabel = (label: string) => {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split('-')
    return `${y}年${parseInt(m, 10)}月`
  }
  if (/^\d{4}$/.test(label)) {
    return `${label}年`
  }
  return label
}
</script>

<template>
  <div v-if="groupedWorks.length === 0" class="empty-archive">
    <p class="empty-text">{{ t('works.noWorks', 'No works found matching your criteria.') }}</p>
  </div>

  <div v-else class="works-list">
    <div v-for="group in groupedWorks" :key="group.label" class="works-group">
      <MonthGroupHeading :label="formatGroupLabel(group.label)" />
      <div class="group-items">
        <div 
          v-for="work in group.items" 
          :key="work.id" 
          class="work-row"
          @click="emit('select', work.id)"
        >
          <div class="work-meta">
            <span class="work-type">{{ work.type === 'ARTICLE' ? t('works.articles', 'Article') : t('works.poems', 'Poem') }}</span>
            <span v-if="work.year" class="work-year">{{ work.year }}</span>
          </div>
          <div class="work-details">
            <h3 class="work-title">{{ work.title }}</h3>
            <p class="work-author" v-if="work.authorMember">AUTHOR: {{ work.authorMember.displayName }}</p>
            <p class="work-author" v-else-if="work.authorName">AUTHOR: {{ work.authorName }}</p>
            <p class="work-author" v-else-if="work.authorMemberId">AUTHOR ID: {{ work.authorMemberId }}</p>
          </div>
          <div class="work-actions" v-if="props.canDelete && props.canDelete(work)">
            <button class="delete-btn" @click.stop="emit('delete', work)" title="Delete">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Empty State */
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

/* Works List */
.works-list {
  display: flex;
  flex-direction: column;
}

.works-group {
  margin-bottom: 3rem;
}

.group-label {
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-h);
  margin: 0 0 1.5rem 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}

.group-items {
  display: flex;
  flex-direction: column;
}

.work-row {
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border);
  gap: 0.5rem;
  transition: background 0.3s ease;
  cursor: pointer;
}

.work-row:hover {
  background: var(--surface);
}

@media (min-width: 640px) {
  .work-row {
    flex-direction: row;
    align-items: flex-start;
    gap: 3rem;
    padding: 2rem 1rem;
  }
}

.work-meta {
  width: 100px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.work-type {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.work-year {
  font-family: var(--sans);
  font-size: 0.7rem;
  color: var(--brand);
  font-weight: 500;
}

.work-details {
  flex: 1;
}

.work-title {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-h);
  margin-bottom: 0.5rem;
  font-weight: 400;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.work-row:hover .work-title {
  color: var(--brand);
}

.work-author {
  font-family: var(--sans);
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
}

.work-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.work-row:hover .delete-btn {
  opacity: 0.6;
}

.delete-btn:hover {
  color: var(--error, #d32f2f);
  opacity: 1 !important;
}
</style>
