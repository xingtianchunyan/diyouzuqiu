# 环境变量约定

## 原则
- 密钥与敏感信息不提交到仓库
- 前端仅使用以 VITE_ 开头的变量
- 后端读取 .env（或 .env.local），并在生产环境通过运行时注入

## 文件分层
- frontend/.env.example：提交到仓库，用于说明变量
- frontend/.env.local：本地开发使用，不提交
- backend/.env.example：提交到仓库，用于说明变量
- backend/.env.local：本地开发使用，不提交

## 前端变量
| 变量名 | 说明 | 示例 |
|---|---|---|
| VITE_API_BASE_URL | 后端 API 基地址 | http://localhost:3000 |

## 后端变量
| 变量名 | 说明 | 示例 |
|---|---|---|
| PORT | 监听端口 | 3000 |
| DATABASE_URL | PostgreSQL 连接串 | postgresql://user:pass@localhost:5432/diyou?schema=public |
| JWT_SECRET | JWT 签名密钥 | （仅本地/生产注入） |

