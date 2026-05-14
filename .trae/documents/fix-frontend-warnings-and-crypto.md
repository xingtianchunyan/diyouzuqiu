# 修复前端开发环境警告与报错计划

## 1. 现状分析 (Current State Analysis)
根据终端输出的日志，目前前端开发环境（运行在 `http://192.168.0.101:5173`）存在以下四个主要问题：

1. **Vue Router 警告**: 大量提示 `[Vue Router warn]: The next() callback in navigation guards is deprecated. Return the value instead of calling next(value).`
   - **原因**: 在 `frontend/src/router/index.ts` 的全局前置守卫中，仍在使用 Vue Router 3 风格的 `next()` 回调函数，而 Vue Router 4 推荐使用 `return` 返回值的方式。
2. **i18n 警告**: `[intlify] Not found 'works.noWorks' key in 'zh' locale messages.`
   - **原因**: `WorksList.vue` 和 `WorksGridModule.vue` 中使用了国际化键名 `works.noWorks`，但 `frontend/src/i18n/index.ts` 的中文（`zh`）配置包中缺失该键值的定义。
3. **API 请求失败 (AxiosError)**: `Failed to fetch user` 和 `Failed to fetch year data`。
   - **原因**: 前端配置的 `VITE_API_BASE_URL` 默认指向 `http://localhost:3000`（或者代理配置指向 3001），但在通过局域网 IP (`192.168.0.101`) 访问前端页面时，前端代码发起 API 请求的目标地址（可能是 localhost 或错误的 IP/端口）无法被正确连接或被浏览器拦截。
4. **Web Crypto API 报错**: `[Unhandled rejection] TypeError: undefined is not an object (evaluating 'crypto.subtle.digest')`。
   - **原因**: Web Crypto API (`crypto.subtle`) 是浏览器的高级安全 API（可能是被底层依赖如 Vite PWA 插件使用）。浏览器严格规定该 API **只能在安全上下文 (Secure Contexts，即 HTTPS 或 localhost)** 下运行。由于你是通过局域网 IP `http://192.168.0.101` (HTTP) 访问的，浏览器禁用了该 API 导致其为 `undefined`。
5. **组件属性透传警告**: `[Vue warn]: Extraneous non-props attributes (year) were passed to component...`
   - **原因**: 路由配置中为 `YearPage` 开启了 `props: true`，Vue Router 会将 url 中的 `:year` 作为 prop 传给组件，但 `YearPage.vue` 内部并没有使用 `defineProps` 显式声明接收 `year`，且该组件存在多个根节点，导致 Vue 不知道该把这个透传属性挂载到哪里。

## 2. 约束与决策 (Assumptions & Decisions)
- **路由改造**: 将 `router/index.ts` 中的 `next()` 替换为现代的 `return` 写法。
- **i18n 补全**: 在 `i18n/index.ts` 的 `zh` 配置中补全 `works.noWorks`。
- **Props 声明**: 在 `YearPage.vue` 中显式声明 `year` prop，消除透传警告。
- **HTTPS 支持**: 为了彻底解决局域网访问时的 `crypto.subtle` 报错以及潜在的 API 跨域/安全策略拦截，我们需要为 Vite 开发服务器配置基本的 HTTPS 支持（使用 `@vitejs/plugin-basic-ssl`）。

## 3. 提议的修改步骤 (Proposed Changes)

1. **修改 Vue Router 守卫** (`frontend/src/router/index.ts`)
   - 移除所有的 `next` 参数和 `next()` 调用。
   - 将 `next({ name: 'login' })` 改为 `return { name: 'login' }`。
   - 将 `next({ name: 'home' })` 改为 `return { name: 'home' }`。
   - 在守卫末尾默认返回 `true`（允许通行）。
2. **修复 YearPage 的 Props 警告** (`frontend/src/views/YearPage.vue`)
   - 在 `<script setup>` 顶部添加 `const props = defineProps<{ year: string | number }>()`，显式接收路由传递的属性。
3. **补全 i18n 缺失键值** (`frontend/src/i18n/index.ts`)
   - 在 `zh` -> `works` 对象下添加：`noWorks: '没有找到符合条件的作品'`。
4. **配置 Vite 局域网 HTTPS** (`frontend/package.json` & `frontend/vite.config.ts`)
   - 运行命令安装插件：`npm install @vitejs/plugin-basic-ssl -D -w frontend`。
   - 在 `vite.config.ts` 中引入并注册该插件，以在 `--host` 模式下自动生成局域网可用的 SSL 证书。
   - *（注：这可以解决你在手机或另一台电脑上通过局域网 IP 预览时发生的 crypto 报错）*

## 4. 验证步骤 (Verification)
- 重新运行 `npm run dev:frontend -- --host 0.0.0.0`。
- 在浏览器中通过 `https://localhost:5173` 或 `https://192.168.0.101:5173` 访问。
- 观察终端日志，确认 `Vue Router warn`、`intlify warn`、`Extraneous non-props attributes` 以及 `crypto.subtle.digest` 错误全部消失。