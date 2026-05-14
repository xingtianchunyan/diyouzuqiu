# 足球下坠 + 足球光标动效计划

## Summary
在全站加入一套“足球动效系统”，包含：
- **足球光标**：用蓝白相间的五边形足球替代系统光标（仅桌面端 pointer:fine 生效）。
- **按钮 Hover 旋转**：当光标悬停在可交互元素（button/link/导航项/时间轴节点等）上时，足球光标进入更快的旋转状态。
- **拖动滚动 + 扬尘**：按下并拖动时，足球根据移动距离产生滚动角速度，并在尾部生成轻微扬尘粒子（不遮挡点击）。
- **足球下坠（滚动触发）**：用户首次滚动页面后触发一次足球从顶部落下的动效（带轻微弹跳/减速收尾），随后淡出。
- **可访问性降级**：当用户系统偏好 `prefers-reduced-motion: reduce` 或为触屏/粗指针设备时，禁用上述动效并回退到默认光标。

## Current State Analysis
- 全局样式入口在 [main.ts](file:///workspace/frontend/src/main.ts#L1-L15) 通过 [style.css](file:///workspace/frontend/src/style.css#L1-L162) 引入。
- 当前动效体系主要为 CSS 过渡与 keyframes（如 `.animate-fade-in`/`.animate-slide-up`），没有引入任何动画库（见 [package.json](file:///workspace/frontend/package.json#L1-L26)）。
- 没有任何全局 cursor 自定义；交互元素零散使用 `cursor:pointer`（例如 [Button.vue](file:///workspace/frontend/src/components/base/Button.vue#L37-L63)）。
- 根布局适合挂载“全局覆盖层/动效容器”的位置是 [App.vue](file:///workspace/frontend/src/App.vue#L15-L44)。

## Proposed Changes

### 1) 新增全局动效组件（核心）
**新增文件**
- `frontend/src/components/SoccerFX.vue`

**职责**
- 只在以下条件启用：
  - `matchMedia('(pointer: fine)')` 为 true
  - `matchMedia('(prefers-reduced-motion: no-preference)')` 为 true
- 启用时：
  - 给 `document.documentElement` 或 `body` 添加 class（如 `soccer-fx-on`），用于隐藏系统光标与控制命中。
  - 渲染一个 fixed overlay（`position: fixed; inset: 0; pointer-events: none; z-index` 高于页面内容但低于调试浮层）。

**实现点（不引入外部库，纯 Vue + DOM + rAF）**
- **足球光标（DOM cursor）**
  - 光标本体：一个 `div.soccer-cursor` 内嵌 SVG（蓝白五边形构成）。
  - 用 `pointermove` 记录目标坐标与速度；用 `requestAnimationFrame` 做平滑跟随（lerp），避免抖动。
  - 角速度：与速度成比例（滚动感），并有上限。
- **Hover 旋转增强**
  - 每次 `pointermove` 用 `document.elementFromPoint(x, y)` 找到目标元素，判断是否为“可交互元素”：
    - `a, button, [role='button'], input, textarea, select`
    - `.nav-item, .gallery-item, .s-timeline-node, .future-btn`（结合现有风格）
  - 若 hover 在交互元素上，提升自转速度（例如乘以 2~3）并轻微放大（scale 1.05）。
- **拖动滚动 + 扬尘**
  - `pointerdown` 进入 dragging；`pointerup/cancel` 退出。
  - dragging 时：
    - 根据速度方向让球产生“滚动”（rotateZ）并叠加轻微倾斜（rotateX/rotateY 1~3deg），增强立体感。
    - 在运动方向反向生成 1~2 个 dust 粒子（`div.dust`）：
      - 粒子用 CSS `radial-gradient` + opacity fade + translate 的 keyframes
      - 生命周期 300~600ms，动画结束后从 DOM 移除
- **滚动触发下坠**
  - 监听 `scroll`（passive），当 `scrollY > threshold` 且未触发过时：
    - 生成一个 `div.soccer-fall` 从顶部随机 x 落下
    - 用 rAF 做简化物理：`v += g; y += v;`，触底后 `v = -v * restitution`（一次弹跳即可），随后淡出移除

### 2) 全局样式支持（隐藏系统光标 + dust 动画）
**修改文件**
- [style.css](file:///workspace/frontend/src/style.css)

**新增内容**
- `@media (pointer:fine)` 下：
  - `.soccer-fx-on, .soccer-fx-on * { cursor: none !important; }`（只在启用时隐藏系统光标）
  - `@media (prefers-reduced-motion: reduce)` 下强制不隐藏光标（避免可用性问题）
- 为 `.soccer-cursor`, `.soccer-fall`, `.dust` 增加全局 keyframes（或放在 `SoccerFX.vue` 的 scoped 中；但 `cursor:none` 必须全局）。

### 3) 根布局挂载（全站生效）
**修改文件**
- [App.vue](file:///workspace/frontend/src/App.vue#L15-L44)

**改动**
- 引入并挂载 `<SoccerFX />`，放在 `app-layout` 内、`header` 之后或 `main` 之前均可。
- 确保 overlay `pointer-events:none`，不会阻挡导航/按钮/时间轴等点击。

### 4) 资源与 SVG 方案（蓝白五边形足球）
**新增文件**（推荐）
- `frontend/public/fx/soccer.svg`

**使用方式**
- DOM cursor 与下坠球都复用这份 SVG：
  - DOM 中用 `inline SVG` 或 `fetch('/fx/soccer.svg')` 后 innerHTML 注入
  - 为保证可控性与避免异步，建议将 SVG 作为组件内的字符串常量（内联），并同步输出到 `public` 便于复用（二选一）。

SVG 设计要点（满足“蓝白相间五边形”）
- 外圈为白底圆 + 细描边
- 内部至少包含：中心五边形（深蓝）+ 5 个周边五边形/六边形块（蓝/白交错）
- 视觉上明确“由五边形拼接而成”，而非单纯圆形渐变

## Assumptions & Decisions
- 动效全站启用，但仅在桌面端 `pointer:fine` 生效；移动端不做 cursor 相关效果。
- 下坠动效采用“首次滚动触发一次”，避免持续飘落带来的干扰与性能开销。
- `prefers-reduced-motion: reduce` 时完全关闭自定义 cursor、下坠与扬尘。

## Verification Steps
1. **桌面端**（鼠标）：进入任意页面，系统光标消失并被足球光标替代；移动时平滑跟随。
2. **Hover**：将光标移到导航链接、按钮、时间轴年份节点等可交互元素上，足球自转明显加速并有轻微放大。
3. **拖动**：按住鼠标并拖动，足球滚动角速度随移动增强，尾部有细微扬尘，且不遮挡点击。
4. **滚动触发**：刷新页面后首次滚动，触发一次足球自顶部下坠（可见、克制、不遮挡交互），落地后淡出。
5. **可访问性**：系统开启“减少动态效果”后刷新页面，足球光标/下坠/扬尘全部禁用，恢复默认光标。
6. **构建检查**：运行 `npm run build` 通过（前端 TS/Vite 无报错）。
