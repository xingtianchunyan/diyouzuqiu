# 修复前端构建类型错误计划

## 1. 现状分析 (Current State Analysis)
- **错误现象**: 运行 `npm run build` 时，`vue-tsc` 报出了 7 个 `TS2307: Cannot find module` 的错误，导致前端构建失败。
- **错误文件**: 
  - `src/components/matches/MatchesList.vue`
  - `src/components/media/MediaGallery.vue`
  - `src/components/media/MediaLightbox.vue`
  - `src/components/works/WorkModal.vue`
  - `src/components/works/WorksList.vue`
- **问题根源**: 这些 Vue 组件文件位于 `src/components/` 的子目录下（如 `matches/`, `media/`, `works/`），因此它们距离 `src/` 目录有**两层**深度。它们目前尝试使用 `../api/services/...` 导入服务，这个路径解析到了 `src/components/api/services/...`，显然是错误的。正确的相对路径应该是 `../../api/services/...`。
- **影响范围**: 前端项目构建 (`frontend/src/components/*/*.vue`)。

## 2. 约束与决策 (Assumptions & Decisions)
- 直接修改上述出错组件中的 import 语句，将 `../api/services/` 修正为 `../../api/services/`。
- 确保所有的相对路径导入能够正确定位到 `frontend/src/api/services/` 目录。

## 3. 提议的修改步骤 (Proposed Changes)
1. **修改 MatchesList.vue**
   - 文件: `frontend/src/components/matches/MatchesList.vue`
   - 将 `import type { Match } from '../api/services/matches.service'` 修改为 `../../api/services/matches.service`。
2. **修改 MediaGallery.vue**
   - 文件: `frontend/src/components/media/MediaGallery.vue`
   - 将 `import type { Media } from '../api/services/media.service'` 和 `import { mediaService } from '../api/services/media.service'` 修改为 `../../api/services/media.service`。
3. **修改 MediaLightbox.vue**
   - 文件: `frontend/src/components/media/MediaLightbox.vue`
   - 将 `import type { Media } from '../api/services/media.service'` 和 `import { mediaService } from '../api/services/media.service'` 修改为 `../../api/services/media.service`。
4. **修改 WorkModal.vue**
   - 文件: `frontend/src/components/works/WorkModal.vue`
   - 将 `import type { Work } from '../api/services/works.service'` 修改为 `../../api/services/works.service`。
5. **修改 WorksList.vue**
   - 文件: `frontend/src/components/works/WorksList.vue`
   - 将 `import type { Work } from '../api/services/works.service'` 修改为 `../../api/services/works.service`。

## 4. 验证步骤 (Verification)
- 在 `frontend` 目录下运行 `npm run build`。
- 确认 `vue-tsc -b` 能够成功执行，不再报告 `TS2307` 错误。