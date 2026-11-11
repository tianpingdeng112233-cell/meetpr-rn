# 107 · Android 拍摄入口白屏

- 触发：David 报告 CN 11 点组行摄像机后、看到取景画面前白屏，退出重试几次恢复。
- 基点：`c07737b`，与已批准摘要可读性修复同批交付；无后端、签名、包名或训练数据修改。
- 复现：emulator-5570 / Android 16 独立 QA 包，通过真实 AllDayBody → VideoAttachmentControls → CameraRecorder；授权相机/麦克风后仍白屏。最小化成单个 compact 拍摄控件，3 次重启打开中 2 次白屏、1 次正常。
- 假设排序：嵌套 Modal 窗口竞争、权限回调时机、相机初始化失败。白屏时 `dumpsys media.camera` 显示 QA 包持有活动 camera client；屏幕 UI 树为空。
- 根因：CameraRecorder 已自带全屏 Modal，无 OverlayHost 的全天一览入口又加一层空 Modal，Android 呈现顺序竞争时空窗盖住相机。仅移除 fallback 外层 Modal，未改变相机权限、录制或视频生命周期。
- 正确测试 seam：真实 VideoAttachmentControls → CameraRecorder 到 React Native Modal 的原生窗口边界；只 mock Expo/存储等外部系统。先红：两条无 host 用例看到 2 个窗口而不是 1；有 host 用例本来正常。绿：compact/普通 × host/fallback 四种入口，单窗口打开、系统返回关闭；camera-review 录制/后台/关闭回归共 55 条通过。
- 原生固定探针：最小场景修后连续 3 次显示取景与录制控件。恢复完整 AllDayBody 入口连续 3 次正常（总计 6/6），实际录制 13 秒后进入剪辑页，关闭未上传的合成视频。
- 范围：T1 修复；验收是原有可拍摄入口恢复，不新增录制行为。QA 合成数据与产物与正式 com.meetpr.app 隔离，保留 5570 正式包及登录态，不碰 5556。

## 最终检查（2026-11-11）

- `npm test -- --runInBand`：218 suites / 2289 tests 全绿；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 全绿。
- `review-loop` 单轮独立审查：Standards CLEAN / 0 项；Spec CLEAN / 0 项。审查记录 `/Users/david/CodexConfig/reviews/2026-11-11-107-android-regressions.md`。
- QA 入口与插桩已移除，Metro 已关闭，5570 系统字号恢复 1.0，正式 CN 11 包及登录数据保留。未修改 iOS、后端或已发布包。
- 原生证据目录：`/Users/david/Documents/Codex/2026-11-11/users-scratch-cards-107-handoff-codex/outputs/summary-readability/`、`outputs/camera-white/`。
