# Fix Frontend IDE Diagnostics Spec

## Why
在前面的构建问题修复过程中，虽然 `npm run build` 和 `vue-tsc` 在终端中均能顺利通过并输出 0 错误，但是由于 VSCode 等 IDE 的 TypeScript 语言服务器 (Volar TS Server) 的缓存和路径匹配机制问题，导致用户在打开 `ChroniclesList.vue` 和 `YearPage.vue` 时依然能看到红色的 TS 类型错误提示。具体表现为提示无法在 `tsconfig.app.json` 的项目文件列表中找到已被引用的 `WorksGridModule.vue` 和 `WorkReader.vue`，甚至还会报出找不到已被删除的 `WorkModal.vue` 等文件。这会极大影响开发体验，需要从配置层面彻底清除这些“幽灵报错”。

## What Changes
- 修改 `frontend/tsconfig.app.json` 中的 `include` 模式。
- 将 `include` 中的全局匹配模式从 `src/**/*.vue` 修改为基于当前目录的显式相对路径 `./src/**/*.vue`，以兼容 Volar 和 TS Server 的路径匹配规范。

## Impact
- Affected specs: Frontend IDE Developer Experience (TypeScript Diagnostics).
- Affected code: `frontend/tsconfig.app.json`.

## ADDED Requirements
### Requirement: TS Server Configuration Compatibility
The system SHALL configure `tsconfig.app.json` so that the Vue language server can accurately resolve `.vue` components located in nested `src/` directories without producing false positive "not in project file list" errors.

#### Scenario: Success case
- **WHEN** user opens `YearPage.vue` or `ChroniclesList.vue` in the IDE
- **THEN** the IDE's TS Server successfully resolves `WorksGridModule.vue` and `WorkReader.vue` and shows 0 diagnostic errors.
