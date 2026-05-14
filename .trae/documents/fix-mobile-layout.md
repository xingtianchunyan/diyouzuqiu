# 修复手机端个人主页及子组件布局失效问题的计划

## 1. 现状分析 (Current State Analysis)
你之前为了解决页面居中跳动的问题，将 `PersonPage.vue` 及其子组件 (`WorksGridModule.vue`, `MatchesList.vue`) 的最外层容器设置为了 `display: flex; flex-direction: column;` 并配合了 `align-items: flex-start;`。

**导致手机端失效的核心原因在于 CSS Flexbox 的机制：**
在 `flex-direction: column`（列向布局）中，`align-items` 控制的是交叉轴（即**水平宽度**）。
- 默认情况下，它的值是 `stretch`，这意味着所有子元素会自动拉伸并撑满父容器的 100% 宽度。
- 当你强制将其设置为 `flex-start` 时，子元素会失去拉伸特性，变为**“收缩以适应内容宽度 (shrink-to-fit)”**。

虽然你在父容器上写了 `width: 100%`，但由于 `align-items: flex-start` 的存在，**内部没有显式设置 `width: 100%` 的深层子元素（如比赛列表行、作品网格）都会收缩到最小宽度**。在手机端屏幕较窄时，这种收缩会导致内部的 `justify-content: space-between` 失效，内容挤在一起，网格也无法正确占满屏幕。

## 2. 拟定更改 (Proposed Changes)
解决这个问题的最佳方案是**将 `align-items: flex-start` 替换为 `align-items: stretch`**。
这样既能保持你想要的“不跳动”和“默认靠左”的效果（因为子元素撑满全宽后，里面的内容默认就是靠左排布的），又能让所有深层子组件在手机端自动获得 100% 的宽度。

**涉及修改的文件及细节：**

- **`frontend/src/views/PersonPage.vue`**
  - 在 `.person-layout` 中，将 `align-items: flex-start;` 修改为 `align-items: stretch;`。
  - 在 `.person-top-section` 中，将 `align-items: flex-start;` 修改为 `align-items: stretch;`。
  - 在 `.person-archive-section` 中，将 `align-items: flex-start;` 修改为 `align-items: stretch;`。

- **`frontend/src/components/works/WorksGridModule.vue`**
  - 在 `.works-grid-module` 中，将 `align-items: flex-start;` 修改为 `align-items: stretch;`。

- **`frontend/src/components/matches/MatchesList.vue`**
  - 在 `.matches-list-container` 中，将 `align-items: flex-start;` 修改为 `align-items: stretch;`。

## 3. 预期效果 (Verification Steps)
- 替换为 `stretch` 后，父容器在切换 Tab 时依然会保持 100% 宽度，上方的个人信息区将“纹丝不动”，不会出现跳动。
- 手机端访问时，下方的作品网格 (Grid) 和比赛列表 (Space-between 行) 会自动撑满屏幕宽度，布局恢复正常。
