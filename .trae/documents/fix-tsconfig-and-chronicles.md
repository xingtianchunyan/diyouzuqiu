# 解决 tsconfig 和 ChroniclesList.vue 构建错误计划

## 1. 现状分析 (Current State Analysis)
目前执行 `npm run build` 时，前端抛出了两个主要问题：
1. **tsconfig.app.json 报错**: `Option 'baseUrl' is deprecated...`。这是因为 TypeScript 5.0+ 在 `moduleResolution: "bundler"` 模式下，不再推荐使用 `baseUrl` 选项。
2. **ChroniclesList.vue 构建失败**: 
   - 存在未使用的组件导入：`import WorkReader from '@/components/works/WorkReader.vue'`。在严格模式（`noUnusedLocals: true`）下，这会触发 `vue-tsc` 的编译错误。
   - 逻辑缺陷：在模板中使用了 `WorksGridModule` 展示大事记关联的作品，但没有监听它的 `@select` 事件，导致用户点击作品卡片时没有任何响应。

## 2. 约束与决策 (Assumptions & Decisions)
- **tsconfig 修复**: 移除 `baseUrl: "."`，并将 `paths` 映射修改为相对于当前配置文件的路径（即将 `src/*` 改为 `./src/*`）。
- **ChroniclesList.vue 修复**:
  - 移除无用的 `WorkReader` 导入，消除编译错误。
  - 增加对 `WorksGridModule` 的 `@select` 事件的监听，并将其作为自定义事件 `select-work` `emit` 给父组件（如 `PersonPage.vue` 和 `YearPage.vue`），由父组件统一调用 `openWorkReader` 来打开作品阅读器。
  - 修复图片和视频 `:src` 绑定的语法错误（将单引号改为反引号以支持模板插值）。

## 3. 提议的修改步骤 (Proposed Changes)
1. **修改 `frontend/tsconfig.app.json`**
   - 移除 `"baseUrl": "."`。
   - 将 `"@/*": ["src/*"]` 更改为 `"@/*": ["./src/*"]`。
2. **修改 `frontend/src/components/chronicles/ChroniclesList.vue`**
   - 删除第 10 行：`import WorkReader from '@/components/works/WorkReader.vue'`。
   - 在 `<script setup>` 中定义 `emit`: `const emit = defineEmits<{ (e: 'select-work', workId: string): void }>()`。
   - 修复 `:src` 绑定：将 `'/api/v1/media/${chronicle.primaryMedia.id}/file'` 改为 `` `/api/v1/media/${chronicle.primaryMedia.id}/file` ``。
   - 在模板的 `<WorksGridModule>` 组件上添加 `@select="(id) => emit('select-work', id)"`。
3. **修改父组件以支持新事件**
   - 在 `PersonPage.vue` 和 `YearPage.vue` 的 `<ChroniclesList>` 标签上添加 `@select-work="openWorkReader"`，使大事记中的作品也能被正确点击阅读。

## 4. 验证步骤 (Verification)
- 运行 `npm run build:frontend`，确保不再出现 `baseUrl` 弃用警告和 `ChroniclesList.vue` 的编译错误。
- 确保构建成功结束，且没有引入新的类型错误。