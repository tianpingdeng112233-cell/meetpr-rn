# spec D-16 — 安卓休息倒计时通知（切后台 / 锁屏可见）

- **状态**：已确认（David 2026-10-04），实装中。
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
