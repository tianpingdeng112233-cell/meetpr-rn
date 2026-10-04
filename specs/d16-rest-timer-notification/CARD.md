# 任务卡（安卓）：D-16 休息倒计时通知

开工先读仓内 CONTEXT.md（如存在）、AGENTS.md、同目录 `SPEC.md` 全文与本卡。SPEC 是验收依据；本卡只补充落点与约束。

- 级别：**T2**。基线 `main@cab3b40`，分支 `feat/d16-rest-timer-notification`。PR 开好后等 David 放行。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节，并在 `PARITY.md` 登记一行（这是安卓相对 iOS build 22 基线的授权差异：iOS 基线没有后台倒计时，David 2026-10-02 拍板安卓做）。本仓已公开。

## 落点

- 新增本地 Expo 模块 `modules/rest-timer-notification`（Kotlin）。目录结构、`expo-module.config.json`、`build.gradle` 写法照抄 `modules/training-reminder-alarm` 与 `modules/training-video`；自动链接方式与它们一致。接口与 Receiver 行为见 SPEC「技术方案」。
- `AndroidManifest.xml`（模块内）声明 Receiver，`exported=false`；`PendingIntent` 一律 `FLAG_IMMUTABLE`。点通知正文与结束提醒用应用的启动 Intent 回到前台，再由 JS 侧切到训练页（沿用仓内现有的通知点击路由方式，见 `src/notifications/` 与训练提醒的实现）。
- JS：新增 `src/features/training/rest-timer-session.ts`（纯状态，不依赖 React 与原生模块，原生调用经注入的接口发出）；`RestTimer.tsx` 改为使用它，页内计时条的外观、文案、交互保持逐像素不变。原生桥接放 `src/features/training/rest-timer-notification.ts`，模块不存在（测试环境）时为 no-op。
- 文案新增键放 `src/i18n/catalog/RnExtras.json`：通知标题、结束提醒正文、两个渠道名、"+30s"。中英文按 SPEC 原文。
- 不使用前台服务；不新增权限；不新增第三方依赖；不改 `expo-notifications` 的现有用法（训练提醒、上传失败提醒）。

## 约束

- 本工作树没有 `android/` 目录，gradle 构建由 Opus 在另一棵树执行；保证 Kotlin、Manifest 与 `build.gradle` 自洽可编译，并在 JOURNAL 写明模块如何被自动链接（Opus 的验收树需要重新生成原生工程还是只需同步模块目录）。
- 状态一致性是这张卡的核心：App 内任何让休息结束或改变终点的路径都必须同步到原生（SPEC「其他」第一条）。列出你找到的全部路径并逐一接线；不允许存在"改了计时但没同步通知"的路径。
- 进程被回收后的按钮与结束提醒必须只依赖原生侧已存的数据，不能依赖 JS 存活。

## 测试 seam

见 SPEC「测试 seam」三条，先红后绿。原生部分没有单测基础设施就如实写明，并给出可在模拟器执行的 adb 验证步骤（发通知后 `adb shell dumpsys notification --noredact | grep -A20 com.meetpr.app`、用 `adb shell am broadcast` 触发 action 等）。

## 验收

SPEC「验收清单」1–11 由 Opus 在模拟器执行，12 由 David 真机执行。实装方不得删减或改写验收项。

结束前跑 `npm test` 全量、`npm run lint`、`npx tsc --noEmit`，贴条数。

---

## 返修一 / 增补（2026-10-04，David 真机验收后）

依据：SPEC 文末「增补一」全文。这是在已提交的第一版（`ea5be38`）之上的增量，不要重写第一版已通过的逻辑。

- 范围：`modules/rest-timer-notification`（Kotlin、Manifest、`build.gradle`、新增 `res/drawable-*` 图标）、`src/features/training/rest-timer-session.ts`、`rest-timer-notification.ts`、`RestTimer.tsx`、`TodayWorkoutView.tsx`（只为把动作名与开始时间传下去）、相关测试、`RnExtras.json`（如需新增渠道名文案）。
- 顺序：先核实 `androidx.core` 里兼容 API 是否存在并把结论写进 JOURNAL，再写 JS 侧会红的测试，最后改原生。
- 进程被回收后的 `TICK`、Skip、+30s、`END` 仍然只能依赖原生侧已存的数据（开始时间、终点、正文、token 都要落 `SharedPreferences`）。
- 本工作树没有 `android/`；Kotlin 与 gradle 由 Opus 在验收树编译。把你对兼容 API 的每一处调用列在 JOURNAL，方便编译失败时对照。
- 页内计时条的外观、文案、交互不变。不使用前台服务。除 `POST_PROMOTED_NOTIFICATIONS` 外不新增权限。不新增第三方依赖（`androidx.core` 版本声明除外）。
- 不 commit、不 push。JOURNAL 追加"D-16 返修一"一节；`PARITY.md` 对应行补一句。
- 结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit`，贴条数。

---

## 返修二（2026-10-04 晚，David 拍板「A」：前台服务 + 文字倒计时）

依据：SPEC 文末「增补二」全文。在 `3b0ce46` 之上做增量。

- 范围：`modules/rest-timer-notification`（新增 `RestTimerService`、Manifest、`RestTimerNotifications.kt`、`RestTimerReceiver.kt`、Module 接口如需加参数）、`src/features/training/rest-timer-notification.ts`（传标题模板）、`RnExtras.json`、相关测试、发布清单备注。JS 侧何时调用 `show` / `hide` 不变。
- 顺序：先把"服务存活时谁负责重发、谁负责收尾、兜底定时器何时取消"的状态机写进 JOURNAL（文字即可），再写会红的 JS 测试，最后改原生。
- 重点防三件事：结束提醒发两次（服务 + 兜底定时器）；回到前台后服务没停；启动服务失败时什么都不显示（必须退回增补一的路径）。
- `startForeground` 必须在 `onStartCommand` 里第一时间调用，之前不得有可能抛异常或耗时的步骤。
- 本工作树没有 `android/`；Kotlin 与 Manifest 由 Opus 在验收树编译，真机由 Opus 用 adb 验（设备 Android 16 / OriginOS 6）。把每个新增的 Manifest 条目与权限列在 JOURNAL。
- 不 commit、不 push。JOURNAL 追加"D-16 返修二"一节；`PARITY.md` 对应行更新。
- 结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit`，贴条数。

---

## 返修三（2026-10-04 晚，David 拍板「A」：数字交回系统渲染）

依据：SPEC 文末「增补三」全文。它整体取代增补二。在 `a771b52` 之上做增量，目标是**净删代码**：前台服务、每秒刷新、`TICK`、进度、标题模板都删干净，不留死代码与无用权限。

- 范围：`modules/rest-timer-notification`（删 `RestTimerService.kt`；改 `RestTimerNotifications.kt`、Manifest；新增 `res/layout/` 两份布局）、`src/features/training/rest-timer-notification.ts` 与相关测试、`RnExtras.json`（删标题模板键）、`rest-timer-session.ts`（仅当 `startedAt` 不再有用途时删）、发布清单备注、`PARITY.md`。
- 设计前提写在 SPEC 里：切后台后进程随时被冻结。**任何依赖"稍后在进程里再做一步"的逻辑都不可靠**——提升判断必须在 `show` 的调用链里 500 毫秒内完成。
- 自定义布局必须在明暗两种系统通知主题下可读，不写死颜色。不要引入 `RemoteViews` 不支持的控件。
- 本工作树没有 `android/`；资源与 Kotlin 由 Opus 在验收树编译，真机由 Opus 用 adb 验。把新增的资源文件与用到的 `RemoteViews` 方法列在 JOURNAL。
- 不 commit、不 push。JOURNAL 追加"D-16 返修三"一节。
- 结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit`，贴条数。

---

## 返修四（2026-10-04 晚，小修）

依据 SPEC「增补三 · 修订」。只做一件事：结束定时从 `setAlarmClock` 改回 `setExactAndAllowWhileIdle`（有精确定时权限时）/ `setAndAllowWhileIdle`（没有或抛 `SecurityException` 时），删掉 `AlarmClockInfo` 相关代码与不再使用的导入。其余一行不动。不 commit、不 push；JOURNAL 追加两三行。结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit`。
