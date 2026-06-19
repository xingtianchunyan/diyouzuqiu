# 棣友足球队内部档案站

一个面向家庭 NAS 部署的足球队资料管理 PWA，支持队员/家庭、比赛、文章/诗集、媒体、纪事、知识库、年会策划、邮箱验证码登录等功能。

## 主要功能

- 队员与家庭管理
- 文章 / 诗集导入与 Markdown 编辑
- 媒体（照片/视频）上传与人物标签
- 比赛记录与 MVP
- 纪事与时间线
- 管理员账号管理、密码重置、批量导入
- 知识库文档上传与 AI 对话
- 邮箱验证码登录（可选真实 SMTP）

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev:backend
npm run dev:frontend
```

## 测试

```bash
# 后端测试
npm run -w backend test

# 前端构建检查
npm run -w frontend build
```

## 生产部署（Docker NAS）

- 技术部署说明：[DEPLOY.md](./DEPLOY.md)
- 傻瓜式逐步操作指南（给客户/自己用）：[DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md)

> 部署前请务必将 `.env.example` 复制为 `.env`，并修改 `JWT_SECRET` 和 `ADMIN_PASSWORD`。
