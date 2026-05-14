<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const enabled = ref(false)
const canvasEl = ref<HTMLCanvasElement | null>(null)

// 可调整参数
const CONFIG = {
  particleColors: ['#d8d8d8', '#bfc3c7', '#f2f2f2'],
  particleLifespan: 0.8, // 粒子生命周期(秒)
  dustMultiplier: 2.0, // 扬尘数量乘数
  gravity: 150, // 重力下坠加速度 (px/s^2)
  trailLength: 1.2, // 拖尾初速度长度
  soccerSize: 36 // 足球大小(px)
}

let rafId = 0
let lastT = 0

// 鼠标状态
let cursorX = 0
let cursorY = 0
let targetX = 0
let targetY = 0
let vx = 0
let vy = 0
let lastMoveT = 0
let lastMoveX = 0
let lastMoveY = 0
let rotation = 0
let dragging = false
let inDocument = true

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  maxSize: number
  color: string
}

let particles: Particle[] = []

function spawnDust(x: number, y: number, speedX: number, speedY: number) {
  const speed = Math.hypot(speedX, speedY)
  if (speed < 30) return // 速度太慢不产生扬尘

  // 速度越快，生成的粒子越多
  const count = Math.floor(Math.min(6, speed / 150) * CONFIG.dustMultiplier)
  
  const nx = speedX / Math.max(1, speed)
  const ny = speedY / Math.max(1, speed)

  for (let i = 0; i < count; i++) {
    // 粒子生成在足球的后方
    const offset = 12 + Math.random() * 10
    const px = x - nx * offset + (Math.random() - 0.5) * 12
    const py = y - ny * offset + (Math.random() - 0.5) * 12

    // 粒子向后方喷射并附带随机散开的角度
    const pvx = -nx * (40 + Math.random() * 80) + (Math.random() - 0.5) * 60
    const pvy = -ny * (40 + Math.random() * 80) + (Math.random() - 0.5) * 60

    particles.push({
      x: px,
      y: py,
      vx: pvx * CONFIG.trailLength,
      vy: pvy * CONFIG.trailLength,
      life: CONFIG.particleLifespan * (0.6 + Math.random() * 0.4),
      maxLife: CONFIG.particleLifespan,
      size: 3 + Math.random() * 5,
      maxSize: 8,
      color: CONFIG.particleColors[Math.floor(Math.random() * CONFIG.particleColors.length)]
    })
  }
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function frame(t: number) {
  rafId = requestAnimationFrame(frame)
  if (!enabled.value) return

  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016)
  lastT = t

  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!inDocument) {
    particles = []
    return
  }

  // 平滑跟随鼠标
  const lerp = 1 - Math.pow(0.001, dt)
  cursorX += (targetX - cursorX) * lerp
  cursorY += (targetY - cursorY) * lerp

  const speed = Math.hypot(vx, vy)
  
  // 滚动物理：向右滚动为顺时针，向左为逆时针
  const spin = (Math.min(10, speed / 150)) * (vx >= 0 ? 1 : -1)
  rotation += spin * dt

  // 拖动时产生扬尘
  if (dragging) {
    spawnDust(cursorX, cursorY, vx, vy)
  }

  // 更新与绘制粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }

    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += CONFIG.gravity * dt // 重力下坠

    const lifeRatio = p.life / p.maxLife
    // 粒子逐渐缩小
    const currentSize = p.size * (0.3 + 0.7 * lifeRatio)
    // 粒子逐渐变透明
    const opacity = lifeRatio

    ctx.globalAlpha = opacity
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1

  // 绘制足球
  ctx.save()
  ctx.translate(cursorX, cursorY)
  ctx.rotate(rotation)
  ctx.font = `${CONFIG.soccerSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 由于 emoji 可能会有细微的垂直偏移，这里微调 y 坐标 + 2px 使得更居中
  ctx.fillText('⚽', 0, 2)
  ctx.restore()

  // 速度衰减
  vx *= Math.pow(0.002, dt)
  vy *= Math.pow(0.002, dt)
}

let cleanup: (() => void) | null = null

onMounted(() => {
  const finePointer = window.matchMedia('(pointer: fine)')

  const recompute = () => {
    const ok = finePointer.matches
    enabled.value = ok
    document.documentElement.classList.toggle('soccer-fx-on', ok)
    if (ok) {
      setTimeout(resize, 0)
    }
  }

  recompute()

  const onPointerMove = (e: PointerEvent) => {
    if (!enabled.value) return
    const x = e.clientX
    const y = e.clientY

    targetX = x
    targetY = y

    const now = performance.now()
    const dt = (now - lastMoveT) / 1000
    if (dt > 0) {
      const dx = x - lastMoveX
      const dy = y - lastMoveY
      vx = dx / dt
      vy = dy / dt
      lastMoveT = now
      lastMoveX = x
      lastMoveY = y
    }
  }

  const onPointerDown = () => {
    if (!enabled.value) return
    dragging = true
    document.documentElement.classList.add('is-dragging')
  }

  const onPointerUp = () => {
    dragging = false
    document.documentElement.classList.remove('is-dragging')
  }

  const onEnter = (e: PointerEvent) => {
    if (!enabled.value) return
    inDocument = true
    const x = e.clientX
    const y = e.clientY
    cursorX = x
    cursorY = y
    targetX = x
    targetY = y
    lastMoveT = performance.now()
    lastMoveX = x
    lastMoveY = y
  }

  const onDocLeave = () => {
    if (!enabled.value) return
    inDocument = false
  }

  const onDocEnter = () => {
    if (!enabled.value) return
    inDocument = true
  }

  finePointer.addEventListener('change', recompute)
  document.addEventListener('mouseleave', onDocLeave)
  document.addEventListener('mouseenter', onDocEnter)
  window.addEventListener('resize', resize)
  window.addEventListener('pointerenter', onEnter, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('pointercancel', onPointerUp, { passive: true })
  window.addEventListener('blur', onPointerUp)

  rafId = requestAnimationFrame((t) => {
    lastT = t
    rafId = requestAnimationFrame(frame)
  })

  cleanup = () => {
    cancelAnimationFrame(rafId)
    document.documentElement.classList.remove('soccer-fx-on')
    document.documentElement.classList.remove('is-dragging')

    finePointer.removeEventListener('change', recompute)
    document.removeEventListener('mouseleave', onDocLeave)
    document.removeEventListener('mouseenter', onDocEnter)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointerenter', onEnter)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('blur', onPointerUp)
  }
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<template>
  <canvas v-if="enabled" ref="canvasEl" class="soccer-canvas" aria-hidden="true"></canvas>
</template>

<style scoped>
.soccer-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}
</style>
