<template>
  <div class="base-card">
    <slot />
  </div>
</template>

<style scoped>
.base-card {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 2rem;
  border-radius: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.base-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-shadow: var(--shadow-whisper);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.base-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-strong);
}

.base-card:hover::after {
  opacity: 1;
}
</style>
