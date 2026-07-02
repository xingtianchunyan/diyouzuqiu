# 准备阶段执行报告：仓库同步、第一部分差异矩阵、第二部分起点分析

## 1. 仓库同步结果

### 1.1 GitHub 基线确认

- 远端仓库：`https://github.com/xingtianchunyan/diyouzuqiu.git`
- 当前本地分支：`main`
- 本地 `HEAD`：`e7afb55f2b033c728fc9f9c51e7e94388fbd6dff`
- 远端 `origin/main`：`0bd7ce1dec9611b2d9b3f32019820bdcf54f3d33`

### 1.2 同步检查结论

- 已执行 `git fetch origin main --prune`
- 检查结果表明：`origin/main` 是当前本地 `HEAD` 的祖先提交
- 也就是说，本地代码已经包含 GitHub 远端 `main` 的最新内容
- 当前不需要执行 `git pull`
- 本地额外领先 1 个提交：`docs: add Windows Docker Desktop deployment guide`

### 1.3 当前工作区说明

- 工作区存在一个未跟踪文档文件：`.trae/documents/prep-sync-optimization-platform-plan.md`
- 这是本次准备阶段新增的计划文件，不影响代码基线判断

## 2. 第一部分实际范围校正

- 按当前确认后的边界，第一部分只分析原始记录中的第 `1-9` 节
- 原始记录中的第 `10` 节“修复鸿蒙系统文件选择器不显示图库问题”不再纳入第一部分
- 第 `10` 节转入第二部分，作为移动端兼容问题的起点议题处理

## 3. 第一部分第 1-9 节差异矩阵

| 编号 | 事项 | 当前状态 | 涉及文件 | 优先级 | 判断 |
|------|------|----------|----------|--------|------|
| 1 | GHCR 镜像推送 403 权限问题 | 仓库层面基本已规避 | `.github/workflows/docker.yml` | 低 | GitHub Actions 已声明 `packages: write`，属于运维权限问题，不是当前源码主风险 |
| 2 | 健康检查 `localhost -> 127.0.0.1` | 未落实 | `docker-compose.yml`、`docker-compose.windows.yml` | 高 | 两份 Compose 仍使用 `http://localhost:3000/health` |
| 3 | Cloudflared 隧道凭证与命令 | 当前仓库未体现该部署模式 | 仓库内未发现 `cloudflared` 相关配置 | 中 | 说明当前仓库没有把 Tunnel 方案纳入正式配置资产 |
| 4 | Caddy 自动 HTTPS 重定向循环 | 未按 Tunnel 模式落实 | `web/Caddyfile`、`web/Caddyfile.public` | 高 | 默认仍是本地 `tls internal` 或最小公网配置，不是 Cloudflare Tunnel 专用配置 |
| 5 | `CORS_ORIGIN` / `ADMIN_EMAIL` 双引号问题 | 仓库层面部分规避 | `docker-compose.yml`、`docker-compose.windows.yml` | 中 | 现为 `${ENV}` 引用，已比硬编码安全，但 `.env` 人工填值仍可能带引号 |
| 6 | 数据库邮箱包含引号 | 代码仓库无法直接确认 | 运行时数据库 | 中 | 这是数据污染问题，不是源码问题，需要单独数据检查 |
| 7 | Caddy `reverse_proxy` 被 `try_files` 干扰 | 仍有风险 | `web/Caddyfile`、`web/Caddyfile.public` | 高 | 当前未使用 `handle` 明确分流，仍可能被 SPA fallback 干扰 |
| 8 | `sameSite: strict -> lax` | 未落实 | `backend/src/modules/auth/auth.routes.ts` | 高 | Cookie 仍是 `strict`，与移动端/跨页面恢复不够兼容 |
| 9 | `onSend` 干扰 stream 响应 | 当前仓库中未发现该问题 | `backend/src/app.ts` | 低 | 当前没有统一破坏流响应的 `onSend` 钩子，因此此项不构成当前主风险 |

## 4. 第一部分逐项分析

### 4.1 第 1 节：GHCR 权限问题

- 当前仓库已包含 Docker 镜像构建与推送工作流
- `.github/workflows/docker.yml` 中明确配置了：
  - `permissions.contents: read`
  - `permissions.packages: write`
  - `docker/login-action@v3` 使用 `GITHUB_TOKEN` 登录 `ghcr.io`
- 结论：
  - 如果未来仍出现 `403`，更可能是 GitHub 仓库权限、包可见性或组织权限配置问题
  - 不是当前代码仓库中的主要阻塞项

### 4.2 第 2 节：后端健康检查

- `docker-compose.yml` 与 `docker-compose.windows.yml` 都仍使用：
  - `http://localhost:3000/health`
- 如果后续仍沿用容器内 `wget` 健康检查，这一项建议优先修正
- 这是第一部分里最明确、最低歧义的配置问题之一

### 4.3 第 3 节：Cloudflared 隧道配置

- 当前仓库中没有找到：
  - `cloudflared-config.yml`
  - `cloudflared-creds.json`
  - `cloudflared` 相关 compose 服务
- 这说明：
  - 原始记录中的 Tunnel 架构没有被收口进当前代码仓库
  - 目前仓库主线部署模型更偏向“Caddy 自己终止 HTTPS / 或本地 HTTPS”
- 结论：
  - 若后续确实以 Cloudflare Tunnel 为正式部署方式，需要补齐独立配置文件、启动方式和文档

### 4.4 第 4 节：Caddy 自动 HTTPS 与重定向循环

- `web/Caddyfile` 当前仍包含 `tls internal`
- `web/Caddyfile.public` 是一个极简公网代理配置，但没有显式 `auto_https off`
- 这说明当前仓库并没有真正把“Tunnel 场景”与“本地 HTTPS 场景”分开
- 风险在于：
  - 一旦部署模式切换，Caddy 行为可能与文档预期不一致
  - 代理链问题会和后续登录态、缓存、PWA 恢复问题相互叠加

### 4.5 第 5 节：环境变量双引号污染

- 当前仓库的 Compose 文件均使用 `${VAR}` 形式，不再把值直接写进 YAML
- 这比原始问题中“直接写带引号值”更安全
- 但仍存在两个残余风险：
  - 如果用户把 `.env` 里的值手工写成带引号字符串，应用层仍可能读到污染值
  - 文档若未强调“不要手动加引号”，仍可能复现
- 结论：
  - 这项属于“仓库已部分规避，但文档与运行时校验仍可加强”

### 4.6 第 6 节：数据库邮箱污染

- 这一项无法仅靠代码仓库判断
- 因为仓库中不包含运行中的 SQLite 数据库内容
- 它本质上是数据修复任务，不是代码修复任务
- 结论：
  - 后续如果要进入实操，需要增加一条“数据巡检 / 数据修复”子任务

### 4.7 第 7 节：API 被 `try_files` 干扰

- `web/Caddyfile` 和 `web/Caddyfile.public` 当前都采用：
  - `reverse_proxy /api/* ...`
  - `try_files {path} /index.html`
  - `file_server`
- 当前没有使用 `handle /api/*`、`handle /static-storage/*`、`handle { ... }` 这种更清晰的分流方式
- 这意味着：
  - API、静态文件、SPA fallback 仍未显式隔离
  - 后续如果部署场景变化，405 / fallback 干扰问题仍可能重现
- 结论：
  - 这是第一部分中优先级最高的问题之一

### 4.8 第 8 节：Cookie `sameSite`

- 当前 `backend/src/modules/auth/auth.routes.ts` 中仍是：
  - `sameSite: 'strict'`
  - `TOKEN_MAX_AGE_MS = 60 * 60 * 1000`
- 这说明：
  - 第一部分中关于 Cookie 兼容性的基础调整未落地
  - 它会直接放大第二部分中的移动端登录态问题
- 结论：
  - 这是第一部分与第二部分之间最关键的桥接问题

### 4.9 第 9 节：`onSend` 干扰文件流

- 当前 `backend/src/app.ts` 没有发现全局 `onSend` 钩子去处理所有响应
- 因此原始记录中的这个问题，在当前仓库里不是主要风险
- 结论：
  - 此项可在差异矩阵中标记为“当前不适用 / 已天然规避”

## 5. 第一部分总体结论

### 5.1 当前判断

- 第一部分第 `1-9` 节中：
  - 已基本规避或不再是主问题：`1`、`5`、`9`
  - 无法仅靠仓库确认，需要运行时数据检查：`6`
  - 当前仍明确未落实或高风险：`2`、`4`、`7`、`8`
  - 当前仓库未收口该部署方案：`3`

### 5.2 建议排序

- P0
  - 第 `2` 节：健康检查地址
  - 第 `7` 节：Caddy `handle` 分流
  - 第 `8` 节：Cookie `sameSite` 基础兼容修正
- P1
  - 第 `4` 节：梳理 Caddy 部署模式，明确区分 Tunnel 与本地 HTTPS
  - 第 `3` 节：若继续用 Tunnel，则把配置正式纳入仓库
- P2
  - 第 `5` 节：完善 `.env` 文档与校验
  - 第 `6` 节：增加数据巡检

## 6. 第二部分起点议题：从第 10 节开始

### 6.1 第 10 节为什么应并入第二部分

- 第 `10` 节是典型的移动端平台兼容问题，不是基础部署问题
- 它直接涉及：
  - 手机系统差异
  - 文件选择器能力差异
  - 上传入口组件设计
  - 与后续登录态、页面恢复、缓存问题的相互影响
- 因此把它放在第二部分统一考虑更合理

### 6.2 当前第 10 节相关现状

- `frontend/src/views/UploadPage.vue`
  - 媒体上传、纪事附件仍使用 `accept="image/*,video/*"`
- `frontend/src/views/PersonPage.vue`
  - 头像上传仍使用 `accept="image/*"`
- `frontend/src/components/base/FileUploadZone.vue`
  - 已存在通用上传组件，但当前主上传链路并未完全统一到这个组件
- 结论：
  - 第 `10` 节问题当前仍然存在
  - 且它不是一个“改一处字符串就完事”的问题，而是一个上传适配层缺失的问题

## 7. 平台模块化可行性分析

### 7.1 是否适合直接做苹果 / 安卓 / 鸿蒙三套模块

- 当前不适合
- 原因：
  - 当前项目是 Vue 3 + Vite PWA，运行时本质上是 Web 应用
  - 仓库中没有 Capacitor、Cordova、React Native、Flutter、Harmony 原生桥接层
  - 也没有任何原生模块接口或平台能力抽象
- 结论：
  - 直接开发三套“系统专属模块”会把当前项目从 Web/PWA 推向原生多端工程，复杂度过高

### 7.2 更合适的路线：平台策略层

- 推荐方案不是“三套模块”
- 推荐方案是：
  - 单一 Web/PWA 主体
  - 统一平台检测
  - 针对不同系统切换不同策略

### 7.3 建议新增的适配层结构

- `frontend/src/platform/detect.ts`
  - 统一识别 iOS / Android / Harmony / PWA / WebView 等环境
- `frontend/src/platform/capabilities.ts`
  - 输出平台能力，如文件选择、拖拽、前后台恢复、缓存策略支持度
- `frontend/src/platform/file-picker-policy.ts`
  - 统一管理不同系统对应的 `accept`、可选 MIME 列表、文件选择策略
- `frontend/src/platform/auth-session-policy.ts`
  - 统一管理不同终端上的会话恢复与重新校验策略
- `frontend/src/platform/media-cache-policy.ts`
  - 统一管理媒体资源缓存与受保护资源的访问策略

## 8. 为什么第二部分会出现连锁反应

当前第二部分问题并不是单点故障，而是几条链路叠加：

- 链路 A：部署与代理链
  - Caddy 配置边界不清，会影响 API 路由、静态资源和 HTTPS 行为
- 链路 B：认证生命周期
  - JWT 与 Cookie 过短或过严，会放大移动端恢复失败
- 链路 C：前端状态恢复
  - 认证恢复逻辑分散，`App.vue`、路由守卫、401 拦截之间没有统一状态机
- 链路 D：媒体访问与缓存
  - 媒体是受保护资源，若缓存策略不当，会在 iOS 等平台被放大
- 链路 E：文件选择器兼容
  - 不同系统对 `accept` 的解释不同，且当前没有统一上传适配层

## 9. 最终建议

### 9.1 第一批真正实施时，建议顺序

1. 先完成第一部分第 `2`、`7`、`8` 节
2. 再补第一部分第 `4` 节，明确部署模型
3. 再进入第二部分，先做第 `10` 节对应的上传适配层，而不是先改字符串
4. 最后再处理会话恢复、401 策略、媒体缓存

### 9.2 不建议的做法

- 不建议把第 `10` 节仍然当成第一部分里的一个小补丁
- 不建议一开始就做苹果 / 安卓 / 鸿蒙三套独立上传组件
- 不建议在多个页面各自写平台判断
- 不建议把部署修复、认证修复、文件上传兼容、缓存问题放在一个提交里同时处理

## 10. 本次准备阶段结论

- 任务 1 已完成：已确认当前本地仓库包含 GitHub 远端最新 `main`，无需拉取
- 任务 2 已完成：已按“第一部分只含第 `1-9` 节”的边界输出当前状态分析
- 任务 3 已完成：已确认当前阶段不适合开发三套系统专属模块，推荐改为“平台策略层”

后续如果进入实施阶段，应先从第一部分的高优问题开始，而不是直接动第二部分的连锁问题。
