# 后端 API 契约（REST，v1）

## 通用约定
- Base URL：`{API_BASE_URL}/api/v1`
- 认证：`Authorization: Bearer <access_token>`
- 时间：ISO 8601 字符串（UTC 或带时区偏移）
- 分页：`?page=1&pageSize=20`（默认 page=1, pageSize=20）

## 错误模型
```json
{ "error": { "code": "STRING", "message": "STRING" } }
```

## 认证与权限

> 认证方式同时支持两种：
> 1. `Authorization: Bearer <token>` 请求头；
> 2. 后端在登录/刷新成功后写入的 `HttpOnly` Cookie（名称为 `token`）。

### GET /auth/captcha
- 200: `{ "id": string, "question": string }`

### POST /auth/login
- body: `{ "email": string, "password": string, "captchaId"?: string, "captchaAnswer"?: string }`
- 说明：同一 IP 连续失败 3 次后，必须携带正确的验证码。
- 200: `{ "token": string, "user": { "id": string, "email": string, "phone": string|null, "role": "ADMIN"|"MEMBER", "memberId": string|null } }`
- Cookie: 同时写入 `token`（HttpOnly, Secure, SameSite=Strict）。

### POST /auth/refresh
- 请求头：`Authorization: Bearer <token>`（或携带 `token` Cookie）。
- 200: `{ "token": string }`
- Cookie: 刷新 `token` Cookie。

### POST /auth/logout
- 认证：需要登录状态。
- 200: `{ "message": "Logged out successfully" }`

### POST /auth/change-password
- 认证：需要登录状态。
- body: `{ "currentPassword": string, "newPassword": string }`
- 说明：`newPassword` 必须满足密码策略（≥8 位，包含大小写字母和数字，不在常见弱口令列表）。
- 200: `{ "message": "Password changed successfully" }`

### POST /auth/otp/send
- body: `{ "email": string }`
- 说明：同一邮箱 10 分钟内最多发送 3 次。未配置 SMTP 时（开发/测试环境）会在响应中返回验证码；生产环境配置 SMTP 后仅通过邮件发送。
- 200: `{ "codeId": string, "code": string, "expiresIn": number }`（未配置 SMTP）或 `{ "codeId": string, "expiresIn": number }`（已配置 SMTP）

### POST /auth/otp/login
- body: `{ "email": string, "codeId": string, "code": string }`
- 说明：邮箱不存在时会自动注册为 `MEMBER` 角色（可通过环境变量控制）。
- 200: 与 `/auth/login` 成功响应相同。

### GET /me
- 认证：需要登录状态。
- 200: `{ "id": string, "email": string, "phone": string|null, "role": "ADMIN"|"MEMBER", "memberId": string|null }`

## 成员/家庭
### GET /families
- 200: `[{ "id": string, "label": string }]`

### POST /families (ADMIN)
- body: `{ "label": string }`
- 201: `{ "id": string, "label": string }`

### GET /members
- query: `team?=RED|BLUE` `familyId?=string`
- 200: `[{ "id": string, "displayName": string, "team": "RED"|"BLUE"|null, "familyId": string|null }]`

### POST /members (ADMIN)
- body: `{ "displayName": string, "team"?: "RED"|"BLUE", "familyId"?: string }`
- 201: member

### GET /members/:id
- 200: member + 关联统计（媒体数/作品数/比赛数，第一阶段可选）

## 媒体（照片/视频）
### POST /media (MEMBER+)
- multipart/form-data:
  - file: binary
  - meta: JSON 字符串（`{ takenAt?: string, year?: number, personTagIds?: string[] }`）
- 201: `{ "id": string }`

### GET /media
- query: `type?=PHOTO|VIDEO` `year?=number` `personId?=string`
- 200: `[{ "id": string, "type": "PHOTO"|"VIDEO", "takenAt": string|null, "year": number|null, "thumbUrl": string|null }]`

### GET /media/:id
- 200: `{ ...media, "personTags": [{ "id": string, "displayName": string }] }`

### PUT /media/:id (MEMBER+)
- body: `{ "takenAt"?: string|null, "year"?: number|null, "personTagIds"?: string[] }`
- 200: media

### GET /media/:id/file (MEMBER+)
- 返回媒体文件（鉴权下载）

## 作品（文章/诗词）
### GET /works
- query: `type?=ARTICLE|POEM` `authorId?=string` `q?=string` `year?=number`
- 200: `[{ "id": string, "type": "ARTICLE"|"POEM", "title": string, "authorId": string|null, "year": number|null }]`

### POST /works (MEMBER+)
- body: `{ "type": "ARTICLE"|"POEM", "title": string, "content": string, "authorId"?: string, "year"?: number }`
- 201: `{ "id": string }`

### GET /works/:id
- 200: `{ "id": string, "type": "...", "title": string, "content": string, "authorId": string|null, "year": number|null }`

## 比赛记录
### GET /matches
- query: `year?=number`
- 200: `[{ "id": string, "playedAt": string, "redScore": number, "blueScore": number, "mvpMemberId": string|null }]`

### POST /matches (MEMBER+)
- body: `{ "playedAt": string, "redScore": number, "blueScore": number, "mvpMemberId"?: string, "participantIds": { "memberId": string, "side": "RED"|"BLUE" }[] }`
- 201: `{ "id": string }`

### GET /matches/:id
- 200: match + participants

## 年度聚合
### GET /years/:year
- 200:
```json
{
  "year": 2015,
  "media": [],
  "works": [],
  "matches": [],
  "events": []
}
```

## 知识库与年会策划 Skill
### POST /knowledge (MEMBER+)
- body: `{ "title": string, "content": string }`
- 201: `{ "id": string }`

### GET /knowledge
- query: `q?=string`
- 200: `[{ "id": string, "title": string }]`

### POST /planner/annual (MEMBER+)
- body:
```json
{
  "constraints": {
    "peopleCount": 40,
    "budget": 5000,
    "date": "2026-01-15",
    "location": "室内/室外",
    "style": "温馨/热烈/正式",
    "notes": "可选补充"
  }
}
```
- 200: `{ "plan": { "sections": [] }, "citations": [{ "docId": string, "title": string }] }`

