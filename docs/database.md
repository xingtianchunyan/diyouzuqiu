# 数据库设计（PostgreSQL）

## 目标
- 用 PostgreSQL 存储所有结构化数据与媒体元数据
- 媒体文件本体落本机磁盘（见 docs/storage.md），数据库只存路径与检索字段
- 无 mock/seed 业务数据：所有数据由“上传资料”与管理操作产生

## 核心实体
### 账号与成员
- User：登录账号（email、password 哈希、role），可关联 Member
- Member：队员档案（displayName、team、family）
- Family：XX 号家庭（label 唯一）

### 媒体
- MediaAsset：媒体元数据（type、storagePath、mimeType、sizeBytes、takenAt、year）
- MediaPersonTag：媒体与成员的多对多标签（第一阶段手动标注）

### 文字作品
- Work：文章/诗词（type、title、content、authorMember、year）

### 比赛
- Match：比赛结果（playedAt、红蓝比分、mvpMember、notes）
- MatchParticipant：参赛关系（member、side）

### 年度聚会
- YearEvent：年度内重大聚会条目（year、happenedAt、title、description）

### 本地知识库
- KnowledgeDoc：知识库文档（title、content、createdByUser）

## 索引与检索策略（第一阶段）
- Member：team、familyId 建索引，用于个人页三下拉筛选
- MediaAsset：type、year、takenAt 建索引，用于时间线与筛选
- MediaPersonTag：memberId 建索引，用于“按人查看”聚合
- Work：type、year、authorMemberId 建索引；全文检索作为第二阶段增强（可用 PostgreSQL FTS）
- Match：playedAt、mvpMemberId 建索引，用于按年筛选与 MVP 汇总
- YearEvent：year 建索引，用于年度页聚合

## 迁移与数据策略
- 使用 Prisma Migrate 管理 schema 变更（迁移文件可审计）
- 不提供业务数据 seed；仅允许技术性初始化（例如：创建管理员账号）通过管理命令或首次启动流程完成

