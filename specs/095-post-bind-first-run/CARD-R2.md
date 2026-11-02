# 卡 R2 · 095 安卓资料向导缩成 4 步 + 待接收页修正

先读仓根 `CONTEXT.md`，再读同目录 `AMEND-wizard-trim.md`（本卡正典：共识、存量照护、验收第 10–16 条、Out of Scope 以它为准），必要时参考 `SPEC.md`。

## 目标
两个构建轨都做：
1. 资料向导只留原第 1、2、3、7 步（新序号 1–4），原第 4「训练环境」、第 5「恢复能力」、第 6「训练资料」整步移除；进度/步数显示跟着变。保留步骤的字段、校验、文案逐字不变。
2. 「我的资料」（`ProfileEditor` 及资料展示页）不再显示这三块的编辑入口和摘要。
3. 旧草稿续填：落在新 4 步里正确的位置；草稿里被移除步骤的值不再上传，也不清空服务端已有的值。
4. 待接收页三处修正：右上「登出」不压标题；副标题拼名（名为空→「等待教练接收」，名已含「教练」→不再追加，其余照旧；英文同理）；资料行「onboarding 完整资料」→「基础资料」/「Basic profile」，繁体按 spec 094 的生成脚本与覆写表出。
5. 教练端只核查不改功能：新学员这三块为空时，`StudentOnboardingProfileView` / `onboarding-display.ts` 和绑定请求卡不崩、不把空值显示成 0 或默认档次；不符合时只允许改成「未填」或隐藏该行，跟该页现有空值惯例一致。

## 文件范围
- `src/features/onboarding/model.ts`、`OnboardingWizard.tsx`、`OnboardingSteps.tsx`、`storage.ts`（草稿）
- `src/features/profile/ProfileEditor.tsx` 及资料展示相关文件
- 待接收页组件（找 `pendingBindView` 文案所在组件）
- `src/features/coach/roster/onboarding-display.ts`（仅限空值显示）
- `src/i18n/catalog/` 与生成的繁体
- 对应测试

## 约束
- 不动后端（后端放宽必填是卡 B2，另一个 worktree 在做）。本地 fixture 的 complete 接口按 12 项必填模拟。
- 不删数据库字段，不改 DTO 的 zod 定义（字段保留、可为空）。
- 不改 tab 结构，不加依赖，不碰 095 已合入的欢迎页/首页卡逻辑。
- 旧概念残留扫描（AMEND 验收第 15 条）：全仓 grep「训练环境」「恢复能力」「训练资料」「器械」「睡眠」「7 步」「of 7」「onboarding 完整资料」，学员端可达的清掉，结果逐条写进 JOURNAL（可达 / 不可达 / 教练端保留）。
- 不 commit、不 push（Opus 收货后提交）。

## 验收
`AMEND-wizard-trim.md` 验收第 10–15 条中安卓适用的全部条目，外加 `SPEC.md` 第 5 条（老学员升级第一屏）。你负责：单测先红后绿 + 全量 Jest / tsc / lint 绿 + AVD `meetpr` 上用本地 fixture 走第 10、11、13、14 条并截图，存 `docs/evidence/spec095-trim-2026-11-02/`。fixture 可参考 `docs/evidence/spec093-2026-10-17/fixture-server.cjs`。

## 测试 seam
- `model.ts` 纯函数先红后绿：`STEP_FIELDS` / `ONBOARDING_STEP_COUNT`、`invalidFieldsForStep`、`resumeStep`（含旧草稿）、`fullOnboardingPatch`（不含移除步骤的字段）、`earliestMissingStep`。
- `__tests__/wizard.test.tsx`：4 步全程提交、旧草稿续填。
- `ProfileEditor` 组件测试：三块不出现。
- 待接收页组件测试：三种拼名、「基础资料」。

## 交付
JOURNAL 写 `docs/journal/2026-11-02-095-R2.md`。回报：改动文件、测试数字、截图路径、残留扫描结果、与 AMEND 不符或做不到的地方。
