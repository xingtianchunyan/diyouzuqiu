# 修复登录问题与优化光标特效计划

## 一、 当前状态分析
1. **登录 502 错误问题**：
   - 报错信息 `AxiosError: Request failed with status code 502 at handleLogin` 是因为前端发起的登录请求经由 Vite 代理到了后端 (`localhost:3001`)。
   - 经排查，后端依赖了 PostgreSQL 数据库 (`DATABASE_URL=postgresql://...`)，但在当前的 Agent Sandbox 环境中，并没有安装或运行 PostgreSQL 数据库。
   - 当调用 `prisma.user.findUnique` 时，后端无法连接到数据库，导致报错，使得请求失败并返回了 502 错误。
2. **光标足球动效需求**：
   - 当前的 `SoccerFX.vue` 组件虽然实现了足球特效，但包含了复杂的 DOM 操作以及多余的彩蛋设计（点击射门、Hover 放大等）。
   - 按照最新需求，需删除多余设计，仅保留“跟随光标的足球（可使用 emoji ⚽）”，并在“按住鼠标左键并拖动”时，产生具备物理特性的**扬尘粒子效果**。
   - 明确要求使用 Canvas 系统来实现粒子系统以保证性能，并支持参数配置（数量、颜色、生命周期等）。

## 二、 提议的变更
### 1. 修复登录问题（后端数据库迁移到 SQLite）
为了在当前无依赖的环境下正常运行，需要将数据库从 PostgreSQL 切换为轻量级的 SQLite：
- **修改 `backend/prisma/schema.prisma`**：
  - 将 `provider` 改为 `"sqlite"`。
  - 由于 SQLite 版本的 Prisma 原生不支持 `enum`，需要将现有的 `enum` 类型（`UserRole`, `TeamSide`, `MediaType`, `WorkType`）删除，并在相关的模型字段中替换为 `String` 类型（例如 `role String @default("MEMBER")`）。
- **修改 `backend/.env`**：
  - 更新 `DATABASE_URL="file:./dev.db"`。
- **初始化数据库**：
  - 运行 `npx prisma db push` 生成 SQLite 数据库并同步表结构。
  - 运行 `npx tsx prisma/seed.ts` 生成默认的管理员账号。

### 2. 优化光标特效（重构 SoccerFX 组件）
- **修改 `frontend/src/components/SoccerFX.vue`**：
  - 完全删除现有的基于 DOM 与 SVG 的足球及交互动画。
  - 引入一个全屏 `canvas` 元素（设置 `pointer-events: none` 且居于顶层）。
  - 在 `requestAnimationFrame` 循环中：
    - **足球渲染**：使用 Canvas 的 `fillText` 直接在鼠标位置绘制 `⚽` emoji（或者绘制图片），并根据移动速度附加轻微的旋转。
    - **粒子系统生成**：当监听到 `mousedown` 事件并且鼠标在移动时，根据速度向鼠标运动的相反方向生成“尘土”粒子。
    - **物理效果**：粒子拥有自身的 `vx`, `vy`（受拖拽方向和速度影响）、重力下坠（增加 y 轴偏移）、随时间缩小、透明度淡出直至消失。拖动越快，每次生成的粒子越多。
    - **停止拖动**：监听 `mouseup` 停止粒子生成。
  - 在代码顶部暴露出可配置的粒子参数，例如：
    ```ts
    const CONFIG = {
      particleColors: ['#8B5A2B', '#A9A9A9', '#556B2F'], // 褐色/灰色/绿色
      particleLifespan: 600, // 存活时间(ms)
      dustMultiplier: 1, // 扬尘数量乘数
      gravity: 0.15, // 重力下坠
    }
    ```

## 三、 假设与决策
- **数据库切换**：仅为了在当前预览环境中快速解决 502 问题，所以切换为 SQLite。这可能会导致之前的部分 Postgres 数据丢失，但对于当前预览和调试阶段是最佳决策。
- **光标图片**：为确保加载速度和兼容性，使用 emoji `⚽` 配合 Canvas 字体渲染，不仅免去了图片加载的烦恼，也能保证清晰度。

## 四、 验证步骤
1. 完成数据库切换后，在浏览器尝试输入测试账号 `admin@diyou.test` 和 `diyou2024` 进行登录，验证 502 错误是否消失且成功登录。
2. 移动鼠标，确认光标已隐藏且由 ⚽ 替代，并跟随光标平滑移动及轻微旋转。
3. 按下鼠标左键并拖拽，观察足球后方是否持续喷射出扬尘粒子，并且拖动越快喷射越远。
4. 松开左键，确认扬尘停止。