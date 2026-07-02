# 准备阶段计划：仓库同步、第一部分优化分析、平台模块可行性研究

## Summary

- 本次仅做准备与分析，不直接修改业务代码。
- 第一步先校验本地仓库与 GitHub 仓库 `main` 分支的真实差异，建立“后续所有分析都基于最新代码”的基线。
- 第二步对照 `项目优化记录.md` 第一部分的实际实施范围（按你的说明只包含第 1-9 节，第 10 节应转入第二部分）与当前仓库状态，输出一份“已具备 / 未落地 / 已偏离 / 不适用”的差异清单。
- 第三步评估是否应该为苹果、安卓、鸿蒙分别做独立模块，并给出更稳妥的分层方案，目标是减少第二部分那种跨问题相互干扰的风险。

## Current State Analysis

### 1. Git 基线现状

- 当前仓库远程地址已配置为 `https://github.com/xingtianchunyan/diyouzuqiu.git`。
- 本地当前分支为 `main`。
- 只读检查结果显示：
  - `git status --short --branch` 显示 `main...origin/main [ahead 1]`
  - 本地 `HEAD` 为 `e7afb55f2b033c728fc9f9c51e7e94388fbd6dff`
  - `git ls-remote origin refs/heads/main` 返回远端 `main` 为 `0bd7ce1dec9611b2d9b3f32019820bdcf54f3d33`
- 这说明本地 `origin/main` 跟踪信息很可能已过期，当前还不能断言本地就是远端最新状态；执行阶段必须先 `fetch` 再决定是否 `pull`。

### 2. 第一部分优化记录与当前代码的主要差异

- 按本次规划边界，第一部分只分析第 1-9 节。
- 原文中的第 10 节“修复鸿蒙系统文件选择器不显示图库问题”不再归入第一部分，而是作为第二部分移动端兼容链路中的一个子议题处理。

#### 已明显未落地或与记录不一致

- `docker-compose.yml`
  - 健康检查仍是 `http://localhost:3000/health`，未按记录改成 `127.0.0.1`。
- `docker-compose.windows.yml`
  - 健康检查同样仍使用 `localhost`。
- `web/Caddyfile`
  - 仍使用 `tls internal`，与记录中基于 Cloudflare Tunnel 的“关闭自动 HTTPS、内部走 HTTP”方案不一致。
  - API 与静态存储仍是直接 `reverse_proxy`，没有按记录使用 `handle` 分流以避免 SPA fallback 干扰。
- `web/Caddyfile.public`
  - 也未采用 `handle` 分流；同时没有第一份记录中强调的响应头与 Cloudflare Tunnel 场景说明。
- `backend/src/plugins/auth.plugin.ts`
  - JWT 过期时间仍是 `1h`，未体现记录中后续为移动端稳定性调整到更长周期的思路。
- `backend/src/modules/auth/auth.routes.ts`
  - Cookie `sameSite` 仍是 `strict`。
  - Cookie `maxAge` 仍是 `1 hour`。
- `frontend/src/stores/auth.ts`
  - `initialize()` 只在首次有效，后续路由跳转虽然调用，但因 `initialized` 已置位，不会重新做状态恢复。
  - 缺少前后台切换时的重新校验/刷新机制。
- `frontend/src/App.vue`
  - 没有监听 `visibilitychange`，无法在 PWA 恢复前台时主动自愈状态。
- `frontend/src/api/client.ts`
  - 401 拦截仍会对大多数请求直接 `logout()`，只排除了 `/auth/login` 与 `/auth/refresh`，没有进一步隔离高风险路径。
- `backend/src/modules/media/media.routes.ts`
  - `GET /media/:id/file` 仍未设置 `Cache-Control: no-store` 等头，iOS Safari 401 缓存风险仍在。
#### 当前仓库中未看到对应问题或已有天然规避

- `backend/src/app.ts`
  - 当前代码中没有看到会统一处理所有响应并破坏 stream 的全局 `onSend` 钩子，因此记录第 9 节对应的风险在当前仓库里不是首要问题。
- `docker-compose.yml` / `docker-compose.windows.yml`
  - 当前通过 `${ENV}` 引用 `.env` 中变量，而不是把值直接硬编码进 compose；这比记录中的“YAML 里直接写带引号值”更安全，但仍需要验证 `.env` 是否可能被手工填入带引号内容。

### 3. 平台相关现状

- 当前前端是单一 Vue 3 + Vite PWA Web 应用，没有任何原生桥接层、设备能力适配层、或平台检测抽象层。
- 当前仓库里没有发现 `userAgent` / `navigator.platform` / `platform service` 之类的运行时平台识别逻辑。
- 文件选择相关逻辑目前分散在多个页面和组件里：
  - `frontend/src/views/UploadPage.vue`
  - `frontend/src/views/PersonPage.vue`
  - `frontend/src/components/base/FileUploadZone.vue`
- 这意味着未来若针对苹果、安卓、鸿蒙做差异化处理，当前结构会造成“同一类兼容修复要散落多个入口”，非常容易再触发第二部分那种连锁影响。

## Proposed Changes

### 阶段 A：先同步并冻结分析基线

#### 目标

- 保证后续分析基于 GitHub 远端的最新代码，而不是基于过期的本地跟踪引用。

#### 执行内容

- 在仓库根目录执行只与同步相关的 Git 操作：
  - `git fetch origin main --prune`
  - 比较 `HEAD`、`origin/main`、`git log --oneline --decorate --graph -n 20`
  - 若本地领先且远端也前进，则先判断是否是真正分叉，再决定 `pull --rebase` 或合并
- 如果 `fetch` 后确认本地落后远端，则优先把仓库更新到远端最新提交，再开始后续代码与文档差异核对。

#### 关注文件

- 仓库根目录整体
- 可能受远端更新影响的全部文件，尤其是：
  - `docker-compose.yml`
  - `docker-compose.windows.yml`
  - `web/Caddyfile`
  - `web/Caddyfile.public`
  - `backend/src/plugins/auth.plugin.ts`
  - `backend/src/modules/auth/auth.routes.ts`
  - `backend/src/modules/media/media.routes.ts`
  - `frontend/src/stores/auth.ts`
  - `frontend/src/App.vue`
  - `frontend/src/router/index.ts`
  - `frontend/src/api/client.ts`
  - `frontend/src/views/UploadPage.vue`
  - `frontend/src/views/PersonPage.vue`

### 阶段 B：输出“第一部分优化差异矩阵”，范围明确限定为第 1-9 节

#### 目标

- 把 `项目优化记录.md` 第一部分第 1-9 节与当前代码逐条对照，形成后续真正实施时的优先级和影响面说明。
- 将原文第 10 节鸿蒙图库问题整体转移到第二部分分析，不在第一部分差异矩阵中统计。

#### 执行内容

- 按条目建立差异矩阵，字段至少包括：
  - 记录编号
  - 目标状态
  - 当前仓库状态
  - 影响文件
  - 是否建议纳入后续实施
  - 风险级别
  - 与第二部分问题的关联说明
- 重点拆成三类：
  - 基础部署/反向代理问题
  - 认证/会话生命周期问题
  - 媒体与缓存问题

#### 逐文件分析重点

- `docker-compose.yml`
  - 检查健康检查地址、环境变量传递方式、与当前部署文档的一致性。
- `docker-compose.windows.yml`
  - 核对 Windows 部署路径下是否继承了同样的健康检查与环境变量风险。
- `web/Caddyfile`
  - 识别当前默认部署到底是“本地自签 HTTPS”还是“Cloudflare Tunnel 模式”。
  - 判断是否需要把不同部署模式拆成更明确的文件或模板，避免配置语义混杂。
- `web/Caddyfile.public`
  - 检查是否能承载“公网 HTTPS”与“Tunnel 入口”两种场景，还是需要进一步分离职责。
- `backend/src/plugins/auth.plugin.ts`
  - 评估 token 生命周期对移动端恢复、跨页面导航和弱网场景的实际影响。
- `backend/src/modules/auth/auth.routes.ts`
  - 评估 `sameSite`、`maxAge` 与当前 Web/PWA 访问路径是否兼容。
- `frontend/src/stores/auth.ts`
  - 识别初始化逻辑、刷新逻辑、前后台切换逻辑目前的耦合关系。
- `frontend/src/App.vue`
  - 检查顶层生命周期是否承担了不该分散在页面路由里的会话恢复职责。
- `frontend/src/router/index.ts`
  - 判断现有路由守卫是在“真正恢复状态”还是“重复调用但无效”。
- `frontend/src/api/client.ts`
  - 梳理 401 拦截的副作用边界，避免“一处未授权触发全局退出”的级联问题。
- `backend/src/modules/media/media.routes.ts`
  - 检查媒体文件接口是否应该与认证接口、静态资源接口使用不同的缓存策略。

### 阶段 C：针对“第二部分连锁反应”的根因做隔离设计

#### 目标

- 不直接实现第二部分的所有修复，而是先把“为什么一处修改会波及别处”拆开。

#### 执行内容

- 把第二部分出现的现象倒推为 4 条独立关注线：
  - 部署入口与代理链
  - JWT / Cookie 生命周期
  - 前端状态恢复机制
  - 媒体缓存与受保护资源访问
- 为每条线单独定义验证方法，后续实现时禁止一次性跨多条线混改。

#### 建议的后续实施顺序

- 先修部署入口与代理链，再修认证参数，再修前端状态恢复，最后修媒体缓存。
- 每一步都要先验证单条链路闭环，再进入下一步，避免“修一个地方，其他地方一起改”的混合提交。

### 阶段 D：研究“苹果 / 安卓 / 鸿蒙模块化”的可行性，并优先采用适配层而不是原生分叉

#### 结论预设

- 在当前技术栈下，直接做三套“原生系统专属模块”并不现实，也不应作为短期方案。
- 可行且低风险的方向是：保留单一 Web/PWA 主体，引入“平台能力适配层”，按系统选择不同策略，而不是完全不同实现。

#### 原因

- 当前项目是纯 Web/PWA，没有 Capacitor、Cordova、React Native、Flutter、Taro、小程序容器或 Harmony 原生桥接。
- iOS / Android / Harmony 在当前项目里共享的运行时实际上是浏览器/WebView，而不是三个独立原生平台。
- 真要做原生模块，需要额外引入移动容器、原生桥、构建链、签名发布流程；这已经超出当前项目架构边界。
- HarmonyOS 对 Web 上传控件的兼容问题，更适合通过 Web 层策略和输入参数适配解决，而不是直接假定能接入“鸿蒙原生图库模块”。

#### 建议的未来文件设计

- 新增平台检测与策略目录：
  - `frontend/src/platform/detect.ts`
  - `frontend/src/platform/capabilities.ts`
  - `frontend/src/platform/file-picker-policy.ts`
  - `frontend/src/platform/auth-session-policy.ts`
  - `frontend/src/platform/media-cache-policy.ts`
- 这些文件不直接改业务 API，而是统一输出“当前平台该用什么策略”。

#### 建议的接入点

- `frontend/src/views/UploadPage.vue`
  - 不直接手写 `accept` 字符串，改为从平台策略层取值。
- `frontend/src/views/PersonPage.vue`
  - 头像上传也复用平台文件选择策略，避免单点漏改。
- `frontend/src/components/base/FileUploadZone.vue`
  - 统一收口 `accept`、扩展名校验、错误文案和后续平台兼容行为。
- `frontend/src/stores/auth.ts`
  - 会话恢复、前后台激活后的刷新节奏由平台策略层提供参数，不再散落在页面层。
- `frontend/src/api/client.ts`
  - 401 处理策略应允许按平台或场景区分“静默恢复 / 重试 / 强制退出”。

#### 不建议的方案

- 不建议立刻为 iOS / Android / Harmony 建三套页面或三套上传组件。
- 不建议在多个页面各自手写 UA 判断。
- 不建议把部署、认证、缓存、上传兼容性放进同一次改动。

### 阶段 E：为未来实施准备验证清单

#### 目标

- 后续真正进入实现阶段时，可以按子问题逐项验证，避免第二部分的连锁反应重演。

#### 建议验证项

- Git 基线验证
  - 本地 `HEAD` 是否等于更新后的 `origin/main`
  - 工作区是否干净
- 代理与部署验证
  - `docker compose` 启动后后端健康检查是否稳定通过
  - API POST 请求是否仍会被 SPA fallback 干扰
- 认证验证
  - 登录成功后 cookie 是否符合预期属性
  - 页面跳转、PWA 切后台再恢复时是否仍保持登录
  - 401 是否只在真正失效时触发退出
- 媒体验证
  - 图片/视频在 iOS Safari 上是否还会出现缓存旧 401 的情况
- 平台适配验证
  - 苹果 / 安卓 / 鸿蒙分别是否命中正确的平台策略
  - 上传入口是否全部共用同一套文件选择策略

## Assumptions & Decisions

- 决定 1：本轮仅做准备和方案，不直接修改业务代码。
- 决定 2：原文第 10 节“鸿蒙系统文件选择器不显示图库问题”不再视为第一部分内容，而是并入第二部分移动端兼容与平台适配问题统一考虑。
- 决定 3：第二部分的所有问题视为第一部分完成后的链式副作用，因此本轮重点不是“继续补丁式修复”，而是先把问题边界拆开。
- 决定 4：当前项目短期内不走“三套原生模块”路线，优先采用“单一 Web 主体 + 平台策略适配层”。
- 假设 1：GitHub 仓库 `main` 分支是后续工作的唯一同步基线。
- 假设 2：后续执行阶段允许先做一次仓库同步，再基于同步后的真实代码更新差异矩阵。
- 假设 3：若远端最新代码已经部分修复上述问题，则以后续同步结果为准，更新本计划里的差异项。

## Verification Steps

1. 执行 `git fetch origin main --prune`，确认本地与远端真实关系。
2. 若需要，同步到远端最新代码，并重新读取以下文件确认最新现状：
   - `docker-compose.yml`
   - `docker-compose.windows.yml`
   - `web/Caddyfile`
   - `web/Caddyfile.public`
   - `backend/src/plugins/auth.plugin.ts`
   - `backend/src/modules/auth/auth.routes.ts`
   - `backend/src/modules/media/media.routes.ts`
   - `frontend/src/stores/auth.ts`
   - `frontend/src/App.vue`
   - `frontend/src/router/index.ts`
   - `frontend/src/api/client.ts`
   - `frontend/src/views/UploadPage.vue`
   - `frontend/src/views/PersonPage.vue`
   - `frontend/src/components/base/FileUploadZone.vue`
3. 基于同步后的代码生成“第一部分 1-9 节差异矩阵”，并标记优先级与影响面。
4. 单独整理“第二部分起点议题”，其中明确包含原文第 10 节鸿蒙文件选择器问题，以及它与后续苹果 / 安卓 / 鸿蒙相互干扰风险的关系。
5. 输出平台模块可行性结论，明确采用“平台策略层”而非“三套原生模块”作为推荐方向。
6. 等待你确认后，再进入真正执行阶段。
