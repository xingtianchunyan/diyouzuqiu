# 修复后端启动报错计划

## 1. 现状分析 (Current State Analysis)
- **错误现象**: 后端启动报错 `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'jsdom' imported from E:\AI编程\Diyouqiudui\SOLO web diyou\backend\src\modules\parse\parse.routes.ts`。
- **问题根源**: 检查 `backend/package.json` 发现，虽然在 `devDependencies` 中安装了 `@types/jsdom` 和 `@types/mozilla-readability`，但在 `dependencies` 中并没有真正安装 `jsdom` 和 `@mozilla/readability` 这两个运行时所需的依赖包。
- **影响范围**: `backend` 工作区。

## 2. 约束与决策 (Assumptions & Decisions)
- 直接通过 npm 命令在 `backend` 工作区安装缺失的生产依赖。
- 不修改现有的业务代码，仅补充依赖。

## 3. 提议的修改步骤 (Proposed Changes)
1. **安装缺失依赖** (命令)
   - 在项目根目录执行：`npm install jsdom @mozilla/readability -w backend`
   - 这会将这两个包添加到 `backend/package.json` 的 `dependencies` 中。
2. **验证启动** (命令)
   - 在根目录执行：`npm run dev:backend` （或在 backend 目录下执行 `npm run dev`），验证后端是否能成功启动且不再报错。

## 4. 验证步骤 (Verification)
- 确认 `backend/package.json` 中已包含 `jsdom` 和 `@mozilla/readability`。
- 确认运行 `npm run dev:backend` 后控制台输出正常的启动信息（如 fastify 监听端口），无 `ERR_MODULE_NOT_FOUND` 报错。