<script setup lang="ts">
import { computed } from 'vue'
import type { Media } from '../../api/services/media.service'
import { mediaService } from '../../api/services/media.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const props = withDefaults(defineProps<{
  mediaList: Media[]
  groupBy?: 'month' | 'year'
  canDelete?: (item: Media) => boolean
  showGroupHeading?: boolean
}>(), {
  showGroupHeading: true
})

const emit = defineEmits<{
  (e: 'select', item: Media): void
  (e: 'delete', id: string): void
}>()

const groupedMedia = computed(() => {
  const groups: Record<string, Media[]> = {}
  for (const media of props.mediaList) {
    const d = media.takenAt ? new Date(media.takenAt) : null
    let key = 'Unknown Date'
    if (d && !isNaN(d.getTime())) {
      const y = d.getFullYear()
      if (props.groupBy === 'year') {
        key = `${y}`
      } else {
        const m = String(d.getMonth() + 1).padStart(2, '0')
        key = `${y}-${m}`
      }
    } else if (media.year) {
      key = props.groupBy === 'year' ? `${media.year}` : `${media.year}-01`
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(media)
  }
  // Sort keys descending
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  return sortedKeys.map(k => ({ label: k, items: groups[k] }))
})

const getMediaUrl = (id: string) => mediaService.getMediaFileUrl(id)

const handleDelete = (id: string) => {
  emit('delete', id)
}

</script>

<template>
  <div class="media-groups delay-4 animate-slide-up">
    <div v-for="group in groupedMedia" :key="group.label" class="media-month-group">
      <MonthGroupHeading v-if="props.showGroupHeading" :label="group.label" />
      <div class="media-gallery">
        <div v-for="item in group.items" :key="item.id" class="media-frame" @click="emit('select', item)">
          <img v-if="item.type === 'PHOTO'" :src="getMediaUrl(item.id)" class="media-content" loading="lazy" />
          <video v-else-if="item.type === 'VIDEO'" :src="getMediaUrl(item.id)" class="media-content" controls preload="metadata"></video>
          <button 
            v-if="canDelete && canDelete(item)" 
            class="delete-media-btn" 
            @click.stop="handleDelete(item.id)"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.media-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 2px;
}

.media-frame {
  aspect-ratio: 1;
  background: var(--surface-hover);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 1px solid #000;
}

.media-content {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  display: block;
}

.media-frame:hover .media-content {
  transform: scale(1.03);
}

.delete-media-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(229, 57, 53, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10;
}
.delete-media-btn:hover {
  transform: scale(1.1);
}
.media-frame:hover .delete-media-btn {
  opacity: 1;
}
</style>
