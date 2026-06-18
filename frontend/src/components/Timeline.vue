<template>
  <div class="s-timeline-container">
    <div class="s-timeline-nodes">
      <button
        v-for="(node, index) in nodes"
        :key="node.year"
        class="s-timeline-node"
        :class="{
          'is-active': currentYear === node.year,
          'is-left': index % 2 === 0,
          'is-right': index % 2 !== 0,
          'has-data': node.hasData
        }"
        :style="{ 'animation-delay': `${index * 0.1}s` }"
        @click="emit('select', node.year)"
      >
        <div class="s-node-content">
          <span class="s-node-year">{{ node.year }}</span>
          <span class="s-node-action">{{ $t('history.explore') }}</span>
        </div>
        <div class="s-node-point">
          <div class="s-node-dot"></div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TimelineNode {
  year: number
  hasData?: boolean
}

defineProps<{
  nodes: TimelineNode[]
  currentYear?: number
}>()

const emit = defineEmits<{
  (e: 'select', year: number): void
}>()
</script>

<style scoped>
.s-timeline-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  padding: 1rem 0;
  overflow: visible;
}

.s-timeline-nodes {
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  padding: 1rem 0;
  margin-top: 1rem;
  gap: 3rem;
}

.s-timeline-node {
  display: flex;
  align-items: center;
  width: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  transform: translateY(20px);
  animation: floatUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.s-timeline-node.is-left {
  align-self: flex-start;
  justify-content: flex-end;
  padding-right: 4rem;
}

.s-timeline-node.is-right {
  align-self: flex-end;
  justify-content: flex-start;
  flex-direction: row-reverse;
  padding-left: 4rem;
}

.s-node-content {
  display: flex;
  flex-direction: column;
  transition: transform 0.4s ease;
}

.s-timeline-node.is-left .s-node-content {
  align-items: flex-end;
  text-align: right;
}

.s-timeline-node.is-right .s-node-content {
  align-items: flex-start;
  text-align: left;
}

.s-node-year {
  font-family: var(--serif);
  font-size: 5rem;
  font-weight: 300;
  line-height: 1;
  color: var(--text-h);
  transition: color 0.4s ease;
  position: relative;
}

.s-node-action {
  font-family: var(--sans);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 0.5rem;
  opacity: 0;
  transition: all 0.4s ease;
}

.s-timeline-node.is-left .s-node-action {
  transform: translateX(10px);
}

.s-timeline-node.is-right .s-node-action {
  transform: translateX(-10px);
}

.s-node-point {
  width: 4rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.s-node-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid rgba(24, 24, 27, 0.45);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 0 4px transparent;
}

.s-timeline-node:hover .s-node-year {
  color: var(--brand);
}

.s-timeline-node:hover .s-node-action {
  opacity: 1;
  transform: translateX(0);
  color: var(--brand);
}

.s-timeline-node:hover .s-node-dot {
  border-color: var(--brand);
  background: var(--brand);
  box-shadow: 0 0 0 8px rgba(168, 79, 56, 0.1);
  transform: scale(1.2);
}

.s-timeline-node.is-left:hover .s-node-content {
  transform: translateX(-10px);
}

.s-timeline-node.is-right:hover .s-node-content {
  transform: translateX(10px);
}

.s-timeline-node.is-active .s-node-year {
  color: var(--brand);
}

.s-timeline-node.is-active .s-node-dot {
  background: var(--brand);
  border-color: var(--brand);
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .s-timeline-nodes {
    gap: 1.5rem;
  }
  
  .s-timeline-node.is-left {
    padding-right: 1rem;
  }
  
  .s-timeline-node.is-right {
    padding-left: 1rem;
  }
  
  .s-timeline-node.is-left .s-node-action {
    transform: translateX(10px);
  }
  
  .s-timeline-node.is-left:hover .s-node-content {
    transform: translateX(-10px);
  }
  
  .s-node-year {
    font-size: 3rem;
  }
}
</style>
