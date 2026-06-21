# Diyou 档案站 — Windows Docker 傻瓜式部署指南

> 目标：在 Windows 电脑的 Docker Desktop 上把网站跑起来，不需要懂代码，按步骤复制粘贴即可。
> 本指南适用于 Windows 10/11 + Docker Desktop（WSL2 后端）。

---

## 一、确认电脑环境

1. **Windows 10 版本 1903 及以上**，或 **Windows 11**。
2. 已开启虚拟化（BIOS 里 Intel VT-x / AMD-V 已启用，通常默认开启）。
3. 电脑至少有 **8GB 内存**，建议 **16GB**（Docker + 浏览器同时运行）。
4. 硬盘剩余空间 **≥ 10GB**。

---

## 二、安装 Docker Desktop

### 2.1 下载并安装

1. 打开官网：https://www.docker.com/products/docker-desktop
2. 点击 **"Download for Windows - AMD64"** 下载安装包。
3. 双击下载的 `Docker Desktop Installer.exe`。
4. 安装过程中勾选 **"Use WSL 2 instead of Hyper-V"**（推荐，性能更好）。
5. 等待安装完成，点击 **Close and restart**。

### 2.2 启动并验证

1. 从开始菜单打开 **Docker Desktop**。
2. 首次启动可能需要你登录 Docker 账号，可以跳过或注册一个免费账号。
3. 等左下角显示 **"Engine running"**（绿色）即可。
4. 打开 PowerShell 或命令提示符，输入：

```powershell
docker --version
docker compose version
```

看到类似下面的输出说明安装成功：

```text
Docker version 27.x.x, build xxxxx
docker compose version v2.x.x
```

> ⚠️ **如果命令提示 "docker 不是内部或外部命令"**：重启电脑，或检查 Docker Desktop 是否已启动。

---

## 三、把项目文件放到电脑上

### 3.1 找到项目文件夹

你当前的项目路径应该是类似：

```text
E:\AI编程\Diyouqiudui\SOLO web diyou
```

这个文件夹里应该包含：

```text
SOLO web diyou/
├── docker-compose.yml
├── docker-compose.windows.yml
├── .env.example
├── backend/
├── frontend/
├── web/
└── scripts/
```

### 3.2 复制到独立部署目录（推荐）

为了避免路径里有空格或中文导致意外问题，建议把项目复制到一个简单的英文路径下：

1. 打开文件资源管理器。
2. 进入 `E:\AI编程\Diyouqiudui\`。
3. 复制 `SOLO web diyou` 文件夹。
4. 粘贴到 `C:\diyou` 或 `D:\diyou`（你自己选一个盘）。
5. 把文件夹重命名为简单的 `diyou`。

最终路径示例：

```text
C:\diyou
```

> 💡 **为什么建议英文路径？** Docker 在 Windows 上处理中文或带空格的路径偶尔会有问题，英文路径最稳。

---

## 四、配置环境变量

### 4.1 复制配置文件

1. 打开 `C:\diyou` 文件夹。
2. 找到 `.env.example` 文件。
3. 复制一份，重命名为 `.env`。
4. 用记事本或 VS Code 打开 `.env`。

### 4.2 必填项修改

至少需要修改下面 **5 项**：

```env
# 访问地址
# 只在本地电脑使用就填 localhost；同一局域网其他设备访问填本机 IP
SITE_ADDRESS=localhost

# Web 端口（Windows 上 80/443 常被系统占用，默认改成 8080/8443）
HTTP_PORT=8080
HTTPS_PORT=8443

# 安全密钥：必须改！
# 打开 PowerShell，执行：node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=改成随机字符串

# 初始管理员账号（必须修改，否则无法登录）
ADMIN_EMAIL=admin@diyou.test
ADMIN_PASSWORD=改成你的强密码

# 跨域来源，必须与您访问网站的地址一致
# 本地访问：http://localhost:8080
# 同一局域网其他设备访问：http://192.168.x.x:8080
CORS_ORIGIN=http://localhost:8080

# 后端监听地址（Docker 内必须保持 0.0.0.0，不要改）
HOST=0.0.0.0
```

### 4.3 密码强度要求

`ADMIN_PASSWORD` 必须同时满足：

- 至少 8 位
- 同时包含大写字母、小写字母、数字

示例：`Diyou2024!`

### 4.4 生成 JWT_SECRET

打开 PowerShell，复制粘贴下面命令：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> 如果提示 "node 不是内部命令"，说明你没装 Node.js。可以改用 PowerShell 生成：
> ```powershell
> -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
> ```
> 生成后手动复制到 `.env` 里的 `JWT_SECRET=` 后面。

把生成的字符串复制到 `.env` 中 `JWT_SECRET=` 后面。

### 4.5 真实邮箱验证码（可选）

如果你希望邮箱验证码真实发送，配置 SMTP：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=你的授权码
SMTP_FROM=你的邮箱@qq.com
```

不配 SMTP 也没关系，验证码会显示在 Docker Desktop 的后端日志里。

---

## 五、启动网站

### 方法一：一键脚本（最简单）

1. 打开 PowerShell。
2. 进入项目目录：

```powershell
cd C:\diyou
```

3. 执行一键部署脚本：

```powershell
.\scripts\windows-deploy.ps1
```

4. 脚本会自动：
   - 检查 Docker 是否运行
   - 检查 `.env` 是否存在
   - 自动从 GitHub Container Registry 拉取镜像
   - 启动后端和前端容器
   - 显示访问地址

首次启动大约需要 **5–15 分钟**，取决于网络速度。

### 方法二：手动命令启动

1. 打开 PowerShell。
2. 进入项目目录：

```powershell
cd C:\diyou
```

3. 使用 Windows 专用 Compose 文件启动：

```powershell
docker compose -f docker-compose.windows.yml up -d
```

4. 等待拉取镜像并启动完成。

---

## 六、检查是否启动成功

### 6.1 查看容器状态

在 PowerShell 中输入：

```powershell
docker compose -f docker-compose.windows.yml ps
```

如果看到 `diyou-backend` 和 `diyou-web` 的状态都是 `running (healthy)`，说明启动成功。

### 6.2 查看日志

如果启动失败，看日志定位问题：

```powershell
# 后端日志
docker compose -f docker-compose.windows.yml logs -f diyou-backend

# 前端日志
docker compose -f docker-compose.windows.yml logs -f diyou-web
```

按 `Ctrl + C` 退出日志查看。

---

## 七、访问网站

### 7.1 本机访问

打开浏览器，输入：

```text
http://localhost:8080
```

> ⚠️ **务必修改端口！** `.env.example` 默认是 `HTTP_PORT=80` / `HTTPS_PORT=443`，但 Windows 上这两个端口常被系统/IIS/其他服务占用，会导致启动失败。Windows 部署请改成 `8080` / `8443`（或你喜欢的其他大于 1024 的端口）。
>
> 本机访问地址：`http://localhost:8080`

### 7.2 同一局域网其他设备访问

1. 查看本机 IP：

```powershell
ipconfig
```

找到类似 `192.168.x.x` 的地址。

2. 在手机/其他电脑浏览器输入：

```text
http://192.168.x.x:8080
```

### 7.3 登录

用 `.env` 里设置的邮箱和密码登录：

```text
邮箱：admin@diyou.test
密码：你刚才在 .env 里设置的 ADMIN_PASSWORD
```

---

## 八、常见问题

### 8.1 端口 8080 被占用

如果启动时报错 `bind: address already in use`，说明 8080 端口被其他程序占用。

修改 `.env`：

```env
HTTP_PORT=8081
```

然后重启：

```powershell
docker compose -f docker-compose.windows.yml down
docker compose -f docker-compose.windows.yml up -d
```

### 8.2 拉取镜像很慢或失败

因为镜像托管在 GitHub Container Registry（ghcr.io），国内访问可能较慢。

解决方法：

1. 开启代理/加速器。
2. 或在 Docker Desktop 设置 → Docker Engine 里配置镜像加速器（如 DaoCloud、阿里云镜像）。
3. 重启 Docker Desktop 后再试。

### 8.3 提示 "JWT_SECRET is required"

说明 `.env` 文件没有正确加载。检查：

- `.env` 文件是否在项目根目录（和 `docker-compose.windows.yml` 同级）
- `JWT_SECRET=` 后面是否有值
- 文件是否保存为 UTF-8 编码

### 8.4 忘记管理员密码

修改 `.env` 中的 `ADMIN_PASSWORD`，然后重启后端容器：

```powershell
docker compose -f docker-compose.windows.yml restart diyou-backend
```

下次启动时会用新密码覆盖管理员账号。

### 8.5 怎么停止网站

```powershell
cd C:\diyou
docker compose -f docker-compose.windows.yml down
```

### 8.6 怎么更新到新版

```powershell
cd C:\diyou
docker compose -f docker-compose.windows.yml down
docker compose -f docker-compose.windows.yml pull
docker compose -f docker-compose.windows.yml up -d
```

---

## 九、备份数据

你的数据（数据库、上传的文件）都保存在 Docker 卷里，不会因为你删除容器而丢失。

要备份，在 PowerShell 中执行：

```powershell
cd C:\diyou
docker run --rm -v diyou-db:/data/db -v diyou-storage:/data/storage -v ${PWD}:/backup alpine tar czf /backup/diyou-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz /data/db /data/storage
```

会在当前目录生成 `diyou-backup-时间戳.tar.gz`。

---

## 十、文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.windows.yml` | Windows Docker Desktop 专用部署文件 |
| `.env` | 你的配置文件（由 `.env.example` 复制而来） |
| `scripts/windows-deploy.ps1` | Windows 一键部署脚本 |
| `DEPLOY-GUIDE.md` | 极空间/NAS 部署指南 |
| `DEPLOY.md` | 通用 Docker 部署说明 |

---

## 十一、如果你要二次开发

如果你不只是部署，还要改代码，请参考项目根目录的 `README.md` 和 `AGENTS.md`，使用本地开发模式：

```powershell
npm install
npm run dev:backend
npm run dev:frontend
```

---

**祝你部署顺利！** 如果遇到问题，把 `docker compose -f docker-compose.windows.yml logs` 的输出发给开发者。
