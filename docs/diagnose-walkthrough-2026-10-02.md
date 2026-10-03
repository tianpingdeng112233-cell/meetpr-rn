# Android walkthrough 排障：Phase 1–3

2026-10-02；工作区 `diagnose/walkthrough-20261002`，基线 `b996f7d`，进入时干净。没有根目录 CONTEXT.md / AGENTS.override.md / FOLLOWUPS.md；已读 AGENTS.md、CLAUDE.md、指定 diagnose 六阶段全文及工程规约。仅增加本报告和 `.diagnose.` 测试，没有生产代码修改、埋点、修复、commit 或 push。

| 问题 | Phase 1 判据 | 后续阶段 |
| --- | --- | --- |
| D-20 上传 | **造不出原问题完整反馈环**；有条件模拟红测试 | 真机事件尚未桥接，停止 Phase 2–3 |
| D-20 Complete set | **造不出**；组件边界测试绿 | HITL，停止 Phase 2–3 |
| D-19 预览丢失 | 能红、确定性、秒级、无人值守，组件实际路径命中 | 已最小化、列假设；尚未执行假设实验 |
| D-28 通知 | **造不出**；11 个已有边界测试绿 | HITL，停止 Phase 2–3 |
| D-12 拖动 | **造不出**；JS 回调与几何测试绿 | HITL，停止 Phase 2–3 |

环境检查：`command -v adb` 无结果，显式检测输出 `ADB_UNAVAILABLE`。没有设备或现场事件日志；未调用正式后端。测试中的 student、文件、URL 都是虚构 fixture。所有命令在仓根运行，Jest 时间为单次实测，不含进程启动开销。

## D-20：切网后 Sending / Complete set 无反应

### ① 反馈环与输出

**原问题造不出。** 已跑实际 manager → upload-runner → multipart → store；只 mock 原生文件/上传接口、后端和 NetInfo。网络事件为人工构造，不能冒充小米切网轨迹。

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/video-upload/__tests__/network-handover.diagnose.test.ts
```

```text
native upload succeeds: virtualMinutes=31 status=uploaded retry=null puts=1 cancels=0
native timeout cancellation settles: virtualMinutes=31 status=failed retry=5 puts=5 cancels=5
native upload AND cancellation stay pending after handover:
  virtualMinutes=31 status=uploading retry=null puts=1 cancels=1
minimal: same pending native calls without handover:
  virtualMinutes=31 status=uploading retry=null puts=1 cancels=1
Tests: 2 failed, 2 passed, 4 total; Time: 0.605 s; exit 1
Assertion: status must be one of [uploaded, failed]; received uploading
```

重跑仍为 2 红 / 2 绿。假时钟推进 31 分钟，不是真实等待。**这只证明“两条原生 Promise 均悬置”时的边界行为；去掉切网仍红，因此没有证明 David 的切网故障就是这个模式。** 上传恢复的 Phase 1 缺少“确为原症状”的证据，其他三项满足。没有把这条红测试升级为 D-20 根因结论。

另跑 `retry-scheduler.test.ts`：9 passed，0.702 s；它只覆盖已有失败后的调度策略。

Complete set 单独尝试：

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/__tests__/set-entry-sending.diagnose.test.tsx
```

最终版本单独运行，并在组合命令中复跑：

```text
PASS set-entry-sending.diagnose.test.tsx
Sending=true; Complete set -> onSave calls=1 (parent commit/network not reproduced)
Tests: 1 passed, 1 total; Time: 0.681 s; exit 0
```

挂载真实 SetEntrySheet / VideoAttachmentControls，输入 80 / 5 / 8、可编辑、上传状态 uploading，确认屏幕文本 Sending，再点 Complete set。保存回调被调用；**onSave 是 stub，没有覆盖 TodayWorkoutView.commit、保存队列、真实网络及触摸投递**，不能据此排除用户反馈。首次 harness 用错文案 key 导致选择器报错，修正测试后通过；该报错不计产品失败。

### ② 最小复现位置 / HITL

边界测试位置如上，保留红测试；原问题没有经过验证的最小复现。待真机执行：在有效组输入下录制 → Use → 确认 Sending → Wi-Fi 切蜂窝 → 记录切换和点击时间 → 点击 Complete set → 连续观察至少 90 秒；上传仍未结束时延长观察并记下实际时长。不要先重启或删除附件，以免丢失现场。

缺：同一时间轴的录屏（遮蔽用户信息）、实际 NetInfo/AppState 事件、原生 PUT 与 cancel 完成/拒绝时间、保存请求是否发出及状态码、实际等待时长、Android/系统版本。只交付状态和相对时间，不交付 token、完整上传 URL 或账号。curl、headless 浏览器无法覆盖 Android 原生上传和触摸；没有现场请求/事件可回放，也没有已知正常版本可二分。

### ③ 假设

**不列。** 两个症状均未完成原问题 Phase 1，人工注入的悬置不是已观察到的真机事实。

### ④ 下一步

先取得上述同步现场证据，分别确认上传是否在继续、以及按钮事件是否到达保存入口；之后用真实事件替换当前 fixture，再决定能否进入假设阶段。

## D-19：预览切后台后丢失

### ① 反馈环与输出

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx
```

```text
no interruption control: previewCount=1 retryVisible=true useVisible=true zeroClock=false fileDeleted=false
inactive-only control:   previewCount=1 retryVisible=true useVisible=true zeroClock=false fileDeleted=false
background and return:  previewCount=0 retryVisible=false useVisible=false zeroClock=true fileDeleted=true
minimal: background alone:
                        previewCount=0 retryVisible=false useVisible=false zeroClock=true fileDeleted=true
Tests: 2 failed, 2 passed, 4 total; Time: 0.467 s; exit 1
Assertion: preview=1, Retry/Use visible, zeroClock=false, fileDeleted=false
```

独立重跑 0.690 s，同样 2 红 / 2 绿；另一次组合重跑也一致。四项判据满足：真实 CameraRecorder 完成录制、停录进入预览，通过其真实 AppState listener 回调触发 background，直接断言原症状。相机返回固定 URI，文件删除为 spy；`fileDeleted` **表示调用了 deleteLocalVideo(uri)，不是已在手机磁盘上验证删除**。没有 mock review state 或背景处理逻辑。

### ② 最小化

位置：[camera-review.diagnose.test.tsx](../src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx)。最小事件链：权限已给 → CameraReady → Record → Stop → 得到固定 URI、确认预览 → **一次 background**。去掉返回 active 仍红；去掉 background 变绿；仅 inactive → active 也绿。无需网络、上传、父页面重建或真实录像内容。保留“完成录制”和“background”两项承重条件；无完成录制就没有本问题要保留的预览。真机补验步骤与用户原步骤相同，尚未执行。

### ③ 可证伪假设（优先级从高到低；未做改动实验）

| 排序 | 假设及当前支持度 | 若成立，什么改变会消失 / 更糟 |
| --- | --- | --- |
| 1 | background 清理把已完成 review 当作录制中断一起丢弃。最小环无需卸载就出现完整症状，支持最强。入口：CameraRecorder 的 AppState 回调。 | 后续仅把中断清理限于录制中、保留已完成 review 和 URI，当前红测试应消失；若扩大到 inactive 也清理，当前 inactive 绿对照会变红。 |
| 2 | 真机切回时父 overlay 或相机异常回调引起卸载/重建，丢失组件私有状态。**不是当前单次挂载红环的必要条件**，只保留为现场可能叠加的路径。 | 在排除 #1 后，保持同一 recorder 实例应消失；强制每次返回换 key/重建会更糟。若实例始终未变仍失败，则否定此解释。 |
| 3 | 系统相机/相册权限 Activity 产生额外 background，把权限交互当作离开录制页。**最小环权限直接通过，故它不是必要条件**；现场若权限早已齐全，应进一步降级。 | 在排除普通切后台清理后，预先授予权限并避免预览期权限 Activity 应消失；撤销权限、让预览期弹系统授权会更频繁。无权限交互仍同样失败则不支持。 |

### ④ 下一步

建议先验证 #1：后续获准修复阶段只改“录制中 / 已完成预览”的清理边界，跑原始 background → active 环及最小环，并补真机文件可播放验证。本轮停在假设表，没有做此实验，也没有宣布修好。

## D-28：Training reminders 到点无通知

### ① 反馈环与输出

**造不出。** 已尝试仓内权限、恢复、调度、页面入口测试：

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/settings/__tests__/training-reminder.test.ts src/features/settings/__tests__/settings-screens.test.tsx
```

```text
PASS training-reminder.test.ts
PASS settings-screens.test.tsx
Tests: 11 passed, 11 total; Time: 1.1 s; exit 0
```

覆盖星期/时间参数、渠道 ID、取消旧请求、退出与重新登录、调度拒绝和页面时间编辑。Notifications 被 mock；**成功调用 schedule 不等于系统投递，更不等于通知栏可见**。确定性、秒级、无人值守满足，但“能对到点不通知变红”不满足。Jest 假时钟不能推进手机系统闹钟，curl 或浏览器也不能替代原生通知展示。

### ② 最小复现 / 缺口

暂无失败测试或已验证最小复现。HITL：同一 debug 包，打开开关、选今天和未来 2 分钟时间，记录设备本地时间/时区；分别在前台、后台、锁屏观察通知栏与声音，不把没有横幅等同于没有通知。保持登录，不清应用数据。

缺：原始复现时前台/后台/锁屏状态、实际星期/时间/时区、系统及 training-reminder 渠道权限、已计划通知列表与下一触发时间、到点接收/展示记录、设备系统版本。只有这些信息才能界定具体失败在哪个边界。已核对 [Expo SDK 57 通知文档](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)；文档只作为下一轮采证的 API 依据，不代替设备结果。

### ③ 假设

**不列；停在 Phase 1。** 不根据静态代码推测权限、定时或系统限制就是根因。

### ④ 下一步

先在同一设备补一轮有时间戳的“已计划请求 → 到点 → 通知栏”观察，并明确前后台状态；取得结果后建立可判红的 HITL 环。

## D-12：RPE 拖动中断

### ① 反馈环与输出

**造不出原生手势反馈环。** 在真实 SetEntrySheet 的 ScrollView 中挂载真实 RPE 控件，回放 grant/move/release，跨父组件更新检查数值；另跑已有几何/方向锁定测试。

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/__tests__/rpe-drag.diagnose.test.tsx src/features/training/__tests__/set-entry-rpe.test.ts
```

```text
{"dy":0,"values":[5,6,7,8,9,10],"nativeArbitration":"NOT_EXECUTED"}
{"dy":30,"values":[5,6,7,8,9,10],"nativeArbitration":"NOT_EXECUTED"}
Tests: 6 passed, 6 total; Time: 0.763 s; exit 0
```

脚本先固定宽度 329，水平移动取得 scrub，再分别保持水平/加入纵向漂移，数值均到 10，JS termination request 均返回 false。**手动送回调绕过原生触摸仲裁，不能证明手机不中断。** 初版缺 AsyncStorage mock、随后误选 Stepper 的 layout 节点，均已修正 harness；这些失败不计 D-12 复现。

### ② 最小复现 / 缺口

保留 [rpe-drag.diagnose.test.tsx](../src/features/training/__tests__/rpe-drag.diagnose.test.tsx) 作为边界对照，没有命中症状的最小失败测试。HITL：实际组录入页从刻度中部连续拖到另一端，先水平、再带轻微纵向偏移；失败时手指保持按住，记录刻度与外层页面是否继续移动。建议每种 10 次，记录失败次数而非声称确定性。

缺：带触点和时间戳的失败录屏、起触位置/方向/宽度、父滚动偏移，以及 grant/move/termination 的相对顺序。没有这些事件，fuzz 任意 dx/dy 只能测试模型；headless 浏览器不能复现 Android 原生 ScrollView 仲裁。

### ③ 假设

**不列；停在 Phase 1。** 当前对照不能用于指认父滚动或方向阈值。

### ④ 下一步

先采一条失败手势及一条成功对照，确认在哪里停止向控件交付移动事件；随后决定能否回放，或必须保留真机 HITL。

## 工作区交付与验证

四个新增测试均带 `.diagnose.`；其中两个文件故意保持红。D-20 的模拟红与 D-19 的症状红明确分开；另两个是绿的边界对照。没有修改正典发布/验收台账，也未把自测当验收。

已跑组合命令：

```sh
npx jest --runInBand --watchman=false --runTestsByPath src/features/training/__tests__/set-entry-sending.diagnose.test.tsx src/features/training/video-upload/__tests__/network-handover.diagnose.test.ts src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx
```

输出：`Tests: 4 failed, 5 passed, 9 total; Time: 1.017 s; exit 1`，四个失败均为上述保留断言。它不是全仓回归结果。

类型检查：`npx tsc --noEmit`，exit 0，无诊断输出。最终复查仅本报告及四个诊断测试为未跟踪新增文件，原有受跟踪文件无 diff。

## 补充：Opus 在模拟器上造的反馈环（2026-10-02，AVD `meetpr` Android 15 + 本地合成 API）

上文四个 `.diagnose.` 测试留在分支 `diagnose/walkthrough-20261002` 的工作区，未随本文件提交；D-19 的诊断测试已转成正式回归测试 `camera-review.test.tsx`。

### D-19 结论

假设 1 被证实：`CameraRecorder` 的后台清理不区分"录制中"与"已完成预览"。修复只在录制进行中才按中断清理。真机复验待做。

### D-12：RPE 拖动（已成环）

用 `adb shell input swipe` / `input motionevent` 在真实组录入页回放触摸，读回无障碍标签里的 RPE 值。

| 手势 | 结果 |
|---|---|
| 纯水平 5→10、10→5，快 / 慢 | 35 / 35 到位 |
| 水平拖动中途带 30–80 px 纵向抖动，或手指滑出卡片 200 px | 9 / 9 到位 |
| 起手先纵向 8 px 再水平 | 3 / 3 到位 |
| 起手先纵向 15 px 再水平 | 1 / 3 到位 |
| 起手先纵向 40 px，或 45° 斜向起手 60 px，再水平 | 0 / 6，值停在按下时的位置 |

即：拖动一旦被控件接管就不会中断；起手阶段只要带十几像素的纵向分量，控件就接不到手势。尚未向 David 确认这与他说的"滑到一半中断"是同一现象。

假设（可证伪，按可能性排序）：
1. 方向锁只在起手的头几次移动里判定归属，纵向分量稍大就把手势让给外层滚动，之后不再重新判定。若成立：放宽起手判定或在后续移动中重新争取手势，上表后两行转为到位；把阈值调严，8 px 那行会失败。
2. 安卓原生 ScrollView 在纵向超过触摸阈值后拦截触摸，JS 层拿不回。若成立：按住刻度条期间禁用外层滚动即可到位，不需要改 JS 阈值。
3. 命中区域太矮、手指滑出即结束。已被"滑出卡片 200 px 仍到位"证伪。

### D-28：训练提醒（已成环）

打开开关 → 系统弹通知权限 → Allow → 选当天与临近时间，用 `dumpsys alarm` / `dumpsys notification` 观察。

- 定时确实排上了：每个选中的星期一条 `RTC_WAKEUP`，到点后自动排下一周的。
- 是**非精确**定时：提前很久排的，系统给 1 小时的窗口（`window=+1h`）；临近排的窗口约为剩余时间的 75%。实测一条提前约 2 分钟排的提醒晚了 78 秒才发。
- App 在**后台**：通知发出，渠道 `training-reminder`，重要级别 DEFAULT（有通知栏条目，无横幅）。
- App 在**前台**：定时被消费、下一周的也排上了，但通知栏里没有任何通知。原因在 `src/features/settings/training-reminder.ts`：通知处理器对前台一律返回不显示横幅、不进列表、不响。

假设（可证伪）：
1. David 测试时 App 开在前台，被上面的前台处理器吞掉。若成立：前台允许展示后，前台用例出现通知；后台用例不变。
2. 非精确定时导致迟到（最坏 1 小时）。若成立：改用精确定时后按点触发；代价是需要精确闹钟权限。
3. 渠道级别 DEFAULT 没有横幅，通知进了通知栏但没被注意到。若成立：调到 HIGH 后后台用例出现横幅。
4. 小米系统的自启动 / 省电限制把定时清掉。模拟器无法验证，需真机。

### D-20：切网后卡在 Sending、Complete set 无反应（未成环）

模拟器无法登录正式后端，本地合成 API 没有上传端点，造不出原问题的环。Codex 的条件模拟测试证明了一个确定的缺口：原生上传调用与其取消调用如果都不返回，管理器会一直停在 uploading，没有任何兜底超时。但没有证据表明真机切网走的就是这条路；Complete set 无反应在组件边界上没有复现。仍需真机现场信息。
