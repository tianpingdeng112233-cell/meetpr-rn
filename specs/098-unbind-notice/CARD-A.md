# 098 · 卡 A（安卓 RN）— 被教练解绑后，绑定页说明原因

先读仓根 `CONTEXT.md`（有则读）、`AGENTS.md`，再完整读 `specs/098-unbind-notice/SPEC.md`——它是唯一验收口径，本卡只补执行细节。分支 `feat/098-unbind-notice`（基于 `origin/main`），worktree `meetpr-rn-wt-098`，依赖已装好（npm）。iOS 同批另有一张镜像卡，两端文案与判定必须一致。

## 为什么一张卡
DTO 加一个可选字段 + 绑定关卡判定加一个分支 + 三语文案，同一模块，一次验收。

## 目标
1. `src/api/domains/bind.ts`：`BindRequest` 的 zod schema 接收可选 `ended_at`（`string | null`，缺省视为 null），旧后端不带此字段时解码照常。
2. `src/features/onboarding/bind-model.ts`：最近一条申请 `status === 'cancelled'` 且 `ended_at` 非空 → 返回解绑提示（与 rejected / expired 同位置同样式）。现在 `resolveBindGateState` 只收 `status`，需要能拿到 `ended_at` 与 `coach_display_name`——改签名或加参数都行，调用方（绑定页 / hook）同步改，挑最小改动。
3. 提示两行：第一行「{教练显示名}已与你解绑」（名为空或纯空白→「教练已与你解绑」），第二行「训练记录都还在，输入邀请码可重新绑定」。英文「{coach} has unlinked you」/「Your coach has unlinked you」+「Your training history is kept. Enter an invite code to link again.」。若现有 notice 渲染只支持一行，用最小改动支持两行（同一提示块内换行），不新增组件样式。
4. 文案进 `src/i18n` 现有 key 体系（简中 + 英文手写），繁体跑 `npm run i18n:zh-Hant` 生成，不手写。
5. 普通 cancelled（`ended_at` 为 null）不显示提示——行为与现在一致。
6. SPEC 变更第 3 条（已填过入学问卷时重新输入邀请码跳过问卷）是现有逻辑：读代码确认并在 JOURNAL 写明走的是哪条路径，不改。

## 约束
- 不碰推送（安卓未接推送）、不加路由、不改其它关卡状态的行为。
- 守仓内 eslint / tsc 配置（唯一事实源是仓内配置）。
- 不 commit、不 push、不开 PR、不改锁文件、不改 `PARITY.md`（收货时由 Opus 更新）。

## 测试 seam（先红后绿，红要实际跑出来）
1. `src/features/onboarding/__tests__/bind-model.test.ts`（主力）：「cancelled + ended_at + 教练名 → 解绑提示（含名）」「cancelled + ended_at + 空名 → 兜底文案」「cancelled 无 ended_at → 无提示」「rejected / expired 照旧」。
2. bind DTO 解码：带 `ended_at` / 不带 `ended_at` 各一条（放现有 bind API 测试旁；没有现成测试文件就放在 bind-model 测试里，不另起测试框架）。
3. 全量 `npm test` + `npx tsc --noEmit` + `npm run lint` 全绿。

## 模拟器
本卡不要求你起模拟器（AVD 可能被别的会话占用，沙箱也未必能跑 Gradle）；Opus 收货时在模拟器上亲验。若提示块渲染逻辑有分支不好用单测覆盖，在 JOURNAL 写明需要 Opus 重点看的地方。

## 交付
写 `docs/journal/2026-11-02-098-card-a.md`（一卡一文件）：改动文件、红 → 绿证据（命令 + 数字）、三项全量检查结果、第 6 条确认结论、与 SPEC 不一致或拿不准的地方。
