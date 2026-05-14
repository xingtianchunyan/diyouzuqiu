# 手机端 UI 适配修复计划

## 1. 现状分析
当前项目在手机端存在三个关键适配问题：
1. **导航栏消失**：在 `App.vue` 中，移动端时隐藏了主导航 `.main-nav`，但未提供替代的汉堡菜单或下拉菜单。
2. **历史页面时间轴错位**：在 `Timeline.vue` 的移动端样式（`@media (max-width: 768px)`）中，强制将所有时间节点覆盖为了 100% 宽度和左对齐（`flex-start`），导致失去了左右交错的效果。
3. **年份页面时间轴错位**：在 `YearPage.vue` 中，由于移动端屏幕高度受限，时间轴侧边栏被挤压为横向滚动，不符合预期。用户建议简化移动端的时间轴交互，改为“左右切换按钮”。

## 2. 解决方案与修改步骤

### 步骤 1：修复导航栏消失问题（引入移动端下拉菜单）
**文件**：`frontend/src/App.vue`
- **逻辑改动**：引入已有的 `OrganicDropdown` 组件。在 setup 中定义 `mobileNavOptions`（包含 History, Media, Works 等路由）以及 `currentPath` 响应式变量。编写 `handleMobileNav` 函数处理页面跳转。
- **模板改动**：在 `<div class="header-actions">` 内部，将语言切换按钮左侧插入 `<div class="mobile-nav-wrapper">` 并放置 `OrganicDropdown`。
- **样式改动**：在桌面端隐藏 `.mobile-nav-wrapper`，在移动端（`max-width: 900px`）显示并给予合适的宽度（如 `130px`）。

### 步骤 2：修复历史页面时间轴左右交错效果
**文件**：`frontend/src/components/Timeline.vue`
- **样式改动**：重写 `@media (max-width: 768px)` 内的规则。
  - 移除强制 `width: 100%`、强制 `flex-start`、`row-reverse` 以及覆盖 `padding` 的 `!important` 属性。
  - 保持其原有 50% 宽度和左右分布特性，仅通过减小 `font-size` 和 `padding`（如将 `4rem` 降至 `1rem`）来适应手机屏幕。

### 步骤 3：简化年份页面的时间轴导航
**文件**：`frontend/src/views/YearPage.vue`
- **模板改动**：将年份的展示区 `<h1 class="editorial-title">` 改为弹性布局（Flex），在年份数字两侧添加带有 `&larr;` 和 `&rarr;` 图标的 `<button>`。点击按钮时触发 `handleSelect(year - 1)` 或 `handleSelect(year + 1)`，并加入边界判断（如 `year > startYear` 才显示上一页）。
- **样式改动**：
  - 增加这些年份切换按钮的轻量级样式（类似 `.minimal-btn` 但无边框，增加点击热区）。
  - 在 `@media (max-width: 767px)` 下，通过 `display: none` 完全隐藏侧边栏 `.year-sidebar`，让移动端专注于内容，仅靠标题栏的箭头翻页。

## 3. 验证方式
修改完成后，重启项目，并在开发者工具或之前的 Playwright 脚本中以手机视图预览验证上述三点改动是否生效。