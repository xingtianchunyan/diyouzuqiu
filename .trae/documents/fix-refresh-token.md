# 修复刷新令牌问题的实施计划

## 1. 现状分析
当前在访问页面（如 `MediaPage.vue`）时会偶发 `No refresh token available` 错误，或者在长时间停留后请求报错 401。
经过代码排查，原因如下：
1. **后端实现差异**：后端的 `/auth/login` 接口仅返回 `{ token, user }`，并不返回 `refreshToken`。而后端 `/auth/refresh` 接口的逻辑是：只要当前的 `token` 尚未过期（通过了 `app.authenticate` 鉴权），就可以用它换取一个新的 `token`。
2. **前端逻辑错误**：前端 `stores/auth.ts` 中错误地期望后端返回 `refreshToken`，并在执行刷新时抛出了 `No refresh token available` 异常。此外，原有的 Axios 响应拦截器在收到 401 错误（Token 已过期）后才去尝试刷新，但由于后端刷新接口同样需要未过期的 Token，这会导致刷新必然失败。

## 2. 解决方案
在**不修改后端代码**的前提下，前端需要改为**主动刷新机制（Proactive Refresh）**：
- 前端拦截每一次请求，解析当前 JWT Token 的过期时间（`exp`）。
- 如果发现 Token 即将过期（例如剩余有效期不足 5 分钟），则在发送当前请求前，先拦截并挂起该请求，调用 `/auth/refresh` 获取新 Token。
- 获取成功后，更新本地 Token，再继续发送原请求。
- 如果请求返回了 401，说明 Token 已经彻底过期且无法挽救，此时直接执行登出并重定向到登录页。

## 3. 具体修改步骤

### 步骤 1：修改 `frontend/src/stores/auth.ts`
- **移除冗余的 Refresh Token 逻辑**：删除 `refreshTokenStr` 的声明以及对 `localStorage.getItem('refreshToken')` 的相关操作。
- **更新 `setTokens` 和 `logout`**：仅处理 `accessToken`，不再处理 `refreshToken`。
- **重写 `refreshToken` 方法**：
  - 移除对 `refreshTokenStr.value` 的判空校验。
  - 将请求改为 `apiClient.post('/auth/refresh', {})`。
  - 获取 `response.data.token`（而非 `accessToken`）并更新到本地状态。

### 步骤 2：修改 `frontend/src/api/client.ts`
- **引入 JWT 解析工具函数**：编写 `parseJwt` 函数，通过 `atob` 和 `decodeURIComponent` 安全地解析 JWT Payload 获取 `exp`。
- **重写请求拦截器（Request Interceptor）**：
  - 增加并发锁（`isRefreshing` 和 `refreshPromise`），防止多个请求同时触发刷新。
  - 在非登录和非刷新接口的请求前，解析 Token。如果 `exp * 1000 - Date.now() < 5 * 60 * 1000`（不足 5 分钟），则触发 `authStore.refreshToken()`。
  - 等待刷新完成后，将新的 Token 附加到 `config.headers.Authorization` 中。
- **重写响应拦截器（Response Interceptor）**：
  - 移除原有的 401 拦截刷新逻辑。
  - 当捕获到 401 错误时，直接调用 `authStore.logout()` 并重定向到 `/login`（如果当前不在登录页）。

## 4. 验证方式
1. 实施计划后，重启前端项目。
2. 观察控制台和网络请求，确认原先的 `No refresh token available` 报错已经消失。
3. 可手动在浏览器 localStorage 中篡改 token 的 payload 过期时间（或者将预判刷新时间调大），验证在发起请求前是否会自动调用 `/auth/refresh` 接口且成功续期。