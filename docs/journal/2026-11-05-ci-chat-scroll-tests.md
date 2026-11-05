# CI 聊天滚动测试稳定性（T1 / P1）

- 来源：David 2026-11-05 直驱修复 CI；只修测试调度，不修改聊天业务行为。
- 基线：`68b2b60405ca3022a3b42e9ab4ec5478eddbc59d`（origin/main）。
- 原失败：RN run 41964635321 / job 127038683594，2064 tests 中 1 项失败；首次未读定位 518 正确，历史前插锚定期望 190、实际 30。
- seam：现有 `StudentConversationScreen` 渲染测试，通过 ScrollView 布局/滚动事件与 scrollTo 可观察结果验证。
- 复现：在滚动触发历史加载后、测试手动发送新布局前插入 30ms 调度延迟；`npm test -- --runInBand --runTestsByPath src/features/chat/__tests__/student-conversation-screen.test.tsx -t 'initial scroll' --silent` 稳定报同一 190→30 差异。
- 假设排序：① RAF 在手工布局前跑到旧 frame；② 锚点计算回归；③ suite 共享状态污染。单测隔离复现，控制帧边界后保留延迟也通过，支持①。
- 修复：仅该测试接管 requestAnimationFrame/cancelAnimationFrame，在送出完整布局后显式执行一帧；移除两个依赖机器调度的 30ms 等待。所有现有位置断言保留。afterEach 的 restoreAllMocks 恢复调度接口。
- 清理：复现用调度延迟和临时 RAF 探针均已删除；无业务代码改动。
- 验证：目标单测通过；整文件 34/34 通过；全量 198 suites / 2064 tests 通过（2 workers）；lint、TypeScript 与 diff --check 通过。
- 独立审查：review-loop 一轮，Standards CLEAN（0），Spec CLEAN（0 blocker）；采纳 Spec 建议，注释仅描述测试调度约定，不声称原生平台保证。未执行原生 UI 验收（业务/UI 未改）。
- 原生轨状态：只修改测试，无 Android 包或线上行为变化；CI 结果待 PR 创建后补。
