# 107 · Android 全天一览摘要可读性修复

- 基点：origin/main `c07737b`，分支 `fix/107-summary-readability`。
- 触发：CN 11 实际用户截图，逐组重量拥挤，`RIR 1/2` 的数字掉到下一行。
- David 2026-11-11 明确选择「上下两行，优先清晰」：动作名在上，组次/重量/强度在下。仅此布局变更；原字号、完整摘要、展开编辑/小勾/视频/完成语义保持。
- 验收沿用 SPEC 107 的完整处方摘要、展开/收起及字体主题要求；补充截图六种数据在 360dp 默认字号及 1.3 字号下不拆开 RIR 标签与数值。长摘要允许自然增高与滚动，不截断。
- 原生测量 seam：真实 `AllDayBody` + Expo Android Text 的 `onTextLayout`，QA 包 `com.meetpr.app.feedbackqa`，仅 emulator-5570；临时插桩与合成数据最后移除。Jest 不执行原生排版，不用样式快照假装验证换行。
- 红灯：六行复现和单行最小复现均输出 `qa-3: split effort [2×10  125 · RIR , 1]`；原生默认字号 1.0，排除了必须调大系统字体才触发的假设。
- 探针：只绑定 RIR 与值可消除语义拆分；缩窄名称列也能减少摘要换行，但把动作名拆成碎行，未采用。最终按 David 决定上下排列，并保护 RPE/RIR 空格。
- 当前验证：默认与 1.3 原生换行检查通过；现有 all-day-view/exercise-summary 64 条通过。中文浅色默认、深色 1.3 倍、英文 lb 1.3 倍原生截图已复核；临时插桩与 QA 路由已移除。最终全量与审查见下。

## 最终检查（2026-11-11）

- `npm test -- --runInBand`：218 suites / 2289 tests 全绿；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 全绿。
- `review-loop` 单轮独立审查：Standards CLEAN / 0 项；Spec CLEAN / 0 项。审查记录 `/Users/david/CodexConfig/reviews/2026-11-11-107-android-regressions.md`。
- QA 入口与插桩已移除，Metro 已关闭，5570 系统字号恢复 1.0，正式 CN 11 包及登录数据保留。未修改 iOS、后端或已发布包。
- 原生证据目录：`/Users/david/Documents/Codex/2026-11-11/users-scratch-cards-107-handoff-codex/outputs/summary-readability/`、`outputs/camera-white/`。
