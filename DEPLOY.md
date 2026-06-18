# Diyou 档案站 - NAS Docker 部署指南

本指南面向希望把项目部署到家庭 NAS（已安装 Docker 和 Docker Compose）的目标用户。

## 1. 前提条件

- NAS 已安装 Docker Engine 和 Docker Compose（v2 插件）。
- 已准备好一个文件夹存放项目，例如 `/volume1/docker/diyou`。
- 知道 NAS 的局域网 IP 地址。

## 2. 快速开始

### 2.1 下载/复制项目

把项目文件放到 NAS 上：

```bash
cd /volume1/docker
git clone <项目仓库地址> diyou
cd diyou
```

或者直接把项目压缩包解压到该目录。

### 2.2 配置环境变量

```bash
cp .env.example .env
nano .env   # 或用任何文本编辑器
```

至少修改以下两项：

```env
# 必须改成强密码
JWT_SECRET=your-random-secret-here

# 初始管理员账号密码
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-strong-password
```

如果只在局域网使用，保持 `SITE_ADDRESS=localhost` 即可；
如果有公网域名并能解析到 NAS，则填写域名，例如 `SITE_ADDRESS=nas.yourdomain.com`。

### 2.3 启动服务

```bash
docker compose up -d --build
```

首次启动会自动执行数据库迁移并创建管理员账号。

### 2.4 访问

根据 `SITE_ADDRESS` 和端口：

- 局域网访问（自签名证书）：`https://<NAS_IP>`
- 公网域名访问：`https://nas.yourdomain.com`

使用 `.env` 中设置的 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录。

## 3. HTTPS 说明

### 3.1 局域网自签名证书（默认）

`web/Caddyfile` 默认使用 `tls internal`，Caddy 会生成自签名证书。

- 浏览器/手机首次访问会提示证书不安全，选择“继续访问”即可。
- iOS 安装 PWA 可能需要信任 Caddy 本地 CA：
  1. 访问 `https://<NAS_IP>`，Safari 会显示证书错误。
  2. 下载 Caddy 根证书（位于容器 `/data/caddy/certificates/local/`）。
  3. 安装描述文件并在 **设置 → 通用 → 关于本机 → 证书信任设置** 中开启信任。
  4. 或者仅作为网页使用，不安装到主屏幕。

### 3.2 公网域名自动证书

如果 NAS 有公网 IP 和域名：

1. 将 `SITE_ADDRESS` 改为你的域名。
2. 使用 HTTPS 覆盖文件启动：

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

3. 确保 80/443 端口能从公网访问。
4. Caddy 会自动申请并续期 Let's Encrypt 证书。

### 3.3 仅使用 HTTP（不推荐）

如果不需要 PWA 离线功能，可以把 `web/Caddyfile` 中的 `tls internal` 删除，并把 `docker-compose.yml` 中的端口映射改为：

```yaml
ports:
  - "8080:80"
```

然后访问 `http://<NAS_IP>:8080`。

## 4. 自动更新

项目已集成 Watchtower，每天检查一次带 `watchtower.enable=true` 标签的容器镜像更新。

启用：

```bash
docker compose --profile watchtower up -d
```

更新后 Watchtower 会自动拉取新镜像并重启 `diyou-backend` 和 `diyou-web`。

## 5. 备份与恢复

### 5.1 备份

```bash
./scripts/backup.sh ./backups
```

会在 `backups/` 目录下生成 `diyou-backup-YYYYMMDD-HHMMSS.tar.gz`。

### 5.2 恢复

```bash
./scripts/restore.sh backups/diyou-backup-YYYYMMDD-HHMMSS.tar.gz
```

## 6. 用户管理

- 管理员登录后，可通过 `/api/v1/admin/users` 管理账号。
- 创建新用户时，密码必须至少 8 位，且同时包含字母和数字。
- 忘记密码时，管理员可在后台重置任意用户密码。
- 用户也可在“我的账号”中自行修改密码。

## 7. 更新版本

```bash
git pull        # 拉取最新代码
docker compose down
docker compose up -d --build
```

更新时会自动运行数据库迁移，不会丢失已有数据。

## 8. 文件说明

| 文件/目录 | 说明 |
|---|---|
| `docker-compose.yml` | 主编排文件（后端 + Web + 可选 Watchtower） |
| `docker-compose.https.yml` | 公网域名 HTTPS 覆盖文件 |
| `backend/Dockerfile` | 后端 Node.js 镜像构建 |
| `web/Dockerfile` | 前端 Caddy 镜像构建 |
| `web/Caddyfile` | 默认本地 HTTPS 配置 |
| `web/Caddyfile.public` | 公网域名 HTTPS 配置 |
| `.env.example` | 环境变量模板 |
| `scripts/backup.sh` | 备份脚本 |
| `scripts/restore.sh` | 恢复脚本 |
| `scripts/smoke-test.sh` | 部署后快速检查脚本 |

## 9. 常见问题

### 9.1 手机无法访问

- 确认手机和 NAS 在同一局域网。
- 确认 NAS 防火墙放行 80/443 端口。
- 检查容器状态：`docker compose ps`。

### 9.2 数据库迁移失败

查看后端日志：

```bash
docker compose logs -f diyou-backend
```

### 9.3 忘记管理员密码

修改 `.env` 中的 `ADMIN_PASSWORD`，然后重启容器：

```bash
docker compose restart diyou-backend
```

下次启动时会用新密码覆盖管理员账号。
