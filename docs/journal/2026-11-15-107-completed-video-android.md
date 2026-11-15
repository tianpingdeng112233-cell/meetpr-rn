# 107 · Android 完成日视频状态与回看

## 授权与现场

- David 指定任务卡：`/Users/david/Projects/scratch/cards-107/card-107-completed-video-android.md`；T1 / P1，依照 096 / 107 已批准行为修复。
- 仅在 `/Users/david/Projects/apps/meetpr-rn-wt-107-video` 工作，分支 `fix/107-completed-video-android`，基线 `7a707ad`；开始时 `git status --short` 无输出。未 commit/push。
- 已先读 CONTEXT、完整任务卡、仓内 AGENTS/CLAUDE、PLAN、096 / 107 spec、记忆索引及工程闭环；本仓无 FOLLOWUPS。编码前读取 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。
- 测试 seam 已由用户和任务卡明确：真实 AllDayBody 渲染入口；采用 tdd 逐行为 red → green。根因已有定位，diagnosing-bugs 以该 seam 复现及验证，跳过无必要的多假设排查和临时日志。

## 根因与改动

AllDayBody 原先仅在 `editable=true` 渲染 VideoAttachmentControls，结算变只读后整块视频控件消失。现有 096 CompletedVideoReplay 未接到 107 全天一览。

- AllDayBody 只读时包 CompletedVideoReplayProvider，组行渲染 CompletedSetVideo 的 compact 分支；可编辑时仍直接渲染原 VideoAttachmentControls。
- CompletedSetVideo compact 复用视频解析与现有只读播放器，以 40pt 行尾摄像机图标显示上传黄、送达绿、失败红。未送达状态不可回看，不引入捕获、删除或换片入口。
- 送达需所选视频的服务端组关联，或本机 `uploaded + setLogId + attachmentId`；仅文件上传完成不标绿。
- 复用原 `playableSetVideo` 的时间比较，较新远端片优先于旧本机片；沿用签名 URL 续取、「教练已点评」和反馈详情路由。
- 未改 VideoAttachmentControls.tsx、TodayWorkoutView.tsx、后端、iOS、applicationId 或 versionCode。PARITY 仅记录已实装及未走查边界。

## Red → green 证据

命令（以下每轮均真实执行）：

```sh
npm test -- --runInBand --watchman=false src/features/training/__tests__/all-day-completed-video.test.tsx
```

证据根目录：`docs/evidence/107-completed-video-android/`。

| 轮次 | 红日志 | 实际红结果 | 绿日志与实际结果 |
|---|---|---|---|
| 完成日视频入口 | `red-render.log` | `Expected length: 1` / `Received length: 0`; `Tests: 1 failed, 1 total`; exit 1 | `green-render-initial.log`: `Tests: 1 passed, 1 total`; exit 0 |
| 上传事件黄→绿 | `red-upload.log` | 完成后图标消失；`Tests: 1 failed, 1 passed, 2 total`; exit 1 | `green-upload.log`: `Tests: 2 passed, 2 total`; exit 0 |
| 失败 / waiting 红色 | `red-failure.log` | 黄色而非红色；`Tests: 2 failed, 2 passed, 4 total`; exit 1 | `green-failure.log`: `Tests: 4 passed, 4 total`; exit 0 |
| 未绑组不得绿 | `red-unbound.log` | 无关联文件错误标绿；`Tests: 2 failed, 4 passed, 6 total`; exit 1 | 最终 `green-render.log`: `Tests: 10 passed, 10 total`; exit 0 |

未绑组门禁暴露了测试事件顺序错误：先向 `status=none` 发 `setLogReady` 会被真实 store 丢弃。已改成先 `uploadStarted` 再 `setLogReady`，随后 `succeeded`；中间失败留于 `unbound-fixture-order-failure.log`。未弱化送达约束。

最终 10 项包含：绿色只读播放、编辑→只读上传黄→绿、failed/waiting 红色、两种未绑组情形、无视频不显示入口、最新远端优先旧本机及签名失效续取、点评跳反馈、可编辑日仍可拍摄/删除。测试复用真实 provider/store/player，仅替换网络仓库、原生视频/文件/设备边界。

## 全量检查

实际命令及结果（均为本地验证，不代表 CI）：

```text
$ npm test -- --runInBand --watchman=false
Test Suites: 220 passed, 220 total
Tests:       2358 passed, 2358 total
Snapshots:   0 total
Time:        48.397 s
Ran all test suites.
exit_code=0

$ npm run lint
> meetpr-rn@1.0.0 lint
> expo lint
exit_code=0

$ ./node_modules/.bin/tsc --noEmit
exit_code=0
```

tsc 无 stdout/stderr。完整原始输出分别为 `jest-full.log`、`lint.log`、`tsc.log`；Jest 存在 expo-notifications 现有 Android 推送支持提示，不影响上述通过结果。`git diff --check` 无输出，exit 0。

## 独立审查

按 review-loop 运行只读 Standards / Spec 两个独立 reviewer；未配置 `docs/agents/issue-tracker.md`，不声称执行依赖 tracker 的 code-review 入口，已告知以后需 `$setup-matt-pocock-skills`。一轮独立审查已完成，范围为基线 HEAD `7a707ad` 至工作区两个生产文件及新增测试：

- Standards（`standards_review`）：**0 findings**；未发现仓规违反或有实质影响的维护性、功能风险。
- Spec（`spec_review`）：**0 findings**；逐项核对任务卡与 096 / 107 视频规则。指出中间失败日志名称易误导，已改名 `unbound-fixture-order-failure.log` 并说明原因。

两位 reviewer 只读，未修改代码或操作模拟器；测试结果由主代理实际执行。审查后仅补充文档与调整中间证据文件名，没有语义改动。主代理已亲读最终 diff 和新增测试；代码验证完成，原生验收仍待补，不宣称完整收货通过。

## 原生验收与未验边界

实际命令：

```sh
/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s emulator-5570 emu avd name
```

实际输出（exit 1），见 `emulator-preflight.log`：

```text
error: could not connect to TCP port 5570: Operation not permitted
```

当前沙箱无法连接指定设备，且不允许申请越权。没有操作 5556 或其它模拟器。未运行以下步骤：

1. 构建 china / `EXPO_PUBLIC_DEMO_MODE=1` / 独立 applicationId `com.meetpr.app.accept107v` 验收包。
2. 在 meetpr16@emulator-5570 并排安装与打开演示训练日。
3. 撤销完成 → 确认绿色入口 → 长按完成今日训练 → 关闭奖励页 → 确认入口保留。
4. 点开原生播放器确认播放、只读及截图；本轮无截图文件。
5. 验收包卸载（本轮未安装，无需清理设备）。

开放事项：以上原生验收待具备连接权限的环境完成；真实 OSS/历史账号升级联验未运行，测试替身或演示素材均不能替代。未发布。


## 返修 1

### 授权、验收发现与范围

- 本轮按 David 指定的 acceptance round 1 定向返修，保留上一轮全部未提交改动；不 commit/push，不操作任何模拟器。
- 已读 CONTEXT、本 JOURNAL、原卡、096 / 107 相关条款和工程规约，并查看收货方已有截图 `docs/evidence/107-completed-video-android/v2-after-complete.png`：同一 Squat 块第 1 组有视频图标，第 2 / 3 组无占位，RPE 向右错位。该截图是修前证据，不冒充本轮改后截图。
- 修前工作区三个源文件快照保存在 `/tmp/107-align-before/`，用于本轮增量审查；基线分支仍为 `fix/107-completed-video-android` @ `7a707ad`。

### 最小修复

- `AllDayBody.tsx`：仅只读模式按动作块包 `CompletedVideoGroup compact`，传入每组的 setLogId / stableSetId；editable 原路径不变。
- `CompletedVideoReplay.tsx`：复用 `resolveSetVideo`，compact 块内任一可回看视频或非 none 上传状态均预留 40pt；没有视频的兄弟行渲染 `completed-video-placeholder`，样式仅 `{ width: 40 }`，不增加行高。全块无视频不占位；非 compact 的旧列宽规则保持不变。
- `all-day-completed-video.test.tsx`：真实 AllDayBody seam 中构造两个各 3 组的动作块，只有第一块第 1 组有视频；参数化覆盖 delivered / uploading / failed，断言图标宽度 40、兄弟空槽宽度 40 且无高度样式、无视频块无空槽或图标。
- `VideoAttachmentControls.tsx` 无 diff；无无关重构。PARITY 只追加本轮对齐修复和复验边界。

### Red → green

在生产代码修改前运行：

```text
$ npm test -- --runInBand --watchman=false src/features/training/__tests__/all-day-completed-video.test.tsx
Expected length: 1
Received length: 0
Test Suites: 1 failed, 1 total
Tests:       3 failed, 10 passed, 13 total
exit_code=1
```

原始红日志：`docs/evidence/107-completed-video-android/red-align.log`。三个新增用例均在兄弟行缺占位断言处失败，原有 10 项通过。

修后同命令：

```text
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
exit_code=0
```

原始绿日志：`docs/evidence/107-completed-video-android/green-align.log`。

### 独立审查与边界

按 review-loop 对修前快照至本轮工作区的三个源文件增量进行一轮独立只读审查：

- Standards（align_standards）：0 findings；复用解析与 Context，默认参数保留旧行为，无实质仓规或维护性问题。
- Spec（align_spec）：0 findings；只读分块 40pt、全状态、无视频不占位、行高与 editable 边界均符合本轮要求。

仓内仍缺 `docs/agents/issue-tracker.md`；沿用此前说明：后续需要 `$setup-matt-pocock-skills` 才能运行依赖 tracker 的 code-review 入口，本轮实际执行的是无需 tracker 的本地双轴 review-loop。未新建配置。

本轮无模拟器构建、安装、操作或新截图；未声称改后原生验收通过。原生对齐复验待收货方执行；未发布。


### 全量检查（本地实际输出）

```text
$ npm test -- --runInBand --watchman=false
Test Suites: 220 passed, 220 total
Tests:       2361 passed, 2361 total
Snapshots:   0 total
Time:        75.222 s, estimated 267 s
Ran all test suites.
exit_code=0

$ npm run lint
> meetpr-rn@1.0.0 lint
> expo lint
exit_code=0

$ ./node_modules/.bin/tsc --noEmit
exit_code=0
```

tsc 无 stdout/stderr。原始日志分别为 `jest-full-align.log`、`lint-align.log`、`tsc-align.log`（同证据目录）；Jest 的既有 expo-notifications 提示未导致失败。最终 `git diff --check` 无输出，exit 0。以上是本地测试结果，不代表 CI 或改后模拟器验收。

## Opus 收货（2026-11-15）

- 读完整 diff；本地 `npx jest src/features/training` 连跑 4 次均 933/933，tsc、lint 通过。全量并行跑时 `all-day-view.test.tsx` 偶发超时一次（与 Gradle 打包同时跑，单文件 62/62、14.9s），记为负载偶发，非本改动回归；以 PR CI 为准。
- 原生：5570 被另一会话（albumfix 包，正在用相机）占用，改在空闲 AVD `meetpr-cn-accept`@5574 无窗口启动，装 china 演示验收包 `com.meetpr.app.accept107v`，验完已卸载并关机。
- 初验（返修前）：拍 Squat 第 1 组 → 绿 → 长按完成 → 绿入口保留、无视频组无入口、点开只读播放（`v1`–`v3`）。发现同一动作块内 RPE 列不对齐 → 返修 1。
- 复验（返修 1 后）：Deadlift 第 1 组拍摄 → 绿 → 长按完成 → 三行对齐、绿入口保留（`v4`），点开播放进度走、角标「第1组 · 177.5kg × 5」、无删除/重拍（`v5`）。
- 画面花屏：撤销完成后用未改动的可编辑播放器放同一段视频同样花屏（`v6`），判定为模拟器软件解码现象，非本改动；真机画面未验。
- 未验：真实 OSS 视频、老用户升级后第一屏、真机播放画面。
