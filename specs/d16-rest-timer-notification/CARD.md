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
