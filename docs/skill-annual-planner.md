# “年会策划”Skill 规格（提示词 + 结构化输出）

## 目标
- 让用户输入约束条件，系统生成一份可直接执行的年会活动方案
- 结合本地知识库（KnowledgeDoc）做检索增强（RAG），并展示引用来源
- 第一阶段接入千问 Qwen（对接方式与密钥仅通过环境变量配置）

## 输入参数（constraints）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| peopleCount | number | 是 | 参与人数 |
| budget | number | 是 | 总预算（人民币） |
| date | string | 是 | 日期（ISO 字符串或 yyyy-mm-dd） |
| location | string | 是 | 地点/场地特征（室内/室外/酒店/球场等） |
| durationHours | number | 否 | 时长（小时） |
| style | string | 否 | 风格（温馨/热烈/正式/轻松等） |
| mustHave | string[] | 否 | 必须包含的环节 |
| avoid | string[] | 否 | 禁忌与避免事项 |
| notes | string | 否 | 其他补充 |

## 输出结构（plan）
输出要求为可复制、可落地的结构化数据，建议 JSON 结构如下：
```json
{
  "meta": { "title": "string", "theme": "string" },
  "goals": ["string"],
  "schedule": [
    { "start": "18:30", "end": "18:40", "title": "string", "hostScript": "string" }
  ],
  "roles": [
    { "role": "主持", "count": 1, "responsibilities": ["string"] }
  ],
  "materials": [
    { "name": "投影仪", "qty": 1, "note": "string" }
  ],
  "budget": [
    { "item": "餐饮", "amount": 2000, "note": "string" }
  ],
  "riskPlan": [
    { "risk": "天气", "mitigation": "string" }
  ],
  "appendix": { "checklist": ["string"] }
}
```

## 提示词策略（Prompting）
- 系统提示词包含三部分：
  1) 角色设定：活动策划 + 项目经理
  2) 约束复述：将输入参数转写为清晰约束
  3) 输出约束：严格输出 JSON，字段齐全，避免编造引用来源
- 语言：跟随前端当前语言（默认中文）

## RAG 召回与引用
### 召回（第一阶段）
- 召回来源：KnowledgeDoc.title + KnowledgeDoc.content
- 基础策略：
  - query = 用户约束总结 + 关键词（年会/流程/预算/主持词/奖项/游戏）
  - PostgreSQL `ILIKE` + 简单排序（标题命中优先，其次内容命中）
  - topK：5–10

### 引用展示
- 在 API 返回中包含 citations：
  - `docId`、`title`、`snippets`（最多 3 段，每段 200–400 字）
- 输出约束：
  - 大模型在生成方案时仅可引用 citations 提供的内容
  - 若 citations 为空，方案仍需生成，但不得声称“来自往届资料”

## 运行时配置（环境变量）
- `QWEN_API_KEY`：仅通过运行环境注入，不入库
- `QWEN_BASE_URL`：可选，默认为官方地址
- `QWEN_MODEL`：可选，默认选择稳定通用模型

