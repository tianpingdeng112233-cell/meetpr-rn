# 卡 · 安卓 学员端：自选重量 / 自重 + 强制升级（backend spec 056）

先读仓根 `CONTEXT.md`（有则读）、契约正典 `/Users/david/Projects/apps/MeetPR-backend-wt-056-spec/specs/056-load-types/SPEC.md`（只读，§1 拍板表、§2 数据契约、§3 各端行为、§6 屏幕稿 ②③④）、本仓 `CLAUDE.md` / `AGENTS.md`。

## 目标

1. **解码兼容**：plan set 的 `load_mode` 新增 `free_weight`、`bodyweight`；`intensity_mode` / `target_value` 改为可空解码（后端过渡期仍会给值，但新版必须能处理 null，不得因 null 整份计划解码失败）。
2. **显示与记录**（§6 ②③，结构与文案一比一，像素用本端现有样式）：
   - `free_weight`：标签「自选重量」，说明「教练没定重量，按今天状态自己选，记下实际用了多少。」；记录时重量**必填**，没填点完成 → 红框 + 「第 n 组还没填重量——自选重量的组要填实际用的重量才能完成。」
   - `bodyweight`：标签「自重」，说明「不加负重做到力竭；挂了片就把额外重量填上。」；重量框显示、**选填**，标签「额外负重 kg · 选填」，占位「不加就空着」（取代现在隐藏重量框的行为）。
   - 旧数据兼容：`load_mode` 为空但备注命中「自重」标记的，按自重显示，且备注里不再显示该标记。
   - 强度目标（RPE / RIR / %）照常显示。
3. **强制升级**（§6 ④）：启动时调 `GET /app/min-version?platform=android`，本机 versionCode 低于 `min_build` → 整屏阻断页：左上 App 图标、标题「需要更新 MeetPR / 才能继续使用」、正文与版本白卡按 §6 ④、底部按钮「下载新版」→ https://dl.meetpr.cn（与现有下载页一致）；无关闭、无跳过。接口失败或超时 → 不拦（不能因为网络把人锁在外面）。
4. 不做教练端编辑这两种模式（spec Out of Scope）。

## 测试 seam（先红后绿）

src/features/training 现有记录测试与 api domain schema 测试；新增：null `intensity_mode/target_value` 解码、两种模式的必填 / 选填完成逻辑、最低版本比较与失败放行。

## 验收

本端全量测试 + 构建全绿（npm test / tsc / lint，按仓内 CLAUDE.md）；红→绿表；JOURNAL `docs/journal/2026-10-29-056-android.md`。不 commit / push / merge。
