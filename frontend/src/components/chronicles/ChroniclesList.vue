<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Media } from '../../api/services/media.service'
import type { Work } from '../../api/services/works.service'
import type { Match } from '../../api/services/matches.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'
import MediaGallery from '@/components/media/MediaGallery.vue'
import MediaLightbox from '@/components/media/MediaLightbox.vue'
import WorksGridModule from '@/components/works/WorksGridModule.vue'
import MatchesList from '@/components/matches/MatchesList.vue'
import { mediaService } from '../../api/services/media.service'
import MarkdownRenderer from '../editor/MarkdownRenderer.vue'

export interface ChronicleEvent {
  id: string
  title: string
  happenedAt: string
  description?: string
  year?: number
  primaryMedia?: Media | null
  mediaAssets?: Media[]
  works?: Work[]
  matches?: Match[]
  members?: { id: string; displayName: string; avatarUrl?: string | null; team?: string | null }[]
  createdByUserId?: string
}

const props = defineProps<{
  chronicles: ChronicleEvent[]
  canDelete?: (item: ChronicleEvent) => boolean
}>()

const emit = defineEmits<{
  (e: 'select-work', workId: string): void
  (e: 'delete', chronicle: ChronicleEvent): void
  (e: 'edit', chronicle: ChronicleEvent): void
}>()

const selectedMedia = ref<Media | null>(null)
const getMediaUrl = (id: string) => mediaService.getMediaFileUrl(id)

const sortedChronicles = computed(() => {
  return [...props.chronicles].sort(
    (a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()
  )
})

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return {
    month: d.toLocaleString('en-US', { month: 'short' }),
    day: d.getDate().toString().padStart(2, '0'),
    year: d.getFullYear()
  }
}

type RelatedMonthGroup = {
  label: string
  media: Media[]
  works: Work[]
  matches: Match[]
}

const getMonthKey = (dateStr: string | null | undefined, fallbackYear?: number | null) => {
  if (dateStr) {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
  if (fallbackYear) return `${fallbackYear}-01`
  return 'Unknown Date'
}

const getChronicleRelatedGroups = (chronicle: ChronicleEvent): RelatedMonthGroup[] => {
  const groups: Record<string, RelatedMonthGroup> = {}

  const mediaAssets = chronicle.mediaAssets ?? []
  const works = chronicle.works ?? []
  const matches = chronicle.matches ?? []

  for (const m of mediaAssets) {
    const key = getMonthKey(m.takenAt, m.year)
    if (!groups[key]) groups[key] = { label: key, media: [], works: [], matches: [] }
    groups[key].media.push(m)
  }

  for (const w of works) {
    const key = getMonthKey(w.date || w.createdAt, w.year)
    if (!groups[key]) groups[key] = { label: key, media: [], works: [], matches: [] }
    groups[key].works.push(w)
  }

  for (const match of matches) {
    const key = getMonthKey(match.playedAt, null)
    if (!groups[key]) groups[key] = { label: key, media: [], works: [], matches: [] }
    groups[key].matches.push(match)
  }

  return Object.values(groups)
    .sort((a, b) => b.label.localeCompare(a.label))
    .map(g => ({
      ...g,
      media: g.media.slice().sort((a, b) => (b.takenAt || '').localeCompare(a.takenAt || '')),
      works: g.works.slice().sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt)),
      matches: g.matches.slice().sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    }))
}
</script>

<template>
  <div class="chronicles-list-container">
    <div v-if="chronicles.length === 0" class="empty-archive">
      <p class="empty-text">No chronicle events found.</p>
    </div>
    
    <div v-else class="timeline">
      <div v-for="(chronicle, index) in sortedChronicles" :key="chronicle.id" class="timeline-item">
        <div class="timeline-date">
          <span class="date-day">{{ formatDate(chronicle.happenedAt).day }}</span>
          <span class="date-month">{{ formatDate(chronicle.happenedAt).month }}</span>
          <span class="date-year">{{ formatDate(chronicle.happenedAt).year }}</span>
        </div>
        
        <div class="timeline-marker">
          <div class="marker-dot"></div>
          <div v-if="index !== sortedChronicles.length - 1" class="marker-line"></div>
        </div>
        
        <div class="timeline-content">
          <div class="chronicle-header">
            <h3 class="chronicle-title">{{ chronicle.title }}</h3>
            <div v-if="props.canDelete && props.canDelete(chronicle)" class="chronicle-actions">
              <button 
                class="edit-btn"
                @click="emit('edit', chronicle)"
                title="Edit"
              >✎</button>
              <button 
                class="delete-btn"
                @click="emit('delete', chronicle)"
                title="Delete"
              >×</button>
            </div>
          </div>
          
          <div v-if="chronicle.primaryMedia" class="chronicle-media">
            <img 
              v-if="chronicle.primaryMedia.type === 'PHOTO'" 
              :src="getMediaUrl(chronicle.primaryMedia.id)" 
              alt="Chronicle Cover" 
              class="media-img"
              loading="lazy"
            />
            <video 
              v-else-if="chronicle.primaryMedia.type === 'VIDEO'" 
              :src="getMediaUrl(chronicle.primaryMedia.id)" 
              class="media-video" 
              controls 
              preload="metadata"
            ></video>
          </div>
          
          <div v-if="chronicle.description" class="chronicle-desc">
            <MarkdownRenderer :markdown="chronicle.description" />
          </div>
          
          <div v-if="chronicle.members && chronicle.members.length > 0" class="chronicle-members">
            <span class="member-tag" v-for="member in chronicle.members" :key="member.id">
              {{ member.displayName }}
            </span>
          </div>

          <div
            v-if="(chronicle.mediaAssets && chronicle.mediaAssets.length) || (chronicle.works && chronicle.works.length) || (chronicle.matches && chronicle.matches.length)"
            class="chronicle-related"
          >
            <section v-for="group in getChronicleRelatedGroups(chronicle)" :key="group.label" class="related-month-group">
              <MonthGroupHeading :label="group.label" />

              <div v-if="group.media.length > 0" class="related-block">
                <div class="related-label">MEDIA</div>
                <MediaGallery
                  :media-list="group.media"
                  group-by="month"
                  :show-group-heading="false"
                  @select="selectedMedia = $event"
                />
              </div>

              <div v-if="group.works.length > 0" class="related-block">
                <div class="related-label">WORKS</div>
                <WorksGridModule
                  :works="group.works"
                  group-by="month"
                  :show-group-heading="false"
                  @select="(id) => emit('select-work', id)"
                />
              </div>

              <div v-if="group.matches.length > 0" class="related-block">
                <div class="related-label">MATCHES</div>
                <MatchesList :matches-list="group.matches" group-by="none" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>

  <MediaLightbox :media="selectedMedia" @close="selectedMedia = null" />
</template>

<style scoped>
.chronicles-list-container {
  width: 100%;
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

.timeline {
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}

.timeline-item {
  display: flex;
  gap: 1.5rem;
  min-height: 120px;
}

.timeline-date {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: 0.25rem;
  flex-shrink: 0;
}

.date-day {
  font-family: var(--serif);
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-h);
}

.date-month {
  font-family: var(--sans);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--brand);
  margin-top: 0.25rem;
}

.date-year {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--surface);
  border: 2px solid var(--brand);
  margin-top: 0.5rem;
  z-index: 2;
}

.marker-line {
  width: 2px;
  flex: 1;
  background-color: var(--border);
  margin-top: 0.5rem;
  margin-bottom: -0.5rem;
}

.timeline-content {
  flex: 1;
  padding-bottom: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chronicle-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 0.25rem;
}

.chronicle-title {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-h);
  margin: 0;
}

.chronicle-actions {
  display: flex;
  gap: 8px;
  margin-left: 1rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.timeline-item:hover .chronicle-actions {
  opacity: 1;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
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

.chronicle-media {
  border-radius: 4px;
  overflow: hidden;
  max-width: 400px;
  border: 1px solid var(--border);
}

.media-img, .media-video {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  display: block;
}

.chronicle-desc {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

.chronicle-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.chronicle-related {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
  padding-top: 0.5rem;
}

.related-month-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.related-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.related-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding-left: 0.25rem;
}

.member-tag {
  font-family: var(--sans);
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  background-color: var(--surface-hover);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

@media (max-width: 640px) {
  .timeline-item {
    gap: 1rem;
  }
  .timeline-date {
    width: 60px;
  }
}
</style>
