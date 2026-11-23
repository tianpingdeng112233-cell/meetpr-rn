# 2026-11-23 周条左右箭头点不到（安卓）· T1 修复卡

来源：学员反馈「安卓端周条左右切换不好点击到」（David 2026-11-23 转述）。分级 T1 / P1。

## 现状（origin/main @ 2fe7eea）

`src/features/training/TrainingWeekStrip.tsx` 的两个箭头：

- `position: 'absolute'`，`left/right: -spacing.md`，宽 `spacing.md`（12dp），图标 12dp。
- 页面左右内边距是 `spacing.base`（16dp），所以箭头整个挂在页边距里，可点区 12dp 宽、离屏幕边 4dp，正好落在安卓侧滑返回的手势区。
- 这是 spec 107（commit 515a824）改出来的：此前是行内 `width: spacing.point28`、图标 `spacing.lg`（24dp）。spec 107 原文只写「点选、左右翻周、本周换天练规则不变」，没有要求改箭头，属实装走样。

参照物（iOS `release/1.0`，`Modules/StudentKit/Sources/StudentKit/Features/TodayWorkout/TrainingWeekStrip.swift` 与 `TrainingWeekCalendarRow.swift`）：

- 结构：`HStack(spacing: 0)` = 左箭头｜七格日历行｜右箭头，箭头在行内，不悬浮。
- 箭头：图标 17pt 粗体，框 28 × 64，整框可点。
- 日期格：`minWidth 36 / minHeight 64`，等分剩余宽度；日期圈 36 × 36；选中环是不占布局的描边（线宽 2，外扩 3）。

## 目标

箭头回到行内、外观对齐 iOS，同时把可点区加宽到 44dp（安卓屏窄、又贴着侧滑返回区，28 不够）。

1. 箭头不再 `position: 'absolute'`、不再用负的 `left/right`。它是周条那一行里的普通子项。
2. 每个箭头的可点区 **宽 ≥ 44dp、高 ≥ 64dp（跟周条等高）**，从屏幕边缘算起：周条这一行左右各顶到屏幕边（抵消页面的 16dp 内边距），箭头占 16 + 28 = 44dp，图标落在靠内的 28dp 里居中，看上去与 iOS 的位置一致。
3. 箭头的可点区必须完整落在它每一层父视图的边界之内，不依赖「溢出父视图仍可点」。`TodayWorkoutView.tsx` 里包着周条、带 `onLayout`（算 `restTop`）的那层 View 也要一起处理，`restTop` 的取值含义不变。
4. 图标恢复为 `spacing.lg`（24dp，spec 107 之前的值）。可用 / 不可用的颜色规则不变。
5. 日历行让出 2 × 28dp 之后，窄屏放不下 36dp 的日期圈加选中环，所以：
   - 选中环改成不占布局宽度的覆盖层（线宽 2，圈外留 2dp 空隙，与现在的观感一致）。
   - 日期圈直径按格宽自适应：`clamp(24, floor(格宽 − 5), 36)`（实装时把下限从 30 放到 24，320dp 宽的放大显示也不叠；圈小于 30 时日期数字 15 → 13）。360dp 宽 → 32；≥393dp → 36。完成小勾跟着圈走。
   - 任何宽度下，选中环与相邻日期圈之间至少留 2dp 可见空隙。
6. 休息格、超过 7 天时的横向滚动、整行横滑翻周（PanResponder）、跨周期翻页（`onPreviousPlan` / `onNextPlan`）、预览态配色、无障碍文案，行为全部不变。

## 文件范围

- `src/features/training/TrainingWeekStrip.tsx`
- `src/features/training/TodayWorkoutView.tsx`（只动周条外层那一处）
- `src/features/training/__tests__/training-week-strip.test.tsx`
- `PARITY.md`（周条那一行补一句）
- 本文件（在下面「实装记录」追加）

不动：`src/domain/plan/week-strip.ts`、i18n、任何其它屏幕。

## 测试 seam（先红后绿）

只用已有的 `src/features/training/__tests__/training-week-strip.test.tsx`，在组件渲染结果上断言：

- 两个箭头（按 `accessibilityLabel` 找）拍平后的样式：`width >= 44`、`minHeight >= 64`、没有 `position: 'absolute'`、没有负的 `left` / `right`。
- 给日历行触发 `onLayout`：行宽对应 360dp 屏时日期圈为 32，对应 393dp 屏时为 36。
- 选中日的环不改变该格的布局宽度（环是绝对定位覆盖层）。
- 原有三条用例保持绿。

先提交会红的断言并贴出红的输出，再改实现。

## 验收标准

- `npx jest src/features/training` 全绿，`npx tsc --noEmit` 无新增错误，`npx eslint` 对改动文件无新增告警。
- 模拟器（Opus 收货时自己跑，360dp 宽）：箭头在行内、点一下就翻周；七格不挤不叠；选中环不压到邻格；带历史的老账号第一屏周条正常。

## 约束

- 被委派的实装作业不 commit、不 push、不开 PR；adb 与模拟器截图由 Opus 收货时做。
- 不夹带其它改动；不改周条以外的间距。

## 实装记录

**实装方降级**：卡派给 Codex 后第一回合即报用量到顶（提示 10:14 AM 恢复），未改任何文件。按全局规约「Codex 不可用」例外，明示降级由 Claude 实装，范围与验收照本卡不变。

**红**（先加两条断言，未改实现）：`npx jest src/features/training/__tests__/training-week-strip.test.tsx` → 2 failed / 2 passed；箭头宽 `Expected: >= 44, Received: 12`，日期圈无 `week-day-circle-*` 节点。

**改动**：

- `TrainingWeekStrip.tsx`：箭头去掉绝对定位与负偏移，宽 `spacing.base + spacing.point28`（44）、`minHeight: spacing.xxxl`（64），左箭头 `paddingLeft: 16`、右箭头 `paddingRight: 16`，图标恢复 `spacing.lg`；日期圈直径由格宽算出；选中环改为圈外 4dp 的绝对定位覆盖层（线宽 2、空隙 2），外层留 `圈 + 8` 的高度，纵向节奏与原来一致。
- `TodayWorkoutView.tsx`：包周条的那层 View 加 `marginHorizontal: -spacing.base`，周条顶到屏幕边，箭头可点区落在各层父视图之内；`onLayout` 取的 `y + height` 不受影响。

**绿**：`npx jest src/features/training` → 83 suites / 998 tests 全过；`npx tsc --noEmit` 与改动文件的 `npx eslint` 无输出。

## 收货（2026-11-23，Claude）

David 先看了 HTML 改动稿（A 行内 44dp / B 只扩可点区），拍 **A**；发布节奏「随下班车，不单独出包」（P1）。

- 环境：AVD `meetpr16` 无窗口 `emulator-5570`，1080×2400 @ 480dpi = 360dp 宽；CN 轨离线演示包，并排包名 `com.meetpr.app.weekarrows`（debug 签名，仅本机）。
- uiautomator 实测：`Previous week` 区域 `[0,547][132,744]`，`Next week` 区域 `[948,547][1080,744]`，换算成 dp 都是 44 × 66dp，贴着屏幕边；七个日期格各 111px，约 37dp。
- 点按：右箭头距屏幕边 3dp、右箭头中部、左箭头距屏幕边 3dp、左箭头内侧边缘这四个位置，各点一次都翻了周（W4 → W5 → W6 → W5 → W4）；点周一那格选中的是周一，没有误触发翻周。横滑左右各一次，都能翻周。
- 截图：[360dp 全屏](2026-11-23-week-strip-evidence/training-360dp.png)、[1.3 倍字号周条](2026-11-23-week-strip-evidence/strip-360dp-font1.3.png)。七格不挤不叠，选中环没压到邻格。体重卡在 1.3 倍字号下「Today's weight」断行，这是现有问题，不在本卡范围。
- 演示包的坑：Metro 的转译缓存放在系统临时目录 `$TMPDIR/metro-cache`，所有会话共用，缓存键不认 `EXPO_PUBLIC_*` 的值，会沿用别的构建里「演示关」的结果，表现为登录报「Incorrect email or password」。解法：构建时给这棵树单独设 `TMPDIR`。
