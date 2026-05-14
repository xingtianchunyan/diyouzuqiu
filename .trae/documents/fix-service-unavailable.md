# 解决“服务不可用”问题计划

## 1. 现状分析 (Current State Analysis)
- **本地服务状态**: 我通过系统终端在本地执行了 `curl` 测试，发现无论是 `https://127.0.0.1:5173/` 还是 `https://192.168.0.101:5173/`，前端 HTML 页面都能正常返回；同时 API 代理 (`/api/v1/works`) 也成功连接到了后端的 `3001` 端口。这说明**代码和服务器本身都在正常运行，没有任何崩溃**。
- **“服务不可用”的根本原因**:
  1. **PWA Service Worker 缓存冲突 (最可能)**: 在上一步中，为了解决 Web Crypto API 的安全限制，我们给开发服务器开启了 HTTPS (`basicSsl`)。如果你之前在浏览器里用 `http` 访问过该地址，浏览器里残留的旧版 PWA Service Worker 会拦截你的请求，但它无法处理现在强制的 HTTPS 连接，从而导致 Workbox 抛出类似“服务不可用 (Service Unavailable)”的脱机错误。
  2. **HTTPS 证书拦截**: 自签名证书可能会被手机浏览器或微信内置浏览器直接拦截，不给“继续访问”的选项，直接显示服务不可用。
  3. **IPv6 代理解析问题**: Node.js 在部分系统中会将 `localhost` 解析为 IPv6 (`::1`)，这可能导致 Vite 的 proxy 偶尔无法连接到监听在 IPv4 (`0.0.0.0`) 的后端，从而返回 503 Service Unavailable。

## 2. 约束与决策 (Assumptions & Decisions)
- 为了彻底排除配置隐患，我将主动修改 `vite.config.ts`：将 proxy 中的 `localhost` 替换为确切的 IPv4 地址 `127.0.0.1`，并显式写入 `host: '0.0.0.0'`，确保服务始终绑定在局域网 IP 上。
- 代码修改完成后，需要用户配合清理浏览器缓存或使用无痕模式进行访问验证。

## 3. 提议的修改步骤 (Proposed Changes)
1. **优化 Vite 配置** (`frontend/vite.config.ts`):
   - 在 `server` 配置块中显式添加 `host: '0.0.0.0'`。
   - 将 `proxy` 中 `/api` 和 `/static-storage` 的 `target` 从 `http://localhost:3001` 改为 `http://127.0.0.1:3001`。

## 4. 验证步骤 (Verification)
- 代码修改完成后，我会提供具体的**浏览器清理步骤**给用户：
  - **电脑端**: 使用**无痕/隐私模式 (Incognito)** 重新访问 `https://192.168.0.101:5173/`。如果出现“您的连接不是私密连接”，点击“高级” -> “继续访问”。
  - **手机端**: 同样建议使用浏览器的无痕模式，或者清理该站点的历史数据，且必须确保输入的是 `https://` 开头。