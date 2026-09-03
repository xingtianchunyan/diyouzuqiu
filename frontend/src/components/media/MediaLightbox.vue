<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Media } from '../../api/services/media.service'
import { mediaService } from '../../api/services/media.service'
import { useScrollLock } from '../../composables/useScrollLock'

const props = defineProps<{
  media: Media | null
  /** Optional reel context: enables prev/next buttons, arrow keys and swipe. */
  list?: Media[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'navigate', item: Media): void
}>()

const { t } = useI18n()

// BUG-007: freeze body scroll (iOS-safe) while the lightbox is open
const isOpen = computed(() => !!props.media)
useScrollLock(isOpen)

const currentIndex = computed(() => {
  if (!props.media || !props.list || props.list.length === 0) return -1
  return props.list.findIndex(m => m.id === props.media!.id)
})

const canNavigate = computed(() => currentIndex.value !== -1 && (props.list?.length ?? 0) > 1)
const hasPrev = computed(() => canNavigate.value && currentIndex.value > 0)
const hasNext = computed(() => canNavigate.value && currentIndex.value < (props.list?.length ?? 0) - 1)

const goPrev = () => {
  if (hasPrev.value && props.list) emit('navigate', props.list[currentIndex.value - 1])
}

const goNext = () => {
  if (hasNext.value && props.list) emit('navigate', props.list[currentIndex.value + 1])
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.media) return
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowLeft') {
    goPrev()
  } else if (e.key === 'ArrowRight') {
    goNext()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// --- Touch swipe (no library): horizontal flick navigates the reel ---
let touchStartX = 0
let touchStartY = 0

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!canNavigate.value) return
  const touch = e.changedTouches[0]
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) goNext()
    else goPrev()
  }
}

const getMediaUrl = (id: string) => mediaService.getMediaFileUrl(id)
const getPosterUrl = (item: Media) => mediaService.resolveAssetUrl(item.thumbUrl) ?? undefined
</script>

<template>
  <Transition name="lb-fade">
    <div
      v-if="media"
      class="lb-overlay"
      @click="emit('close')"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <div class="lb-stage" @click.stop>
        <img
          v-if="media.type === 'PHOTO'"
          :key="`img-${media.id}`"
          :src="getMediaUrl(media.id)"
          class="lb-media"
          :alt="t('media.alt')"
          decoding="async"
          @dblclick="emit('close')"
        />
        <!-- BUG-006: muted + playsinline allow inline autoplay on iOS -->
        <video
          v-else-if="media.type === 'VIDEO'"
          :key="`vid-${media.id}`"
          :src="getMediaUrl(media.id)"
          :poster="getPosterUrl(media)"
          class="lb-media"
          controls
          autoplay
          muted
          playsinline
          @dblclick="emit('close')"
        ></video>
      </div>

      <div class="lb-hint" aria-hidden="true">{{ t('media.lightboxHint') }}</div>

      <div class="lb-topbar">
        <RouterLink
          v-if="media"
          :to="`/media/${media.id}`"
          class="lb-btn"
          :title="t('media.openDetailPage')"
          :aria-label="t('media.openDetailPage')"
          @click.stop
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </RouterLink>
        <button
          type="button"
          class="lb-btn lb-close"
          :title="t('common.close')"
          :aria-label="t('common.close')"
          @click.stop="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <button
        v-if="hasPrev"
        type="button"
        class="lb-btn lb-nav lb-nav--prev"
        :aria-label="t('media.lightboxPrev')"
        @click.stop="goPrev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <button
        v-if="hasNext"
        type="button"
        class="lb-btn lb-nav lb-nav--next"
        :aria-label="t('media.lightboxNext')"
        @click.stop="goNext"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>

      <div class="lb-info" v-if="media">
        <p v-if="canNavigate" class="lb-counter">
          {{ t('media.lightboxCounter', { index: currentIndex + 1, total: list!.length }) }}
        </p>
        <p v-if="media.takenAt">{{ t('media.timeLabel') }}: {{ new Date(media.takenAt).toLocaleString() }}</p>
        <p v-if="media.personTags && media.personTags.length > 0">
          {{ t('media.membersLabel') }}: {{ media.personTags.map((p: any) => p.displayName).join(', ') }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 6, 5, 0.96);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  touch-action: pan-y;
}

.lb-stage {
  width: 100%;
  height: 100%;
  padding: calc(4rem + var(--safe-top)) 3.5rem calc(4rem + var(--safe-bottom));
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .lb-stage {
    padding: calc(3.5rem + var(--safe-top)) 0.5rem calc(4.5rem + var(--safe-bottom));
  }
}

.lb-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  border-radius: 6px;
}

/* ===== Controls: all >=44px touch targets, safe-area aware ===== */
.lb-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(5, 8, 10, 0.6);
  color: rgba(238, 243, 238, 0.92);
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  z-index: 10;
}

.lb-btn:active {
  transform: scale(0.92);
  background: rgba(61, 220, 132, 0.22);
  border-color: rgba(61, 220, 132, 0.5);
}

@media (hover: hover) {
  .lb-btn:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(61, 220, 132, 0.45);
  }
}

.lb-topbar {
  position: absolute;
  top: calc(1rem + var(--safe-top));
  right: calc(1rem + var(--safe-right));
  display: flex;
  gap: 0.6rem;
  z-index: 11;
}

.lb-nav {
  position: absolute;
  top: 50%;
  margin-top: -22px;
}

.lb-nav--prev {
  left: calc(0.75rem + var(--safe-left));
}

.lb-nav--next {
  right: calc(0.75rem + var(--safe-right));
}

.lb-info {
  position: absolute;
  left: calc(1rem + var(--safe-left));
  bottom: calc(1rem + var(--safe-bottom));
  max-width: min(70vw, 480px);
  color: rgba(238, 243, 238, 0.9);
  background: rgba(5, 8, 10, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.7rem 1.1rem;
  border-radius: 10px;
  font-family: var(--sans);
  font-size: 0.82rem;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: none;
}

.lb-info p {
  margin: 0 0 0.35rem 0;
}

.lb-info p:last-child {
  margin: 0;
}

.lb-counter {
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: #3ddc84;
}

.lb-hint {
  position: absolute;
  top: calc(1.1rem + var(--safe-top));
  left: calc(1rem + var(--safe-left));
  color: rgba(238, 243, 238, 0.75);
  background: rgba(5, 8, 10, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 40px;
  font-family: var(--sans);
  font-size: 0.8rem;
  pointer-events: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* transform/opacity-only motion, disabled for reduced-motion users */
@media (prefers-reduced-motion: no-preference) {
  .lb-hint {
    animation: lb-hint-out 3s forwards;
    animation-delay: 2s;
  }

  .lb-fade-enter-active .lb-media,
  .lb-fade-leave-active .lb-media {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lb-fade-enter-from .lb-media {
    transform: scale(0.96);
  }

  @keyframes lb-hint-out {
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
}

.lb-fade-enter-active,
.lb-fade-leave-active {
  transition: opacity 0.35s ease;
}

.lb-fade-enter-from,
.lb-fade-leave-to {
  opacity: 0;
}
</style>
