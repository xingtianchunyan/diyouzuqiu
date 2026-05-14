<script setup lang="ts">
import { computed } from 'vue'
import type { Match } from '../../api/services/matches.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const props = withDefaults(defineProps<{
  matchesList: Match[]
  groupBy?: 'month' | 'none'
  highlightMvpId?: string
  canDelete?: (item: Match) => boolean
}>(), {
  groupBy: 'none'
})

const emit = defineEmits<{
  (e: 'delete', match: Match): void
}>()

const groupedMatches = computed(() => {
  if (props.groupBy === 'none') {
    return [{ label: '', items: props.matchesList }]
  }

  const groups: Record<string, Match[]> = {}
  for (const m of props.matchesList) {
    const d = m.playedAt ? new Date(m.playedAt) : null
    let key = 'Unknown Date'
    if (d && !isNaN(d.getTime())) {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, items]) => ({ label, items }))
})

</script>

<template>
  <div class="matches-list-container">
    <div v-if="matchesList.length === 0" class="empty-archive">
      <p class="empty-text">No match records found.</p>
    </div>
    
    <div v-else>
      <div v-for="(group, index) in groupedMatches" :key="group.label || index" class="matches-group">
        <MonthGroupHeading v-if="group.label" :label="group.label" />
        
        <div class="match-list">
          <div v-for="match in group.items" :key="match.id" class="match-row">
            <div class="match-date">{{ new Date(match.playedAt).toLocaleDateString() }}</div>
            <div class="match-score">
              <div class="score-line">
                <span class="team red">RED {{ match.redScore }}</span>
                <span class="divider">:</span>
                <span class="team blue">BLUE {{ match.blueScore }}</span>
              </div>
              <div class="match-mvp" v-if="highlightMvpId && match.mvpMemberId === highlightMvpId">
                <span class="mvp-badge" title="MVP">⭐ MVP</span>
              </div>
              <div class="match-mvp" v-else-if="!highlightMvpId && match.mvpMember">
                <span class="mvp-badge" title="MVP">⭐ MVP: {{ match.mvpMember.displayName }}</span>
              </div>
            </div>
            
            <div class="match-actions">
              <button v-if="props.canDelete && props.canDelete(match)" class="delete-btn" @click.stop="emit('delete', match)" title="Delete">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matches-list-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
}

.empty-archive {
  padding: 2rem 0;
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

.matches-group {
  margin-bottom: 2rem;
}

.matches-group:last-child {
  margin-bottom: 0;
}

.match-list {
  display: flex;
  flex-direction: column;
}

.match-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border);
}

.match-row:last-child {
  border-bottom: none;
}

.match-date {
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--text-muted);
  flex: 1;
}

.match-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: var(--sans);
  font-size: 1.1rem;
  font-weight: 400;
  flex: 2;
  justify-content: center;
}

.score-line {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  width: 100%;
}

.match-mvp {
  display: flex;
  justify-content: center;
  width: 100%;
}

.team {
  min-width: 60px;
}

.team.red {
  color: #e53e3e;
  text-align: right;
}

.team.blue {
  color: #3182ce;
  text-align: left;
}

.divider {
  color: var(--border-strong);
}

.mvp-badge {
  font-size: 0.75rem;
  background: var(--brand-2);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.match-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
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

.match-row:hover .delete-btn {
  opacity: 0.6;
}

.delete-btn:hover {
  color: var(--error, #d32f2f);
  opacity: 1 !important;
}
</style>
