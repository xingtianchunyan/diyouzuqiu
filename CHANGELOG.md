# 变更日志

本文件记录 diyousoccer.cc 的重要变更。格式按日期倒序，标注对应 PR 与问题编号。

## 2026-09-04 · 整体升级（第 1–3 批）

### 安全
- 四个密钥完成轮换：QQ 邮箱 SMTP 授权码、SiliconFlow API Key、管理员密码、Cloudflare Tunnel 凭证（隧道重建，详见部署层维护手册）。
- 修复手机端"导航即掉登录"根因：Cloudflare 对 `http://` 不跳转 HTTPS，HTTP 下登录响应的 Secure Cookie 被浏览器拒存。现在 HTTP 访客经 308 重定向到 HTTPS（POST 保持方法体）。（#47, #40）

### 新增
- **FIFA 竞技风主页**（#48, #36）：暗色沉浸竞技场主题、SVG 盾形队徽、Anton 展示字体、6 张球场分区导航卡；`/` 改为公开落地页，未登录可访问；主页顶部条内置中英切换。
- **集锦式媒体画廊 + 沉浸灯箱**（#49, #36）：暗色玻璃卡片网格（2/3/4 列响应式）、灯箱支持键盘 Esc/←/→ 与触屏滑动、上一张/下一张导航。
- **FIFA 风球员卡**（#50, #36）：伪 3D 倾斜卡面（仅精细指针设备启用）、OVR 综合评分、手写 SVG 六维雷达图（速度/射门/传球/盘带/防守/体能）、生涯数据条（出场/胜场/胜率/MVP）。
- **apple-touch-icon**（#50, BUG-012, #42）：180×180 盾形队徽，iOS 主屏图标不再退化。
- 成员能力字段 + 统计 API + 缩略图管线 + 媒体缓存头（#45，第 1 批）。
- viewport-fit=cover 与安全区工具类基建（#46，第 1 批）。

### 修复
- **BUG-005**：触屏设备无法操作媒体编辑/删除——操作按钮触屏常显（44px），hover 隐藏仅 `@media (hover:hover)`。（#49）
- **BUG-006**：视频 autoplay 缺 `playsinline muted`——MediaLightbox / MediaDetailPage / YearPage / PersonPage 全部补齐。（#49, #50）
- **BUG-007**：弹层打开背景滚动穿透——新增 `useScrollLock` composable，灯箱与媒体编辑弹窗接入。（#49）
- **BUG-002**：鸿蒙/部分安卓文件选择器不显示图库——上传 accept 改为与后端白名单一致的具体 MIME 枚举。（#51, #39）
- **BUG-008 残余**：全项目裸 `100vh` 清零——布局容器改 `100svh`，fixed 遮罩改 `100lvh`。（#51, #43）
- **BUG-004**：401 拦截器排除 /auth/logout，回到前台主动续期 token。（#44, #41，待真机复验）
- 画廊网格图片全部走缩略图 + `srcset`/`sizes` + 懒加载，灯箱才加载原图，移动端流量显著下降。（#49, BUG-011 相关）

### 文档
- `docs/mobile-compatibility-plan.md` 关闭（BUG-013）：P0/P1 项已分批落地，平台能力层按当前规模判定为过度设计，剩余事项转入 GitHub Issues 跟踪。
