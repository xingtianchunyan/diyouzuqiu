# 媒体文件存储与访问策略（本机磁盘）

## 目标
- 媒体文件本体存磁盘，数据库仅存元数据与路径
- 支持鉴权访问（避免直接暴露静态目录）
- 为后续扩展到对象存储预留迁移空间

## 目录结构（建议）
根目录：`backend/storage`
- `backend/storage/media/original/{yyyy}/{mm}/...`：原始文件
- `backend/storage/media/thumb/{yyyy}/{mm}/...`：缩略图（照片/视频封面）

## 文件命名与去重
- 命名：`{id}_{sha256}.{ext}`
  - `{id}` 为数据库生成的 MediaAsset.id
  - `{sha256}` 为文件内容哈希，便于去重与一致性校验
- 去重策略（第一阶段）
  - 上传时计算 sha256，与同目录/同年月份已有文件比对
  - 如发现重复：仅复用已有文件路径，并在数据库创建新的 MediaAsset 记录或复用记录（按业务选择）

## 访问控制
- 不将 `backend/storage` 暴露为静态目录
- 通过受保护 API 下载：
  - `GET /api/v1/media/:id/file`：鉴权后流式返回
- 权限规则（第一阶段建议）
  - MEMBER：可读
  - MEMBER/ADMIN：可上传
  - ADMIN：可删除与全量管理

## 缩略图与预览
- 第一阶段：上传后异步生成缩略图（或延迟生成）
- 返回给前端的展示字段：
  - `thumbUrl`（若存在）用于列表网格加载
  - `fileUrl` 用于详情页加载原图/原视频

## 视频流（范围请求）
- 对视频下载接口支持 `Range` 头（后端透传或自行处理），以支持移动端边下边播

## 备份与迁移建议
- 备份范围：`backend/storage` + PostgreSQL 数据库
- 基本做法：
  - 定期全量压缩备份 `backend/storage`
  - PostgreSQL 使用 `pg_dump` 做逻辑备份
- 迁移到对象存储（第二阶段）：
  - 保持 API 不变，仅替换 storagePath 的解析与读写实现

