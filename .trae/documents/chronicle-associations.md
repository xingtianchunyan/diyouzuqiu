# 实施计划：在「上传大事记」中增加批量关联功能

## 1. 现状分析
当前「上传大事记」的表单已经建立，并可以上传一个主要的文件（`mediaId`）。但是根据最新需求，大事记需要能批量关联队员、照片、视频、文章、诗歌、比赛数据。为了实现这一点，我们需要在后端的 `ChronicleEvent` 模型中建立与这些实体的多对多关系，并在前端表单中新增「关联区域」，通过下拉菜单支持批量选择并提交这些关联数据的 IDs。

## 2. 解决方案与修改步骤

### 步骤 1：更新数据库模型关系 (Prisma)
**涉及文件**：`backend/prisma/schema.prisma`
- 在 `ChronicleEvent` 中添加多对多关系（隐式关联表）：
  - `members Member[]`
  - `mediaAssets MediaAsset[] @relation("ChronicleMediaAssets")`
  - `works Work[]`
  - `matches Match[]`
- 同时为了避免与原有的单文件关联冲突，将原有的 `media MediaAsset?` 明确命名为 `@relation("ChroniclePrimaryMedia")`。
- 在 `Member`, `MediaAsset`, `Work`, `Match` 模型中添加对应的反向关系数组（如 `chronicleEvents ChronicleEvent[]`）。
- 运行 `npx prisma db push` 并 `npx prisma generate` 更新数据库与客户端类型。

### 步骤 2：优化后端查询与接口支持
**涉及文件**：`backend/src/modules/chronicles/chronicles.routes.ts` & `backend/src/modules/media/media.routes.ts`
- **媒体接口增强**：在 `media.routes.ts` 的 `GET /media` 接口返回数据中补充 `originalFilename`，方便前端在下拉菜单中显示媒体名称。
- **大事记接口更新**：在 `chronicles.routes.ts` 的 `POST /chronicles` 中，解析并接收可选的关联数组参数：`memberIds`, `mediaAssetIds`, `workIds`, `matchIds`。
- 在 `prisma.chronicleEvent.create` 语句中，使用 `connect` 语法将这些传进来的 IDs 进行数据库层面的绑定关联。

### 步骤 3：增强前端 API 服务与状态管理
**涉及文件**：`frontend/src/api/services/chronicles.service.ts` & `frontend/src/api/services/media.service.ts`
- 更新 `Media` 接口定义，包含 `originalFilename`。
- 更新 `ChronicleEventPayload` 接口，追加可选属性 `memberIds`, `mediaAssetIds`, `workIds`, `matchIds`。

### 步骤 4：更新「上传资料」表单视图
**涉及文件**：`frontend/src/views/UploadPage.vue`
- **数据获取**：为了能让下拉菜单显示选项，在进入该组件时，额外调用 `mediaStore.fetchMediaList()`, `worksStore.fetchWorks()`, `matchesStore.fetchMatches()` 拉取用于选择的列表数据。
- **计算属性（Options）**：增加用于 `OrganicDropdown` 的计算属性，分别从各自的 store 中过滤并映射出：
  - `photoOptions` (类型为 PHOTO 的媒体)
  - `videoOptions` (类型为 VIDEO 的媒体)
  - `articleOptions` (类型为 ARTICLE 的文章)
  - `poemOptions` (类型为 POEM 的诗歌)
  - `matchOptions` (格式化比赛时间的比赛列表)
- **表单状态扩展**：在 `chronicleForm` 中新增数组属性 `memberIds`, `photoIds`, `videoIds`, `articleIds`, `poemIds`, `matchIds`。
- **表单 UI 渲染**：在大事记表单的底部新增「ASSOCIATIONS (关联区域)」分组，使用包含多个 `OrganicDropdown`（并开启 `multiple: true`）的表单组，供用户勾选对应内容。
- **提交组装**：在 `submitChronicle` 函数中，将 `photoIds` 和 `videoIds` 合并为 `mediaAssetIds`，将 `articleIds` 和 `poemIds` 合并为 `workIds`，随后作为载荷发送给后端。

## 3. 验证方式
- 重启后端及前端服务。
- 打开「上传资料」页面并进入「上传大事记」选项卡。
- 确认在下方看到了「ASSOCIATED MEMBERS」、「ASSOCIATED PHOTOS」等多个多选下拉框。
- 随意勾选一些已有的队员、照片或文章并提交大事记。
- 查看数据库，确认 `ChronicleEvent` 记录已生成，并隐式建立或填充了对应的多对多关联中间表。