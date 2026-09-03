<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const navItems = [
  { path: '/history', label: 'app.menu.history', desc: 'home.nav.historyDesc' },
  { path: '/media', label: 'app.menu.media', desc: 'home.nav.mediaDesc' },
  { path: '/works', label: 'app.menu.works', desc: 'home.nav.worksDesc' },
  { path: '/people', label: 'app.menu.people', desc: 'home.nav.peopleDesc' },
  { path: '/upload', label: 'app.menu.upload', desc: 'home.nav.uploadDesc' },
  { path: '/planner', label: 'app.menu.planner', desc: 'home.nav.plannerDesc' },
]
</script>

<template>
  <main class="arena-theme">
    <!-- 球氛围光效：纯 CSS，仅 transform/opacity 动画，性能优先 -->
    <div class="arena-fx" aria-hidden="true">
      <div class="fx-mow"></div>
      <div class="fx-centerline"></div>
      <div class="fx-circle"></div>
      <div class="fx-glow fx-glow--green"></div>
      <div class="fx-glow fx-glow--gold"></div>
      <div class="fx-sweep"></div>
    </div>

    <!-- 顶部条：队徽 + 用户区 -->
    <header class="topbar rise d1">
      <div class="club-badge">
        <svg class="badge-shield" viewBox="0 0 48 56" role="img" aria-label="DIYOU FC">
          <defs>
            <linearGradient id="arenaBadgeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#1d5c3a" />
              <stop offset="1" stop-color="#0a2316" />
            </linearGradient>
          </defs>
          <path
            d="M24 3 L43 9 V26 C43 39 35.5 48.5 24 53 C12.5 48.5 5 39 5 26 V9 Z"
            fill="url(#arenaBadgeFill)"
            stroke="#e8c766"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path
            d="M24 7 L39 11.8 V26 C39 36.6 32.6 44.7 24 48.8 C15.4 44.7 9 36.6 9 26 V11.8 Z"
            fill="none"
            stroke="rgba(232, 199, 102, 0.3)"
            stroke-width="1"
          />
          <text x="24" y="31" text-anchor="middle" class="badge-letter">D</text>
          <path
            d="M24 34 L25.41 38.06 L29.71 38.15 L26.28 40.74 L27.53 44.85 L24 42.4 L20.47 44.85 L21.72 40.74 L18.29 38.15 L22.59 38.06 Z"
            fill="#e8c766"
          />
        </svg>
        <div class="badge-text">
          <span class="badge-name">DIYOU</span>
          <span class="badge-est">EST. 2013</span>
        </div>
      </div>

      <div class="user-zone">
        <template v-if="authStore.user">
          <span class="user-email">{{ authStore.user.email }}</span>
          <button class="btn-ghost" type="button" @click="handleLogout">
            {{ t('auth.logout') }}
          </button>
        </template>
        <RouterLink v-else class="btn-gold" to="/login">
          {{ t('home.auth.signIn') }}
        </RouterLink>
      </div>
    </header>

    <!-- 主视觉 -->
    <section class="hero">
      <p class="hero-kicker rise d2">{{ t('home.hero.kicker') }}</p>
      <h1 class="hero-title rise d3" :data-text="t('home.hero.title')">
        <span class="hero-title-fill">{{ t('home.hero.title') }}</span>
      </h1>
      <p class="hero-subtitle rise d4">{{ t('home.hero.subtitle') }}</p>
    </section>

    <!-- 球场分区式导航 -->
    <section class="sections">
      <div class="sections-head rise d4">
        <p class="sections-kicker">{{ t('home.sections.kicker') }}</p>
        <h2 class="sections-title">{{ t('home.sections.title') }}</h2>
      </div>
      <div class="cards">
        <RouterLink
          v-for="(item, index) in navItems"
          :key="item.path"
          :to="item.path"
          class="card rise"
          :class="`cd${index + 1}`"
        >
          <span class="card-top">
            <span class="card-no">0{{ index + 1 }}</span>
            <span class="card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </span>
          </span>
          <span class="card-title">{{ t(item.label) }}</span>
          <span class="card-desc">{{ t(item.desc) }}</span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ============ 页面级竞技风主题令牌(不动 :root) ============ */
.arena-theme {
  --font-display: 'Anton', 'Inter', system-ui, sans-serif;
  --arena-text: #eef3ee;
  --arena-muted: rgba(238, 243, 238, 0.55);
  --arena-faint: rgba(238, 243, 238, 0.32);
  --arena-line: rgba(255, 255, 255, 0.09);
  --arena-green: #3ddc84;
  --arena-green-deep: #1f7a48;
  --arena-gold: #e8c766;

  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  color: var(--arena-text);
  background:
    radial-gradient(1100px 520px at 85% -10%, rgba(232, 199, 102, 0.07), transparent 60%),
    radial-gradient(1000px 720px at 8% 112%, rgba(31, 122, 72, 0.2), transparent 65%),
    linear-gradient(180deg, #05080a 0%, #08130e 52%, #05080a 100%);
}

/* ============ 光效层(仅 transform/opacity) ============ */
.arena-fx {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* 草坪割草条纹 */
.fx-mow {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.022) 0 90px,
    rgba(255, 255, 255, 0) 90px 180px
  );
}

/* 中线 + 中圈 */
.fx-centerline {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.06), transparent);
}

.fx-circle {
  position: absolute;
  left: 50%;
  top: 34%;
  width: min(72vmin, 560px);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.fx-glow {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.fx-glow--green {
  width: 62vmax;
  height: 62vmax;
  top: -24vmax;
  left: -18vmax;
  background: radial-gradient(closest-side, rgba(46, 180, 100, 0.2), transparent 70%);
  animation: drift-green 26s ease-in-out infinite alternate;
}

.fx-glow--gold {
  width: 48vmax;
  height: 48vmax;
  right: -16vmax;
  bottom: -18vmax;
  background: radial-gradient(closest-side, rgba(232, 199, 102, 0.1), transparent 70%);
  animation: drift-gold 32s ease-in-out infinite alternate;
}

/* 缓慢扫光 */
.fx-sweep {
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 42%;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0.04) 42%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 58%,
    transparent
  );
  transform: translateX(-130%) skewX(-10deg);
  animation: sweep 9s linear infinite;
  will-change: transform;
}

@keyframes drift-green {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(9vmax, 6vmax, 0); }
}

@keyframes drift-gold {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-7vmax, -5vmax, 0); }
}

@keyframes sweep {
  from { transform: translateX(-130%) skewX(-10deg); }
  to { transform: translateX(340%) skewX(-10deg); }
}

/* ============ 布局容器 ============ */
.topbar,
.hero,
.sections {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: calc(2rem + var(--safe-left));
  padding-right: calc(2rem + var(--safe-right));
  box-sizing: border-box;
}

/* ============ 顶部条 ============ */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: calc(1.1rem + var(--safe-top));
  padding-bottom: 1rem;
}

.club-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.badge-shield {
  width: 42px;
  height: auto;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 8px rgba(61, 220, 132, 0.25));
}

.badge-letter {
  font-family: var(--font-display);
  font-size: 19px;
  fill: #f4f8f2;
}

.badge-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.badge-name {
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  color: var(--arena-text);
  line-height: 1;
}

.badge-est {
  font-family: var(--sans);
  font-size: 0.58rem;
  letter-spacing: 0.28em;
  color: var(--arena-gold);
}

.user-zone {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.user-email {
  font-family: var(--sans);
  font-size: 0.78rem;
  color: var(--arena-muted);
  max-width: 38vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-ghost,
.btn-gold {
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.55rem 1.05rem;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, filter 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: var(--arena-text);
}

.btn-ghost:active {
  transform: scale(0.96);
  background: rgba(255, 255, 255, 0.12);
}

.btn-gold {
  background: linear-gradient(160deg, #f3d47e, var(--arena-gold) 60%, #c9a23f);
  border: none;
  color: #14210f;
}

.btn-gold:active {
  transform: scale(0.96);
  filter: brightness(1.08);
}

/* ============ 主视觉 ============ */
.hero {
  padding-top: clamp(2.5rem, 8vh, 5.5rem);
  padding-bottom: clamp(1.5rem, 4vh, 3rem);
}

.hero-kicker,
.sections-kicker {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--arena-green);
  margin: 0;
}

.hero-kicker::before,
.sections-kicker::before {
  content: '';
  width: 26px;
  height: 1px;
  background: linear-gradient(90deg, var(--arena-green), transparent);
  flex-shrink: 0;
}

.hero-title {
  position: relative;
  margin: 0.9rem 0 0.8rem;
  font-family: var(--font-display);
  font-size: clamp(3.4rem, 13vw + 0.5rem, 8.75rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: 0.015em;
  text-transform: uppercase;
  color: var(--arena-text);
}

/* 描边重影(装饰,不支持 text-stroke 的浏览器自动不可见) */
.hero-title::before {
  content: attr(data-text);
  position: absolute;
  left: 0.045em;
  top: 0.06em;
  z-index: -1;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(232, 199, 102, 0.32);
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .hero-title-fill {
    background: linear-gradient(165deg, #ffffff 15%, #d3f0dd 52%, #9ed8ae 78%, var(--arena-gold) 118%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
}

.hero-subtitle {
  margin: 0;
  font-family: var(--sans);
  font-size: clamp(0.85rem, 1.6vw, 1rem);
  font-weight: 400;
  letter-spacing: 0.32em;
  color: var(--arena-muted);
}

/* ============ 分区导航 ============ */
.sections {
  padding-bottom: calc(3.5rem + var(--safe-bottom));
}

.sections-head {
  margin-top: clamp(1.5rem, 5vh, 3.5rem);
  margin-bottom: 1.4rem;
}

.sections-title {
  margin: 0.55rem 0 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(1.7rem, 4.5vw, 2.5rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--arena-text);
}

.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
}

@media (min-width: 640px) {
  .cards {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .cards {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.1rem;
  }
}

/* FIFA 菜单式大卡片:切角 + 左侧能量条 */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1.25rem 1.35rem;
  min-height: 148px;
  box-sizing: border-box;
  text-decoration: none;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.018));
  border: 1px solid var(--arena-line);
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
  transition: transform 0.16s ease, background-color 0.2s ease, border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--arena-green), var(--arena-gold));
  opacity: 0;
  transform: scaleY(0.35);
  transform-origin: top;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card:active {
  transform: translateY(2px) scale(0.99);
  background: linear-gradient(155deg, rgba(61, 220, 132, 0.12), rgba(255, 255, 255, 0.03));
  border-color: rgba(61, 220, 132, 0.5);
}

.card:active::before,
.card:focus-visible::before {
  opacity: 1;
  transform: scaleY(1);
}

.card:focus-visible {
  outline: 2px solid var(--arena-green);
  outline-offset: 3px;
}

/* 触屏无 hover:hover 特效仅作为桌面的额外增强,功能不依赖它 */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-3px);
    border-color: rgba(61, 220, 132, 0.45);
    background: linear-gradient(155deg, rgba(61, 220, 132, 0.1), rgba(255, 255, 255, 0.03));
  }

  .card:hover::before {
    opacity: 1;
    transform: scaleY(1);
  }

  .card:hover .card-arrow {
    border-color: var(--arena-gold);
    color: var(--arena-gold);
    transform: translateX(3px);
  }

  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-gold:hover {
    filter: brightness(1.06);
  }
}

.card:active .card-arrow {
  border-color: var(--arena-gold);
  color: var(--arena-gold);
  transform: translateX(3px);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: auto;
}

.card-no {
  font-family: var(--font-display);
  font-size: 1.55rem;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.18);
  line-height: 1;
}

.card-arrow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--arena-line);
  border-radius: 50%;
  color: var(--arena-faint);
  transition: transform 0.18s ease, border-color 0.2s ease, color 0.2s ease;
}

.card-title {
  margin-top: 1.9rem;
  font-family: var(--sans);
  font-size: 1.06rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--arena-text);
}

.card-desc {
  margin-top: 0.4rem;
  font-family: var(--sans);
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--arena-muted);
}

/* ============ 入场动画:仅 no-preference 启用,默认/减动效下内容直接可见 ============ */
@media (prefers-reduced-motion: no-preference) {
  .rise {
    animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .d1 { animation-delay: 0.05s; }
  .d2 { animation-delay: 0.14s; }
  .d3 { animation-delay: 0.22s; }
  .d4 { animation-delay: 0.3s; }

  .cd1 { animation-delay: 0.34s; }
  .cd2 { animation-delay: 0.4s; }
  .cd3 { animation-delay: 0.46s; }
  .cd4 { animation-delay: 0.52s; }
  .cd5 { animation-delay: 0.58s; }
  .cd6 { animation-delay: 0.64s; }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .fx-glow,
  .fx-sweep {
    animation: none;
  }

  .fx-sweep {
    display: none;
  }
}

/* ============ 小屏微调 ============ */
@media (max-width: 640px) {
  .topbar,
  .hero,
  .sections {
    padding-left: calc(1.25rem + var(--safe-left));
    padding-right: calc(1.25rem + var(--safe-right));
  }

  .user-email {
    max-width: 30vw;
  }

  .hero-subtitle {
    letter-spacing: 0.2em;
  }
}
</style>
