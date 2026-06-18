# SOLO web diyou 安全测试报告

> 评估范围：前端（Vue 3 + Vite + PWA）+ 后端（Fastify + Prisma + SQLite）
> 评估方式：白盒代码审计 + 攻击面梳理
> 报告日期：2026-06-18

---

## 1. 执行摘要

本次安全测试以攻击者视角对项目进行了全面审计，共发现 **7 项高风险/严重漏洞**，主要集中在：**未授权访问、越权文件读取、CORS 配置错误、JWT 硬编码/永不过期、文件上传绕过导致的存储型 XSS、SSRF** 等方面。此外还存在多处中低风险（信息泄露、输入校验缺失、安全响应头缺失等）。

### 风险等级分布

| 等级 | 数量 | 编号 |
|------|------|------|
| 严重 (Critical) | 3 | C-01, C-02, C-03 |
| 高 (High) | 4 | H-01 ~ H-04 |
| 中 (Medium) | 5 | M-01 ~ M-05 |
| 低 (Low) | 4 | L-01 ~ L-04 |
| 信息 (Info) | 2 | I-01, I-02 |

---

## 2. 测试方法与范围

- **代码审查**：`backend/src`、`frontend/src` 全部路由、插件、服务、组件
- **依赖扫描**：`npm audit`（当前 0 漏洞）
- **攻击面**：认证授权、输入校验、文件上传、静态资源、CORS/CSRF、业务逻辑、AI/解析接口、配置与容器

---

## 3. 严重漏洞（Critical）

### C-01 媒体文件任意公开读取（未授权）

**位置**：`backend/src/modules/media/media.routes.ts:264`

```ts
app.get('/media/:id/file', async (request, reply) => {
  const { id } = request.params as { id: string }
  const media = await prisma.mediaAsset.findUnique({ where: { id } })
  if (!media || !media.storagePath) {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } })
  }
  return reply.sendFile(media.storagePath)
})
```

**问题**：该接口**没有 `preValidation: [app.authenticate]`**，任何知道媒体 ID 的人无需登录即可直接下载照片/视频。

**影响**：
- 用户上传的私人照片、视频可被批量爬取（ID 为 CUID，可枚举猜测）。
- 如果照片包含敏感信息（人脸、地理位置、活动细节），造成隐私泄露。

**复现**：
```bash
curl -O http://<host>/api/v1/media/<任意ID>/file
```

**修复**：
```ts
app.get('/media/:id/file', { preValidation: [app.authenticate] }, async (request, reply) => {
  // 非 ADMIN 时检查：上传者 或 独占标签为自己的成员
  // ...
})
```

---

### C-02 头像上传无任何校验 → 存储型 XSS

**位置**：`backend/src/modules/members/members.routes.ts:141`、`backend/src/lib/storage.ts:83`

`saveAvatarFile` 没有校验文件扩展名、MIME 类型、文件头或图片尺寸：

```ts
const ext = path.extname(file.filename) || '.jpg'
const finalFilename = `${memberId}_${timestamp}${ext}`
```

攻击者可上传 `evil.html` 作为头像，后端保存为 `avatars/<memberId>_<ts>.html`，并通过 `/static-storage/avatars/...` 以 `text/html` 响应。

**影响**：
- 存储型 XSS：诱导管理员/用户直接访问头像 URL 即可执行任意脚本。
- 由于头像 URL 可能被写入 `Member.avatarUrl`，也可通过 `javascript:` 协议在 `<img src>` 场景下触发脚本。

**复现**：
1. 以普通用户登录，上传文件名为 `xss.html` 的头像，内容为 `<script>alert(document.cookie)</script>`。
2. 后端返回 `/static-storage/avatars/<id>_<ts>.html`。
3. 直接访问该 URL，浏览器以 HTML 解析并执行脚本。

**修复**：
- 头像强制转换为 WebP/JPEG 并重新编码（使用 `sharp` 等库）。
- 限制扩展名为 `.jpg/.jpeg/.png/.webp/.gif`。
- 校验 MIME 类型和文件魔数。
- `PUT /members/:id` 中 `avatarUrl` 字段禁止任意字符串，只允许 `/static-storage/avatars/` 前缀。

---

### C-03 CORS 默认允许任意来源且携带凭证

**位置**：`backend/src/app.ts:26`

```ts
function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN
  if (!raw || raw === 'true') return true
  ...
}
```

**问题**：生产环境若未设置 `CORS_ORIGIN`，默认 `origin: true` 且 `credentials: true`，即**任何网站**都能携带用户 Cookie/Token 跨域调用 API。

**影响**：
- 攻击者搭建恶意网站，诱使已登录用户访问，即可在其浏览器中调用 `/api/v1/admin/users/batch` 等接口执行批量导入、删除用户等操作。
- 与本地存储 Token 结合，造成完全账户接管。

**修复**：
```ts
function getCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGIN must be set in production')
    }
    return false // 开发环境默认不允许跨域带凭证
  }
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw.split(',').map(s => s.trim())
}
```

---

## 4. 高风险漏洞（High）

### H-01 JWT 密钥存在硬编码回退且刷新令牌永不过期

**位置**：`backend/src/plugins/auth.plugin.ts:21`、`backend/src/modules/auth/auth.routes.ts:53`

1. 硬编码回退密钥：
```ts
secret: process.env.JWT_SECRET || 'super-secret-key'
```
若部署时未设置 `JWT_SECRET`，攻击者可直接伪造任意用户 Token。

2. 刷新接口使用 `ignoreExpiration: true`：
```ts
payload = app.jwt.verify(rawToken, { ignoreExpiration: true })
```
且没有 Token 黑名单/撤销机制。Token 一旦泄露，理论上可永久刷新使用，直到用户被删除或密钥轮换。

**修复**：
- 移除 `'super-secret-key'` 回退，未设置 `JWT_SECRET` 时启动失败。
- 刷新接口不应忽略过期；建议使用 Refresh Token + Access Token 双令牌机制，并支持登出黑名单。
- JWT 密钥生产环境应 ≥ 256 bit 随机字符串。

---

### H-02 `/parse` URL 抓取接口存在 SSRF

**位置**：`backend/src/modules/parse/parse.routes.ts:411`、`backend/src/lib/ai/qwen.client.ts`

```ts
app.get('/parse', async (request, reply) => {
  const { url } = request.query as { url?: string }
  ...
  html = await fetchHtml(url, app.log)
})
```

该接口**未认证**，且对 `url` 没有协议、域名、IP 限制。`fetchHtml` 使用 `fetch(url, ...)` 直接请求。

**影响**：
- 读取云厂商元数据：`http://169.254.169.254/latest/meta-data/`
- 扫描内网端口、访问内部服务（Redis、数据库管理面板、Kubernetes API 等）。
- 配合 `enableSearch` 的 AI 调用，造成 Qwen API 配额/费用消耗。

**修复**：
- `/parse` 整体增加 `app.authenticate`。
- URL 增加白名单/黑名单：仅允许 `http/https`，拒绝私有 IP、localhost、元数据地址。
- 使用 URL 解析库校验 host，必要时使用代理/隔离网络。

---

### H-03 多个读取接口未认证导致信息泄露

以下接口均未要求登录即可访问，泄露成员、活动、知识库、文集等敏感元数据：

| 接口 | 位置 | 泄露内容 |
|------|------|----------|
| `GET /api/v1/media` | media.routes.ts:103 | 所有媒体元数据、原始文件名、人物标签、上传者 |
| `GET /api/v1/media/:id` | media.routes.ts:171 | 单条媒体详情 |
| `GET /api/v1/chronicles` | chronicles.routes.ts:92 | 所有大事记、描述、关联成员/媒体 |
| `GET /api/v1/chronicles/daily-materials?date=...` | chronicles.routes.ts:6 | 按日期聚合的媒体/文集/比赛 |
| `GET /api/v1/knowledge` | knowledge.routes.ts:41 | 知识库标题与完整内容 |
| `GET /api/v1/works/:id` | works.routes.ts:120 | 文集完整正文（Markdown） |

**修复**：
- 所有业务读取接口统一添加 `preValidation: [app.authenticate]`。
- 若存在公开需求，应单独设计公开 API 并脱敏。

---

### H-04 认证插件错误处理可导致信息泄露/双重响应

**位置**：`backend/src/plugins/auth.plugin.ts:27`

```ts
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)  // 未 return
  }
})
```

**问题**：
- 捕获 JWT 错误后直接 `reply.send(err)`，未 `return`。Fastify 可能继续执行后续钩子，导致双重响应或逻辑绕过。
- `err` 可能包含 JWT 内部错误、堆栈，泄露实现细节。

**修复**：
```ts
} catch (err) {
  return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } })
}
```

---

## 5. 中风险漏洞（Medium）

### M-01 文件上传大小限制过大且无单文件限制

**位置**：`backend/src/app.ts:57`

```ts
await app.register(fastifyMultipart, {
  limits: {
    fileSize: 1024 * 1024 * 500 // 500MB
  }
})
```

500MB 过大，普通照片/文章不需要。若多名用户同时上传大文件，可导致磁盘/内存耗尽。

**修复**：
- 头像限制 5MB，媒体限制 100MB（或按类型细分）。
- 增加全局请求体大小限制。
- 限制并发上传数。

---

### M-02 多处输入未校验导致 DoS / 数据污染

- `chronicles` 创建/更新：`title`、`description` 无长度限制，可写入超大文本。
- `knowledge` 创建：`title`、`content` 无长度限制；`splitIntoChunks` 未限制总输入长度，大量内容会生成海量 chunk。
- `works` 创建/更新：`content` 无长度限制。
- `media` 上传：`meta.takenAt`、`meta.year` 直接 `new Date(...)`，可传入无效日期。

**修复**：
- 对所有字符串字段增加 `z.string().min(1).max(N)`。
- 知识库 content 限制总长度（如 100KB），chunk 数量限制。
- 日期字段使用 `z.string().datetime()` 或 `z.coerce.date()` 校验。

---

### M-03 AI 接口存在提示词注入与资源耗尽风险

**位置**：`backend/src/modules/planner/planner.routes.ts`

用户输入的 `constraints.notes`、`messages` 直接被拼接到 system prompt 中发送给大模型。攻击者可：
- 通过提示词注入覆盖 system prompt，诱导模型输出恶意内容。
- 在 `messages` 中插入超长内容，消耗 Token/费用。
- 连续调用 `/planner/annual` 或 `/planner/chat` 耗尽 API 配额（无 AI 接口单独限流）。

**修复**：
- 用户输入与系统提示严格分离（使用结构化 message 数组，避免字符串拼接）。
- 对单条消息长度、对话轮数、单用户 AI 调用频率做限制。
- AI 输出返回前端前再次使用 DOMPurify 清洗（前端已有，但后端也应清洗）。

---

### M-04 静态头像 URL 可被设置为任意外部 URL 或 `javascript:` 协议

**位置**：`backend/src/modules/members/members.routes.ts:107`

```ts
if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null
```

管理员可通过 `PUT /members/:id` 将 `avatarUrl` 设为 `javascript:alert(1)` 或外部恶意图片。

**影响**：
- 在 `PeoplePage.vue`、`PersonPage.vue` 中 `<img :src="member.avatarUrl">` 可能被触发。
- 现代浏览器对 `<img src="javascript:...">` 执行有限制，但仍是风险面；外部 URL 还会导致隐私泄露（Referer、IP）。

**修复**：
- 禁止直接设置 `avatarUrl`，仅允许通过上传接口生成内部路径。
- 若必须支持 URL，校验为 `https://` 开头并限制域名白名单。

---

### M-05 Excel 解析新增 XML 外部实体（XXE）风险

**位置**：`backend/src/modules/users/users.routes.ts`（本次新增）

本次迁移引入 `read-excel-file/node`，其底层依赖 `@xmldom/xmldom` 解析 XLSX（ZIP 内 XML）。虽然 `npm audit` 当前未报漏洞，但 xlsx 文件本质上包含 XML，若解析器未禁用 DTD/外部实体，可能存在：
- XXE（读取服务器本地文件）。
- Billion Laughs / Zip bomb DoS。

**修复**：
- 在解析前校验文件大小、ZIP 条目数量与压缩比。
- 监控 `@xmldom/xmldom` 安全公告，及时升级。
- 考虑在沙箱/子进程中解析不可信 Office 文档。

---

## 6. 低风险漏洞（Low）

### L-01 缺少安全响应头

后端未配置：
- `Content-Security-Policy`
- `X-Frame-Options`（可被点击劫持登录页/管理页）
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `Referrer-Policy`

**修复**：注册 `@fastify/secure-session` 或自行通过 `reply.header()` / `fastify-helmet` 添加。

---

### L-02 密码策略较弱

**位置**：`backend/src/lib/password.ts`

仅要求 8 位 + 1 字母 + 1 数字，未限制常见弱口令、字典攻击、键盘序列。

**修复**：
- 增加字典检查或 zxcvbn 强度评分。
- 禁止使用泄露密码（Have I Been Pwned API 或本地字典）。

---

### L-03 错误处理泄露内部信息

**位置**：`backend/src/modules/members/members.routes.ts:101`

```ts
return reply.code(500).send({ error: e.message })
```

生产环境应返回统一错误码，不暴露 `e.message` 或堆栈。

---

### L-04 开发配置暴露到生产构建

**位置**：`frontend/vite.config.ts`

- `server.host: true` 仅在 dev 生效，无直接风险。
- `basicSsl()` 使用自签名证书，生产应使用正式 TLS 证书。
- PWA `devOptions.enabled: true` 仅在开发生效。

---

## 7. 信息项（Info）

### I-01 Token 存储在 localStorage

**位置**：`frontend/src/stores/auth.ts`

JWT 保存在 `localStorage`，若发生 XSS 可被直接窃取。当前 XSS 入口已通过 DOMPurify 大幅缓解，但仍建议：
- 评估使用 `httpOnly` Cookie + CSRF Token 方案。
- 若保持 localStorage，设置短有效期、敏感操作二次验证。

---

### I-02 默认管理员账号自动创建

**位置**：`backend/src/app.ts:95`

非生产环境会根据 `.env` 自动 upsert 管理员。生产环境 `NODE_ENV=production` 时不会触发，但需确保生产部署时正确设置强密码。

---

## 8. 优先修复建议

按优先级排序：

1. **立即修复（Critical）**：
   - [C-01] 为 `/media/:id/file` 增加认证与授权。
   - [C-02] 头像上传强制校验与转码；禁止任意 `avatarUrl`。
   - [C-03] 生产环境强制配置 `CORS_ORIGIN`，默认禁止任意跨域带凭证。

2. **本周修复（High）**：
   - [H-01] 移除 JWT 硬编码密钥；改造 Refresh Token 机制。
   - [H-02] `/parse` 接口认证 + URL 白名单/SSRF 防护。
   - [H-03] 统一为所有业务读取接口增加认证。
   - [H-04] 修复认证插件错误处理逻辑。

3. **短期改进（Medium/Low）**：
   - 增加安全响应头、文件大小限制、输入长度校验、AI 接口限流、密码策略增强、统一错误响应。
   - 持续关注 `read-excel-file` / `@xmldom/xmldom` 的 XXE 公告。

---

## 9. 结论

项目当前存在多处可导致数据泄露、账户接管、内网探测、存储型 XSS 的实质性漏洞。建议在上线前至少完成 Critical 与 High 级别修复，并补充自动化安全测试（认证/授权用例、SSRF 用例、文件上传用例）。
