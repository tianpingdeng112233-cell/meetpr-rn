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
