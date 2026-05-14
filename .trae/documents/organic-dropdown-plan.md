# 有机趣味下拉菜单 (Organic Dropdown) 实现计划

## 一、 当前状态与目标
- **现状**：目前项目中的下拉菜单（如 `MediaPage`、`PeoplePage`、`UploadPage` 等页面）均使用的是原生 `<select>` 标签，样式为极简的下划线风格。
- **目标**：设计并实现一个带有**有机/柔和/趣味性**的自定义下拉菜单组件，应用到整个项目中。风格采用优先推荐的**气泡/水滴/云朵风格**，带有弹簧缓动动画，以及优雅的悬浮反馈。

## 二、 设计与技术方案 (OrganicDropdown.vue)
1. **视觉风格 (气泡/水滴/对话泡)**：
   - **触发按钮**：保留融入当前极简排版的底线或柔和边框，但在 Focus 或 Hover 时，底部会浮现柔和的光晕/水滴阴影。
   - **下拉面板**：摒弃直角矩形，使用动态 CSS `border-radius` (例如 `border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px`) 模拟手绘/气泡的有机形态。
   - **小尾巴 (Pointer)**：使用 CSS 伪元素在下拉面板顶部绘制一个圆润的三角箭头，使其看起来像一个云朵对话框。
2. **动画交互 (Spring Animation)**：
   - **展开/收起**：面板展开时从触发点起始，使用 `transform-origin: top center;` 和 `cubic-bezier(0.68, -0.55, 0.265, 1.55)`（回弹贝塞尔曲线）实现缩放和位移的 Q 弹效果；收起时平滑淡出。
   - **Hover 反馈**：鼠标悬浮选项时，选项背景呈现柔和的品牌色晕染，文字轻微向右浮动 (`translateX(4px)`)，并带有微小的缩放反馈。
3. **技术栈与特性**：
   - 纯 Vue 3 `<script setup>` + CSS 实现，无第三方依赖。
   - 包含完整的 Click-Outside（点击外部关闭）逻辑，保证触屏/移动端友好。
   - **支持单选与多选**：兼容 `UploadPage` 中的 `multiple` 标签选择需求。

## 三、 提议的变更 (修改的文件)
1. **`src/components/base/OrganicDropdown.vue` (新建)**
   - 编写完整的组件代码（包含所有样式和脚本）。
   - 在代码中通过注释清晰标注“如何修改菜单内容和样式”（如背景色、动画曲线、气泡圆角等）。
2. **`src/views/MediaPage.vue`**
   - 将原生的 `TYPE`、`YEAR`、`SUBJECT` `<select>` 替换为 `<OrganicDropdown>`，并将选项数据格式化为 `[{ label, value }]`。
3. **`src/views/PeoplePage.vue`**
   - 将 `TEAM`、`FAMILY` 替换为 `<OrganicDropdown>`。
4. **`src/views/UploadPage.vue`**
   - 替换所有表单中的下拉框。对于 `personTagIds` 和 `participantIds`，传入 `multiple` 属性以支持多选，并处理数组绑定。

## 四、 验证步骤
1. 浏览页面，点击下拉菜单，确认展开时具有带有小尾巴的气泡/云朵形状以及 Q 弹的弹簧动画。
2. 鼠标悬浮在菜单项上，确认有明显的右移和背景色反馈。
3. 验证点击页面空白处能正确收起菜单。
4. 在 `UploadPage` 测试单选与多选逻辑，确保数据能够正确提交。