# 棣友档案站 NAS Docker 傻瓜式部署指南

> 目标：不需要懂代码，只要会复制粘贴，就能把网站跑起来。  
> 本指南对应项目当前版本（含邮箱验证码、知识库、账号批量导入等功能）。

---

## 🌟 推荐：使用“填表生成器”（最简单）

如果你的客户或你自己不想手动改配置文件，请直接使用：

```
deploy/diyou-deploy-wizard.html
```

**用法**：在 Windows 电脑上双击这个文件，浏览器打开后按提示填写：NAS IP/域名、管理员账号、邮箱授权码等，最后点击 **“生成部署文件包”**，会下载一个 `diyou-zspace-deploy.zip`。把 zip 解压到极空间上，再按本指南第六章导入即可。

下面章节为手动部署说明，供参考。

---

## 一、先确认这几件事

1. 你有一台 **极空间 NAS**（或其他支持 Docker Compose 的 NAS，如群晖、威联通）。
2. NAS 上已安装 **Docker** 和 **Docker Compose**。
3. 你的电脑和 NAS 连接在同一个路由器/局域网内。
4. 你知道 NAS 的 **局域网 IP 地址**（例如 `192.168.0.105`）。

---

## 二、把项目文件放到 NAS 上

### 方法 A：用电脑复制（最简单）

1. 把项目压缩包解压到电脑桌面，得到一个名为 `diyou` 的文件夹。
2. 打开 NAS 的共享文件夹，例如 `\\192.168.0.105\docker`。
3. 把 `diyou` 文件夹复制进去。

最终 NAS 上的路径应该类似：

```text
/SATA存储/docker/diyou
```

> 极空间用户：共享文件夹通常在 `/SATA存储/` 或 `/M2存储/` 下。

### 方法 B：用 Git 拉取

如果 NAS 能访问 GitHub：

```bash
cd /SATA存储/docker
git clone https://github.com/xingtianchunyan/diyouzuqiu.git diyou
cd diyou
```

---

## 三、配置环境变量

1. 在 NAS 上进入 `diyou` 文件夹。
2. 找到 `diyou/.env.example` 文件，复制一份，重命名为 `.env`。
3. 用文本编辑器打开 `.env`，至少修改下面 **加粗的几项**。

完整的 `.env` 示例：

```env
# 访问地址
# 只在局域网用就填写极空间 IP；有公网域名再改
SITE_ADDRESS=192.168.0.105

# Web 端口
HTTP_PORT=80
HTTPS_PORT=443

# 安全密钥：必须改！
# 执行下面命令生成：openssl rand -base64 32
JWT_SECRET=改成随机字符串

# 初始管理员账号（必须修改，否则无法登录）
ADMIN_EMAIL=admin@diyou.test
ADMIN_PASSWORD=改成你的强密码

# 后端监听地址（Docker 内必须保持 0.0.0.0，不要改）
HOST=0.0.0.0

# 跨域来源，必须与您访问网站的地址一致
# 局域网 IP：https://192.168.0.105
# 公网域名：https://diyou.yourdomain.com
CORS_ORIGIN=https://192.168.0.105

# 下面这些一般不用改
DATABASE_URL=file:/data/db/diyou.db
STORAGE_ROOT=/data/storage

# 真实邮箱验证码（SMTP）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=你的授权码
SMTP_FROM=你的邮箱@qq.com
```

### 必填项说明

| 配置项 | 怎么填 | 示例 |
|---|---|---|
| `JWT_SECRET` | 一串随机字符，越乱越好 | `aBcD1234xyz...` |
| `ADMIN_EMAIL` | 管理员登录邮箱 | `admin@diyou.test` |
| `ADMIN_PASSWORD` | 管理员密码，至少 8 位，同时含**大写、小写、数字** | `Diyou2024!` |
| `SITE_ADDRESS` | 极空间 IP 或域名 | `192.168.0.105` |
| `CORS_ORIGIN` | 必须与浏览器地址栏一致 | `https://192.168.0.105` |
| `HOST` | Docker 部署保持 `0.0.0.0` | `0.0.0.0` |

> ⚠️ **生产环境 `CORS_ORIGIN` 不能写 `true`，必须填写实际访问地址。**

### 邮箱授权码获取

- **QQ 邮箱**：登录网页版 → 设置 → 账户 → 开启“IMAP/SMTP服务” → 获取 16 位授权码。
- **163 邮箱**：设置 → POP3/SMTP/IMAP → 开启服务 → 获取授权码。
- **Gmail**：开启两步验证 → 生成“应用专用密码”。

---

## 四、启动网站（极空间 Docker）

### 1. 打开极空间 Docker 应用

依次点击：**Docker → Compose → 新建项目**。

### 2. 导入项目

- 项目名称填 `diyou`。
- 添加方式选择 **“从本地导入（NAS）”**。
- 选中刚才的 `/SATA存储/docker/diyou` 文件夹。
- 确认代码框里已经读取了 `docker-compose.yaml`。

### 3. 创建并启动

点击 **“创建”**。系统会自动下载 GitHub Container Registry 上的预构建镜像并启动。

首次启动大约需要 **5–15 分钟**，取决于网络速度。

### 4. 查看运行状态

在极空间 Docker 的“容器”标签页，确认 `diyou-backend` 和 `diyou-web` 都是运行中状态。

### 5. 看启动日志（出问题才需要）

在容器列表里点击 `diyou-backend` → “日志”查看。

---

## 五、访问网站

### 局域网访问

在浏览器地址栏输入：

```text
https://192.168.0.105
```

把 IP 换成你的极空间 IP。

> 第一次访问会提示“证书不安全”，这是因为本地部署用的是自签名证书。**点击“高级” → “继续前往”即可**。

### 登录

用 `.env` 里设置的邮箱和密码登录：

```text
邮箱：admin@diyou.test
密码：你刚才在 .env 里设置的 ADMIN_PASSWORD
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

### 3. 批量导入账号（可选）

1. 进入“账号管理”页面。
2. 点击“批量导入”。
3. 在表格中填写：邮箱、密码、角色（目前只支持 MEMBER）、队员姓名、队伍、家庭。
4. 也可以上传 CSV / Excel 自动填充。
5. 密码留空时，系统会自动生成 12 位随机临时密码，并在导入成功后显示给管理员。

> 批量导入**不能创建管理员**，管理员账号必须单独创建。

### 4. 上传文章/诗集

1. 进入“上传”页面。
2. 选择“文章/诗集”标签。
3. 在“智能导入”里粘贴微信公众号源码，点击解析。
4. 检查标题、作者、日期是否自动填入。
5. 修改或补充内容。
6. 提交。

### 5. 上传照片/视频

1. 进入“上传”页面。
2. 选择“媒体”标签。
3. 选择文件上传。
4. 系统会自动识别照片拍摄时间，也可以手动修改。

### 6. 记录比赛

1. 进入“上传”页面。
2. 选择“比赛”标签。
3. 填写比赛时间、红队比分、蓝队比分、参赛队员、MVP。
4. 提交。

### 7. 创建纪事

1. 进入“上传”页面。
2. 选择“纪事”标签。
3. 填写标题、发生日期、描述。
4. 可以关联已有的照片、视频、文章、比赛。
5. 提交。

### 8. 使用知识库（可选）

1. 进入“知识库”页面。
2. 上传 docx / xlsx / pdf 等工作文档。
3. 可与知识库对话，或基于文档生成活动策划。

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
git pull                  # 如果用 git 拉取的项目
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
# 建议同时指定 CORS 来源
CORS_ORIGIN=https://diyou.yourdomain.com
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
- 如果 `diyou-backend` 一直 `unhealthy`，看日志：

```bash
docker compose logs -f diyou-backend
```

### 2. 提示“证书不安全”

- 正常现象，点击“高级” → “继续前往”。
- iPhone 安装到主屏幕时可能需要信任 Caddy 本地证书；如果只是网页访问，不用处理。

### 3. 忘记管理员密码

修改 `.env` 里的 `ADMIN_PASSWORD` 为新的强密码，然后重启：

```bash
cd /volume1/docker/diyou
docker compose restart diyou-backend
```

下次启动时会用新密码覆盖管理员账号。

### 4. 容器起不来

看日志：

```bash
docker compose logs -f diyou-backend
```

常见原因：

- `JWT_SECRET` 没改。
- `ADMIN_PASSWORD` 没设置。
- 端口 80/443 被 NAS 自带服务占用，可以改成 `HTTP_PORT=8080`、`HTTPS_PORT=8443`。

### 5. 邮箱验证码收不到

- 如果没有配置 SMTP，这是正常的，验证码会打印在后端日志里。
- 如果配置了 SMTP 仍收不到，检查：
  - `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS` 是否填对。
  - 是否用的是“授权码”而不是登录密码（QQ/163/Gmail 通常如此）。
  - 查看后端日志里的具体报错。

### 6. 电脑进不了 BIOS，本地跑不了 Docker

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
