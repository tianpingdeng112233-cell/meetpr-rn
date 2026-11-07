# 卡：今日训练 hero 动作行可点开看逐组（安卓 RN）

先读仓根 CONTEXT.md（有则读）与 CLAUDE.md。工作目录 = 本 worktree `/Users/david/Projects/apps/meetpr-rn-wt-hero-expand`（分支 `feat/hero-expand-sets`，基于 `origin/main`，依赖已由 Opus `npm ci`）。级别 T1。

## 现状
`src/features/training/WorkoutBody.tsx` 里开练前的 hero 卡（`testID="workout-hero"`，`!recording` 分支的 `groups.map(...)`），每个动作一行只给 `prescriptionSummary(...)` 一句：各组一致 →「140kg × 3 @RPE8 · 5 组」，各组不一致 → 只剩「N 组」，看不到逐组重量。行本身不可点。预览别的训练日（`preview`）走同一段。

## 目标
动作行做成和同文件里完成后回顾卡（`completed-day-card`，用 `expandedSummary` 状态的那段）一样：点一下展开逐组、再点收起。
- 收起态：保持现有摘要文案不变，右侧加与回顾卡同款展开指示（`›` / `⌄`），默认全部收起；展开状态是组件内 state，不持久化。可复用或另起一个与 `expandedSummary` 同形的 state，别让回顾卡与 hero 互相串状态。
- 展开态：在行内下方逐组列出处方组（`group.drafts` 里 `!draft.kind` 的，不含 extra / 学员自加），每行「组号 + 该组处方」。组号口径与训练中一致；处方文本逐组用 `prescribed(decodePrescription(draft.planSet), suggestionForDraft(draft).percentage)`（从 `src/domain/plan/prescription.ts` 导出所需函数，百分比组带解算重量）。
- 字号/颜色/间距/命中区（`spacing.minimumHitTarget`）/无障碍（`accessibilityRole="button"`、`accessibilityState={{ expanded }}`）照抄回顾卡那段；不带视频按钮。

## 不做（Out of Scope）
不改回顾卡、训练中记录流、教练端、后端；不新增或改动 i18n key；不改 `prescriptionSummary` 本身。

## 测试 seam（先红后绿）
在 `src/features/training/__tests__/` 现有 WorkoutBody / training-flow 测试旁补用例（复用已有 fixture）：开练前渲染一个各组重量不同的动作 → 默认看不到逐组行 → press 该行 → 每组各自的重量文本出现、`accessibilityState.expanded` 为 true → 再 press 收起；extra/学员自加组不出现。

## 验收
- 新测试先红后绿；全量 `npm test` 绿；`npx tsc --noEmit` 与 lint 无新增错误。
- 沙箱里 adb 不可用，安卓截图由 Opus 收货时补，不必尝试。
- JOURNAL 写 `docs/journal/2026-11-07-hero-expand-android.md`（改了哪些文件、测试命令与结果、遗留）。
- 不 commit、不 push、不开 PR（Opus 收货时做）。
