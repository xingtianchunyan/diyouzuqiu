# Tasks
- [x] Task 1: 定义项目结构与技术栈基线（前后端分离 + 模块化）
  - [x] SubTask 1.1: 确定 Monorepo/双仓结构（建议：frontend/ + backend/ + docs/）
  - [x] SubTask 1.2: 明确前端技术栈（Vue3 + Vite + Router + Pinia + i18n + PWA）与后端技术栈（Node TS + 模块化框架 + ORM + Auth）
  - [x] SubTask 1.3: 定义环境配置策略（.env 分层、密钥不入库、开发/生产差异）

- [x] Task 2: 完成信息架构与页面路由规格（移动优先）
  - [x] SubTask 2.1: 定义全站页面与路由（主页、历史页、年度页、照片/视频、文集/诗集、个人页、单人页、上传资料、年会策划）
  - [x] SubTask 2.2: 定义关键交互与空状态（无数据、无权限、加载失败）

- [x] Task 3: 完成设计系统规格（Design Tokens + 组件清单）
  - [x] SubTask 3.1: 定义设计令牌（颜色、排版、间距、栅格、圆角、阴影、动效）
  - [x] SubTask 3.2: 定义基础组件 API（Button、Card、Dropdown、List、Tabs、Search、Timeline、EmptyState 等）

- [x] Task 4: 完成数据模型与数据库设计（PostgreSQL）
  - [x] SubTask 4.1: 定义核心实体与关系（User/Member/Family、Media、Work、Match、Year、Event、KnowledgeDoc）
  - [x] SubTask 4.2: 定义索引与检索策略（作者搜索、按人筛媒体、按年筛比赛、全文检索方案）
  - [x] SubTask 4.3: 定义迁移策略与种子数据策略（不提供 mock/seed 业务数据）

- [x] Task 5: 定义后端 API 契约（REST）
  - [x] SubTask 5.1: 认证与权限 API（登录、刷新、登出、角色/权限）
  - [x] SubTask 5.2: 成员/家庭 API
  - [x] SubTask 5.3: 媒体上传与查询 API（含人物标签）
  - [x] SubTask 5.4: 文章/诗词 API
  - [x] SubTask 5.5: 比赛记录 API
  - [x] SubTask 5.6: 年度页聚合 API
  - [x] SubTask 5.7: 知识库与年会策划 Skill API（上传资料、检索、生成）

- [x] Task 6: 定义媒体文件存储与访问策略（本机磁盘）
  - [x] SubTask 6.1: 定义目录结构、文件命名、去重策略（如哈希）
  - [x] SubTask 6.2: 定义访问控制（鉴权下载、缩略图策略、范围请求/视频流策略）
  - [x] SubTask 6.3: 定义备份与迁移建议（手动/脚本化）

- [x] Task 7: 定义 PWA 策略与离线边界
  - [x] SubTask 7.1: 定义缓存策略（App Shell、API、媒体不缓存/可选缓存）
  - [x] SubTask 7.2: 定义安装与更新策略（版本提示、强制刷新策略）

- [x] Task 8: 定义“年会策划 Skill”规格（提示词 + 结构化输出）
  - [x] SubTask 8.1: 定义 Skill 输入参数（人数、预算、时间、地点、主题偏好、禁忌等）
  - [x] SubTask 8.2: 定义输出结构（章节、表格字段、可复制格式）
  - [x] SubTask 8.3: 定义 RAG 召回与引用展示方式（来源、片段）

# Task Dependencies
- Task 5 depends on Task 4
- Task 7 depends on Task 1
- Task 8 depends on Task 4
