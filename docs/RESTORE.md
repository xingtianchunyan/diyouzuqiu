# 棣友足球队档案站 — 灾难恢复指南

本文档说明当 NAS 故障、数据损坏或需要迁移到新设备时，如何恢复项目运行。

## 1. 恢复前准备

### 1.1 必要条件

- 一台安装有 Docker 和 Docker Compose 的新 NAS/服务器。
- 可用的备份文件：`diyou-backup-YYYYMMDD-HHMMSS.tar.gz`。
- 项目源码（从 GitHub 拉取或本地副本）。
- 正确的 `.env` 配置文件（特别是 `JWT_SECRET`，建议与旧环境一致或重新生成并通知所有用户重新登录）。

### 1.2 拉取项目源码

```bash
git clone https://github.com/xingtianchunyan/diyouzuqiu.git
cd diyouzuqiu
```

### 1.3 准备环境变量

复制示例配置并修改：

```bash
cp .env.example .env
nano .env   # 或 vim
```

重点检查以下字段：

- `JWT_SECRET`：建议使用原环境的值，或重新生成一个强随机字符串。
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`：用于初始化管理员。
- `SITE_ADDRESS`：局域网 IP 或公网域名。
- `HTTP_PORT` / `HTTPS_PORT`：确保端口未被占用。

## 2. 完整恢复流程

### 2.1 启动一次服务以创建容器和数据卷

```bash
docker compose up -d --build
```

首次启动会创建 SQLite 数据库和 storage 目录。此步骤仅为了生成容器，稍后会用备份覆盖数据。

### 2.2 停止后端容器

```bash
docker compose stop diyou-backend
```

### 2.3 解压备份并恢复数据

假设备份文件位于 `~/backups/diyou-backup-20250618-020000.tar.gz`：

```bash
# 创建临时目录
RESTORE_DIR=$(mktemp -d)
tar xzf ~/backups/diyou-backup-20250618-020000.tar.gz -C "$RESTORE_DIR"

# 查看备份内容
ls "$RESTORE_DIR"
# 应包含：diyou-backup-20250618-020000/diyou.db 和 .../storage/

# 恢复数据库
docker cp "$RESTORE_DIR/diyou-backup-20250618-020000/diyou.db" diyou-backend:/data/db/diyou.db

# 恢复媒体文件
docker cp "$RESTORE_DIR/diyou-backup-20250618-020000/storage/." diyou-backend:/data/storage/

# 清理临时目录
rm -rf "$RESTORE_DIR"
```

### 2.4 修复容器内文件权限

如果容器以非 root 用户运行，恢复后需要确保文件权限正确：

```bash
docker compose exec diyou-backend chown -R node:node /data/db /data/storage
```

### 2.5 重新启动服务

```bash
docker compose start diyou-backend
```

### 2.6 验证恢复结果

```bash
# 查看容器状态
docker compose ps

# 查看后端日志
docker compose logs --tail 50 diyou-backend

# 访问站点测试登录和媒体展示
curl -s http://localhost:3001/health
```

## 3. 使用一键恢复脚本

项目已提供 `scripts/restore.sh`，可自动执行上述大部分步骤：

```bash
./scripts/restore.sh ~/backups/diyou-backup-20250618-020000.tar.gz
```

脚本会：

1. 停止后端和 Web 容器。
2. 解压备份。
3. 复制数据库和媒体文件。
4. 重启容器。

## 4. 仅恢复数据库（不恢复媒体）

如果只想回滚数据库到某个时间点，而不想覆盖媒体文件：

```bash
docker compose stop diyou-backend
docker cp ~/backups/diyou-backup-20250618-020000/diyou.db diyou-backend:/data/db/diyou.db
docker compose exec diyou-backend chown node:node /data/db/diyou.db
docker compose start diyou-backend
```

## 5. 恢复到新设备后的注意事项

1. **JWT 密钥不一致**：如果 `JWT_SECRET` 与旧环境不同，所有已登录用户会收到 401 错误，需要重新登录。
2. **域名/IP 变化**：如果访问地址改变，需要更新 `.env` 中的 `SITE_ADDRESS` 和 `CORS_ORIGIN`，然后重建并重启 Web 容器。
3. **HTTPS 证书**：使用 `docker-compose.https.yml` 时，Let's Encrypt 会重新申请证书；使用自签名证书时，浏览器会再次提示不安全。
4. **备份验证**：恢复完成后，建议登录后台检查用户、媒体、大事记等数据是否完整。

## 6. 常见问题

### Q1: 恢复后媒体图片无法显示

检查 `/data/storage` 权限：

```bash
docker compose exec diyou-backend ls -l /data/storage
```

如果所有者为 root，执行：

```bash
docker compose exec diyou-backend chown -R node:node /data/storage
```

### Q2: 容器无法启动，日志显示数据库被锁定

可能是恢复过程中后端仍在运行。停止后再恢复：

```bash
docker compose stop diyou-backend
docker cp ...
docker compose start diyou-backend
```

### Q3: 备份文件损坏或无法解压

尝试使用 `tar` 测试备份完整性：

```bash
tar tzf diyou-backup-YYYYMMDD-HHMMSS.tar.gz | head
```

如果输出为空或报错，备份文件可能已损坏，需使用更早的备份。

## 7. 定期演练建议

每季度至少在新设备或测试环境中执行一次完整恢复演练，确保：

- 备份文件可用。
- 恢复文档与当前版本一致。
- `.env` 模板包含所有必要字段。
- 团队成员熟悉恢复流程。
