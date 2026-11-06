# Android 相机保持常亮 · T1

- 基线：`fix/camera-keep-awake` @ `cd287552a752ac14ef824214ec92b90a7035e290`；开工工作树干净。需求及验收清单来自 David 本轮任务正文。未 commit、push 或创建 PR。
- 已读 AGENTS、CLAUDE（仅引用 AGENTS）、CONTEXT、PLAN、全局 engineering-workflow、memory/INDEX、tdd 和 review-loop；RN 仓无更近的 AGENTS.override / FOLLOWUPS。
- 只改 CameraRecorder、既有 camera-review 测试、package.json、package-lock.json 和本 JOURNAL。无 UI、文案、后端或其它依赖版本改动；正典台账留给 Opus 收货。
- 复用开工已有的 node_modules 软链（指向 meetpr-rn-wt-kbd/node_modules）。已核对本地 expo-keep-awake JS 与 Android 源码；未执行依赖升级。

## iOS 时机与实现

默认 iOS checkout 没有该 Swift 文件，从已有 `MeetPR-wt-kbd` @ `e106803b2b6d38c0d68777fed4860154d1602b78` 只读核实：

- `Modules/StudentKit/Sources/StudentKit/Features/VideoUpload/Camera/CameraRecorderView.swift:137`：视图 `.task` 中、`controller.prepare()` 之前设置 `isIdleTimerDisabled = true`。是相机出现时开启，不是开始录制时。
- 同文件 `:286`：`shutdownRecorder()` 中恢复 false；`close`、外部 dismissal、符合条件的 `onDisappear` 调用 shutdown。iOS 停止录制后仍保持到关闭录制器。
- 本次 Android 按用户明确的“停止录制也要释放”要求：相机出现即开启；Stop、时长上限、原生录制完成进入预览、录制失败、权限拒绝、相机错误、退后台、退出和卸载均释放。前台构图、重拍或失败后的重新录制重新激活；预览与已退出的录制器不会因回前台而激活。
- 每次激活使用 `training-camera:<React useId>:<activation sequence>`，同 tag 成对释放，避免晚到的旧激活清理误伤新相机。关闭时立即释放，不依赖父组件同步卸载。异步激活在释放后才完成时再清理同一旧 tag；这是竞态补偿，不是新的持有者。
- 显式声明 `expo-keep-awake: ~57.0.1`；lockfile 根依赖同步，已锁定的 `57.0.1` 包节点及其它依赖保持原样。
- 已查阅 [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) 和 [KeepAwake API](https://docs.expo.dev/versions/v57.0.0/sdk/keep-awake/)；网页当前推荐版本不覆盖用户要求的现有锁定版本。

## 测试 seam 与先红后绿

沿用用户指定的 `src/features/training/video-upload/__tests__/camera-review.test.tsx`，真实挂载 CameraRecorder，通过相机/按钮/Modal/AppState 公开事件驱动；mock `expo-keep-awake` 的原生 API，断言对应 tag 的激活与释放。没有新造内部测试接口。

每个切片先运行失败用例，再改生产代码、用同命令转绿。共同命令前缀：

```sh
npx jest --runInBand --watchman=false src/features/training/video-upload/__tests__/camera-review.test.tsx
```

| 切片（追加 `-t`） | Red | Green | 失败依据 |
| --- | --- | --- | --- |
| `'camera appearance keeps'` | 1 failed / 32 skipped | 1 passed / 32 skipped | 预期激活 1 次，实际 0 次；同时验证 Stop 在原生完成前释放 |
| `'releases keep-awake even'` | 3 failed / 33 skipped | 3 passed / 33 skipped | Close / back / camera error 在父组件未卸载时没有释放 |
| `'background releases keep-awake'` | 2 failed / 36 skipped | 2 passed / 36 skipped | 构图及录制中退后台没有释放 |
| `'denied camera permission releases'` | 1 failed / 38 skipped | 1 passed / 38 skipped | 权限拒绝后仍持有 tag |
| `'releases keep-awake even'`（增强） | 3 failed / 36 skipped | 3 passed / 36 skipped | 已退出但父组件未卸载时，回前台错误地再次激活 |
| `'time limit releases'` | 1 failed / 39 skipped | 1 passed / 39 skipped | 到时停止但原生 promise 未完成时尚未释放 |

原始临时日志：`/tmp/camera-keep-awake-red1.log` 至 `red6.log`，对应 `green1.log` 至 `green6.log`，共同前缀均为 `camera-keep-awake-`。本表保存结果，临时文件不作为后续接棒的必要条件。

追加覆盖：构图/录制中卸载、recordAsync reject 后重录、原生自动完成与 Retry、旧激活晚到且新相机已打开、原生 API reject 的清理尝试。既有预览、裁剪、保存相册和文件所有权测试全部保留。

最终定向结果：**1 suite / 46 tests 全绿**（原 32 + 新增 14），1.258s，0 snapshots；日志 `/tmp/camera-keep-awake-focused.log`。

## 全量检查

| 命令 | 结果 |
| --- | --- |
| `npx jest --runInBand --watchman=false` | **207 suites / 2185 tests 全绿**，45.094s，0 snapshots，最终退出 0 |
| `npx tsc --noEmit` | 退出 0，0 诊断 |
| `npm run lint` | 退出 0，0 errors / 0 warnings |
| `git diff --check` | 通过 |

全量日志 `/tmp/camera-keep-awake-jest-all.log`；类型与 lint 日志分别为 `/tmp/camera-keep-awake-tsc.log`、`/tmp/camera-keep-awake-lint.log`。本轮无超时、无失败套件，无需 `--testTimeout=120000` 重跑。Jest 完成后一度提示异步操作未在 1 秒内退出；随后进程自行退出 0，未强制终止或使用 `--forceExit`，未运行额外诊断来推断该提示的来源。

## 独立代码自审

依 review-loop 做一轮独立只读双轴审查，固定范围为 HEAD 至本任务 4 个代码/依赖文件。仓内缺少 `docs/agents/issue-tracker.md`，已告知正式 tracker 流程需 `$setup-matt-pocock-skills`；本地 review-loop 以本任务正文为源，不依赖 tracker。

- Standards：0 findings；核对版本、tag 生命周期、延迟激活、公开测试 seam 与无 UI/文案改动。
- Spec：0 findings；核对出现时开启、停止/限时停止释放、退出/卸载/后台/错误、晚到激活和 tag 隔离、依赖版本及无 UI/文案改动。
- 本轮是开发自测/自审，不替代 Opus 收货和真机验收。

## 真机 HITL

**待人工复验，未宣称物理屏幕或 vivo 真机验收通过。** Jest mock 只能证明调用与生命周期，不能证明 OEM 熄屏行为。未构建、安装或发包。

1. vivo CN 包将系统自动熄屏设为较短时长，打开训练相机，构图等待及录制均超过该时长，确认屏幕持续亮、录制不中断。
2. Stop 后预览、退出相机后等待系统时长，确认恢复正常熄屏；系统返回和录制途中退出同样检查。
3. 重拍、录制中退后台再返回、相机错误/权限拒绝后退出，确认没有全 App 常亮；录制完成的视频仍可预览、保存和使用。
