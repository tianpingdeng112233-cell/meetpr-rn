# spec D-16 — 安卓休息倒计时通知（切后台 / 锁屏可见）

- **状态**：已确认（David 2026-10-04）。第一版已实装（PR #79）；真机验收后 David 追加「2A」（见文末「增补一」），返修中。
- **拍板**：2026-10-02 David 定"安卓做常驻通知（锁屏、切后台可见倒计时）"；2026-10-04 细节 1A / 2A / 3A（见"行为"）。
- **级别 / 节奏**：T2（新原生能力 + 新的用户可见行为）；P1。PR 开好后等 David 放行。
- **范围**：仅安卓（meetpr-rn）。iOS 对应能力是 spec 073 Live Activity，不在本 spec。零后端。

## 问题

组间休息倒计时只在 App 内的计时条里。学员组间切去别的 App 或锁屏后什么都看不到，休息结束时的震动也只在 App 前台才有，只能自己估摸着切回来（真机走查 D-16）。

## 行为

### 倒计时通知（3A：只在不在前台时显示）
- 休息倒计时进行中、App 进入后台或手机锁屏时，出现一条**持续通知**；回到 App 前台时这条通知立即消失，页内计时条照常显示且剩余时间一致。
- 通知内容：
  - 标题："Rest between sets" / 「组间休息」。
  - 倒计时：由系统原生计时控件显示 mm:ss 并自动每秒跳动（不靠 App 进程刷新）。
  - 按钮（2A）：**"Skip"**（沿用 `student.restTimerOverlay.copy001`）与 **"+30s"**。
- 通知为静默、不可滑动清除的进行中通知；不响铃、不震动、不弹横幅。锁屏上可见。
- 点通知正文：打开 App 回到训练页。
- 点 **Skip**：不打开 App，休息立即结束——倒计时通知消失、不再有结束提醒；之后回到 App 时页内计时条也已关闭。
- 点 **+30s**：不打开 App，剩余时间加 30 秒（总剩余不超过现有上限 `TRAINING_LIMITS.restMaximumSeconds` = 900 秒），通知上的倒计时随之更新；之后回到 App 时页内计时条显示同一剩余时间。

### 结束提醒（1A）
- 倒计时走完时 App **不在前台**：倒计时通知消失，换成一条提醒——震动一次并弹出横幅，标题 "Rest complete"（沿用 `student.restTimerOverlay.copy003`，中文「休息结束」），正文 "Time for your next set" / 「该做下一组了」。点开回到训练页。提醒在回到 App 前台时自动清除，不堆积。
- 倒计时走完时 App **在前台**：行为与现在完全相同（页内显示 Rest complete + 轻震），不发任何通知。

### 其他
- App 内对休息的任何操作（-30s / Skip / +30s、记下一组、完成当天、离开训练页导致计时结束）都要同步到通知：计时结束则通知与结束提醒一并取消。
- 首次进入"需要说明"或"休息设置"弹层而暂停计时的现有逻辑不变；计时未开始走时不发通知。
- 通知权限未授予：不发任何通知，不弹权限请求（权限在首启时已请求过），App 内行为不变。
- 精确定时权限（"闹钟和提醒"）未授予：结束提醒改用非精确定时，可能晚到；倒计时通知不受影响。不为此新增权限请求。
- App 进程在后台被系统回收：倒计时通知继续走完、结束提醒照常出现、两个按钮照常可用；再次冷启动 App 时不恢复页内计时条（现状即如此，不在本 spec 扩展）。

## 技术方案

- 新增本地 Expo 模块 `modules/rest-timer-notification`（Kotlin），不新增第三方依赖。`expo-notifications` 不支持系统倒计时控件，所以不走它。
  - `show(endAtEpochMs, labels)`：用 `NotificationCompat` 发进行中通知——`setUsesChronometer(true)`、`setChronometerCountDown(true)`、`setWhen(endAt)`、`setOngoing(true)`、`setOnlyAlertOnce(true)`、`setTimeoutAfter(剩余毫秒)`；两个 action 指向模块内的 `BroadcastReceiver`；同时用 `AlarmManager` 在 `endAt` 排结束提醒（有精确定时权限用 `setExactAndAllowWhileIdle`，否则 `setAndAllowWhileIdle`）。
  - `hide()`：取消进行中通知、结束提醒通知与未触发的定时。
  - `consumeState()`：返回并清空后台期间由通知按钮产生的状态 `{ endAtEpochMs | null, skipped: boolean }`（存 `SharedPreferences`，进程被回收也不丢）。
  - Receiver：`SKIP` → 取消通知与定时、写入 `skipped`；`ADD_30` → 读当前 `endAt`、加 30 秒并按上限截断、重发通知与定时、写回 `endAt`；`END` → 取消进行中通知、发结束提醒。
  - 两个通知渠道：`rest-timer`（低重要度、静默）与 `rest-complete`（高重要度、震动、无声音）。渠道名走 i18n。
  - 不使用前台服务，不新增权限（`POST_NOTIFICATIONS` 与 `SCHEDULE_EXACT_ALARM` 已在用）。
- JS 侧：把休息计时的"墙钟终点 + 是否在走"从 `RestTimer.tsx` 的组件内状态提到一个小的纯状态模块（`src/features/training/rest-timer-session.ts`），由它决定何时 `show` / `hide`：`AppState` 变为非 active 且计时在走 → `show`；变回 active → `consumeState()` 应用（跳过则关闭计时条，改过终点则更新终点）→ `hide`。页内计时条的显示、文案、交互不变。
- 文案：新增键放 `src/i18n/catalog/RnExtras.json`（标题、正文、渠道名、"+30s" 按钮）；能沿用的沿用现有键。

## 测试 seam（先红后绿）

1. `rest-timer-session.ts` 纯状态：开始 / 加减 / 跳过 / 走完；进后台时产出 `show(endAt)`；回前台时按 `consumeState` 的三种结果（无变化、终点已改、已跳过）更新状态并产出 `hide`；计时未在走时进后台不产出 `show`；权限未授予时不产出任何原生调用。
2. `RestTimer` 组件测试：回前台后剩余时间与原生状态一致；被通知跳过后计时条关闭并调用 `onClose` 一次。
3. 原生 Receiver 的加 30 秒截断与跳过写状态：若仓内没有 Android 单测基础设施，写明缺 seam，由 Opus 在模拟器按验收清单验。

## 验收清单（Opus 收货，实装方不得自定范围）

1. 记完一组、计时条在走时按 Home：通知栏出现"Rest between sets"与每秒跳动的倒计时，数值与切回 App 后计时条一致（误差 ≤ 1 秒）。
2. 锁屏上可见同一条通知。
3. 回到 App：通知立即消失。
4. 通知上点 +30s：倒计时加 30 秒；回到 App 计时条一致。连点到上限不超过 15:00。
5. 通知上点 Skip：通知消失、之后没有结束提醒；回到 App 计时条已关闭。
6. 在后台等到走完：震动 + 横幅 "Rest complete / Time for your next set"；点开进入训练页；回前台后提醒被清除。
7. 在前台等到走完：没有任何通知，页内表现与改动前一致。
8. 在 App 内点 Skip / 记下一组后再切后台：没有倒计时通知。
9. 关掉 App 的通知权限后重复 1：没有通知、没有权限弹窗、App 内正常。
10. 划掉最近任务（杀进程）后：通知继续倒计时，走完有结束提醒，Skip / +30s 仍可用。
11. `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过；原生编译通过。
12. 真机（David，vivo）：1、2、6、10 各走一遍。厂商系统对后台定时有额外限制，结束提醒是否准时以真机为准。

## Out of Scope

- 冷启动后恢复页内计时条。
- 通知上的 "-30s"、进度条、下一组信息。
- 声音提示。
- iOS（spec 073）。
- 训练提醒通知（已有，另一条链路）。

---

## 增补一（2026-10-04，David 真机验收后拍板「2A」）

真机（vivo）反馈两点：通知只有一行标题加倒计时，过于简陋，希望接近打车软件那种实时卡片；另外锁屏上没有出现倒计时通知（通知中心里有，被归在静默一组）。本节**覆盖**上文与之冲突的条目，其余不变。

### 行为

**A. Android 16 及以上：实时更新通知（Live Update）**
- 倒计时通知以系统的"实时更新"形态发出。系统允许时：
  - 状态栏出现一个胶囊，里面是 MeetPR 图标和每秒跳动的倒计时；在任何 App 里都能看到。
  - 通知栏与锁屏上，这条通知排在最前并默认展开：标题、正文、进度条、Skip / +30s 两个按钮。
- 样式由系统决定，不使用自定义布局。
- 用户在系统设置里关掉了 MeetPR 的"实时更新"，或系统没有把它提升：退回 B 的形态，不报错、不弹任何请求。

**B. 其他系统版本（以及 A 未被提升时）：标准通知**
- 仍是一条进行中通知，但内容与 A 一致：标题、正文、进度条、两个按钮。

**A 与 B 共同的内容**
- 图标：MeetPR 标志的单色小图标（不再是系统闹钟图标）；强调色用品牌金。
- 标题："Rest between sets" / 「组间休息」（不变）。
- 正文：刚记完这一组所属的动作名（如 "Competition Deadlift"）。拿不到动作名时不显示正文。
- 倒计时：系统计时控件，每秒跳动（不变）。
- 进度条：已休息时间占本次休息总时长的比例。后台期间约每 10 秒前进一次，尽力而为；系统推迟刷新时进度条可以滞后，但倒计时数字必须始终准确。点 +30s 后按新的总时长重新计算。
- 结束提醒 "Rest complete" 也换成 MeetPR 图标，其余不变。

**C. 锁屏可见、不再归入静默组**
- 倒计时通知改用"默认重要度、无声音、无震动"的渠道：出现在锁屏上，在通知中心里不再被折进静默组；仍然不响铃、不震动、不弹横幅。
- 旧渠道已经在装过上一版包的手机上建好且重要度改不了，所以换用新的渠道 id，并删除旧渠道。

### 技术方案
- 仍在 `modules/rest-timer-notification` 内，不使用前台服务。
- 形态 A 的要求以官方文档为准：https://developer.android.com/develop/ui/views/notifications/live-update 。要点：模块 Manifest 声明 `android.permission.POST_PROMOTED_NOTIFICATIONS`（普通权限，无弹窗；这是对原"不新增权限"的唯一放宽）；通知 `setOngoing(true)`、有标题、`setRequestPromotedOngoing(true)`、样式用 `ProgressStyle`、不设自定义视图、不 colorized、渠道重要度高于 MIN。胶囊文字不设 `setShortCriticalText`，让系统用计时控件显示倒计时。
- 用 `androidx.core` 的兼容 API（`NotificationCompat.ProgressStyle`、`setRequestPromotedOngoing`，需要 core ≥ 1.17.0；工程 compileSdk 已是 36）。在模块 `build.gradle` 显式声明所需的 core 版本。开工先在本机 gradle 缓存里的 core 构件中核实这些 API 确实存在；若兼容库里没有，改为在 `Build.VERSION.SDK_INT >= 36` 分支内直接用平台 API，并在 JOURNAL 写明。
- 低于 Android 16 的系统上 `ProgressStyle` 的表现以兼容库为准；若兼容库在旧系统上不画进度条，改用 `setProgress(max, progress, false)`，保证 B 形态有进度条。
- 进度刷新：原生侧在倒计时期间每 10 秒用 `AlarmManager` 触发一次模块内 Receiver 的 `TICK` 动作，重发同一条通知（`setOnlyAlertOnce`，不出声）。有精确定时权限用精确定时，否则用非精确定时。`hide()`、Skip、走完时一并取消；`TICK` 必须校验当前 token，旧倒计时遗留的 `TICK` 不得复活通知，也不得影响 `END` 定时。
- `show` 增加两个入参：本次休息的开始时间（墙钟毫秒，用于算进度）与正文。JS 侧由休息计时的状态模块给出开始时间；动作名从触发休息的那一组所属动作取。
- 小图标素材由 Opus 提供，在本机 `/Users/david/Projects/scratch/rn-d16-rest-notif-20261004/icon/drawable-*/ic_stat_meetpr.png`（白色透明底，mdpi–xxxhdpi 五档）。原样拷入模块 `android/src/main/res/` 对应目录，不要重画、不要改名。
- 渠道：倒计时用新 id（如 `rest-timer-v2`），`IMPORTANCE_DEFAULT`、`setSound(null, null)`、`enableVibration(false)`、锁屏可见；创建渠道时删除旧的 `rest-timer`。结束提醒渠道不变。

### 测试 seam（先红后绿）
1. `rest-timer-session.ts`：进后台时产出的 `show` 带上本次休息的开始时间与终点；页内加减时间后再进后台，开始时间不变、终点变化。
2. `RestTimer` / `TodayWorkoutView`：触发休息的那一组的动作名被传到通知正文；没有动作名时传空。
3. 原生部分无 jest seam：在 JOURNAL 给出 adb 验证步骤（`dumpsys notification --noredact` 里看 `FLAG_PROMOTED_ONGOING` / 渠道 id / 进度值；`am broadcast` 触发 `TICK`）。

### 验收清单（追加，Opus 收货）
13. Android 16 模拟器：切后台后状态栏出现带倒计时的胶囊；下拉通知栏，MeetPR 这条在最前并展开，有标题、动作名、进度条、Skip、+30s。
14. Android 16 模拟器锁屏：同一条通知可见。
15. Android 15 模拟器：标准通知里有 MeetPR 图标、动作名、进度条、两个按钮；不在静默组；锁屏可见。
16. 后台停留 30 秒以上：进度条前进过，且与倒计时大致对应；点 +30s 后进度条按新总时长回退。
17. Skip / 回前台 / 走完之后，`dumpsys alarm` 里没有残留的 `TICK`。
18. 在系统设置里关掉 MeetPR 的"实时更新"（Android 16）：退回标准通知，App 不崩、不弹请求。
19. 验收清单 1–11 全部重跑通过（这次改动不得弄坏第一版已通过的条目）。
20. 真机（David，vivo）：胶囊、锁屏、通知中心各看一眼。vivo 的系统是否把它显示成胶囊 / 卡片以真机为准。

### Out of Scope（追加）
- vivo 原子通知 / 原子岛等厂商专有接入。
- 自定义通知布局、进度条上的图标、通知里的下一组处方信息。
- 前台服务。

---

## 增补二（2026-10-04 晚，David 真机验 `9215385` 后拍板「A」）

### 真机上发生了什么（vivo V2405A，Android 16 / OriginOS 6，adb 现场）

- **系统在 App 切后台约 6 秒后冻结它，并删掉它排的全部定时器**（`dumpsys alarm` 的 Removal history 里原因写的是 `frozen`）。后果：进度不刷新；**"Rest complete" 不来**（终点后 25 秒、70 秒各查一次都没有）。
- 通知没有被提升为实时更新（没有 `PROMOTED_ONGOING`）。这台系统的状态栏"岛"只认厂商自己的场景白名单。
- 系统给 `ProgressStyle` 画的卡片不画计时控件，所以卡片里没有倒计时数字（第一版的普通样式在通知中心是有的）。

结论：依赖"系统计时控件 + 系统定时器"的做法在会冻结后台应用的系统上不成立。本节**覆盖**上文"不使用前台服务""由系统原生计时控件显示""进度约每 10 秒前进一次（TICK 定时）"等条目，其余不变。

### 行为

- 休息倒计时进行中、App 进入后台时，由一个**前台服务**持有倒计时通知；回到前台、Skip、走完时服务结束。服务存活期间 App 不会被系统冻结。
- **剩余时间写进通知标题并每秒刷新**："Rest 01:53" / 「休息 01:53」（分:秒，不足两位补零；超过 59:59 不会出现）。正文仍是动作名。进度条每秒更新。任何厂商的卡片样式都能看到数字。
- 不再使用系统计时控件（否则原生 Android 上标题与页眉会出现两个倒计时）。Android 16 的状态栏胶囊改用短文本显示同一个剩余时间（如 `1:53`），每秒刷新；仍请求提升为实时更新。
- **结束提醒由服务在终点准点发出**，不依赖系统定时器；内容、渠道、震动不变。保留一个系统定时器作为兜底（服务被系统杀掉的情况），兜底与服务不得重复发提醒。
- 通知上的 Skip / +30s 行为不变，在服务存活时立即生效（标题、进度、终点同步更新）。
- 3A 不变：App 在前台时没有通知、没有服务。
- 通知权限未授予：不启动服务、不发通知，App 内行为不变。
- 服务启动被系统拒绝（个别系统不允许此时启动）：退回"增补一"的做法（系统计时控件 + 定时器），不崩溃、不弹任何请求。
- 划掉最近任务（杀进程）之后：服务与通知随进程结束；兜底定时器若还在，结束提醒照常；不要求通知继续倒计时（覆盖验收 10 的原表述）。

### 技术方案

- 在 `modules/rest-timer-notification` 新增 `RestTimerService`（`Service`），Manifest 声明 `android:foregroundServiceType="specialUse"`、`exported=false`，并带 `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` 属性（一句英文说明：用户记完一组后发起的组间休息倒计时）。新增权限 `FOREGROUND_SERVICE` 与 `FOREGROUND_SERVICE_SPECIAL_USE`（都是普通权限，无弹窗）。这是经 David 拍板对"不使用前台服务、不新增权限"的放宽。
- 启动时机：JS 侧 `show` 的调用点不变（App 进入后台那一刻，Activity 仍可见，系统允许此时启动前台服务）。原生 `show` 改为 `ContextCompat.startForegroundService`；服务在 `onStartCommand` 里立即 `startForeground`（Android 14+ 带上类型）。捕获启动异常（含 `ForegroundServiceStartNotAllowedException`、`SecurityException`）后走退回路径。
- 服务内用主线程 `Handler` 每秒重发通知（`setOnlyAlertOnce`），时间一律按墙钟终点计算，不累加。终点到达：发结束提醒 → `stopForeground(STOP_FOREGROUND_REMOVE)` → `stopSelf()`。`START_NOT_STICKY`。
- 通知构建沿用现有 `publish`：去掉 `setUsesChronometer` / `setChronometerCountDown` / `setShowWhen(true)`，加 `setShortCriticalText(剩余时间)`；`ProgressStyle`、`setRequestPromotedOngoing`、渠道、图标、按钮不变。退回路径保留计时控件。
- Receiver 的 Skip / +30s / END 与服务共用同一份 `SharedPreferences` 状态与同一把锁；服务存活时由服务负责重发与收尾，`TICK` 定时不再排。`hide()` 负责停服务。
- 标题模板由 JS 传入（带一个占位符），原生只做时间格式化与替换。新增文案键放 `RnExtras.json`：英文 `Rest {0}`、中文 `休息 {0}`。
- 把这次的 Play 申报要求记到仓内发布清单：上 Google Play 时需为 `specialUse` 前台服务填写用途说明（`docs/` 下已有分发 / W4 文档则追加一行，没有则写进 `PARITY.md` 对应行的备注）。

### 测试 seam（先红后绿）

1. JS：`show` / `hide` / `consumeState` 的调用契约不变，现有测试保持通过；新增"标题模板被传给原生"的断言。
2. 纯函数（若把时间格式化放在可测位置）：剩余毫秒 → `mm:ss`，含 0、59 秒、10 分钟、向上取整规则与页内计时条一致。
3. 原生无 jest seam：在 JOURNAL 给出 adb 验证步骤——`dumpsys activity services com.meetpr.app` 能看到前台服务；相隔 3 秒两次 `dumpsys notification --noredact` 的 `android.title` 不同；终点后 `id=16002` 出现。

### 验收清单（追加，Opus 收货）

21. 模拟器（Android 15 与 16）：切后台后通知标题里的时间每秒变化，回到 App 与页内计时条一致（误差 ≤ 1 秒）；进度条连续前进。
22. Android 16 模拟器：状态栏胶囊显示剩余时间并每秒变化；卡片排最前。标题与页眉不出现两个倒计时。
23. 未授予"闹钟和提醒"权限时，后台走完仍准点（≤ 2 秒）出现 "Rest complete" 并震动；不重复出现两条。
24. 通知上 Skip / +30s 立即生效；回到前台后 `dumpsys activity services` 里没有本服务。
25. App 内 Skip / 记下一组 / 完成当天后切后台：没有服务、没有通知。
26. 关掉通知权限：不启动服务、不崩溃、不弹请求。
27. **真机（vivo）**：切后台后标题时间在走；终点后 5 秒内 `dumpsys notification` 有 `id=16002`；`dumpsys alarm` 的 Removal history 在休息期间没有新增针对本应用的 `frozen` 条目（或虽有但结束提醒仍准点）。
28. 锁屏（模拟器与真机）：记录实际表现。真机锁屏若仍不显示，如实写明，不在本轮硬修。
29. 增补一的 15–18 与第一版的 3、4、5、7、8、9 复跑通过。

### Out of Scope（追加）

- vivo 状态栏"岛" / 原子通知接入。
- 训练提醒在被冻结系统上的可靠性（另案 D-47）。

---

## 增补三（2026-10-04 晚，前台服务版真机失败后 David 拍板「A」）

### 为什么又改

- 增补二（前台服务 + 每秒自己刷新标题）在 vivo（Android 16 / OriginOS 6）上失败：带前台服务的进程照样在切后台后被冻结，标题卡在 `Rest 02:53` 不动，进度不动，没有结束提醒。卡住的数字比没有数字更糟。
- 用户在系统里打开"允许后台高耗电"后一切正常，但 **David 明确：不能引导用户去开这个开关**。
- 所以设计前提改为：**App 切到后台后随时会被冻结，冻结期间进程里的任何代码都不执行，普通定时器会被系统删除。** 仍然成立的只有系统自己渲染的东西——通知里的系统计时控件在这台手机上是会走的（第一版实测）。

本节**整体取代增补二**，并取代增补一里的进度条、`ProgressStyle`、`TICK` 定时。其余不变。

### 行为

- **倒计时数字一律由系统计时控件渲染**，App 进程不参与刷新。通知里不再有任何需要 App 定期更新才正确的内容：**没有进度条，标题里不写时间**。
- **卡片用自定义布局**（系统标准页眉 + 自定义内容区 + 系统标准按钮）：
  - 内容区一行：左侧两行文字——"Rest between sets" / 「组间休息」，下面是动作名（没有就只有一行）；右侧一个**大号倒计时**（系统计时控件，分:秒，等宽数字），垂直居中。
  - 展开态与收起态结构相同，展开态的倒计时字号更大。
  - 文字颜色跟随系统通知的明暗（用系统通知文字样式，不写死颜色）；不使用品牌色做文字。
  - 按钮仍是 Skip 与 +30s。小图标仍是 MeetPR 标志，强调色品牌金。
- 页眉也保留系统计时控件（某些系统不渲染自定义内容区时，至少页眉有数字）。
- **Android 16 的实时更新**：系统真的把它提升时（原生 Android 16 等），用系统标准样式（不能带自定义布局），状态栏胶囊由系统计时控件显示倒计时；系统没有提升时（如 vivo），用上面的自定义布局。判断以"发出后系统是否给了提升标记"为准，不按厂商名判断。
- 倒计时通知在终点由系统自动移除（通知自带的超时）。
- **结束提醒**：App 被冻结时自己发不出来。改用闹钟级定时（系统对闹钟的保留通常最强）在终点触发原有的结束提醒；副作用是休息期间状态栏可能出现闹钟图标。没有精确定时权限时退回原有的非精确定时。**该定时在会冻结的系统上是否幸免，以真机实测为准；测不过就如实记录"这类手机上没有结束提醒"，不再追加别的机制。**
- 通知上的 Skip / +30s：行为不变。+30s 之后倒计时、超时、结束定时都按新终点重设。
- 去掉前台服务、去掉每秒刷新、去掉 `TICK`。App 在前台时没有通知（3A 不变）。

### 技术方案

- 删除 `RestTimerService` 及其 Manifest 条目、`FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` 权限、标题模板文案键与相关 JS 传参、`TICK` 全部代码、进度相关代码（含 `startedAt` 若不再有用途）。`POST_PROMOTED_NOTIFICATIONS` 保留。发布清单里关于前台服务申报的备注一并删除。
- 自定义布局：模块 `res/layout/` 下两份 XML（收起 / 展开），`RemoteViews` + `NotificationCompat.DecoratedCustomViewStyle`，`setCustomContentView` 与 `setCustomBigContentView`。倒计时用 `Chronometer`：`setChronometer(id, base, null, true)` + `setChronometerCountDown(id, true)`，`base = SystemClock.elapsedRealtime() + 剩余毫秒`。布局里只用 `RemoteViews` 支持的控件；文字样式用 `TextAppearance.Compat.Notification.*`，数字加大字号并开等宽数字。
- 提升判断：先按"可提升"的标准样式发出（`setRequestPromotedOngoing(true)`、页眉计时控件、无自定义视图），随后在同一进程内尽快读取 `NotificationManager.getActiveNotifications()` 里这条通知的 flags；带提升标记则保持；否则立刻用自定义布局重发同一个 id（`setOnlyAlertOnce`，不出声）。低于 Android 16 直接用自定义布局。这一步必须在 `show` 的同一次调用链里完成，不能依赖稍后的定时或回调（进程几秒后就可能被冻结）；读取需要的短暂等待用主线程 `Handler` 延迟一次（≤ 500 毫秒），并保证被 `hide` / 新的 `show` 作废。
- 结束定时：`AlarmManager.setAlarmClock(AlarmClockInfo(endAt, 打开 App 的 PendingIntent), END 的 PendingIntent)`；`canScheduleExactAlarms()` 为假或抛 `SecurityException` 时退回 `setAndAllowWhileIdle`。`hide` / Skip / 走完都要取消。
- Receiver 的状态、token 校验、`consumeState` 契约不变。

### 测试 seam（先红后绿）

1. JS：原生调用契约的变化（去掉标题模板等）在现有测试里体现；`show` / `hide` / `consumeState` 的时机测试保持通过。
2. 原生无 jest seam：JOURNAL 给出 adb 步骤——`dumpsys notification --noredact` 里看 `contentView` / `bigContentView` 非空或提升标记；`am kill` 之后相隔几秒截图两次，数字仍在变化；`dumpsys alarm` 里 "Next alarm clock" 指向本应用。

### 验收清单（Opus 收货；取代 21–29）

30. Android 15 模拟器：切后台后是自定义卡片——大号倒计时每秒在走、动作名、Skip / +30s；回到 App 与页内计时条一致（误差 ≤ 1 秒）；没有进度条；`dumpsys activity services` 里没有本应用的服务；没有 `TICK` 定时。
31. Android 16 模拟器：被提升，状态栏胶囊有倒计时、卡片排最前；关掉本应用的实时更新后退回自定义卡片。
32. **冻结等价测试**：切后台后 `am kill` 杀掉进程，相隔数秒两次截图，卡片上的数字仍在走。
33. 杀进程后点 +30s / Skip 仍然有效。
34. 走完：有精确定时权限时 "Rest complete" 准点出现且只有一条；记录状态栏是否出现闹钟图标。
35. 系统浅色与深色下，卡片文字与数字都清晰可读。
36. **真机（vivo，"允许后台高耗电"关闭）**：通知中心里数字在走；+30s / Skip 有效；结束提醒是否到达、锁屏是否显示，如实记录。
37. 回归：前台不发通知；App 内 Skip / 记下一组后切后台无通知；关通知权限无通知、不崩溃。
38. `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过；原生编译通过。

### Out of Scope（追加）

- 进度条、标题内时间、前台服务。
- 为保活而引导用户修改系统电池 / 后台设置。
- 训练提醒在被冻结系统上的可靠性（D-47，另案，方向是服务端推送）。

### 增补三 · 修订（2026-10-04 晚，真机验收 36 之后）

- 真机结果：倒计时在走；锁屏不显示；结束后没有提示。David 定：**这类手机上暂不提供结束提醒**，等训练提醒的服务端推送（D-47）做起来后搭同一条通道；锁屏另做一轮试验（不在本 PR）。
- 闹钟级定时（`setAlarmClock`）没有换来结束提醒，却会让系统把休息终点当成"下一个闹钟"。**结束定时改回普通精确定时**：`canScheduleExactAlarms()` 为真用 `setExactAndAllowWhileIdle`，否则 `setAndAllowWhileIdle`。验收 34 的"闹钟图标"一项随之作废，其余不变。

## 已知限制（2026-10-04 定稿，真机 vivo V2405A / Android 16 / OriginOS 6）

在会冻结后台应用的系统上（切后台约 6 秒后进程被冻结、定时器被删除），本功能提供的是：**通知中心里一直在走的倒计时，以及 Skip / +30s**。以下三项在这类手机上没有，属于系统限制，不是缺陷：

1. **没有结束提醒。** 进程被冻结后发不出 "Rest complete"，系统定时器（含闹钟级定时）也送不到。David 定：等 CN 版的服务端推送通道。
2. **锁屏上不显示。** 该系统的锁屏只显示锁屏之后新到的通知（adb 探测：解锁时发的不上锁屏，锁屏 8 秒后发的上）。试过"锁屏后 5 秒内撤掉重发一次"（分支 `exp/d16-lockscreen-repost`，原生 Android 上有效），在真机上无效，未并入。
3. **没有状态栏胶囊。** 系统不提升 Android 16 的实时更新，它自己的"岛"只认厂商场景白名单。

用户在系统设置里给 MeetPR 打开"允许后台高耗电"后三项都恢复，但产品上不引导用户这么做。原生 Android（以及不冻结后台的系统）不受这些限制。证据与全过程不入仓，在 Opus 的 scratch 诊断记录里。
