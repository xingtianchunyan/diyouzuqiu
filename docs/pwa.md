# PWA 策略与离线边界

## 目标
- 支持安装到手机桌面（standalone）
- 提供基础离线能力：App Shell 与静态资源可离线打开
- 明确边界：不缓存媒体大文件与 API 数据，避免存储膨胀与数据过期

## Manifest
- 路径：`frontend/public/manifest.webmanifest`
- 必要字段：name、short_name、start_url、display、theme_color、icons

## Service Worker（第一阶段）
- 路径：`frontend/public/sw.js`
- 注册：仅在生产环境注册（`import.meta.env.PROD`）

### 缓存范围
- 预缓存（install）：`/`、`/index.html`、`/manifest.webmanifest`
- 运行时缓存（cache-first）：
  - `destination` 为 `style/script/image/font` 的静态资源

### 不缓存范围
- 所有 `/api/` 请求不拦截（始终走网络）
- 带 `Range` 头的请求不拦截（视频流/分片下载）
- 媒体文件下载接口建议默认不走缓存（避免大文件占用）

## 更新策略
- 通过变更 `CACHE_NAME` 实现强制更新缓存壳
- 激活时清理旧缓存（activate 阶段删除非当前版本的 cache）
- 若需要“提示用户刷新”，第二阶段可在前端增加更新提示 UI

