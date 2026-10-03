# 任务卡（安卓）：长按完成后立即弹奖励页，后台同步

开工先读仓内 CONTEXT.md（如存在）、AGENTS.md 与本卡。

- 级别：T1。基线 `feat/084c-chat-video-rest`（PR #71 顶），分支 `fix/instant-completion-celebration`。与 iOS 同步改（本机只读 `/Users/david/Projects/apps/MeetPR-wt-complete`）。
- 落点：`src/features/training/TodayWorkoutView.tsx` 的 `completeDay`（现在 `await mutateAsync` 之后才 `setCompletionPhase('celebration')`）、完成 mutation 的乐观更新、`WorkoutCelebrationView.tsx` 的教练已收到行。守仓内 eslint 与 TypeScript 配置。

- 来源：David 2026-10-03 真机反馈"长按完成本日训练后🏅奖励页没弹，重开 App 才弹"。模拟器复现：把完成请求延迟 8 秒，页面先本地显示已完成，奖励页要等服务器返回才出现；真机在流量下请求长时间不回，就一直不弹。David 拍板方案 B：**立即弹奖励页，后台同步**。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。

## 要做的

1. 长按完成后**立即**进入奖励页（celebration），不等服务器返回；同时照常发出完成请求。
2. 奖励页上"教练已收到训练记录"这一行：请求在途时显示"正在发送给教练…"（en: "Sending to your coach…"），请求成功后切换为现有的已收到文案。中英文同步。
3. 请求失败或超过 30 秒没回：若奖励页还开着就关闭它，撤销本地的"已完成"显示（回到未完成、可再次长按），弹出现有的完成失败提示。已记录的组不受影响。
4. 请求成功时的后续（游标推进、刷新、完成后回到当前训练日等）保持现状，只是不再阻塞奖励页出现。
5. 撤销完成（undo）的流程不变。

## 测试 seam（先红后绿）

- 完成流程的状态机 / 视图模型层：(a) 发起完成后、请求返回前，已处于奖励页且显示"正在发送"；(b) 成功后文案切换；(c) 失败与超时（假定时器）后奖励页关闭、本地完成状态回滚、出现失败提示。

## 验收（Opus 收货）

- 模拟器把完成请求延迟 8 秒：长按后立即出奖励页，先显示"正在发送"，8 秒后变为已收到。
- 完成请求返回 503：奖励页关闭，页面回到未完成，提示失败，可再次长按完成。
- 正常网速行为与现状一致。
- 全量测试与 lint 通过。

## Out of Scope

上传、周条、其他页面。
