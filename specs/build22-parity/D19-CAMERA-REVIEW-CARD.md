# 任务卡 D-19：录完的视频预览切后台后不丢

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、本卡，以及 `/Users/david/.claude/skills/diagnose/SKILL.md` 的 Phase 4–6。

- 级别：T1。来源：2026-10-02 真机走查 D-19；Phase 1–3 已完成（分支 `diagnose/walkthrough-20261002` 的排障报告，结论摘在下面）。
- 基线：RN `fix/e1rm-imported-baseline`（PR #65 顶）。这是 Opus 派的卡：在当前分支 `fix/camera-review-survives-background` 的工作区改，**不 commit、不 push**；只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。

## 现象

拍摄页录完一段视频，停在预览（Retry / Use）时切到别的 App 再切回来：预览没了，回到 00:00 待录，刚录的视频丢失。

## 已有的反馈环（Phase 1–2，已跑过，确定性、亚秒级）

`src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx`（已放进本工作区，目前 2 红 2 绿）：

```
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx
```

最小事件链：权限已给 → CameraReady → Record → Stop → 进入预览 → **一次 background**。结果：预览消失、Retry/Use 不见、计时回 00:00，并调用了 `deleteLocalVideo(uri)`。只有 inactive → active 时不复现；不切后台不复现。

## 假设（排序，可证伪）

1. **`CameraRecorder` 的 AppState 后台清理把"已完成的预览"当成"录制被中断"一起丢弃。** 若成立：把清理限定在"正在录制"状态、保留已完成预览及其文件，红测试转绿；若把清理扩大到 inactive，现在绿的 inactive 对照会变红。
2. 真机切回时父层重建导致组件状态丢失。不是当前红环的必要条件，#1 排除后再看。
3. 预览期出现系统权限页产生额外 background。最小环里权限直接通过，不是必要条件。

## 要做的（Phase 4–6）

- 先验证 #1（一次只改一个变量；如需调试日志，带唯一前缀 `[DEBUG-d19]`，结束前清干净）。
- 把诊断测试转成正式回归测试（去掉 `.diagnose.` 命名），保留三条对照：不打断、仅 inactive、background 再返回。
- 修复后的行为：
  - 录制**进行中**切后台：维持现有的中断清理行为，不留半截文件。
  - **已停止、停在预览**时切后台再回来：预览、Retry / Use、时长都还在，本地文件不删；点 Use 仍走原有的附件流程，点 Retry 仍删除旧文件并重录。
  - 关闭拍摄页（Close camera / 系统返回）时照旧清理未使用的文件，不留孤儿文件。
- 正确的那个假设写进 JOURNAL，供提交信息引用。

## 测试 seam

`CameraRecorder` 组件 + 其 AppState 监听（即现有诊断测试所在边界）。不新增其他 seam。

## 验收清单（Opus 收货）

- [ ] 原红测试转绿；inactive 对照与无打断对照保持绿；新增"录制中切后台仍按中断清理"的用例为绿。
- [ ] 预览态切后台返回后点 Use：附件进入原有上传流程；点 Retry：旧文件被删、可重录。
- [ ] 关闭拍摄页后没有未引用的本地视频残留（现有 `local-retention` 行为不回归）。
- [ ] `grep -rn "DEBUG-d19" src` 为空；全量 jest、tsc、lint 通过。
- [ ] 真机复验由 David 做：Opus 出包后按原步骤走一遍。

## Out of Scope

视频剪辑（R3）、拍摄页全屏与关闭按钮位置（D-13）、上传与切网（D-20）、后台继续录制。
