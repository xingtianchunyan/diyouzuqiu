# 设计系统（Design Tokens + 组件清单）

## 设计原则
- 移动优先：以 360–430px 视口宽度为主要设计基线
- 信息密度可控：列表与卡片采用可触达的间距与字号
- 视觉一致性：所有组件复用同一套 token（颜色/字号/间距/圆角/阴影）

## Design Tokens（以根目录 DESIGN.md 为唯一真相）
### 颜色（语义角色）
| Token | Light | Dark | 用途 |
|---|---:|---:|---|
| --bg | #f5f4ed | #141413 | 页面背景（Parchment / Deep Dark） |
| --surface | #faf9f5 | #30302e | 卡片/容器底色（Ivory / Dark Surface） |
| --text-h | #141413 | #faf9f5 | 标题/主文本（Near Black / Ivory） |
| --text | #5e5d59 | #b0aea5 | 次级文本（Olive Gray / Warm Silver） |
| --text-muted | #87867f | #b0aea5 | 弱化文本（Stone Gray / Warm Silver） |
| --border | #f0eee6 | #30302e | 轻边框（Border Cream / Border Dark） |
| --border-strong | #e8e6dc | #30302e | 强分割线（Border Warm / Border Dark） |
| --brand | #c96442 | #c96442 | 品牌强调色（Terracotta Brand） |
| --brand-2 | #d97757 | #d97757 | 次级强调（Coral Accent） |
| --focus | #3898ec | #3898ec | Focus ring（唯一冷色） |
| --error | #b53333 | #b53333 | 错误态 |
| --ring | #d1cfc5 | #30302e | Ring shadow（交互态） |
| --warm-sand | #e8e6dc | #30302e | 次按钮背景（Warm Sand / Dark Surface） |

### 排版
| Token | 建议 |
|---|---|
| Serif 标题 | 500（不使用 700+） |
| Sans UI | 400–500 |
| 正文行高 | 1.60（阅读型） |
| 标题行高 | 1.10–1.30（紧但不压迫） |

### 间距（Spacing Scale）
| 名称 | 值 |
|---|---|
| 3 | 3px |
| 4 | 4px |
| 6 | 6px |
| 8 | 8px |
| 10 | 10px |
| 12 | 12px |
| 16 | 16px |
| 20 | 20px |
| 24 | 24px |
| 30 | 30px |

### 圆角与阴影
| Token | 值 |
|---|---|
| 圆角（标准） | 8px |
| 圆角（输入/主按钮/导航） | 12px |
| 圆角（强调容器） | 16px–32px |
| Ring shadow | 0px 0px 0px 1px（暖色系 ring） |
| Whisper shadow | rgba(0,0,0,0.05) 0px 4px 24px |

## 组件清单与 API（第一阶段）
### Button
- variants: warm-sand / white / dark-charcoal / brand / dark-primary
- sizes: sm / md
- props: disabled, loading

### Card
- 用于列表项与内容容器
- slots: header / default / footer
 - states: contained / ring / whisper

### Dropdown（Select）
- 用于“个人页模板”的三下拉菜单
- 交互：点击展开、选中后收起、支持清空选择

### Tabs
- 用于“文集/诗集”切换
- 交互：可滑动、当前项高亮

### SearchInput
- 用于作者/标题搜索
- 交互：输入即触发（可节流），支持清空

### EmptyState
- props: title, description, actionText
- 用于无数据场景，引导到“上传资料”

### Timeline
- 用于“历史页”
- 第一阶段：支持年份节点点击；波浪线/折线路径细节可在第二阶段增强
