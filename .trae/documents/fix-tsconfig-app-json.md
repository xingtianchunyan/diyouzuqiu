# 修复 tsconfig.app.json 报错计划

## 1. 现状分析 (Current State Analysis)
- **错误现象**: `frontend/tsconfig.app.json` 的第 1 行报出多个 TypeScript 错误，提示找不到多个 `.vue` 文件（例如 `ChroniclesList.vue`, `MatchesList.vue`, `MediaGallery.vue`, `MediaLightbox.vue`, `WorkModal.vue`, `WorksList.vue`）。
- **问题根源**: 这些被删除或重命名的 `.vue` 文件的路径仍然残留在 TypeScript 的构建缓存文件 (`tsBuildInfoFile`) 中。当 VS Code / Trae 语言服务器读取 `tsconfig.app.json` 时，会试图根据旧缓存加载这些实际上已经不存在的文件，从而在 `tsconfig.app.json` 顶部抛出“找不到文件”的异常。
- **影响范围**: 仅影响开发阶段的 TypeScript 报错提示，不影响实际的运行环境（因为实际文件已被移除）。

## 2. 约束与决策 (Assumptions & Decisions)
- TypeScript 编译器缓存导致的幽灵报错。通过清理旧的构建缓存（`node_modules/.tmp/tsconfig.app.tsbuildinfo` 等）即可让 TS Server 重新扫描真实存在的文件。

## 3. 提议的修改步骤 (Proposed Changes)
1. **删除旧的 TS 构建缓存** (命令)
   - 目标路径为 `frontend/node_modules/.tmp` 目录。
   - 使用 PowerShell 命令 `Remove-Item -Recurse -Force "node_modules/.tmp" -ErrorAction SilentlyContinue` 清理整个临时缓存目录。
2. **重启/刷新 TypeScript 服务**
   - 缓存被删除后，编辑器会自动重新索引项目文件。

## 4. 验证步骤 (Verification)
- 检查 `frontend/tsconfig.app.json` 是否还有报错。
- 如果语言服务器没有立刻更新，我会提示用户手动重启一次 TS Server（在命令面板执行 `TypeScript: Restart TS server`）。