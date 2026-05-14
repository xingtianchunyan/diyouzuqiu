# 修复体验问题与有机组件优化计划

## 一、 当前状态分析与目标
根据反馈，目前存在三个核心体验问题需要解决：
1. **拖拽选中文字问题**：用户在使用自定义足球光标并按住左键拖拽（触发扬尘物理效果）时，会意外触发浏览器的默认文本选中行为（蓝色高亮），这破坏了页面整体的沉浸式体验。
2. **气泡组件层级被遮挡**：新添加的 `OrganicDropdown` 组件在展开时，由于父容器未建立高优先级的层叠上下文（Stacking Context），导致其下拉面板被页面结构中后续的文字或按钮遮挡。
3. **两选项下拉框操作繁琐**：部分下拉框（如 `UploadPage` 中 Work 表单的 Type 字段）只有两个选项，使用“点击 -> 展开 -> 点击选择”的流程显得过于繁重。

**目标**：
- 修复拖拽时的文字选中问题。
- 修复 `OrganicDropdown` 的 `z-index` 层级，确保其始终置顶。
- 基于有机风格，设计并实现一个新的 `OrganicToggle.vue` 开关组件，替换仅有两个选项的下拉菜单。

## 二、 提议的变更与技术实现

### 1. 修复光标拖拽选中文字 (SoccerFX.vue)
- **修改文件**：`src/components/SoccerFX.vue` 与 `src/style.css`
- **具体实现**：
  - 在 `SoccerFX.vue` 的 `onPointerDown` 事件触发时，向 `document.documentElement` 添加一个类名 `is-dragging`。
  - 在 `onPointerUp` 时移除该类名。
  - 在 `style.css` 中增加规则：`html.soccer-fx-on.is-dragging * { user-select: none !important; }`。通过这种方式，只有在主动拖拽时才全局禁用文本选中，不影响正常的文本复制操作。

### 2. 修复 OrganicDropdown 层叠遮挡问题
- **修改文件**：`src/components/base/OrganicDropdown.vue`
- **具体实现**：
  - 在 `<style scoped>` 中为 `.organic-dropdown.is-open` 增加 `z-index: 100;`。
  - 这样当下拉菜单激活时，其根元素会被提升至当前层叠上下文的最顶层，内部的 `.dropdown-menu` 也就自然能够覆盖在其下方的其他页面元素之上。

### 3. 实现并应用 OrganicToggle 组件
- **新增文件**：`src/components/base/OrganicToggle.vue`
- **设计风格**：
  - 视觉上是一个柔和圆润的胶囊形轨道（如 `border-radius: 30px 10px 25px 15px / 15px 30px 10px 25px;`）。
  - 轨道内并排显示两个选项的文字，背后有一个带有主题色（`var(--brand)` 或 `var(--text-h)`）的高亮滑块。
  - 点击时，高亮滑块使用弹簧动画（`cubic-bezier(0.34, 1.56, 0.64, 1)`）平滑移动至目标选项下方。
- **应用替换**：
  - **修改文件**：`src/views/UploadPage.vue`
  - 在 `UploadPage.vue` 的 `Work Form` 中，`workForm.type` 对应的下拉框仅有 `Article` 和 `Poem` 两个选项。将此处调用的 `<OrganicDropdown>` 替换为 `<OrganicToggle>`。

## 三、 假设与决策
- **文本选择禁用的作用域**：仅在“正在拖拽” (`is-dragging`) 时禁用全局选中，以确保用户如果在非拖拽状态下仍然可以正常高亮并复制页面上的文本（如标题、引用等）。
- **Toggle 组件的扩展性**：`OrganicToggle` 专为两个选项设计，接收 `options` 数组和 `modelValue`，并发出 `update:modelValue`。它不处理超过 3 个的选项，对于 3 个以上的依然保留使用 `OrganicDropdown`。

## 四、 验证步骤
1. 按住鼠标左键在页面上拖拽（触发扬尘），验证在此过程中是否不会选中任何蓝色文本。
2. 展开 `MediaPage` 或 `UploadPage` 的下拉菜单，验证展开的面板是否完全遮盖在其下方的文字和按钮之上，且能够正常点击。
3. 进入 `UploadPage` -> `WORK` 表单，验证“TYPE”字段是否已变为并排的胶囊形状 Toggle 按钮，并且点击时伴有 Q 弹的滑块位移动画。