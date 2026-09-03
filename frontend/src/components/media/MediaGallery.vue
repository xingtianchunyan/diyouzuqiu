<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Media } from '../../api/services/media.service'
import { mediaService } from '../../api/services/media.service'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const { t } = useI18n()

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
  (e: 'edit', item: Media): void
}>()

const groupedMedia = computed(() => {
  const groups: Record<string, Media[]> = {}
  for (const media of props.mediaList) {
    const d = media.takenAt ? new Date(media.takenAt) : null
    let key = t('common.unknownDate')
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
const getThumbUrl = (item: Media) => mediaService.resolveAssetUrl(item.thumbUrl)

// Resolution-adaptive source set: grid tiles load the API thumbnail at 1x,
// high-DPR screens may upgrade to the original file. When the API returned
// no thumbnail (videos, failed generation) the original URL is the fallback.
const getSrcSet = (item: Media) => {
  const thumb = getThumbUrl(item)
  if (!thumb) return undefined
  return `${thumb} 1x, ${getMediaUrl(item.id)} 2x`
}

const getTileSrc = (item: Media) => getThumbUrl(item) ?? getMediaUrl(item.id)

const GRID_SIZES = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'

const getAlt = (item: Media) =>
  item.type === 'PHOTO'
    ? t('media.fallbackPhoto', { id: item.id })
    : t('media.fallbackVideo', { id: item.id })

const handleDelete = (id: string) => {
  emit('delete', id)
}
</script>

<template>
  <!-- Self-contained dark panel: carries its own arena context so the reel
       stays coherent both on the dark MediaPage and on light host pages
       (YearPage / ChroniclesList). -->
  <div class="mg-root arena-theme animate-slide-up delay-4">
    <div v-for="group in groupedMedia" :key="group.label" class="mg-group">
      <MonthGroupHeading v-if="props.showGroupHeading" :label="group.label" class="mg-heading" />
      <div class="mg-grid">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="mg-frame"
          :class="{ 'mg-frame--video': item.type === 'VIDEO' }"
          role="button"
          tabindex="0"
          :aria-label="item.type === 'VIDEO' ? t('media.gallery.playVideo') : t('media.gallery.viewPhoto')"
          @click="emit('select', item)"
          @keydown.enter.prevent="emit('select', item)"
          @keydown.space.prevent="emit('select', item)"
        >
          <img
            v-if="item.type === 'PHOTO' || getThumbUrl(item)"
            :src="getTileSrc(item)"
            :srcset="getSrcSet(item)"
            :sizes="GRID_SIZES"
            class="mg-media"
            :alt="getAlt(item)"
            loading="lazy"
            decoding="async"
          />
          <div v-else class="mg-media mg-video-placeholder" aria-hidden="true">
            <svg class="mg-video-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          </div>

          <!-- Video badge: play glyph + type label -->
          <div v-if="item.type === 'VIDEO'" class="mg-play-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
            <span>{{ t('media.type.video') }}</span>
          </div>

          <div class="mg-corner" aria-hidden="true"></div>

          <!-- BUG-005: visible by default on coarse pointers; hover-reveal only on hover-capable devices -->
          <div v-if="canDelete && canDelete(item)" class="mg-actions">
            <button
              type="button"
              class="mg-action-btn mg-action-btn--edit"
              @click.stop="emit('edit', item)"
              :title="t('common.edit')"
              :aria-label="t('common.edit')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button
              type="button"
              class="mg-action-btn mg-action-btn--delete"
              @click.stop="handleDelete(item.id)"
              :title="t('common.delete')"
              :aria-label="t('common.delete')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Page-level arena tokens (component-scoped, never :root) ===== */
.arena-theme {
  --font-display: 'Anton', 'Inter', system-ui, sans-serif;
  --arena-text: #eef3ee;
  --arena-muted: rgba(238, 243, 238, 0.55);
  --arena-faint: rgba(238, 243, 238, 0.32);
  --arena-line: rgba(255, 255, 255, 0.09);
  --arena-green: #3ddc84;
  --arena-green-deep: #1f7a48;
  --arena-gold: #e8c766;
}

.mg-root {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1.25rem;
  border-radius: 14px;
  border: 1px solid var(--arena-line);
  background:
    radial-gradient(720px 300px at 88% -12%, rgba(232, 199, 102, 0.05), transparent 60%),
    linear-gradient(180deg, #08130e 0%, #05080a 100%);
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .mg-root {
    padding: 0.85rem;
    gap: 1.25rem;
  }
}

/* Month/year group heading inherits the dark context */
.mg-root :deep(.month-group-heading) {
  color: var(--arena-faint);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding-left: 0.1rem;
}

/* ===== Highlight-reel grid ===== */
.mg-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (min-width: 768px) {
  .mg-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1280px) {
  .mg-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
}

/* ===== Dark glass tile ===== */
.mg-frame {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  cursor: pointer;
  border-radius: 10px;
  border: 1px solid var(--arena-line);
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.018));
  transition: transform 0.16s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mg-frame:focus-visible {
  outline: 2px solid var(--arena-green);
  outline-offset: 3px;
}

.mg-frame:active {
  transform: scale(0.97);
  border-color: rgba(61, 220, 132, 0.5);
}

.mg-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.mg-video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(closest-side at 50% 42%, rgba(31, 122, 72, 0.35), transparent 75%),
    linear-gradient(160deg, #0b1710 0%, #05080a 100%);
  color: rgba(238, 243, 238, 0.4);
}

.mg-video-glyph {
  width: 30%;
  height: 30%;
}

/* ===== Play badge for videos ===== */
.mg-play-badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(5, 8, 10, 0.72);
  border: 1px solid rgba(61, 220, 132, 0.45);
  color: var(--arena-green);
  font-family: var(--sans);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: none;
}

/* ===== Gold corner accent (revealed on hover-capable devices / focus) ===== */
.mg-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 22px;
  background: linear-gradient(225deg, var(--arena-gold) 0 50%, transparent 50%);
  opacity: 0;
  transform: translate(4px, -4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

/* Touch devices have no hover: hover styling is pure enhancement */
@media (hover: hover) {
  .mg-frame:hover {
    border-color: rgba(61, 220, 132, 0.45);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  }

  .mg-frame:hover .mg-media {
    transform: scale(1.05);
  }

  .mg-frame:hover .mg-corner,
  .mg-frame:focus-visible .mg-corner {
    opacity: 1;
    transform: none;
  }

  /* BUG-005: hover-reveal only where hover exists */
  .mg-actions {
    opacity: 0;
    transform: translateY(-4px);
  }

  .mg-frame:hover .mg-actions,
  .mg-frame:focus-within .mg-actions {
    opacity: 1;
    transform: none;
  }
}

/* ===== Action buttons (BUG-005) ===== */
.mg-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 6px;
  z-index: 10;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mg-action-btn {
  background: rgba(5, 8, 10, 0.72);
  color: var(--arena-text);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  /* >=44px touch target on coarse pointers (default); finer pointers shrink below */
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mg-action-btn:active {
  transform: scale(0.92);
}

.mg-action-btn--edit:active {
  border-color: var(--arena-green);
  color: var(--arena-green);
}

.mg-action-btn--delete:active {
  border-color: #e5534b;
  color: #e5534b;
}

@media (hover: hover) and (pointer: fine) {
  .mg-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }

  .mg-action-btn--edit:hover {
    background: rgba(31, 122, 72, 0.9);
    border-color: var(--arena-green);
  }

  .mg-action-btn--delete:hover {
    background: rgba(153, 27, 27, 0.9);
    border-color: #e5534b;
  }
}

/* Entrance polish: transform/opacity only, gated by reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .mg-frame {
    animation: mg-tile-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes mg-tile-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
}
</style>
