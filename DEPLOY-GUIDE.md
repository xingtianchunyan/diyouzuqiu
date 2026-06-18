# 棣友档案站 NAS Docker 傻瓜式部署指南

> 目标：不需要懂代码，只要会复制粘贴命令，就能把网站跑起来。

---

## 一、先确认这几件事

1. 你有一台 **NAS**（群晖 Synology、威联通 QNAP、自组 NAS 都可以）。
2. NAS 上已安装 **Docker** 和 **Docker Compose**（Compose 版本 2 以上）。
3. 你的电脑和 NAS 连接在同一个路由器/局域网内。
4. 你知道 NAS 的 **局域网 IP 地址**（例如 `192.168.0.105`）。

如果不确定 NAS IP：

- 群晖：打开 Synology Assistant 查看。
- 威联通：打开 Qfinder Pro 查看。
- 路由器后台：查看设备列表。

---

## 二、把项目文件放到 NAS 上

### 方法 A：用电脑复制（最简单）

1. 把项目压缩包解压到电脑桌面，得到一个名为 `diyou` 的文件夹。
2. 打开 NAS 的共享文件夹，例如 `\\192.168.0.105\docker` 或 `\\NAS_NAME\docker`。
3. 把 `diyou` 文件夹复制进去。

最终 NAS 上的路径应该类似：

```text
/volume1/docker/diyou
```

> 群晖用户：共享文件夹通常在 `/volume1/` 下；威联通类似。如果你的共享文件夹叫 `homes` 或 `Data`，对应放里面就行。

### 方法 B：用命令行复制（适合会 SSH 的人）

在电脑上打开 PowerShell / Terminal，执行：

```bash
# 把本地项目复制到 NAS（需要替换 IP 和用户名）
scp -r E:\diyou admin@192.168.0.105:/volume1/docker/
```

---

## 三、配置环境变量

1. 在 NAS 上进入 `diyou` 文件夹。
2. 找到 `diyou/.env.example` 文件，复制一份，重命名为 `.env`。

文件内容如下（可以直接复制修改）：

```env
# 访问地址
# 只在局域网用就保持 localhost；有公网域名再改
SITE_ADDRESS=localhost

# Web 端口
HTTP_PORT=80
HTTPS_PORT=443

# 安全密钥：必须改！
# 打开 NAS 的 SSH，执行下面命令生成：
# openssl rand -base64 32
JWT_SECRET=改成上面命令生成的随机字符串

# 管理员账号
ADMIN_EMAIL=admin@diyou.test
ADMIN_PASSWORD=Diyou2024!

# 下面这些一般不用改
DATABASE_URL=file:/data/db/diyou.db
STORAGE_ROOT=/data/storage
CORS_ORIGIN=true
```

### 必填项说明

| 配置项 | 怎么填 | 示例 |
|---|---|---|
| `JWT_SECRET` | 一串随机字符，越乱越好 | `aBcD1234xyz...` |
| `ADMIN_EMAIL` | 管理员登录邮箱 | `admin@diyou.test` |
| `ADMIN_PASSWORD` | 管理员密码，至少 8 位，同时含字母和数字 | `Diyou2024!` |
| `SITE_ADDRESS` | 公网域名，没有就保持 `localhost` | `localhost` |

> ⚠️ **密码必须同时包含英文字母和阿拉伯数字，且不少于 8 位，否则系统会拒绝。**

---

## 四、启动网站

### 1. 用 SSH 登录 NAS

群晖：控制面板 → 终端机和 SNMP → 启用 SSH。
威联通：控制台 → 网络与文件服务 → Telnet/SSH → 允许 SSH。

在电脑打开终端（Windows 用 PowerShell，Mac 用 Terminal），执行：

```bash
ssh admin@192.168.0.105
```

把 `admin` 换成你的 NAS 管理员用户名，`192.168.0.105` 换成你的 NAS IP。

### 2. 进入项目目录

```bash
cd /volume1/docker/diyou
```

### 3. 一键启动

```bash
docker compose up -d --build
```

第一次会下载镜像、编译前后端、创建数据库，可能需要 **5–15 分钟**，请耐心等待。

### 4. 查看运行状态

```bash
docker compose ps
```

正常应该看到 `diyou-backend`、`diyou-web` 两个容器是 `Up (healthy)` 状态。

### 5. 看启动日志（出问题才需要）

```bash
docker compose logs -f diyou-backend
```

按 `Ctrl + C` 退出日志查看。

---

## 五、访问网站

### 局域网访问

在浏览器地址栏输入：

```text
https://192.168.0.105
```

把 IP 换成你的 NAS IP。

> 第一次访问会提示“证书不安全”，这是因为 NAS 本地部署用的是自签名证书。**点击“高级” → “继续前往”即可**。

### 登录

用 `.env` 里设置的邮箱和密码登录：

```text
邮箱：admin@diyou.test
密码：Diyou2024!
```

---

## 六、首次使用教程

登录后建议按这个顺序操作：

### 1. 创建家庭

1. 进入“上传”页面。
2. 选择“家庭”标签。
3. 输入家庭名称，例如“李家”、“张家”。
4. 提交。

### 2. 创建队员

1. 进入“上传”页面。
2. 选择“队员”标签。
3. 填写姓名、选择队伍（红队/蓝队）、选择家庭。
4. 提交。

### 3. 上传文章/诗集

1. 进入“上传”页面。
2. 选择“文章/诗集”标签。
3. 在“智能导入”里粘贴微信公众号源码，点击解析。
4. 检查标题、作者、日期是否自动填入。
5. 修改或补充内容。
6. 提交。

### 4. 上传照片/视频

1. 进入“上传”页面。
2. 选择“媒体”标签。
3. 选择文件上传。
4. 系统会自动识别照片拍摄时间，也可以手动修改。

### 5. 记录比赛

1. 进入“上传”页面。
2. 选择“比赛”标签。
3. 填写比赛时间、红队比分、蓝队比分、参赛队员、MVP。
4. 提交。

### 6. 创建纪事

1. 进入“上传”页面。
2. 选择“纪事”标签。
3. 填写标题、发生日期、描述。
4. 可以关联已有的照片、视频、文章、比赛。
5. 提交。

---

## 七、日常维护命令

### 停止网站

```bash
cd /volume1/docker/diyou
docker compose down
```

### 重启网站

```bash
cd /volume1/docker/diyou
docker compose restart
```

### 更新到新版

```bash
cd /volume1/docker/diyou
docker compose down
docker compose pull
docker compose up -d --build
```

> 更新不会删除已有数据，数据库和媒体文件都保存在 Docker 卷里。

---

## 八、备份与恢复

### 备份

在 NAS 的 SSH 中执行：

```bash
cd /volume1/docker/diyou
./scripts/backup.sh ./backups
```

备份文件会生成在：

```text
/volume1/docker/diyou/backups/diyou-backup-YYYYMMDD-HHMMSS.tar.gz
```

建议每周或每月执行一次，并把备份文件复制到电脑或其他硬盘。

### 恢复

```bash
cd /volume1/docker/diyou
./scripts/restore.sh backups/diyou-backup-YYYYMMDD-HHMMSS.tar.gz
```

把文件名换成实际的备份文件名。

---

## 九、公网访问（可选，进阶）

如果你希望不在家也能访问：

### 方案 1：内网穿透（推荐新手）

使用 Tailscale、ZeroTier 或花生壳等工具，把 NAS 和你手机/电脑组成虚拟局域网。这样不需要开放公网端口，相对安全。

### 方案 2：公网域名 + HTTPS

1. 买一个域名（例如 `diyou.yourdomain.com`）。
2. 在路由器做端口映射：把外部 80/443 映射到 NAS 的 80/443。
3. 修改 `.env`：

```env
SITE_ADDRESS=diyou.yourdomain.com
```

4. 用 HTTPS 覆盖文件启动：

```bash
cd /volume1/docker/diyou
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

5. Caddy 会自动申请并续期 Let's Encrypt 证书。

---

## 十、常见问题

### 1. 访问时显示“无法访问此网站”

- 检查 NAS IP 是否填对。
- 检查 NAS 防火墙是否放行 80/443 端口。
- 执行 `docker compose ps` 看容器是否都在运行。

### 2. 提示“证书不安全”

- 正常现象，点击“高级” → “继续前往”。
- iPhone 安装到主屏幕时可能需要信任 Caddy 本地证书；如果只是网页访问，不用处理。

### 3. 忘记管理员密码

修改 `.env` 里的 `ADMIN_PASSWORD`，然后重启：

```bash
cd /volume1/docker/diyou
docker compose restart diyou-backend
```

### 4. 容器起不来

看日志：

```bash
docker compose logs -f diyou-backend
```

常见原因：

- `JWT_SECRET` 没改。
- 端口 80/443 被 NAS 自带服务占用，可以改成 `HTTP_PORT=8080`、`HTTPS_PORT=8443`。

### 5. 电脑进不了 BIOS，本地跑不了 Docker

不影响 NAS 部署。NAS 本身的 Docker 不需要你电脑的 BIOS。部署和访问都在 NAS 上进行。

---

## 十一、命令速查表

```bash
# 登录 NAS
ssh admin@192.168.0.105

# 进入目录
cd /volume1/docker/diyou

# 启动
docker compose up -d --build

# 停止
docker compose down

# 重启
docker compose restart

# 看状态
docker compose ps

# 看后端日志
docker compose logs -f diyou-backend

# 备份
./scripts/backup.sh ./backups

# 恢复
./scripts/restore.sh backups/xxx.tar.gz
```

---

如果还有疑问，可以把报错信息复制给技术支持或开发者。
