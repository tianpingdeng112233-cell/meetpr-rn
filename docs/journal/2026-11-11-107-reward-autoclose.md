# 107 奖励页自动关闭 · 2026-11-11

- 入口：已读 CONTEXT、仓规、spec 107 第 5 轮修订与 HANDOFF-codex；基线 `2570491`，分支 `fix/107-reward-autoclose`。T1 / P1。
- 范围：仅奖励完成流程、测试及提示本地化。5 秒无触碰等同完成；任意触碰取消；查看报告不被打断。保留上传等待、撤销与回顾入口；历史重量预填保持关闭。
- 测试 seam：CompletionControls / WorkoutCompletionFlowView（jest fake timers）。
- 测试证据：验收 18/19 先红后绿，20 与卸载/回顾回归通过；typecheck/lint 通过。全量首次 2284 通过、1 个旧测试期待29.999秒奖励页仍在；改为先触碰取消再验证原30秒超时回滚。
- 独立 review-loop 一轮及定向复核：Standards 0 个阻塞；Spec 0 个未决缺陷。CI check（lint/typecheck/全量测试）通过。
- 原生验证：meetpr16 / emulator-5570，china + demo，com.meetpr.app.walk；验收18无触碰自动返回已完成训练页、19顶部空白触碰后6秒仍停留且提示消失、20在5秒内进入报告后6秒不被关闭，均通过。手动 Done、撤销、报告滚动与反思输入可用；完成回顾入口保留。
- 环境排障：5570 原 guest shell 卡住；仅重启原 meetpr16、不清数据、不碰5556，恢复后安装/启动和验证通过。原生 assembleRelease 成功。
- 证据：本机会话 outputs/reward-autoclose/android-auto-1.png、android-auto-7.png、android-touch-cancels.png、android-report-stays.png、android-report-edit.png；大日志不入仓。
- 状态：本卡开发与原生验证完成；按 HANDOFF 等 PR CI 全绿 auto-merge 后切包。
