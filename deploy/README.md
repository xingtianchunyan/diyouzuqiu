# 部署包使用说明

本目录包含一个给非技术用户使用的图形化部署向导。

## 文件

- `diyou-deploy-wizard.html`：Windows 双击即可打开的网页表单，填写后生成极空间 NAS 部署包。

## 使用流程

1. 在 Windows 电脑上双击 `diyou-deploy-wizard.html`。
2. 按页面提示填写：NAS IP/域名、存储路径、安全密钥、管理员账号、SMTP 授权码等。
3. 选择镜像访问方式：
   - **公开镜像**：最简单，任何人都能拉取，适合不介意源码/镜像被下载的场景。
   - **私有镜像**：更安全。需要先在 GitHub 上把客户的 GitHub 账号加入 `diyou-backend` 和 `diyou-web` 两个包的 Read 权限，再让客户生成只含 `read:packages` 权限的 Personal Access Token。
4. 点击“生成部署文件包”，下载 `diyou-zspace-deploy.zip`。
5. 把 zip 解压到极空间 NAS 上的目标文件夹。
6. 如果选择了私有镜像，先按 `docker-login-极空间.txt` 里的命令在极空间 SSH 中执行 `docker login ghcr.io`。
7. 在极空间 Docker 应用中：Compose → 新建项目 → 从本地导入 → 选中项目文件夹 → 创建。
8. 等待镜像下载并启动，然后用浏览器访问填写的 IP/域名。

## 镜像仓库

预构建镜像由 GitHub Actions 自动推送到：

```text
ghcr.io/xingtianchunyan/diyou-backend:latest
ghcr.io/xingtianchunyan/diyou-web:latest
```

如需使用私有镜像，请确保：

1. 在 GitHub Package 设置中将 `diyou-backend` 和 `diyou-web` 的可见性设为 **Private**。
2. 为客户的 GitHub 账号分配这两个包的 **Read** 权限。
3. 客户生成 Personal Access Token 时只勾选 `read:packages`。
4. 在极空间 NAS 上执行过一次 `docker login ghcr.io`。

## 域名与 HTTPS

- 如果没有域名，向导会按局域网 IP 生成自签名 HTTPS 配置，浏览器首次访问会提示“证书不安全”，点击继续即可。
- 如果已有域名并在 Cloudflare 等 DNS 配置了 A 记录指向 NAS，向导会按域名生成配置，Caddy 会自动申请 Let's Encrypt 证书。

## 交付前检查清单

- [ ] GitHub Packages 可见性已按需求设置（公开或私有）。
- [ ] 如使用私有镜像，已给客户账号授权并拿到 Token。
- [ ] 客户已填写正确的 SMTP 授权码，能正常发送验证码邮件。
- [ ] 客户知道管理员初始邮箱和密码。
- [ ] 客户已在极空间 NAS 上新建好项目文件夹和四个子文件夹（db、storage、caddy-data、caddy-config）。
