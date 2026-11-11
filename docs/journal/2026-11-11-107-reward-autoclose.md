# 107 奖励页自动关闭 · 2026-11-11

- 入口：已读 CONTEXT、仓规、spec 107 第 5 轮修订与 HANDOFF-codex；基线 `2570491`，分支 `fix/107-reward-autoclose`。T1 / P1。
- 范围：仅奖励完成流程、测试及提示本地化。5 秒无触碰等同完成；任意触碰取消；查看报告不被打断。保留上传等待、撤销与回顾入口；历史重量预填保持关闭。
- 测试 seam：CompletionControls / WorkoutCompletionFlowView（jest fake timers）。
- 测试证据：验收 18/19 先红后绿，20 与卸载/回顾回归通过；typecheck/lint 通过。全量首次 2284 通过、1 个旧测试期待29.999秒奖励页仍在；改为先触碰取消再验证原30秒超时回滚。
- 独立 review-loop 一轮：Standards 0 个阻塞；Spec 0 个确定性缺陷。原生触碰、安全区与报告滚动待模拟器验证。
- 状态：开发验证进行中，尚未合并，尚未切包；大日志留本机 work/，不入仓。
