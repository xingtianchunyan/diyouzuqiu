# 多系统适配详细计划（Web/PWA 主体，iPhone / 安卓 / 鸿蒙三端生产可用）

## Summary

- 目标是在**保持当前 `Vue 3 + Vite PWA` 架构不变**的前提下，为 `iPhone`、`Android`、`HarmonyOS` 三类手机系统制定一套可执行、可验证、可灰度的多系统适配方案。
- 本计划不引入原生 App、Capacitor、Cordova 或鸿蒙原生模块；适配范围限定为**浏览器 / PWA 安装态**。
- 按你的前提，当前基线下**如果不实施原记录中的第 10 步文件选择器改动，就不会实际触发第二部分问题**。因此本计划把重点放在：
  - 先构建平台适配层与上传兼容策略
  - 再通过隔离、验收与灰度手段，保证第 10 步未来落地后不会引发连锁问题
- 计划遵循行业常见做法：
  - 以**能力分层**代替页面分叉
  - 以**渐进增强**代替硬编码平台特判
  - 以**统一上传入口**代替页面散改
  - 以**验收矩阵 + 生产回滚点**保证上线可控

## Current State Analysis

### 1. 当前项目架构边界

- 项目主形态是 `Vue 3 + Pinia + Vue Router + Vite PWA` 的单体 Web/PWA 应用，见 [README.md](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/README.md#L1-L52)。
- 前端没有发现原生容器、系统桥接或平台服务层：
  - 没有 `Capacitor`
  - 没有 `Cordova`
  - 没有 `React Native` / `Flutter`
  - 没有鸿蒙原生能力桥
- 当前只存在极少量“输入设备能力判断”，例如 [SoccerFX.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/components/SoccerFX.vue#L170-L271) 中的 `matchMedia('(pointer: fine)')`，并没有统一的 `platform / capability` 抽象。

### 2. 当前上传能力是分散的

- 主上传页 [UploadPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/UploadPage.vue#L194-L721) 直接在页面中维护两个原生文件输入：
  - 媒体上传：`accept="image/*,video/*"`
  - 纪事附件上传：`accept="image/*,video/*"`
- 人物页头像上传 [PersonPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/PersonPage.vue#L321-L334) 仍直接使用 `accept="image/*"`。
- 虽然存在通用上传组件 [FileUploadZone.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/components/base/FileUploadZone.vue#L1-L217)，但当前主要媒体链路并没有统一复用它。
- `FileUploadZone` 的当前校验只按文件名后缀做字符串匹配 [FileUploadZone.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/components/base/FileUploadZone.vue#L25-L43)，对移动端文件名、MIME、系统文件选择器行为并不稳健。

### 3. 当前认证恢复链路是单一 Web 逻辑，不是平台化逻辑

- 认证状态集中在 [auth.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/stores/auth.ts#L1-L89)，依赖 Cookie、`/me` 与 `/auth/refresh`。
- 顶层壳层 [App.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/App.vue#L16-L22) 在 `onMounted` 时初始化认证。
- 路由守卫 [router/index.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/router/index.ts#L44-L62) 也会调用 `initialize()`。
- axios 401 响应拦截器 [client.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/api/client.ts#L31-L50) 仍是统一“退出并跳登录”的模式，没有平台差异和恢复状态机。
- 按你当前判断，这条链路在“未实施第 10 步前”并不是正在发生的生产故障；因此本计划把它视为**未来适配改动的保护带**，不是第一落点。

### 4. 当前 PWA 能力较基础

- PWA 注册逻辑非常轻量，见 [register.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/pwa/register.ts#L1-L8)。
- PWA 策略文档 [pwa.md](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/docs/pwa.md#L1-L29) 已明确：
  - 不缓存 `/api/`
  - 不缓存大媒体
  - App Shell 可离线
- 这说明当前方向本身是对的，但还缺：
  - 平台能力识别
  - 安装态 / 浏览器态差异策略
  - 文件选择、前后台恢复、可观测性这些“生产适配层”

### 5. 本轮规划边界

- 依据你的最新判断，本轮不把“第二部分问题”当作当前已爆发的缺陷去修。
- 本轮要做的是：**制定一套细致的、多系统适配实施计划**，确保将来真正做第 10 步及其后续兼容改造时，生产环境仍可控、可验收、可回滚。

## Proposed Changes

### 阶段 A：建立正式支持矩阵与适配边界

#### 目标

- 先定义“什么叫三端生产可用”，避免后续改造没有验收口径。

#### 计划内容

- 新增一份正式适配文档，建议文件：
  - `docs/mobile-compatibility-plan.md`
- 文档中定义三端支持矩阵：
  - `iPhone`
    - Safari 浏览器
    - 添加到主屏幕后的 PWA 安装态
  - `Android`
    - Chrome 浏览器
    - Chrome PWA 安装态
    - 常见 Android WebView 风格浏览器作为兼容补充
  - `HarmonyOS`
    - 系统浏览器
    - 安装态 / 桌面快捷方式场景
- 每端至少定义以下生产能力必须通过：
  - 登录
  - 会话保持
  - 媒体上传
  - 头像上传
  - 纪事附件上传
  - 页面切后台再恢复
  - 媒体预览/下载
  - PWA 安装与启动

#### 为什么这样做

- 行业标准里，移动端适配首先不是“写代码”，而是**先建立支持矩阵和失败定义**。
- 否则后续只会变成某一台手机上打补丁，而不是生产级兼容方案。

### 阶段 B：建立统一平台能力层，而不是拆系统专属模块

#### 目标

- 不为 iPhone / Android / 鸿蒙做三套页面或三套上传实现。
- 统一为“单一业务页面 + 平台能力策略层”。

#### 计划文件

- 新增目录：
  - `frontend/src/platform/`
- 计划新增文件：
  - `frontend/src/platform/detect.ts`
  - `frontend/src/platform/capabilities.ts`
  - `frontend/src/platform/file-picker-policy.ts`
  - `frontend/src/platform/session-policy.ts`
  - `frontend/src/platform/runtime-state.ts`

#### 每个文件的职责

- `detect.ts`
  - 负责检测运行环境
  - 输出：
    - `isIOS`
    - `isAndroid`
    - `isHarmonyOS`
    - `isStandalonePWA`
    - `isTouchDevice`
    - `isFinePointer`
    - `isLikelyWebView`
- `capabilities.ts`
  - 把系统判断映射为能力判断
  - 输出：
    - 是否建议拖拽上传
    - 是否建议使用广义 MIME 通配符
    - 是否建议细粒度 MIME 列表
    - 是否应启用前后台恢复检查
    - 是否对媒体资源禁用缓存
- `file-picker-policy.ts`
  - 统一定义各类上传场景的文件选择策略
  - 场景包括：
    - 媒体上传
    - 纪事附件上传
    - 头像上传
    - 知识库文档上传
- `session-policy.ts`
  - 统一定义页面切后台恢复、登录态自检、401 恢复策略
- `runtime-state.ts`
  - 统一管理：
    - 当前是否处于浏览器态
    - 是否处于安装态
    - 页面是否刚从后台恢复
    - 当前网络是否离线/重连

#### 为什么这样做

- 这是最符合当前项目现状的行业方案：
  - 保持一套业务 UI
  - 把系统差异集中到小范围策略层
  - 后续每新增一个系统兼容点，都有稳定挂载位置

### 阶段 C：统一上传入口，先解决第 10 步的结构性风险

#### 目标

- 第 10 步不再以“页面里改一个 `accept` 字符串”的方式实施。
- 而是先把所有上传入口统一到同一套策略体系。

#### 重点改造文件

- [UploadPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/UploadPage.vue#L194-L721)
- [PersonPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/PersonPage.vue#L321-L334)
- [FileUploadZone.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/components/base/FileUploadZone.vue#L1-L217)
- [UploadDocModal.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/components/knowledge/UploadDocModal.vue)

#### 具体方案

- 第一步：把 `UploadPage.vue` 的媒体上传与纪事附件上传都收敛到统一上传组件
  - 不再直接在页面里写裸 `<input type="file">`
- 第二步：把 `PersonPage.vue` 的头像上传接入同一套文件策略
- 第三步：扩展 `FileUploadZone.vue`
  - 不只支持后缀名校验
  - 改为：
    - MIME 校验
    - 扩展名白名单校验
    - 平台策略兜底
    - 不同平台错误提示分流
- 第四步：在 `file-picker-policy.ts` 中定义场景化 accept 规则
  - `media`
  - `chronicleAttachment`
  - `avatar`
  - `knowledgeDoc`

#### 核心决策

- `HarmonyOS` 不使用宽泛 `image/*` 作为唯一策略来源
- 对于媒体上传，默认用**具体 MIME 列表 + 明确扩展名列表**生成 accept
- 但该规则不直接散落在页面，而是从 `file-picker-policy.ts` 统一提供

#### 为什么这样做

- 这正是你所强调的问题本质：
  - 只要不动第 10 步，就不会出现第二部分问题
  - 所以第 10 步未来必须通过结构化改造，而不是局部热修

### 阶段 D：为第 10 步设置“隔离护栏”，防止连锁反应

#### 目标

- 让文件选择器兼容改动只影响上传行为，不影响登录态、媒体缓存、页面恢复。

#### 计划内容

- 适配改造分为三个独立提交面：
  - 提交面 1：平台能力层与上传组件重构
  - 提交面 2：第 10 步文件选择策略切换
  - 提交面 3：三端验证与灰度开关
- 在策略层保留可切换开关，建议来源：
  - 环境变量
  - 构建时常量
  - 或前端配置对象
- 例如：
  - `useExplicitMobileMediaAcceptList`
  - `enableHarmonyMediaPickerPolicy`

#### 为什么这样做

- 行业标准里，生产适配不能把“结构重构 + 策略变更 + 全量上线”压在一次提交里。
- 必须先有可回退点，再改策略。

### 阶段 E：补充会话恢复保护带，但只作为适配配套，不作为当前故障修复

#### 目标

- 虽然你判断第二部分问题当前不实际存在，但一旦第 10 步开始改上传入口，移动端使用方式会更频繁，这时必须提前补上保护带。

#### 重点文件

- [auth.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/stores/auth.ts#L1-L89)
- [client.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/api/client.ts#L1-L53)
- [App.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/App.vue#L1-L249)
- [router/index.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/router/index.ts#L1-L62)
- [LoginPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/LoginPage.vue#L115-L215)

#### 具体方案

- 在 `session-policy.ts` 中定义：
  - 前后台切换时是否触发会话自检
  - PWA 恢复时是否静默刷新
  - 401 是否直接登出，还是先尝试一次恢复
- 在 `App.vue` 中增加统一的生命周期监听入口：
  - `visibilitychange`
  - `pageshow`
  - `online`
- 在 `auth.ts` 中把 `initialize()` 重构为更清晰的状态机：
  - 初始冷启动恢复
  - 前台恢复检查
  - 失败后的无损降级
- 在 `client.ts` 中把“401 直接退出”改成策略驱动
  - 登录接口、刷新接口、普通资源接口、媒体资源接口分别处理

#### 为什么这样做

- 这一步不是因为当前已经有故障
- 而是因为生产级多系统适配里，**上传频次提高以后，后台恢复、安装态唤醒、弱网重连会自然放大认证链路的不稳定点**

### 阶段 F：媒体资源访问与缓存策略补足

#### 目标

- 避免未来在 iOS / 鸿蒙等环境里，因为缓存了受保护资源的异常响应，导致“看起来像上传或显示坏了”。

#### 重点文件

- [media.routes.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/backend/src/modules/media/media.routes.ts#L330-L346)
- [pwa.md](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/docs/pwa.md#L21-L29)
- 新增：
  - `frontend/src/platform/media-cache-policy.ts`

#### 具体方案

- 媒体文件接口加上明确缓存策略
  - 受保护媒体默认 `no-store`
  - 防止 401/403 被错误缓存
- 前端媒体显示层遵守“不做离线缓存兜底”的原则
- 文档中明确：
  - 静态壳缓存可以存在
  - 用户受保护媒体不进入 SW 长缓存

### 阶段 G：测试矩阵与生产上线门禁

#### 目标

- 把“看起来能用”变成“可验证地生产可用”。

#### 计划内容

- 新增一份测试矩阵文档，建议文件：
  - `docs/mobile-compatibility-test-matrix.md`
- 至少包含三类测试：
  - 静态能力检查
  - 手工真机验收
  - 自动化回归

#### 自动化建议

- Web 自动化：
  - 保留浏览器级 E2E 验证登录、导航、上传入口可见性
- 不强依赖自动化完成系统文件选择器验证
  - 因为 iOS / 鸿蒙真实文件选择器行为通常必须靠真机手测确认

#### 真机验收矩阵

- iPhone
  - Safari 浏览器
  - 添加到主屏幕后打开
- Android
  - Chrome 浏览器
  - PWA 安装态
- HarmonyOS
  - 系统浏览器
  - 安装态 / 桌面入口

#### 每端必须验证的用例

1. 登录
2. 登录后切后台 1 分钟再恢复
3. 上传照片
4. 上传视频
5. 上传头像
6. 上传纪事附件
7. 访问媒体详情
8. 受保护媒体显示与刷新
9. 页面刷新后会话恢复
10. PWA 安装后重新打开

### 阶段 H：灰度与回滚

#### 目标

- 保证生产环境出现单端异常时，可以快速止损。

#### 计划内容

- 上传策略变更使用开关控制
- 第 10 步上线顺序：
  1. 开发环境验证
  2. 测试环境三端真机验证
  3. 生产环境仅管理员先用
  4. 观察日志与反馈
  5. 再全量开放
- 保留回滚方案：
  - 一键关闭新文件选择策略
  - 回退到旧上传入口实现
  - 保证服务端白名单与存储逻辑不变

## Assumptions & Decisions

- 决定 1：本次多系统适配范围限定为**现有 Web/PWA 架构**，不纳入原生 App 路线。
- 决定 2：支持等级设为**iPhone / Android / HarmonyOS 三端都必须生产可用**。
- 决定 3：第 10 步不再被视为单点字符串修改，而是一次“上传适配层改造”。
- 决定 4：不为三端分别开发独立业务模块，统一采用**平台能力层 + 统一业务页面**。
- 决定 5：第二部分问题在当前基线下不作为现存事故处理，而作为未来适配上线的风险护栏处理。
- 假设 1：后续实施将继续沿用当前的 Docker + Caddy + Web/PWA 部署方式。
- 假设 2：三端真机验证条件可获得，至少能覆盖各自一台主力设备。
- 假设 3：服务端媒体白名单与鉴权接口不做根本架构调整。

## Verification Steps

1. 先完成 `docs/mobile-compatibility-plan.md` 与 `docs/mobile-compatibility-test-matrix.md`，明确支持矩阵与验收用例。
2. 新建 `frontend/src/platform/` 适配层，并保证所有平台判断都从这里输出。
3. 将 [UploadPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/UploadPage.vue#L194-L721) 与 [PersonPage.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/views/PersonPage.vue#L321-L334) 接入统一上传策略，不再散落写 `accept`。
4. 在不改变生产默认行为的前提下，为第 10 步引入开关与灰度路径。
5. 为 [auth.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/stores/auth.ts#L1-L89)、[client.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/api/client.ts#L1-L53)、[App.vue](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/frontend/src/App.vue#L1-L249) 建立最小会话恢复保护带。
6. 为 [media.routes.ts](file:///e:/AI编程/Diyouqiudui/SOLO%20web%20diyou/backend/src/modules/media/media.routes.ts#L330-L346) 增加明确缓存策略，防止受保护媒体异常缓存。
7. 完成三端真机验收矩阵，所有核心路径都至少通过一次浏览器态和一次安装态验证。
8. 生产上线先小范围灰度，再全量开放；若任一平台出现异常，可通过开关快速回退第 10 步策略。
