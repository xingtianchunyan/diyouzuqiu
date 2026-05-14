# 实施计划：在「上传资料」页面新增「上传大事记」功能

## 1. 现状分析
当前「上传资料」页面（`UploadPage.vue`）包含四个选项卡：上传队员、上传照片/视频、上传文章/诗集、上传比赛数据。这些上传功能都拥有统一的表单风格（`.editorial-form`），并通过对应的 API 服务与后端通信。
本次需求是新增第五个选项卡「上传大事记」，并且要求风格一致，包含日期、标题、描述、图片/视频上传字段，同时需要在后端新增 `chronicle_events` 数据表。

## 2. 解决方案与实施步骤

### 步骤 1：更新数据库模型 (Prisma)
**涉及文件**：`backend/prisma/schema.prisma`
- 新增模型 `ChronicleEvent`，并映射表名为 `chronicle_events` (`@@map("chronicle_events")`)。
- 字段包含：`id` (主键), `title` (标题), `description` (描述, 可选), `happenedAt` (发生日期), `year` (年份, 自动从日期提取), `mediaId` (关联的媒体 ID, 可选), `createdByUserId` (创建者 ID)。
- 在现有的 `User` 模型和 `MediaAsset` 模型中补充对 `ChronicleEvent` 的反向关系映射（`chronicleEvents ChronicleEvent[]`）。
- **后续操作**：修改完成后，将执行 `npx prisma db push` 和 `npx prisma generate` 来同步数据库表并更新客户端。

### 步骤 2：新增后端 API 路由
**涉及文件**：`backend/src/modules/chronicles/chronicles.routes.ts` (新建) & `backend/src/main.ts`
- 在 `chronicles.routes.ts` 中创建一个 `POST /chronicles` 路由。
- 路由逻辑：接收 `title`, `description`, `happenedAt`, `mediaId` 参数，解析 `happenedAt` 获取年份 `year`，并在数据库中创建一条 `ChronicleEvent` 记录。
- 在 `main.ts` 中将新的 `chroniclesRoutes` 注册到 API 路由树中（`/api/v1` 前缀下）。

### 步骤 3：新增前端 API 服务
**涉及文件**：`frontend/src/api/services/chronicles.service.ts` (新建)
- 编写 `chroniclesService`，提供 `createChronicle(data)` 方法，用于向后端 `POST /api/v1/chronicles` 发送 JSON 数据。

### 步骤 4：更新前端多语言配置
**涉及文件**：`frontend/src/i18n/index.ts`
- 在 `zh-CN.upload` 下新增 `chronicle: '上传大事记'`。
- 在 `en.upload` 下新增 `chronicle: 'Upload Chronicle'`。

### 步骤 5：更新上传页面 UI 与逻辑
**涉及文件**：`frontend/src/views/UploadPage.vue`
- **Tab 更新**：在 `tabs` 数组中追加第五个选项卡 `{ label: t('upload.chronicle'), value: 'CHRONICLE' }`。
- **状态声明**：新增 `chronicleForm` 响应式对象（包含 `title`, `happenedAt`, `description`, `file`）。
- **提交流辑**：新增 `submitChronicle` 函数。逻辑设计为：若用户选择了文件，则先复用现有的 `mediaService.uploadMedia` 上传文件获取 `mediaId`，随后调用 `chroniclesService.createChronicle` 提交最终的表单数据。
- **模板更新**：新增对应的 `<form v-if="currentTab === 'CHRONICLE'">`。复用现有的 `.editorial-form`、`.form-group`、`.form-input` 等类名，保证在手机端和桌面端的样式响应式完全一致。字段结构如下：
  - 标题（TITLE *）：`type="text"`
  - 大事记日期（HAPPENED AT *）：`type="date"`
  - 描述（DESCRIPTION）：`textarea`
  - 图片/视频（MEDIA）：`type="file"`

## 3. 验证方式
- 运行 `npm run dev:backend` 和 `npm run dev:frontend`。
- 访问 `/upload` 页面，检查是否出现第五个选项卡。
- 填写表单并上传包含图片的测试大事记，查看页面是否提示成功，并检查 SQLite 数据库中的 `chronicle_events` 表是否正确记录。
- 切换至手机视图，检查表单样式是否由于使用了相同的基础类而保持了完美的自适应。