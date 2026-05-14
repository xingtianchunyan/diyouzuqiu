# 历史页面时间轴优化计划 (History Timeline Enhancement Plan)

## 1. 目标与总结 (Summary)
本次修改旨在根据 `canvas-design` 的高级画廊设计规范，对历史页面的时间轴布局进行视觉优化和交互增强：
1. **收紧空间布局**：大幅度缩小时间轴与上方分割线（`div.divider-y`）的距离，并缩减各个年份节点之间的纵向间距，使其在移动端浏览时更加紧凑、精致，不再显得空旷。
2. **增加“未来”交互**：在标题“历史”右侧增加一个风格契合的高级感“未来”按钮。点击该按钮后，能够以现有的倒序逻辑（即新添加的年份在最上方，且保持左右交错）依次动态添加 2027 至 2040 年的时间节点。

## 2. 当前状态分析 (Current State Analysis)
- **间距过大**：`HistoryPage.vue` 中的 `.timeline-wrapper` 具有 `padding: 4rem 0`；`Timeline.vue` 中的 `.s-timeline-nodes` 具有 `margin-top: 5rem` 和 `gap: 6rem`。多层大间距叠加导致了视觉上的过度空旷。
- **数据静态化**：目前 `HistoryPage.vue` 中的 `nodes` 是通过写死的 `endYear`（2026）进行一次性初始化的静态数组，无法动态响应新年份的追加。

## 3. 具体修改方案 (Proposed Changes)

### 3.1 修改 `frontend/src/views/HistoryPage.vue`
- **逻辑层 (Script)**:
  - 引入 Vue 的 `ref` 和 `computed`。
  - 将 `currentEndYear` 转换为响应式变量（初始值为 2026 或当前真实年份的最大值）。
  - 将 `nodes` 转换为基于 `currentEndYear` 的计算属性 (`computed`)，使其能动态响应年份的变化。
  - 增加 `addFutureYear` 方法，每次点击使 `currentEndYear` 递增 1，最大限制为 2040。
- **视图层 (Template)**:
  - 将原本的 `h1.editorial-title` 包裹在一个 Flex 布局的容器 `.title-row` 中。
  - 在 `h1` 右侧加入 `<button class="future-btn" @click="addFutureYear" v-if="currentEndYear < 2040">未来</button>`。
- **样式层 (Style)**:
  - 减小 `.timeline-wrapper` 的 `padding` 至 `1rem 0`。
  - 为 `.title-row` 和 `.future-btn` 添加样式，采用与当前全局语言一致的细线、胶囊形、悬浮反色的画廊级克制设计。

### 3.2 修改 `frontend/src/components/Timeline.vue`
- **样式层 (Style)**:
  - 修改 `.s-timeline-nodes`：将 `padding` 减小为 `1rem 0`，`margin-top` 减小为 `1rem`，基础 `gap` 从 `6rem` 缩减至 `3rem`。
  - 在 `@media (max-width: 768px)` 移动端查询中，显式将 `gap` 进一步缩小至 `1.5rem`，以确保在手机屏幕上的信息密度合适，避免空旷感。
  - （节点左右交错逻辑基于 `index % 2` 自动实现，当 `nodes` 数组从最前方追加新年份时，现有年份的左右位置会自动交替，形成优美的蛇形延伸效果。）

## 4. 假设与决定 (Assumptions & Decisions)
- **排序逻辑**：既然当前的时间轴是 2026 在最上方，2015 在最下方（倒序排列），那么点击“未来”新增的年份（2027、2028...）自然也应当被追加到**最上方**，成为新的时间轴起点。
- **按钮隐藏**：当时间轴追加到最大值 2040 年时，“未来”按钮将自动从 DOM 中平滑隐藏。

## 5. 验证步骤 (Verification Steps)
1. 访问 `/history` 页面，观察时间轴顶部是否已大幅贴近上方的细线分割线。
2. 使用浏览器开发者工具切换至移动端视图，确认年份之间的上下距离是否明显缩小且视觉紧凑。
3. 点击标题右侧的“未来”按钮，确认页面最上方是否出现 2027 年，且后续年份的左右排列逻辑是否仍然正确交错。
4. 连续点击直至 2040 年，确认新增正常且达到 2040 后按钮正确消失。