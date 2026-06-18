<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import type { Media } from '../../api/services/media.service'
import { mediaService } from '../../api/services/media.service'

const props = defineProps<{
  media: Media | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.media) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const getMediaUrl = (id: string) => mediaService.getMediaFileUrl(id)
</script>

<template>
  <Transition name="fade">
    <div v-if="media" class="lightbox" @click="emit('close')">
      <div class="lightbox-content" @click.stop>
        <img
          v-if="media.type === 'PHOTO'"
          :src="getMediaUrl(media.id)"
          class="lightbox-media"
          @dblclick="emit('close')"
        />
        <video
          v-else-if="media.type === 'VIDEO'"
          :src="getMediaUrl(media.id)"
          class="lightbox-media"
          controls
          autoplay
          @dblclick="emit('close')"
        ></video>
        <div class="lightbox-hint">{{ $t('media.lightboxHint') }}</div>
        <RouterLink
          v-if="media"
          :to="`/media/${media.id}`"
          class="lightbox-link"
          :title="$t('media.openDetailPage')"
          @click.stop
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </RouterLink>
        <div class="lightbox-info" v-if="media">
          <p v-if="media.takenAt">{{ $t('media.alt') }} {{ $t('media.timeLabel') }}: {{ new Date(media.takenAt).toLocaleString() }}</p>
          <p v-if="media.personTags && media.personTags.length > 0">
            {{ $t('media.membersLabel') }}: {{ media.personTags.map((p: any) => p.displayName).join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.lightbox-content {
  width: 100%;
  height: 100%;
  padding: 4rem 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.lightbox-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  border-radius: 4px;
}

.lightbox-info {
  position: absolute;
  top: 4.5rem;
  left: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem 1.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: none;
}
.lightbox-info p {
  margin: 0 0 0.5rem 0;
}
.lightbox-info p:last-child {
  margin: 0;
}

.lightbox-hint {
  position: absolute;
  top: 2rem;
  right: 6rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.4);
  padding: 0.5rem 1rem;
  border-radius: 40px;
  font-size: 0.85rem;
  pointer-events: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fadeOut 3s forwards;
  animation-delay: 2s;
}

.lightbox-link {
  position: absolute;
  top: 2rem;
  right: 2rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  z-index: 10;
}

.lightbox-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes fadeOut {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
