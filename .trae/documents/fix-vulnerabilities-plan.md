# 修复依赖高危漏洞计划

## 1. 现状分析 (Current State Analysis)
- **项目结构**: Monorepo 结构，根目录统一管理 `package-lock.json`，子包 `frontend` 和 `backend` 仅有 `package.json`。
- **漏洞来源**: `npm audit` 报出的 4 个高危漏洞全部源于 `serialize-javascript` 的旧版本（<=7.0.4）。引入路径为：`frontend` 的 `vite-plugin-pwa` -> `workbox-build` -> `@rollup/plugin-terser` -> `serialize-javascript`。
- **核心问题**: 根目录的 `package.json` 中虽然已经配置了 `overrides` 和 `resolutions` 试图强制将 `serialize-javascript` 升级到 `^7.0.5`，但 **`package-lock.json` 并没有成功同步该修改**（目前 lock 树中仍锁定在 `6.0.2` 版本）。因此 `npm audit` 依然报错，且 npm 提示版本不一致 (invalid)。

## 2. 约束与决策 (Assumptions & Decisions)
- **绝不删除 `package-lock.json`**: 正如你所担心的，直接删除根目录的 lock 文件会导致整个 Monorepo（前后端所有依赖）版本大规模更新，存在极高的导致项目运行崩溃的风险。
- **使用增量更新策略**: 我们将利用 npm 原生的 `overrides` 机制和 `npm install` 命令，仅针对 `serialize-javascript` 进行“外科手术式”的精准更新，保证其他无关依赖的 lock 状态丝毫不受影响。

## 3. 提议的修改步骤 (Proposed Changes)
1. **精简 `package.json` 的 overrides 配置** (文件: `/package.json`)
   - 现有的 `overrides` 配置过于复杂（包含了深层嵌套层级），有时会导致 npm 解析异常。
   - 将其精简并保留顶层的强制覆盖：`"serialize-javascript": "^7.0.5"`，移除冗余嵌套配置，确保 npm 能够全局正确应用。
2. **重新生成目标包的 lock 树** (命令)
   - 清除当前 `node_modules` 下报错的旧缓存（如果有必要），然后在根目录运行 `npm install`。
   - 这一步会触发 npm 读取 `package.json` 中的 `overrides` 规则，自动将 `package-lock.json` 中关于 `serialize-javascript` 的版本变更为无漏洞的 `7.0.5` 版本，**不会修改其他无关依赖**。
3. **验证修复** (命令)
   - 运行 `npm ls serialize-javascript`，确认版本已提升至 7.0.5+。
   - 运行 `npm audit`，确认高危漏洞（High severity）清零。

## 4. 验证步骤 (Verification)
- 检查 `package-lock.json` 的 Git diff，确认仅仅是 `@rollup/plugin-terser` 和 `serialize-javascript` 相关节点的更新。
- 确保 `npm audit` 输出显示 0 vulnerabilities。
- 运行 `npm run build:frontend`，确保打包流程正常工作，没有因该小版本升级引发构建问题。