# 移动端多系统适配计划

> 范围：现有 `Vue 3 + Vite PWA` 架构，不引入原生 App / Capacitor / Cordova / 鸿蒙原生模块。
> 目标：让 `iPhone`、`Android`、`HarmonyOS` 三端在浏览器态与 PWA 安装态下均可生产可用。

## 1. 目标与边界

### 1.1 目标

- 定义三端（iPhone / Android / HarmonyOS）生产可用的验收口径。
- 建立统一的平台能力层 `frontend/src/platform/`，把系统差异集中到策略层。
- 统一所有上传入口，避免在页面中散落写 `accept` 字符串。
- 为未来的文件选择器兼容改动（内部称“第 10 步”）预留灰度开关与回滚点。
- 补齐认证恢复与媒体缓存的保护带，但仅作为适配配套，不作为当前未发生故障的修复。

### 1.2 边界

| 包含 | 不包含 |
|-----|-------|
| 浏览器内访问与 PWA 安装态 | 原生 App、小程序、快应用 |
| iPhone Safari + 添加到主屏幕 | iOS 原生分享扩展 |
| Android Chrome + Chrome PWA | 各厂商自带浏览器深度定制 |
| HarmonyOS 系统浏览器 + 桌面快捷方式 | 鸿蒙原生 Ability |
| 文件选择器、会话恢复、媒体缓存策略 | 服务端鉴权与存储架构大改 |

### 1.3 支持矩阵

| 系统 | 浏览器态 | PWA / 桌面快捷方式 | 最低目标 |
|-----|---------|-------------------|---------|
| iPhone | Safari 最新 2 个大版本 | 添加到主屏幕后打开 | 登录、上传、预览、后台恢复 |
| Android | Chrome 最新 2 个大版本 | Chrome PWA 安装态 | 登录、上传、预览、后台恢复 |
| HarmonyOS | 系统浏览器（WebView 内核） | 桌面快捷方式 | 登录、上传、预览、后台恢复 |

## 2. 核心原则

1. **能力分层，不做页面分叉**
   - 业务页面保持一套实现。
   - 系统差异通过 `frontend/src/platform/` 下的策略函数表达。
2. **渐进增强，不降级体验**
   - 桌面端保留拖拽上传等完整能力。
   - 移动端在能力受限时给出明确提示，而不是静默失败。
3. **统一上传入口**
   - 所有文件选择行为走 `FileUploadZone` + `file-picker-policy.ts`。
   - 不再在页面内部直接维护裸 `<input type="file">`。
4. **先验证，后上线**
   - 任何策略变更必须先在开发环境、测试环境跑过三端真机矩阵，再灰度到生产。

## 3. 平台能力层

新增目录：`frontend/src/platform/`

### 3.1 文件职责

| 文件 | 职责 |
|-----|------|
| `detect.ts` | 运行环境检测：`isIOS`、`isAndroid`、`isHarmonyOS`、`isStandalonePWA`、`isTouchDevice`、`isLikelyWebView` 等。 |
| `capabilities.ts` | 把系统判断映射为能力判断：是否建议拖拽上传、是否启用具体 MIME 列表、是否启用前后台恢复检查、是否对媒体资源禁用缓存等。 |
| `file-picker-policy.ts` | 统一定义上传场景的 accept 策略与校验规则：`media`、`chronicleAttachment`、`avatar`、`knowledgeDoc`。 |
| `session-policy.ts` | 前后台恢复、登录态自检、401 恢复策略。 |
| `runtime-state.ts` | 浏览器态 / 安装态、前后台切换、网络离线/重连等运行时状态。 |

### 3.2 HarmonyOS 检测说明

鸿蒙 UA 在不同版本与浏览器下可能与 Android 重叠，检测策略应为：

1. 优先匹配 `HarmonyOS` 关键字。
2. 对 HarmonyOS NEXT 及后续版本，结合 `navigator.userAgentData` 与特定 API 探测做兜底。
3. 不单独依赖 UA 字符串做业务分支，最终决策以 `capabilities.ts` 输出为准。

## 4. 统一上传入口（P0）

### 4.1 现状问题

- `UploadPage.vue` 中媒体上传与纪事附件上传直接维护裸 `<input type="file">`。
- `PersonPage.vue` 头像上传直接写 `accept="image/*"`。
- `FileUploadZone.vue` 仅按扩展名校验，未覆盖 MIME、移动端文件名异常等场景。

### 4.2 改造方案

1. 将 `UploadPage.vue` 的媒体上传与纪事附件上传收敛到 `FileUploadZone`。
2. 将 `PersonPage.vue` 头像上传接入同一组件。
3. 扩展 `FileUploadZone.vue`：
   - 支持 MIME 白名单校验。
   - 支持扩展名白名单校验。
   - 支持按平台策略兜底。
   - 错误提示按场景分流。
4. 在 `file-picker-policy.ts` 中定义场景化规则：

| 场景 | accept 策略 | 多选 | 大小限制 |
|-----|------------|-----|---------|
| `media` | 具体 MIME 列表 + 扩展名列表 | 是 | 后端限制 |
| `chronicleAttachment` | 图片/视频 MIME + 扩展名 | 否 | 后端限制 |
| `avatar` | `image/png, image/jpeg, image/webp` | 否 | 5 MB |
| `knowledgeDoc` | 按知识库需求定义 | 否 | 后端限制 |

### 4.3 关于 `image/*` 与 `video/*`

- 默认不单独使用宽泛的 `image/*` 或 `video/*` 作为唯一策略来源，以避免部分系统文件选择器行为不一致。
- 对 HarmonyOS 等存在兼容风险的系统，优先使用**具体 MIME 列表 + 明确扩展名列表**生成 `accept`。
- 规则统一从 `file-picker-policy.ts` 输出，不散落在页面中。

## 5. 会话恢复保护带（P2）

> 仅作为适配配套。当前基线未出现认证恢复故障时，不主动大规模重构。

### 5.1 触发条件

以下任一条件满足时启动：

- 上传改动上线后，收到后台恢复导致登录态丢失的真实反馈。
- 计划新增 PWA 安装态支持，需要处理唤醒后的会话自检。

### 5.2 改造点

1. `session-policy.ts` 定义：
   - 前后台切换是否触发会话自检。
   - PWA 恢复时是否静默刷新。
   - 401 是否直接登出，还是先尝试一次恢复。
2. `App.vue` 增加生命周期监听入口：
   - `visibilitychange`
   - `pageshow`
   - `online`
3. `auth.ts` 把 `initialize()` 重构为更清晰的状态机：
   - 初始冷启动恢复
   - 前台恢复检查
   - 失败后的无损降级
4. `client.ts` 把“401 直接退出”改成策略驱动：
   - 登录接口、刷新接口、普通资源接口、媒体资源接口分别处理。

## 6. 媒体缓存策略（P2）

### 6.1 目标

避免在 iOS / 鸿蒙等环境里，浏览器或 Service Worker 缓存了受保护媒体的异常响应（401/403），导致“看起来像上传或显示坏了”。

### 6.2 后端改造

在 `backend/src/modules/media/media.routes.ts` 的 `/media/:id/file` 路由上增加响应头：

```ts
reply
  .header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  .header('Pragma', 'no-cache')
  .sendFile(media.storagePath)
```

### 6.3 前端与 PWA 边界

- 静态 App Shell 可继续缓存。
- 用户受保护媒体不进入 Service Worker 长缓存。
- 与现有 `docs/pwa.md` 策略保持一致。

## 7. 灰度与回滚

### 7.1 开关设计

在平台层保留可配置开关，来源可以是：

- 环境变量 / 构建时常量
- 前端运行时配置对象

建议开关名：

- `useExplicitMobileMediaAcceptList`
- `enableHarmonyMediaPickerPolicy`

### 7.2 上线顺序

1. 开发环境本地验证。
2. 测试环境三端真机验证。
3. 生产环境仅管理员先用。
4. 观察日志与用户反馈。
5. 全量开放。

### 7.3 回滚方案

- 一键关闭新文件选择策略。
- 回退到旧上传入口实现。
- 保证服务端白名单与存储逻辑不变。

## 8. 验收标准

### 8.1 文档验收

- [ ] `docs/mobile-compatibility-plan.md` 已创建并通过评审。
- [ ] `docs/mobile-compatibility-test-matrix.md` 已创建并通过评审。

### 8.2 代码验收

- [ ] `frontend/src/platform/` 目录已建立，所有平台判断统一从这里输出。
- [ ] `UploadPage.vue` 与 `PersonPage.vue` 不再散落写 `accept`。
- [ ] `FileUploadZone.vue` 支持 MIME + 扩展名双校验。
- [ ] 文件选择策略可通过开关切换，且默认行为与当前基线一致。

### 8.3 测试验收

- [ ] 三端真机验收矩阵中所有 P0 用例通过。
- [ ] 自动化回归测试通过。
- [ ] 灰度期间无异常反馈。

## 9. 阶段划分与优先级

| 阶段 | 优先级 | 内容 | 产出 |
|-----|-------|------|------|
| P0 | 高 | 支持矩阵文档 + 平台能力层 + 统一上传入口 | `docs/mobile-compatibility-plan.md`、`docs/mobile-compatibility-test-matrix.md`、`frontend/src/platform/`、`FileUploadZone` 改造 |
| P1 | 中 | 灰度开关 + 真机测试矩阵落地 | 开关配置、测试报告 |
| P2 | 低 | 认证恢复保护带 + 媒体缓存头 | `auth.ts`/`client.ts` 改造、`media.routes.ts` 缓存头 |

## 10. 关键决策记录

| 编号 | 决策 | 原因 |
|-----|------|------|
| D1 | 不引入原生 App 路线 | 项目定位为家庭 NAS 部署的轻量 PWA，原生方案会显著增加运维成本。 |
| D2 | 三端都必须生产可用 | 用户群体覆盖 iPhone、Android、HarmonyOS，缺一不可。 |
| D3 | 不为三端做独立页面 | 保持一套业务 UI，降低长期维护成本。 |
| D4 | 文件选择策略统一从 `file-picker-policy.ts` 输出 | 避免局部热修导致平台差异扩散。 |
| D5 | 认证恢复与媒体缓存作为 P2 | 当前基线未出现对应故障，优先解决上传入口的结构性风险。 |

## 11. 相关文档

- [README.md](../README.md)
- [PWA 策略与离线边界](./pwa.md)
- [移动端兼容性测试矩阵](./mobile-compatibility-test-matrix.md)
