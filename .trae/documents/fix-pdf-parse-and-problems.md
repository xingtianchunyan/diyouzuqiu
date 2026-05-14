# 修复依赖版本及 TypeScript 报错的计划

## 1. 现状分析 (Current State Analysis)
- **`pdf-parse` 依赖问题**：`backend/package.json` 目前使用的是 `^2.4.5`，该版本在 ESM 环境下存在导出兼容性问题以及读取文件 BUG。
- **`#problems:parse.routes.ts`**：由于使用了 `import * as pdfParseModule from 'pdf-parse-new'`，TypeScript 抛出 `TS2349` 错误（无法调用模块对象）。
- **`#problems:knowledge.routes.ts`**：IDE 报错提示 `category` 不在 `KnowledgeDocSelect` 等类型中。经过排查 `backend/prisma/schema.prisma`，`category` 字段**确实已经存在**。该报错属于 VSCode TS Server 缓存了旧版 Prisma Client 导致的“幽灵报错”。
- **`#problems:index.ts`**：全局扫描了前后端的所有 `index.ts` 文件（包括 `frontend/src/router/index.ts` 等），`tsc` 编译均通过且无实际报错。同样属于 IDE 缓存导致的滞后报错。

## 2. 拟定更改 (Proposed Changes)

1. **处理后端依赖 (`backend/package.json`)**
   - 锁定 `pdf-parse` 的版本为 `1.1.1`。
   - 引入 `pdf-parse-new` 作为替代解析方案。
   - 执行 `npm install` 以更新 `package-lock.json`。

2. **修复代码报错 (`backend/src/modules/parse/parse.routes.ts`)**
   - 修改模块的引入方式。因为 `pdf-parse-new` 默认导出是一个函数且缺乏 `.d.ts` 类型声明文件，采用 `// @ts-ignore` 搭配 `import pdfParse from 'pdf-parse-new'` 的形式来解决 TS2349 报错。

3. **修复 IDE 幽灵报错 (`knowledge.routes.ts` / `index.ts`)**
   - 在后端执行 `npx prisma generate` 强制刷新 Prisma Client 类型。
   - 这两个文件的报错为缓存引起，实际上代码已经正确无误。完成修复后，建议你在 IDE 中执行 `Ctrl+Shift+P` -> `TypeScript: Restart TS Server` 来清除缓存。

## 3. 预期效果 (Verification Steps)
- 后端 `package.json` 中 `pdf-parse` 锁定为 `1.1.1`。
- 执行 `npx tsc --noEmit` 时，`parse.routes.ts` 不再抛出任何类型错误，后端成功编译并启动。
- 幽灵报错在重启 TS Server 后自然消失。