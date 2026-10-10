# CODEX-JOURNAL

> 当前验收正典：[2026-09-23 W3矩阵](verification-w3-2026-09-23.md)。下文按日期保留历史，旧 ADB/阶段性待办不代表当前状态。

> 历史施工记录；当前集成状态以 [PARITY](../PARITY.md) 和 [2026-09-21 build 22 验收](verification-build22-2026-09-21.md) 为准。下文旧角色分工和 ADB 受限描述只代表记录当时。

## 2026-09-04 — G0-a tokens v3

- 卡: `card-g0a-tokens-v3.md`;只改当前 worktree,无 commit/push。视觉正典 `docs/w0-reference/design-tokens-v3.md` 为开工前已存在的 untracked 输入,未修改。
- `palette` / archived `legacyPalette` / light 静态快照 / reactive ThemeProvider 完成。所有 22 个实际旧色消费者迁入新语义,组件样式随 scheme 更新;原卡估计 16 个。
- Archivo 800/900、IBM Plex Sans 400/500/600/700、IBM Plex Mono 400/500/600/700 从各字面子路径导入,Android 产物只包含这十个新字体。字体名集中在 `fonts.ts`,加载时挡住 splash,失败时沿用 Expo 文档的系统字体降级避免卡死。
- 四个基础组件重写,新增 TextField/StatTile/Eyebrow/LargeTitleBar/StatusBadge/GoldProgressBar/DayChip/IconButton/TabBar。Tab path 机械转译自 iOS `202e95db` 的 `MeetPRTabBar.swift`,保留现有 tab 名称、顺序、隐藏路由和今日 tab listener。
- 首次 `npx expo install` 受 sandbox DNS 阻断,并移除了 worktree 的 node_modules symlink;随后恢复工具访问。用户在外部完成三个字体包安装及 package/lock 更新;续跑未执行任何 install。main checkout 未改。

### Legacy 分流与需走查的判断

| 位置 | 歧义 / 决定 |
|---|---|
| `SetEntrySheet.tsx` 的 plate | 旧 brandRed 是现有杠铃片图示,不是错误/行动状态。卡明确 PlateVisual 延后 W3,因此保留原 `#E5221E` 字面并注释,不移植新 plate 视觉;请求 Claude 在 W3 决定新片色。该处无 legacy token 名引用。 |
| `WorkoutBody.tsx` 的 failed statusMark | “failed” 可推为 danger,但卡明确 `amber → gold500`。遵循逐名规则保留该 amber 类别,迁为 gold500,未改 failed 判断与文案;后续逐屏走查确认。 |
| `DashboardScreen.tsx` 的 completeTriangle | 旧 brandRed 既可能是品牌角标也可能是完成状态。仅 complete 时渲染,按正典 `completed → success` 使用 success。 |
| `tokens.ts` 的 borderStrong | 新旧同名但 RGB 不同。resolveColors 使用 v3 值;原值完整保存在 legacyPalette.light/dark.borderStrong。 |

确定分流:错误/未开始/负 delta/登出 → danger,未读点 → dangerFill;stepper/选中 tick/重试/加载/曲线末点/通知行动 → gold500,其软底 → goldSoft;green/greenSoft → success/successTint。手写主 CTA 原 fgPrimary/bg 配对改为 ctaBackground/ctaText,Dashboard TrainingCTA 接 AppButton,保留回调和文案。

参考表按钮 alias 行与 GoldCTA 本体有差异:secondary 采用 pinned GoldCTA 的 display16、minHeight52(有 sub 62)、tracking0.16;danger 采用 surfaceCard/borderStrong/dangerMuted、body semibold14、radius16。Android 轻触反馈用 RN 10ms vibration,未加依赖或装饰动画。

### 测试与验证

先写卡指定两个 seam 再实现。首次执行:tokens 4 项全部失败,legacy guard 明确列出 22 个消费文件;theme 因模块尚未存在而失败。随后 token/theme 全绿。旧 AppButton 视觉断言更新为 v3 合约;使用方测试增加 AsyncStorage 原生边界 mock,root layout 测试显式模拟字体/splash 完成。

测试名:

- `resolves the v3 light page and both primary CTA backgrounds`
- `title1 uses Archivo ExtraBold 34 and mono leaves tracking to roles`
- `card, control and inset radii match v3`
- `src consumers contain zero legacy color references`
- `ThemeProvider defaults to light appearance and light page colors`
- `setAppearance dark changes colors and persists meetpr.appearance`
- `primary / secondary / danger / link variant matches v3 GoldCTA fill, typography and press states`

按顺序执行结果:

- `npm run lint`: exit 0,输出 `> meetpr-rn@1.0.0 lint` / `> expo lint`,无 warning/error。
- `npx tsc --noEmit`: exit 0,无输出。
- `npx jest`: exit 0;26 passed / 26 suites,177 passed / 177 tests,0 snapshots。
- `npx expo export --platform android --output-dir .expo/g0a-export`: exit 0,1 Android Hermes bundle;确认仅十个指定新字面。构建工具有 NO_COLOR/FORCE_COLOR 环境提示,不影响导出。
- `npx expo run:android --no-install --no-bundler`: prebuild 成功,ADB `could not install *smartsocket* listener: Operation not permitted`,无法连接 AVD meetpr,故未亲眼走查、未产截图。未伪标视觉验收通过。
- Standards / Spec 两轴独立只读 review:各 0 个阻断/实质代码问题;解释决定与运行限制记录于本条。

### 改动文件清单

- `PARITY.md`
- `app.json`
- `docs/CODEX-JOURNAL.md`
- `package-lock.json`
- `package.json`
- `src/analytics/PrivacyNoticeSheet.tsx`
- `src/analytics/__tests__/root-layout.test.tsx`
- `src/app/(coach)/_layout.tsx`
- `src/app/(student)/_layout.tsx`
- `src/app/(student)/growth-curve.tsx`
- `src/app/_layout.tsx`
- `src/app/login.tsx`
- `src/app/validating.tsx`
- `src/design/AppButton.tsx`
- `src/design/Card.tsx`
- `src/design/DayChip.tsx`
- `src/design/Eyebrow.tsx`
- `src/design/GoldProgressBar.tsx`
- `src/design/IconButton.tsx`
- `src/design/LargeTitleBar.tsx`
- `src/design/ListRow.tsx`
- `src/design/Screen.tsx`
- `src/design/Sparkline.tsx`
- `src/design/StatTile.tsx`
- `src/design/StatusBadge.tsx`
- `src/design/TabBar.tsx`
- `src/design/TextField.tsx`
- `src/design/__tests__/AppButton.test.tsx`
- `src/design/__tests__/Sparkline.test.ts`
- `src/design/__tests__/theme.test.tsx`
- `src/design/__tests__/tokens.test.ts`
- `src/design/fonts.ts`
- `src/design/index.ts`
- `src/design/theme.tsx`
- `src/design/tokens.ts`
- `src/features/dashboard/DashboardScreen.tsx`
- `src/features/dashboard/__tests__/use-dashboard.test.tsx`
- `src/features/training/CompletionControls.tsx`
- `src/features/training/ReadinessSheet.tsx`
- `src/features/training/RestTimer.tsx`
- `src/features/training/SetEntrySheet.tsx`
- `src/features/training/TodayWorkoutView.tsx`
- `src/features/training/TrainingCalendarView.tsx`
- `src/features/training/WorkoutBody.tsx`
- `src/navigation/BindGate.tsx`
- `src/navigation/FeaturePlaceholderScreen.tsx`


## 2026-09-04 — G0-a 定向返修 R1

- 卡: `card-g0a-return-1.md`;保留全部既有 G0-a 改动,仅改当前 worktree;未 commit/push,未执行 npm/expo install,node_modules symlink 未改。所有命令 PATH 包含 `/opt/homebrew/bin`。开工前已读 Expo SDK 57 版本文档。
- 先写 `pressing the button calls onPress without vibrating`:通过按钮 onPress seam 验证回调执行且 `jest.spyOn(Vibration, 'vibrate')` 为 0 次,finally 恢复 spy 并卸载 renderer。首次定向 Jest:exit 1,1 failed / 4 passed / 5 tests,1 failed suite;错误原文:

```text
expect(jest.fn()).not.toHaveBeenCalled()

Expected number of calls: 0
Received number of calls: 1

1: 10
```

- 随后仅移除 AppButton 的 Vibration import 与调用,改为 `onPress={onPress}`;定向 Jest 转绿:exit 0,1 passed suite,5 passed / 5 tests,0 snapshots。
- login 及全仓相同模式共 14 文件、28 处统一 `useMemo(() => createStyles(colors), [colors])`;未改 StyleSheet 内容、tokens 数值或视觉。AppButton 样式测试的两处 state 参数增加 `as PressableStateCallbackType`,本机已有 expo-env.d.ts 类型增强时验证通过。
- PARITY「设计 tokens 主题包」补入卡要求的 2026-09-04 模拟器亲验原句;该视觉验收依据返修卡提供的既有验收,本轮未重跑模拟器。

### R1 验证

- `npm run lint`:PASS,exit 0,0 errors / 0 warnings;输出原文:

```text
> meetpr-rn@1.0.0 lint
> expo lint
```

- `npx tsc --noEmit`:PASS,exit 0,0 errors,无输出。
- `npx jest`:PASS,exit 0;26 passed / 26 suites,0 failed suites;178 passed / 178 tests,0 failed tests;0 snapshots;无错误。lint/tsc 后续单独复核退出码均为 0。
- `git diff --check`:exit 0,无输出。直接检查本轮前后 diff:Standards 0 项问题;Spec 0 项缺漏。正式 code-review skill 因缺少 `docs/agents/issue-tracker.md` 未运行,已按 skill 提示用户 `$setup-matt-pocock-skills`;未声称执行双 agent review。

### R1 精确改动文件(相对本轮开始)

- `PARITY.md`
- `docs/CODEX-JOURNAL.md`
- `src/analytics/PrivacyNoticeSheet.tsx`
- `src/app/(student)/growth-curve.tsx`
- `src/app/login.tsx`
- `src/app/validating.tsx`
- `src/design/AppButton.tsx`
- `src/design/__tests__/AppButton.test.tsx`
- `src/features/dashboard/DashboardScreen.tsx`
- `src/features/training/CompletionControls.tsx`
- `src/features/training/ReadinessSheet.tsx`
- `src/features/training/RestTimer.tsx`
- `src/features/training/SetEntrySheet.tsx`
- `src/features/training/TodayWorkoutView.tsx`
- `src/features/training/TrainingCalendarView.tsx`
- `src/features/training/WorkoutBody.tsx`
- `src/navigation/BindGate.tsx`
- `src/navigation/FeaturePlaceholderScreen.tsx`

## G0-b — i18n 基建与全仓英文化 (2026-09-05)

- 正典：iOS `release/1.0 @ 202e95db` 的八份 JSON，原样复制到 `src/i18n/catalog/`。无安装、无 commit/push；已有 package.json/package-lock.json 改动未动。
- 范围例外：按卡约束，guard 排除 `src/app/login.tsx` 和 `src/features/onboarding/**`；CN 登录中文保持不动，Global 登录由 G0-c 实装。注释不是字面量，guard 使用 TypeScript AST 扫描字符串、模板和 JSX 文本。
- 先红：`npx jest src/i18n/__tests__ --runInBand`，2 failed suites；guard 实际报出 294 个未标记字面量条目，t 测试因运行时模块未存在而失败。证据 `/private/tmp/g0b-red.log`。替换前已确认 guard 红。
- 字符串层：设备 zh* → zh，其余 → en；测试/调试覆盖可恢复设备选择；keyof catalog 编译期收窄；zh/key fallback、位置/printf 占位符、one/other。日期保留原 UTC/本地日期语义，显示改用 Intl；动作名称集中按 name_en/name 选择。
- 组合文案用正典拆合（上次/最佳、教练备注、动作编号、组编号、完成组数横幅、赛扣后缀、90 天和反馈日期）；R1 按标点归一化重匹配，命中改用正典 key，zh 标点随 iOS 正典。
- 初版 97 条登记对应 97 个 TODO 源码行：drift 33，missing 64；R1 消除 17 条后，以下 80 条登记对应 80 行：drift 33，missing 47；同一行多条残留合并登记。guard 同时核对数量上限和每个文件:行。

| 文件:行 | zh 原文 | 处理 |
|---|---|---|
| `src/app/(student)/growth-curve.tsx:28` | 成长曲线 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/app/(student)/growth-curve.tsx:37` | 成长曲线 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/app/(student)/growth-curve.tsx:38` | 完整曲线将在成长页图表卡接入 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/features/dashboard/DashboardScreen.tsx:78` | 点击重试 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:123` | 把整份计划往后顺延一天? | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:124` | 今天的${course}课改到明天,之后的课依次顺延,本周期结束日变为${shiftedEnd} | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:128` | 确认顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:136` | 已累计顺延 ${result.total_offset_days} 天,建议联系教练调整计划 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:138` | 顺延成功 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:153` | 撤销顺延?；课程会回到${chineseMonthDay(utcDateText(vm.now))}。 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:154` | 保留顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:156` | 撤销顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:259` | 顺延中…；今天有事 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:270` | 撤销中…；撤销顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/DashboardScreen.tsx:310` | 本周训练进度 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:354` | · 在「成长」查看全部反馈 → | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:492` | 选中 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:498` | 成长曲线 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:510` | 练几次就有趋势了；选中训练日查看对应成长曲线 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:551` | 资料档案 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:600` | 暂无新通知 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:601` | 新的反馈和计划会在这里出现 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:611` | 第 ${notification.weekIndex} 周计划已可查看 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:622` | 查看教练最近的训练反馈 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:623` | ${notification.count} 条未读反馈 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:632` | 查看教练给你的评估结果 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/DashboardScreen.tsx:633` | 评估已完成 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/dashboard/model.ts:307` | 今日休息 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:312` | 今日已完成 · 查看 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:315` | 继续 ${code} · ${lift} | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:317` | 开始 ${code} · ${lift} | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:450` | 当前计划未生效,暂时不能顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:451` | 只能顺延今天的训练 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:452` | 今天的训练已经开始,不能顺延或撤销 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:453` | 只有计划所属学员可以顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:454` | 当前没有可撤销的顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:455` | 只能在顺延当天撤销,请联系教练调整计划 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:469` | 无法顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:472` | 当前计划暂不支持顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:474` | 顺延失败,请检查网络后重试 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:475` | 撤销顺延失败,请检查网络后重试 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:480` | 无法顺延；当前计划暂不支持顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/CompletionControls.tsx:40` | 滑动完成今日训练 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/CompletionControls.tsx:91` | 完成组数 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/CompletionControls.tsx:97` | 🔒 仅自己可见的训练笔记,保存在本机 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/CompletionControls.tsx:107` | 保存中… | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/SetEntrySheet.tsx:158` | 返回训练 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/SetEntrySheet.tsx:174` | kg / 侧 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/SetEntrySheet.tsx:225` | 松开确认 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/SetEntrySheet.tsx:228` | W1-h 接线 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/SetEntrySheet.tsx:243` | 保存中… | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:83` | 🎉 今天你的；e1RM 突破! | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:87` | (此前 ${formatWeight(event.previousMaxE1RMKg)} kg) | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:88` | ,第一个纪录点 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:452` | 今日状态已填写 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:454` | 今日状态已跳过 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:465` | 刷新训练 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:473` | 今日休息；这天休息；看本周计划 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:476` | 历史记录 · 不可修改；未到训练日 · 仅预览 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:83` | 上一段日期 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:87` | 下一段日期 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:97` | 月 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/WorkoutBody.tsx:59` | 下一组 · | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:124` | ${formatWeight(perSideKg)}kg 片 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:196` | 建议 · 同上组 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:208` | 建议 · 基于 e1RM ${formatWeight(e1RMKg)} | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:219` | 建议 · 上次重量 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/save-errors.ts:5` | 训练日已切换,本组无法保存。你的输入仍保留在本页,请刷新训练页后重新记录。 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/navigation/FeaturePlaceholderScreen.tsx:27` | W1 实装 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |

### G0-b 最终验证与限制

- `npm run lint`:exit 0，0 errors / 0 warnings。完整输出：

```text
> meetpr-rn@1.0.0 lint
> expo lint
```

- `npx tsc --noEmit`:exit 0，无输出。
- `npx jest`:exit 0；原始摘要：

```text
Test Suites: 28 passed, 28 total
Tests:       187 passed, 187 total
Snapshots:   0 total
Time:        2.836 s
Ran all test suites.
```

- `git diff --check`:exit 0。8 份 catalog 与 docs 正典逐字节相同，2,098 keys，无重复。CN login/onboarding 未动。
- 补充日期 red-green：原 numeric 月日把中文变为斜线日期，改用 Intl short month，zh 保留 `7月19日`、en 输出 `Jul 19`；新增公开日期 seam 测试先红后绿。既有中文断言显式设置 locale override；补充 name_en 及 null 回退测试。
- Android 模拟器未验证、无截图：`adb devices` exit 1，ADB 5037 smartsocket listener 被 sandbox 以 `Operation not permitted` 拒绝。未运行依赖 ADB 的 `npx expo run:android`，未生成 native 工程或修改 Android resources。
- 本地 diff 检查：Standards 0 个未解决代码问题；Spec 0 个未解决代码问题，视觉验收仍待模拟器。正式 code-review skill 未执行：缺少 `docs/agents/issue-tracker.md`，已提示用户 `$setup-matt-pocock-skills`；不声称双 agent review。
- 本卡不宣称整个应用已经全英文：§C 的 97 行保留文本待后续卡处理，CN 登录页由卡约束排除，Global 登录页待 G0-c。

### G0-b 精确改动文件

本轮共 47 个文件（不含用户预先更新的 `package.json` / `package-lock.json`）：

- `PARITY.md`
- `docs/CODEX-JOURNAL.md`
- `src/analytics/PrivacyNoticeSheet.tsx`
- `src/app/(coach)/_layout.tsx`
- `src/app/(coach)/planning.tsx`
- `src/app/(coach)/profile.tsx`
- `src/app/(coach)/receiving.tsx`
- `src/app/(coach)/students.tsx`
- `src/app/(coach)/today.tsx`
- `src/app/(student)/_layout.tsx`
- `src/app/(student)/growth-curve.tsx`
- `src/app/(student)/growth.tsx`
- `src/app/(student)/profile.tsx`
- `src/app/validating.tsx`
- `src/features/dashboard/DashboardScreen.tsx`
- `src/features/dashboard/__tests__/error-states.test.tsx`
- `src/features/dashboard/__tests__/model.test.ts`
- `src/features/dashboard/__tests__/use-dashboard.test.tsx`
- `src/features/dashboard/model.ts`
- `src/features/dashboard/types.ts`
- `src/features/dashboard/use-dashboard.ts`
- `src/features/training/CompletionControls.tsx`
- `src/features/training/ReadinessSheet.tsx`
- `src/features/training/RestTimer.tsx`
- `src/features/training/SetEntrySheet.tsx`
- `src/features/training/TodayWorkoutView.tsx`
- `src/features/training/TrainingCalendarView.tsx`
- `src/features/training/WorkoutBody.tsx`
- `src/features/training/__tests__/exercise-metadata.test.ts`
- `src/features/training/__tests__/training-policy.test.ts`
- `src/features/training/constants.ts`
- `src/features/training/exercise-metadata.ts`
- `src/features/training/policy.ts`
- `src/features/training/save-errors.ts`
- `src/i18n/__tests__/no-literal-zh.test.ts`
- `src/i18n/__tests__/t.test.ts`
- `src/i18n/catalog/Analytics.json`
- `src/i18n/catalog/AppShell.json`
- `src/i18n/catalog/ChatUI.json`
- `src/i18n/catalog/CoachKit.json`
- `src/i18n/catalog/CoreModels.json`
- `src/i18n/catalog/DesignSystem.json`
- `src/i18n/catalog/RepositoryContracts.json`
- `src/i18n/catalog/StudentKit.json`
- `src/i18n/index.ts`
- `src/navigation/BindGate.tsx`
- `src/navigation/FeaturePlaceholderScreen.tsx`

### G0-b 定向返修 R1 — 标点归一化再匹配 (2026-09-05)

- 导出 `src/i18n/match.ts` 的 `punctuationMatches`；比较前统一卡指定的问号、逗号/顿号、冒号、感叹号、分号、括号、引号、省略号并去首尾空白，不改 catalog 显示文本。
- 使用该函数重扫全部 missing 字符串、模板及 JSX 文本；模板将表达式和正典占位符按位置匹配。命中 17 行：ReadinessSheet 6、CompletionControls 3、RestTimer 2、policy 1、TodayWorkoutView 1、save-errors 4，全部改用正典 key；server error 参数仍为 `error.code ?? error.status ?? 500`。重扫无剩余标点匹配。RIR 其余白话原已使用正典 key，保持不动。
- TODO 计数口径：工作目录文本文件排除 `.git`、`node_modules`、`.expo`，不跟随符号链接；全部标记出现次数 **108 → 91**（含 guard 测试中的 2 个查找字符串）；非测试源码标记出现次数 **106 → 89**，所在源码行数 **97 → 80**。同一源码行可能有多个标记。
- 上方未命中表为 R1 当前状态：missing **64 → 47**；15 行归「将被 W1-i / W1-g 分支替换,合并后消失」，32 行归「W1-d/W1-f 推进制复核卡重写,随卡消灭」。其余交 Claude 定英文的 missing 列表为空。drift 33 行的代码和表项逐字保持不动；未命中代码不变，仅登记去向。
- 严格先红后绿：第一处代码编辑是 normalization 测试。`npx jest src/i18n/__tests__/match.test.ts --runInBand` exit 1：`Cannot find module '../match'`，1 failed suite；最小实现后同命令 exit 0：1 passed suite / 1 passed test。新测试名：`normalization matches punctuation variants without matching different words`，PASS。原始证据：`/private/tmp/g0b-r1-red.log`、`/private/tmp/g0b-r1-green.log`。
- 既有公开错误文案/RIR 测试更新为正典标点，保存错误覆盖 en/zh 与服务器参数；实装前跑得 3 failed / 19 passed（中文半角标点及英文未翻译），替换后 i18n + 两组策略测试共 5 suites / 30 tests 全绿，包含 no-literal-zh guard。证据：`/private/tmp/g0b-r1-copy-red.log`、`/private/tmp/g0b-r1-copy-green.log`。
- `npm run lint`：PASS，exit 0，完整输出（`/private/tmp/g0b-r1-lint.log`）：

```text
> meetpr-rn@1.0.0 lint
> expo lint
```

- `npx tsc --noEmit`：PASS，exit 0，无输出（`/private/tmp/g0b-r1-tsc.log`）。
- `npx jest`：PASS，exit 0；完整输出 `/private/tmp/g0b-r1-jest.log`，原始摘要：

```text
Test Suites: 29 passed, 29 total
Tests:       189 passed, 189 total
Snapshots:   0 total
Time:        2.41 s
Ran all test suites.
```

- 本地 Standards 检查：无未解决问题；本地 Spec 检查：17 个命中全替换、模板参数保留、剩余 missing 全分流、drift 不变。正式 code-review skill 未运行：`docs/agents/issue-tracker.md` 缺失，已提示用户调用 `$setup-matt-pocock-skills`；未声称双 agent review。沿用前轮 Android 模拟器未验收的限制，本轮不宣称视觉验收。
- 保留全部前轮 G0-b 工作；未安装依赖、未编辑 node_modules、未 commit/push。PARITY 同步 R1 收货状态；本卡实现无偏离。


## 2026-09-05 — W1-d/W1-f progression card (Codex, no commit/push)

Card: `/private/tmp/claude-501/-Users-david/a02c90bb-a740-4052-8cd6-9325d48a540d/scratchpad/card-w1d-progression.md`.
Canonical reference: `docs/w1-reference/core-training-loop-v2.md`, with the explicitly retained v1 portions. Pinned iOS source was read at `202e95dbbf88baf5778f2329f206f34e117a4dd0`. Expo SDK 57 documentation was read before code changes. Code-review/setup workflow skipped per the user's explicit follow-up. PARITY is left to Claude as directed by the card.

Implemented:
- Plan completion DTOs/endpoints, recognized completion errors, optimistic shared-cache completion/undo with rollback, and silent NO_COMPLETION_TO_UNDO convergence. Shift endpoints/hooks/UI removed; historical shift fields remain readable but unused.
- Four-key sequence ordering, cursor/current week/progress, device-local 04:00 gym-day windows, recommendation anchoring, published-at plan selection, completion-aware day state and dashboard actions. Plan logs use one full-cycle, padded range; the separate v1 history query remains for e1RM and prior weights. There is no persisted plan projection cache to version; existing AsyncStorage data is scalar preferences, reviews and e1RM history. Reviews and started-mode persistence now use student/day identity.
- Dashboard header, ordinal week cells, sequence summary, feedback expansion, profile metrics, per-main-lift e1RM rail, three action states, day-ID handoff, and sticky primary CTA. Independent inline retry/loading/waiting states.
- Training list/recording hero, persistent started state, upcoming/completed notices and read-only rows, current-week-forward grouped sequence list, remaining pill, hold-to-complete, undo and completion review. A refresh keeps the active editor/plan snapshot and checks the latest server cursor before saving. Foreground/focus refresh uses full versus volatileOnly with a 25-second throttle.
- Six-form decoding/formatting, faithful new-form weight entry, percentage resolution with registered/e1RM/top-set sources, unsupported/range/RIR gating, legacy RTS path, and prescription-derived rest defaults. Actual explicit zero remains valid for new forms; empty weight cannot save. Cycle draft synthesis prefers the newest real log over assumed records.
- All new copy uses t(). Added narrowly scoped catalog entries where canonical catalog keys were missing or overloaded; no translation-catalog source/reference files were changed.

Tests were created at all six requested paths before implementation; first run: six suites failed because the public modules did not exist. Domain and UI modules were then brought green incrementally. Additional red/green regressions cover timestamp offsets, cursor-week progress, legacy weight floors, reason mapping, mixed prescription summaries, and newest-real-log synthesis. Native hold callback tests verify 1.10s completion, early cancellation, move-out cancellation, duplicate suppression and unmount cleanup. Existing API-boundary tests cover completion/undo and idempotent convergence.

Exact obsolete tests/assertions removed (no test files deleted):
- `src/features/dashboard/__tests__/model.test.ts`: `Dashboard CTA > matches all four release states` (date/log/rest CTA states replaced by sequence actions).
- Same file: `plan shift gate > uses the UTC calendar boundary exactly`; `requires notStarted and no same-day log` (shift gate removed).
- Same file: `plan shift copy > maps %s to its exact message` for PLAN_NOT_ACTIVE, SHIFT_ONLY_TODAY, ALREADY_STARTED, NOT_PLAN_STUDENT, NO_ACTIVE_SHIFT, UNDO_WINDOW_PASSED (six obsolete shift-specific cases); `covers unsupported plus both network fallbacks` (shift UI/error copy removed).
- Same file: `week grid calendar conversion > converts iOS Sunday-based weekday to Monday-first offset` (date grid replaced by ordinal sequence cells). Date-format localization tests remain because recommended dates still display.
- `src/features/dashboard/__tests__/error-states.test.tsx`: `an unresolved catalog family keeps the week cell and training CTA usable` (old date-keyed cell/CTA test). The catalog-failure regression in `use-dashboard.test.tsx` is retained and updated to day IDs/current CTA behavior.
- `src/api/domains/__tests__/repositories.test.ts`: `POSTs plan shift with no body and parses the snake_case response`, replaced by completion/undo requests.
- `src/api/domains/__tests__/domain-schemas.test.ts`: removed only the ShiftPlanResponseSchema assertion from `parses list, detail, shift response, and the documented empty state`; renamed that test to omit shift. Its plan-list/detail/empty DTO checks remain.
- `src/features/training/__tests__/training-policy.test.ts`: removed only the two isGymDayEditable assertions from `04:00 is the local gym-day boundary`. Gym-day bucketing remains tested; editability now uses cursor identity.
Total removed obsolete standalone/parameterized cases: 13. Two otherwise-retained tests also lost obsolete assertion blocks as detailed above.

Reference discrepancies and integration/verification limits:
- Backend pct-anchor migration/schema (`MeetPR-backend-wt-034-pct-anchor/src/db/types.ts`, migration 0063) uses `one_rm`, not the reference table's tentative `registered_1rm`. DTO accepts both and normalizes to the registered anchor in the domain; null defaults to registered. No backend changes.
- Exact pinned motion constants are 1.10s hold / 0.30s cancel, not the approximate 1.2s in the card. Used the pinned constants, visual feedback only, no custom Android vibration.
- Pinned iOS legacy pure-RPE formatting emits `-kg x ...`; the card explicitly forbids it. The card wins: pure RPE displays `RPE n × reps`. Legacy weight rows retain `kg x`/hyphen formatting. Main-lift legacy entry retains the pinned 20kg bar floor; new forms do not invent a weight.
- Pinned source would allow new RPE suggestions to seed the sheet, while this card says new forms other than faithful weight/resolved percentage stay empty. The card wins: RTS suggestion outcome remains available, but new RPE-only entry stays empty.
- The catalog overloads the Chinese day suffix with an English `Sun`; added a localized day-name template instead of appending the mistranslated weekday. Resolved percentage copy follows the catalog exactly (`≈ 150 kg · 75% · 1RM`).
- This worktree has no dedicated chat route or connected set-video UI. Coach-message/header actions use the existing coach-feedback destination; the conditional Ask Coach action is absent without a chat integration, and set-video recording/upload actions remain disabled as before. Implementing chat/video flows or push routes was not added to this card. Full chat/video interaction parity therefore still depends on their owning cards.
- Android verification attempted with `EXPO_OFFLINE=1 CI=1 npx expo run:android --no-install --no-bundler --device meetpr`, documented PATH/JAVA_HOME/ANDROID_HOME. Prebuild succeeded with no package.json changes or dependency installation; ADB failed with `could not install *smartsocket* listener: Operation not permitted` (ADB exit 255; Expo exit 1). The sandbox blocks ADB's local socket, so emulator visual QA/screenshots could not be completed. The generated ignored android directory was removed after the attempt. Full log: `/private/tmp/w1d-android.log`.
- No dependencies installed; the pre-existing node_modules symlink was preserved. No commit or push. Formatting used the already-installed local Prettier binary without installing anything.

Changed files (absolute paths; includes this journal):

Modified:

- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/docs/CODEX-JOURNAL.md`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/api/client.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/api/domains/__tests__/domain-schemas.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/api/domains/__tests__/repositories.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/api/domains/plans.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/design/tokens.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/DashboardScreen.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/__tests__/error-states.test.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/__tests__/model.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/__tests__/use-dashboard.test.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/model.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/plan-seen.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/types.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/use-dashboard.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/week-overview.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/student-tabs.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/CompletionControls.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/SetEntrySheet.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/TodayWorkoutView.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/TrainingCalendarView.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/WorkoutBody.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/__tests__/async-control.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/__tests__/training-policy.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/constants.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/drafts.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/model.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/policy.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/save-errors.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/i18n/catalog/StudentKit.json`

Created:

- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/e1rm/__tests__/pct-anchor.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/e1rm/pct-anchor.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/__tests__/prescription.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/__tests__/sequence.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/prescription.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/presentation.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/sequence.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/test-fixtures.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/domain/plan/workout-date-policy.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/MeetPRMark.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/__tests__/today-model.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/dashboard/today-model.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/HoldToCompleteButton.tsx`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/__tests__/hold-to-complete.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/__tests__/suggestion-gating.test.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/completion-errors.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/hold-to-complete.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/refresh-throttle.ts`
- `/Users/david/Projects/apps/meetpr-rn-wt-w1d/src/features/training/suggestion-gating.ts`

Deleted files: none.

Final verification results are recorded below after the exact requested commands.

Final exact requested commands (PATH includes /opt/homebrew/bin):
- `npm run lint`: exit 0; 0 errors, 0 warnings. Output: `> meetpr-rn@1.0.0 lint` / `> expo lint`, no diagnostics. Log: `/private/tmp/w1d-final-lint.log`.
- `npx tsc --noEmit`: exit 0; no output/diagnostics. Log: `/private/tmp/w1d-final-tsc.log`.
- `npx jest`: exit 0; **35 passed / 35 test suites; 236 passed / 236 tests; 0 snapshots; 2.527 s**. Log: `/private/tmp/w1d-final-jest.log`.
- `git diff --check`: clean.

### Claude 收货补记 W1-d(2026-09-05)

- 正典 `src/i18n/catalog/StudentKit.json` 恢复为逐字节 = `docs/w0-reference/i18n/StudentKit.json`;Codex 新增的 15 条 RN 专属 key(`student.progression.*`)挪到 `src/i18n/catalog/RnExtras.json`,英文措辞我逐条过了接受。规则:iOS 导出的 catalog 永不改;RN 自造文案只进 RnExtras。
- 发现 iOS catalog 一处误译:`trainingCalendarLogic.copy011`「日」(日名后缀)的 en 是 `Sun`,Codex 改用模板 key 绕开是对的;待回报 iOS 仓修正。
## 2026-09-04 — W1-i return-fix R1

Card: `/private/tmp/claude-501/-Users-david/a02c90bb-a740-4052-8cd6-9325d48a540d/scratchpad/card-w1i-return-1.md`.
Worktree: `/Users/david/Projects/apps/meetpr-rn-wt-w1i`.

Read the card first, then AGENTS.md and peripheral-screens.md sections 1, 2 and Appendix B; also read PLAN.md and the required Expo SDK 57 documentation. All edits stayed in this worktree. No commit or push. Existing edits to PARITY.md, peripheral-screens.md and src/api/domains/bind.ts were preserved without modification. The initial onboarding implementation and BindGate changes were already present at task start.

### Files changed by this return-fix

- `src/api/domains/onboarding.ts` — strict Appendix B enum validation in profile and upsert schemas.
- `src/features/onboarding/catalog.ts` (new) — canonical tokens, Chinese labels, ordered equipment catalog, tier prefills and unknown-label fallback.
- `src/features/onboarding/model.ts` — canonical form values, bidirectional weekday mapping, shared RTS estimator and conservative estimate rounded from the raw engine result.
- `src/features/onboarding/storage.ts` — canonical draft enum validation; obsolete drafts still read as null.
- `src/features/onboarding/controls.tsx` — preserve token types through generic MultiChoice.
- `src/features/onboarding/OnboardingSteps.tsx` — catalog labels, four equipment sections with tier filtering, exclusive dumbbell limit, shared estimator results, estimator Android back dismissal.
- `src/features/onboarding/OnboardingWizard.tsx` — reset loading before rendering each reopened modal; Android back uses save-and-exit and is guarded while loading or saving.
- `src/navigation/BindGate.tsx` — open the wizard on both needsOnboarding entry paths; retain the stashed/submitted name and clear the code after invalid-code or direct submission failures. Handoff network failures retain the existing retry screen and stash.
- `src/features/onboarding/__tests__/model.test.ts` — wire round-trip, API schema, and estimator regressions; corrected existing fixture tokens.
- `src/features/onboarding/__tests__/catalog.test.ts` (new) — ordered home/professional prefills and unknown token label.
- `src/features/onboarding/__tests__/wizard.test.tsx` (new) — reopening, back handling, equipment interaction, and draft compatibility.
- `src/navigation/__tests__/BindGate.test.tsx` (new) — automatic entry, interstitial continuation, and name prefill.
- `docs/CODEX-JOURNAL.md` (new) — this record.

### Requirement-to-test mapping

1. Wire values, catalog and schemas:
   - `fullOnboardingPatch serializes a filled form with canonical tokens`
   - `formFromServer restores canonical tokens and numeric training days`
   - `lb and every weekday round-trip through the server mapping`
   - `canonical profile and full patch pass the tightened API schemas`
   - `API profile and upsert reject obsolete tokens: %j` (nine cases)
   - `prefillEquipment home_with_rack contains its complete catalog in order`
   - `prefillEquipment professional includes every powerlifting item`
   - `equipmentLabel preserves unknown legacy tokens`
   - `equipment sections filter by tier and dumbbell limits are mutually exclusive`
   - `canonical drafts round-trip while obsolete units and gym tiers read as null`
2. Shared 1RM engine:
   - `estimateOneRepMax rounds the shared RTS engine result to 0.5 kg`
   - `the conservative estimate applies 90% before rounding the shared engine result`
3. Automatic wizard entry and interstitial resume:
   - `needsOnboarding opens immediately and save-and-exit allows continuing from the interstitial`
   - `submitting a code for an incomplete profile opens onboarding immediately`
4. Name prefill / empty code:
   - `invalid stashed invite returns to an empty code field with the stashed name`
   - `invalid invite clears the submitted code while prefilling the submitted name`
   - `network failure clears the submitted code while prefilling the submitted name`
5. Reopening loading state:
   - `reopening the wizard hides the old form until the draft is loaded`
6. Android back:
   - `Android wizard back saves the draft and exits only after the save completes`
   - `Android estimator back closes the estimator without changing the lift`

### Verification

The card's specified model/catalog tests were written and run before implementation changes. Initial red run, `npx jest src/features/onboarding src/navigation --runInBand`: exit 1; 2 suites failed, 1 passed; 3 assertions failed and all 22 original tests passed. Catalog failed to load because it did not yet exist; serialization, reverse mapping and RTS expectations failed for the intended reasons. After implementation, all 28 tests at those seams passed. The conservative estimator regression was subsequently run red (expected 115.5, received 128), then made green. Component/schema/draft regression checks were added during verification.

Final requested commands, all with `/opt/homebrew/bin` prepended to PATH:

- `npm run lint`: exit 0; no errors or warnings.
- `npx tsc --noEmit`: exit 0; no output.
- `npx jest src/features/onboarding src/navigation`: exit 0; **5 suites passed, 50 tests passed, 0 snapshots**; reported time 1.352 s. All 22 original tests remain green.
- `git diff --check`: exit 0; no output.

Additional API compatibility check: `npx jest src/features/onboarding src/navigation src/api/domains/__tests__/domain-schemas.test.ts --runInBand` passed all 6 suites / 60 tests at that stage (before the additional conservative-estimate regression).

### Review and verification limitations

Direct Standards review: changes stay within the card's allowed source/test paths plus its explicitly requested journal; no design-token changes, backend changes, commit, push, or PARITY edits. Direct Spec review: all six requested code changes are implemented and covered above. No remaining code findings.

The formal code-review skill workflow was not run: `docs/agents/issue-tracker.md` is missing, and that skill requires requesting `/setup-matt-pocock-skills`. The user was informed and asked to invoke `$setup-matt-pocock-skills`; repository tracker scaffolding was not added.

Android visual verification and screenshot evidence could not be completed. Attempted `npx expo run:android` with the documented PATH, JAVA_HOME and ANDROID_HOME; it exited 1 before building because ADB could not start its socket listener: `could not install *smartsocket* listener: Operation not permitted` (adb start-server exit 255). The session does not permit sandbox escalation. Component tests verify the modal/back/state behavior but do not substitute for emulator visual acceptance.

### Claude 收货补记(2026-09-04)

- 直改三处(单文件小改,不另派卡):① `catalog.ts` 标签改为 iOS xcstrings zh 逐字(equipmentCatalog001–024 / onboardingLabels / step4 副标题);② `OnboardingSteps.tsx` 器械四段改为展示全部 token(参照包附 B 首版写错「按场馆过滤」,已勘误),`wizard.test.tsx` 断言同步;③ `controls.tsx` 日期轮 FlatList→ScrollView,消除 VirtualizedLists 嵌套警告。
- 模拟器走查(AVD meetpr,staging 学员号):登录→输码→自动弹向导→7 步→完成→自动重提交 stash→等待屏→教练 accept→回前台进 tabs,全程通过;截图见会话 scratch。

## 2026-09-04 — W1-i return-fix R2

Card: `/private/tmp/claude-501/-Users-david/a02c90bb-a740-4052-8cd6-9325d48a540d/scratchpad/card-w1i-return-2.md`.
Worktree: `/Users/david/Projects/apps/meetpr-rn-wt-w1i`.

Read the card first, then AGENTS.md, peripheral-screens.md sections 1, 2 and Appendix B, and the journal including Claude 收货补记. Also read PLAN.md, the TDD skill and its test/mocking references, and https://docs.expo.dev/versions/v57.0.0/ before editing code. Used the card's explicitly authorized test seams. Preserved R1 and Claude's Chinese catalog labels, full four-group equipment display (tiers only control prefills), and ScrollView date wheels. No commit or push.

### R2 files changed

- `src/api/domains/onboarding.ts` — tolerant string profile enums and equipment; unchanged strict upsert schema. `OnboardingUpsertInput` represents form patches that can retain legacy equipment before request validation.
- `src/features/onboarding/model.ts` — preserve legacy equipment, map unknown scalar enums to null and omit unknown array enum entries; nullable unit selection; shared birthday/competition date bounds and day-level validation, including inclusive endpoints and the ten-year competition limit.
- `src/features/onboarding/storage.ts` — retain legacy equipment and unset unit selection through draft persistence; obsolete non-null unit/gym values remain rejected.
- `src/features/onboarding/controls.tsx` — one-row top/bottom wheel padding, centered initial offset and momentum selection; minDate/maxDate month/day clipping and automatic clamping.
- `src/features/onboarding/OnboardingSteps.tsx` — removable raw-label legacy equipment; local imperial input text with conversion to metric form values and normalization on blur/unit change; selected gym no-op; bounded date call sites and birthday error border.
- `src/features/onboarding/__tests__/model.test.ts` — profile compatibility and date validation regressions. The nine existing obsolete-token cases retain strict upsert rejection; removed their profile rejection assertions because R2 explicitly changes reads to be tolerant.
- `src/features/onboarding/__tests__/wizard.test.tsx` — imperial editing, gym no-op, legacy draft/chip, date clipping/clamping and centered wheel regressions.
- `docs/CODEX-JOURNAL.md` — this R2 record.

### Requirement-to-test mapping

1. Tolerant profile reads / strict writes / legacy equipment:
   - `legacy equipment parses and survives form mapping while upsert rejects it`
   - `unknown profile enums parse and map to unset form values`
   - `legacy equipment survives drafts and displays its raw token until deselected`
   - Existing `API upsert rejects obsolete tokens: %j` (nine cases).
2. Centered wheel selection:
   - `Wheel centers the initial value and selects options[k] at ROW_HEIGHT times k` (first, interior and last day; verifies padding and initial offset).
3. Imperial raw input:
   - `imperial height input preserves each keystroke while storing centimeters` (`1`, `1.`, `7`, `70`, `70.`, `70.5`; blur and unit switches).
   - `imperial weight input preserves raw text until blur or a unit change`.
4. Repeated selected gym:
   - `pressing the selected gym preserves customized equipment without an alert or update`.
5. Day-level date boundaries:
   - `tomorrow birthday and yesterday competition date are invalid in steps 1 and 7` (also verifies today, pre-1930 and beyond-ten-year limits).
   - `DateWheel clips same-month options from %s to %s` (equal min/max and a three-day range).
   - `DateWheel automatically clamps out-of-range value %s` (both boundaries).

### Verification

All new regressions were written and run before production edits, as explicitly requested by the card. Red run: `npx jest src/features/onboarding src/navigation --runInBand`, exit 1; **2 suites failed / 3 passed; 12 tests failed / 50 passed**. Failures reproduced legacy profile/draft rejection, unknown enum rejection, date validation, imperial text replacement, selected-gym reset, unclipped date options, missing automatic clamping and missing center padding. After implementation: all 62 tests passed.

Final requested commands, each with `/opt/homebrew/bin` prepended to PATH:

- `npm run lint`: **exit 0**, no errors or warnings.
- `npx tsc --noEmit`: **exit 2**, only the two explicitly exempted **TS2345** diagnostics in `src/design/__tests__/AppButton.test.tsx(29,46)` and `(30,47)`: `{ pressed: false }` / `{ pressed: true }` lacks required `hovered`. No other TypeScript errors. The test and local `expo-env.d.ts` were not edited.
- `npx jest src/features/onboarding src/navigation`: **exit 0; 5 suites passed; 62 tests passed; 0 snapshots; 1.199 s**.
- `git diff --check`: exit 0, no output; also checked the R2 additions in initially untracked files for trailing whitespace.

### Review and limitations

Standards review (direct): no remaining findings in the R2 diff. Edits are limited to the card's source/test paths and explicitly requested journal. Existing PARITY.md, peripheral-screens.md, bind API, BindGate, catalog labels and wizard lifecycle code are preserved; no tokens, backend, navigation or unrelated test changes.

Spec review (direct): all five R2 fixes are implemented and covered above. All 50 pre-existing test cases remain passing, with obsolete-profile expectations updated to the new tolerant-read contract. Legacy equipment remains in the form/patch until removed, and the unchanged upsert schema still rejects it before network submission.

Formal code-review skill workflow could not run because `docs/agents/issue-tracker.md` is missing. Its SKILL.md says to request `/setup-matt-pocock-skills`; the user was informed and asked to invoke `$setup-matt-pocock-skills`. No tracker scaffolding was added.

Android build/visual acceptance and R2 screenshots could not be completed. Attempted `npx expo run:android` with the documented PATH, JAVA_HOME and ANDROID_HOME. Exit 1 before building: ADB startup failed with `could not install *smartsocket* listener: Operation not permitted` (`adb start-server` exit 255). This session disallows sandbox escalation. Tests do not replace emulator visual acceptance.

### Claude 收货补记 R2(2026-09-04)

- R2 卡第 1 项我写错了口径,收货时纠正:iOS 把老 profile 里的 legacy 器械 token **原样写回**(后端 `equipment_overrides: string[]` 接受任意字串),所以 upsert schema 的 `equipment_overrides` 也改为 `z.array(z.string())`,UI 只提供正典 token;对应测试改为「legacy token 读写都通过」。
- 模拟器抽查(新学员号):输码→向导自动弹出;磅·英寸模式输入 `70.5` 逐字保留(体重自动换算 183 lb 显示);日期轮见截图。

## 2026-09-05 — W1-i stack: v3 tokens + i18n

- 先读卡、AGENTS、G0-a/G0-b、i18n/index、i18n/match、design/index、PLAN 和 Expo SDK 57 版本文档。仅本 worktree；未安装依赖、未动 node_modules symlink、未 commit/push。
- 首跑指定两守卫：exit 1；2 failed suites，2 failed / 3 passed tests。legacy guard 报 4 个文件；中文 guard 报 BindGate 字面量。
- onboarding/BindGate 消费新语义 token；组件 useColors + useMemo(createStyles)。错误/必填缺失/1RM 锁定警告 danger；选中/进度/加载/估算入口 gold500 + goldSoft。
- 匹配 StudentKit 正典并以 t(key, params) 替换；训练年限、e1RM/保守值、每周天数、教练姓名、等待时长、上传数量保留参数。标签表与绑定通知 getter、步骤标题函数在读取时翻译，避免模块加载时冻结语言。其他模块仅复用逐字匹配的关闭/提交中/三大项名称/伤病记录 key，未改 catalog、线值、流程或状态机。
- item 3：输码/姓名改 TextField（uppercase mono label、helper；输码 mono），保留输入归一化/长度/值与提交禁用条件；主行动 primary，取消请求 secondary，登出 link。已读 iOS 202e95db 的 BindGateView.swift：GateLogoutButton 使用 textSecondary，故选 link。GateFrame 已用 Card，保留共享 Card 与响应主题样式。
- 删除 G0-b 表中已被 W1-i 替换的 11 条旧 BindGate 登记；下表为本卡全部未命中：21 个标记、17 个源码行。onboarding 仍在原全仓 guard 的历史排除范围内，本卡也逐条迁移/登记，未扩大代码修改范围。未新增译文或用近义文案替换不匹配项。
- 按用户后续指令跳过 code-review skill 与 setup 工作流。卡限制改动范围，PARITY.md 未改。

| 文件:行 | zh 原文 | 处理 |
|---|---|---|
| `src/features/onboarding/OnboardingSteps.tsx:62` | 单位 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:348` | 按身体消耗选择 — 久坐 ≠ 低消耗,也请考虑通勤和站立时间。 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:349` | 轻松；很累 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:354` | 很高 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:357` | 按训练后恢复到正常状态所需时间选择,拿不准就选 3。 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:358` | 很快；很慢 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:373` | 上传训练视频；上传训练资料 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:398` | 伤病部位 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingSteps.tsx:420` | 目标体重级别 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingWizard.tsx:182` | 请补全标红的必填资料 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/OnboardingWizard.tsx:253` | 保存中… | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/features/onboarding/catalog.ts:26` | 窄；宽 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/navigation/BindGate.tsx:312` | 没有教练?请向你的教练索取邀请码 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/navigation/BindGate.tsx:337` | 提交 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/navigation/BindGate.tsx:428` | 完整资料 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/navigation/BindGate.tsx:436` | 取消中… | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |
| `src/navigation/BindGate.tsx:439` | 保留请求 | missing: 无逐字/标点归一化匹配，保留原文，交 Claude 定英文。 |

### 验证结果与改动清单

- 两守卫复跑：exit 0；2 passed suites / 5 passed tests。
- `npx jest src/features/onboarding src/navigation`：exit 0；5 suites / 60 tests / 0 snapshots。卡写 62，本 checkout 实际为 60，未删除测试。相同测试通过临时 setup 在模块加载前设置 zh 后也全部通过（5 / 60，1.113 s）；首次临时 setup 在 beforeEach 才设置语言，导致 2 条表驱动期望在 en 初始化，与 zh 实际值不符，已修正临时 harness，无产品改动。
- `npm run lint`：exit 0，无 warning/error；完整输出 `/private/tmp/w1i-stack-lint.log`：

```text
> meetpr-rn@1.0.0 lint
> expo lint
```

- `npx tsc --noEmit`：exit 0，无输出（`/private/tmp/w1i-stack-tsc.log`）。
- `npx jest`：exit 0，完整输出 `/private/tmp/w1i-stack-jest.log`：

```text
Test Suites: 34 passed, 34 total
Tests:       249 passed, 249 total
Snapshots:   0 total
Time:        1.928 s, estimated 4 s
Ran all test suites.
```

- `git diff --check`：exit 0。
- `EXPO_OFFLINE=1 npx expo run:android --no-install --no-bundler`：exit 1；ADB `could not install *smartsocket* listener: Operation not permitted` / `cannot connect to daemon`，无法连接 AVD meetpr；未完成亲眼走查或截图，不宣称视觉验收通过。完整输出 `/private/tmp/w1i-stack-android.log`。

改动文件：

- `docs/CODEX-JOURNAL.md`
- `src/features/onboarding/OnboardingSteps.tsx`
- `src/features/onboarding/OnboardingWizard.tsx`
- `src/features/onboarding/__tests__/wizard.test.tsx`
- `src/features/onboarding/bind-model.ts`
- `src/features/onboarding/catalog.ts`
- `src/features/onboarding/controls.tsx`
- `src/features/onboarding/model.ts`
- `src/navigation/BindGate.tsx`
- `src/navigation/__tests__/BindGate.test.tsx`
## 2026-09-05 — W1-g 成长 tab v2 复核

- 卡：`card-w1g-growth-recheck.md`；施工固定点 `9e83cc3`，仅当前 worktree。先读卡及规定参照，已读取 Expo SDK 57 版本文档。未安装依赖、未改 node_modules symlink、未 commit/push。
- 第一步重现两个 tsc 错误及两条 guard 失败，再完成 Sparkline API/文案类型修复、history 的 v3 颜色分流和 catalog 迁移。随后 tsc exit 0，两条 guard 2 suites / 5 tests 全绿。guard 另揭示 rebase 后 Dashboard model 的 11 个旧 TODO 登记行号偏移，仅校正 JOURNAL 登记，未改该 model。临时 unmatched history TODO 已全部随 v2 替换清除，history 无新增 i18n TODO、无中文 UI 字面量。
- 先写卡指定两个 seam：model 首红 9 failed / 6 passed；growth-screen 首红 4 failed。screen 测试使用真实 QueryClient、history VM、model 和组件，只替换 API repository/原生持久化/会话/路由/analytics 边界。RN 0.86 的 Pressable 在 renderer 中需通过公开 a11y role 查找，已修正测试选择器。补测加载/失败优先/重试、反馈归档 markRead，以及 daily-best 同值可信度与时间优先规则；后者首红 1 failed / 16 passed 后修复。

### 实装与四态依据

- Growth 保留既有加载、刷新回填和 feedbackJumpToken 滚动实现，按 Header → 三项 e1RM 卡 → 比较 → 反馈入口 → 历史 stats/入口 → 容量强度排序。v3 reactive useColors、Card/LargeTitleBar/StatTile；页面 20 padding，主块 14 间距。移除旧 PR 横幅主入口布局。
- `TREND_UNLOCK_THRESHOLD = 3` 为共享门槛。`e1rmCardState`：familyTotal=0 → zero；1/2 → formingProgress；达到 3 但窗口主线不足 3，或值域缺失/不大于 0 → formingWindowSparse；其余 → chart。窗口计数先夹到 familyTotal，主线再夹到窗口。容量图由全局去重训练日达到 3 解锁。
- snapshot 以设备日历归并 daily-best eligible；同值优先 normal，再取最新时间。low-confidence 日点仅画散点；主线为可信 daily-best 折线，非 Dashboard record trajectory。headline 取 smoothed 最后样本指向的原始 winner，delta 为窗口主线首尾差；当前 kg 一位小数、正负 delta、首次估算、最新纪录日与 sparse 文案均已接线。
- 每卡独立循环 30 天 → 90 天 → 历史总览。按 pinned `GrowthCurveViewModel.windowCutoff`，30 天显示标签实际映射既有 rollingWindowDays=28；90 天映射 90；all 不过滤。未改 e1RM 引擎任何常量。
- `historyStats` 只算 completed && !assumed；以 logged_at 的设备日历日去重，以 ISO 周一日期标识跨年周，容量 Σ weight×reps。`chartBuckets` 与 pinned `.suffix(6)` 一致，保留最新六个有数据的 ISO 周（不凭空补周），截断后重新计算量程。
- 两个比较总值任一组成项缺失即显示 —；注册训练 1RM 从现有 onboarding query 读取。突破百分数沿 pinned percentage 的 estimated/training×100 口径。历史零训练三个值均为 —，入口 disabled / opacity 0.55 / copy005。反馈入口有无两态、全屏归档、两行正文/日期/未读点，详情打开执行 markRead。无 chat 路由/服务的当前 RN 树不显示条件式 HeaderChatButton。
- 两类数据任一失败优先显示失败卡和 message/重试；未齐全显示 catalog a11y 骨架。progress_viewed 在进屏发送 tab=e1rm/volume，打开历史时 tab=history（与 pinned Analytics+Events 一致）。

### HistoryEntriesView 与 GrowthCurveScreen 现场核验

- 通过 `git -C ../MeetPR-release show 202e95db:...` 读取 pinned `HistoryEntriesView.swift` 全文：保留周分组、每日卡、动作过滤及组数据；补日期下的星期、搜索/清除/无匹配文案、按系统语言排序；过滤保留匹配训练日的全部动作，符合源 `filteredWeeks`。组序号从 prescribed set_number 映射到零基 set_index；无 log 显示处方，有 log 显示重量×次数 @ RPE，完成色 success。
- 此 pinned 文件没有周/月切换控件、DayDetail 跳转或视频指示；因此不凭导航副标题新增这些控件。反馈详情沿已有正文实现；视频播放属于未接通的后续视频能力，本卡未引入依赖。
- 路由结论：删除 `GrowthCurveScreen`、`growth-curve.tsx` 及隐藏 tab/export 注册。证据：`git -C ../MeetPR-release grep -n 'GrowthCurveView(' 202e95db -- '*.swift'` 无结果，旧 Swift view 定义仍在 MyProfile 但没有调用点。按 v2 §1 不可达即删 RN 路由；Dashboard 仅将成长入口 pathname 改为 `/(student)/growth`，其它交互保持既有实现。

### 验证与限制

- `npm run lint`：exit 0，0 errors / 0 warnings。
- `npx tsc --noEmit`：exit 0，无输出。
- `npx jest`：exit 0，31 passed / 31 suites，212 passed / 212 tests，0 snapshots。
- `git diff --check`：exit 0。
- `EXPO_OFFLINE=1 npx expo export --platform android --output-dir .expo/w1g-export`：exit 0，1 个 Android Hermes bundle（4.4 MB）。
- 设置 PATH/JAVA_HOME/ANDROID_HOME 后 `npx expo run:android --no-install --no-bundler` 在启动 ADB 时失败：`could not install *smartsocket* listener: Operation not permitted`，adb start-server exit 255。sandbox 不允许提权，不能连接 AVD meetpr；未亲眼走查、未产截图。PARITY 标为实装待走查，W3 像素对齐未冒充完成。
- Standards 直接复核：无剩余代码问题；Spec 直接复核：实现卡指定行为，上述 native 验证/条件式 chat 与源文件差异明确登记。正式 code-review 双 agent workflow 未运行：`docs/agents/issue-tracker.md` 缺失，已按 skill 向用户提示 `$setup-matt-pocock-skills`；未静默配置 tracker。

### W1-g 精确改动文件（17）

- `PARITY.md`
- `docs/CODEX-JOURNAL.md`
- `src/app/(student)/_layout.tsx`
- `src/app/(student)/growth-curve.tsx`（删除）
- `src/features/dashboard/DashboardScreen.tsx`（仅路由目标）
- `src/features/history/E1RMChart.tsx`
- `src/features/history/GrowthCurveScreen.tsx`（删除）
- `src/features/history/GrowthE1RMCard.tsx`（新增）
- `src/features/history/GrowthScreen.tsx`
- `src/features/history/HistoryEntriesView.tsx`
- `src/features/history/VolumeIntensityChart.tsx`
- `src/features/history/__tests__/growth-screen.test.tsx`（新增）
- `src/features/history/__tests__/model.test.ts`
- `src/features/history/index.ts`
- `src/features/history/model.ts`
- `src/features/history/types.ts`
- `src/features/history/use-history.ts`

## 2026-09-05 — W1-p MyProfile / settings / account security

- Task: `/private/tmp/claude-501/-Users-david/a02c90bb-a740-4052-8cd6-9325d48a540d/scratchpad/card-w1p-my-profile.md`; canonical reference `docs/w1-reference/my-profile-v2.md`, Appendix B wire tokens; iOS checkout verified at `202e95db`. Used the requested TDD seams. No code-review skill, setup workflow, subagents, installs, commit, or push.
- MyProfile: v3 header/chat button position, loading skeleton, empty/retry cards, all seven loaded sections, pull-to-refresh, locked 1RM values/SBD sum, readiness summary and shared two-step readiness sheet. Loading/empty/failure retain preferences, account security, and sign-out. Chat remains a disabled button position as scoped by the card; this checkout has no chat route.
- Editing: extracted and reused onboarding sections for measurements, muscles, injuries, competition; reused complete background/environment/recovery steps. Explicit Save calls the existing upsert mutation and awaits profile invalidation/refetch. `profilePatch` has an outbound allowlist, never executes step 3, and separates injury/competition/measurement writes. Wizard navigation, BindGate, and e1RM engine were not modified. Shared recovery/extra field labels and bench grips now use existing canonical translations.
- Settings: appearance uses `useTheme().setAppearance`; per-student rest preferences use AsyncStorage with legacy fixed-duration migration, 30–600s/15s clamping and actual-RPE bands. TodayWorkout reads the preference while preserving coach-prescribed priority and the existing first-rest explanation flag. Reminder settings default off, preselect onboarding days or Mon/Wed/Fri, use local 20:00 and shared numeric wheels, request Android permission, expose system settings on denial, and schedule weekly identifiers on the `training-reminder` channel. Updates cancel only that prefix, roll partial schedules back, and serialize with logout. Sign-in restores saved preferences; unsaved defaults are never written. Foreground notifications are suppressed.
- Account security: current/new/confirmation password sheet with minimum eight characters / maximum 72 UTF-8 bytes, mismatch/generic error copy and success toast; full ledger CSV with exact header, escaping, device-calendar dates, chronological rows, and `meetpr-training-log-YYYYMMDD.csv`; sharing uses the existing Expo FileSystem cache and preinstalled expo-sharing, with temporary file cleanup. Full-screen account deletion requires the exact localized confirmation word and signs out after successful deletion.

### Endpoint findings (source verification, not live production verification)

Verified newer local backend git objects at `origin/staging @ a0846de` (the backend working checkout itself is older, `1e494db`):

- `src/routes/me.ts`: `PUT /me/password` accepts `{ old_password, new_password }`; `204` success, `403 PASSWORD_MISMATCH`, `400 VALIDATION_ERROR`, `401 AUTH_INVALID_TOKEN`. No channel branch: Global email accounts use the same `users.password_hash` path. `src/routes/auth/schemas.ts` validates both old and new passwords with eight-character minimum and 72 UTF-8-byte maximum. Google-only accounts have no known current password; this card preserves the canonical current-password flow and adds no alternative credential flow.
- `src/services/password.ts`: password change revokes **all** refresh sessions, including the requesting device, and clears legacy `refresh_token_jti`. The canonical success toast mentions other devices, but this device will also need sign-in when its access token needs refresh. No backend workaround was introduced.
- `DELETE /me`: student roles only (`coached_student`, `self_train_student`), `204` success, deletes the user with cascading data removal; role/token errors use existing auth middleware. No client DELETE was sent during implementation.
- `src/routes/sets.ts` + `src/handlers/sets-fetch.ts`: `GET /students/:id/sets?from=...&to=...&scope=all` returns `{ logs }`, includes adhoc/orphaned rows, has no pagination or maximum range, and bounds `logged_date` with inclusive `from` / exclusive `to`. Export requests `1970-01-01` through `9999-12-31`, resolves names through `GET /exercises`, and formats CSV dates from `logged_at` using the device calendar as required by the exporter contract.
- Live Global endpoint/error-code verification could not be performed: sandbox networking is unavailable and no test credentials were requested/read. Existing shared `src/api/client.ts` still defaults to CN staging in this checkout; Global smoke testing must configure `EXPO_PUBLIC_API_BASE_URL=https://api.meetpr.app` or consume the separate Global auth/config work. This card uses the shared repositories without changing that unrelated migration.

### Exact file inventory

Added:
- `src/features/profile/MyProfileScreen.tsx`
- `src/features/profile/ProfileEditor.tsx`
- `src/features/profile/components.tsx`
- `src/features/profile/model.ts`
- `src/features/profile/__tests__/model.test.ts`
- `src/features/settings/AppearancePreferenceRow.tsx`
- `src/features/settings/RestTimerSettingsScreen.tsx`
- `src/features/settings/TrainingReminderSettingsScreen.tsx`
- `src/features/settings/TrainingReminderSession.tsx`
- `src/features/settings/reminder-lifecycle.ts`
- `src/features/settings/rest-timer.ts`
- `src/features/settings/storage.ts`
- `src/features/settings/training-reminder.ts`
- `src/features/settings/__tests__/rest-timer.test.ts`
- `src/features/settings/__tests__/training-reminder.test.ts`
- `src/features/account/AccountSecuritySection.tsx`
- `src/features/account/csv.ts`
- `src/features/account/__tests__/csv.test.ts`

Modified:
- `src/app/(student)/profile.tsx`
- `src/app/_layout.tsx`
- `src/api/session.ts`
- `src/features/onboarding/OnboardingSteps.tsx`
- `src/features/onboarding/controls.tsx`
- `src/features/onboarding/catalog.ts`
- `src/features/training/TodayWorkoutView.tsx`
- `app.json`
- `package.json`
- `package-lock.json`
- `PARITY.md`
- `docs/CODEX-JOURNAL.md` (also rebased existing TodayWorkout TODO line references after imports moved)

Dependency declarations: expo-notifications `~57.0.17`, expo-sharing `~57.0.18`. Exact lock entries and their required transitive updates were copied from the preinstalled `node_modules/.package-lock.json`; no install command ran and the shared symlink target was not edited. The notifications config plugin is registered. FileSystem was already in the Expo dependency tree; no third new direct dependency was added.

### Tests and verification

- Red first: all four task-named test files were written and run before implementation; all four initially failed because their public modules did not exist (`/private/tmp/w1p-red.log`). The subsequent sign-in restoration seam also failed before its module was implemented (`/private/tmp/w1p-lifecycle-red.log`).
- `profile/__tests__/model.test.ts`: readiness/assessment summaries, three injury states, 1RM total/missing values, missing-row copy, every onboarding step cannot emit three 1RM fields, row patch isolation.
- `settings/__tests__/rest-timer.test.ts`: three custom bands/null RPE, automatic v1 defaults, duration range/step/NaN clamp.
- `settings/__tests__/training-reminder.test.ts`: weekday identifiers/local times/dedup/empty/disabled, onboarding day defaults, cancel-before-reschedule, logout cleanup, partial scheduling rollback, logout during scheduling, no persistence for unsaved defaults, saved-account restoration, stale-account protection.
- `account/__tests__/csv.test.ts`: exact header, comma/quote/LF/CR escaping, device-calendar date instead of gym-day/UTC, filename.
- `npm run lint`: exit 0, no errors or warnings.
- `npx tsc --noEmit`: exit 0, no diagnostics.
- `npx jest`: exit 0, **38 suites / 292 tests passed**, 0 snapshots. Two existing auth test suites now emit the Expo notifications SDK warning about remote push in Expo Go when exercising logout; only local notifications are used here.
- `git diff --check`: passed.
- `EXPO_OFFLINE=1 CI=1 npx expo run:android --no-install --device meetpr` with the required PATH/JAVA_HOME/ANDROID_HOME: native prebuild succeeded; ADB failed to open the 5037 smartsocket with `Operation not permitted` (ADB exit 255). Therefore no app launch, device permission/delivery/share validation, or screenshot evidence is claimed. Generated `android/` is ignored local prebuild output, not part of the diff.
- Offline Android export succeeded at `/private/tmp/w1p-android-export` (Hermes bundle + 56 assets). The first export reused another worktree's router transform and failed resolving its history feature; rerunning with isolated `TMPDIR=/private/tmp/w1p-metro`, this worktree's `EXPO_ROUTER_APP_ROOT`, `--clear --max-workers 1` removed that shared-cache issue. Versioned Expo references read before writing code: https://docs.expo.dev/versions/v57.0.0/, `/sdk/notifications/`, `/sdk/sharing/`.

### W1-d 返修 R1 — 模拟器走查四处偏差 (2026-09-05)

- `src/i18n/index.ts`：新增 `PLURAL_COUNT_INDEX: Record<string, number>`，照卡镜像七个 index 1 key 与 `todayWorkoutScreen.copy020` index 2，其余默认 index 0。当前 checkout 原先仅处理内嵌 one/other，未选择 StudentKit 独立 `.one` key；现统一支持两种 catalog 形制，英文按指定参数选单数，中文保持原文。未修改 catalog。
- 全仓检索手写 `.one` 调用，仅命中 `CompletionControls.tsx` 与 `src/domain/plan/prescription.ts`；两处均改为基础 key + count，由 `t()` 统一选择。
- `DashboardScreen.tsx`：体重卡删除第三行 `Body weight {0}`，`copy002` 仅用于卡片 accessibilityLabel，值复用可见体重文本，缺省 `—`。比赛倒计时卡补 `copy005` accessibilityLabel，无额外可见行；两卡设置 accessible。
- `TodayWorkoutView.tsx`：复用 Dashboard 的 97×24 `MeetPRMark`（实际导出位于 `features/dashboard/MeetPRMark.tsx`，不在 `@/design`）。页头改为间距 1 的两层结构，weekCode 仅 WnDn/display 20，无计划 W—、无训练日 copy011；移除日名后缀与 ISO 日期。保留回到今天 link，右侧按间距 9 排刷新、readiness、消息按钮；未读角标 mono 9 bold，超过 99 显示 99+。消息复用现有反馈 inbox 未读数及 Dashboard 的 Growth/feedbackJump 入口。未改变滚动区、API/DTO 或推进制逻辑。
- `CompletionControls.tsx`：完成横幅整卡 Pressable 打开回顾，copy003 作 a11y label；success 印章、body 16 bold/textPrimary 可收缩标题、Spacer、body 13/textSecondary 查看回顾与 11pt chevron；间距 10、padding 16、success 14% 底/40% 边、1px 边框及 radius.control。
- `src/i18n/__tests__/t.test.ts`：按用户已指定的 `t()` seam 做两轮红绿。首轮先观察 `[2,1]` 错出 `Completed 2 / 1 sessions`，修正后转绿；次轮先观察第三参 1 错出 `80 kg × 5 · 1 sets`，补 index 2 后转绿。保留默认 index 0，并覆盖独立 `.one` 与中文行为。

验证：
- `npm run lint`：exit 0，无诊断。
- `npx tsc --noEmit`：exit 0，无诊断（本轮无 hovered 例外）。
- `npx jest`：exit 0，35 suites / 239 tests 全绿。
- `git diff --check`：通过；`src` 非 JSON 文件已无手写 `.one` 调用。
- Android：使用指定 PATH/JAVA_HOME/ANDROID_HOME，运行 `EXPO_OFFLINE=1 CI=1 npx expo run:android --no-install --no-bundler --device meetpr`。Prebuild 完成且 package.json 无变化；ADB 因沙箱拒绝本地监听（`could not install *smartsocket* listener: Operation not permitted`）失败，Expo exit 1。本轮未取得模拟器截图，不能宣称完成视觉验收。日志 `/private/tmp/w1d-r1-android.log`；仅清理本轮新生成的 ignored android 目录。
- 仅修改本 R1 涉及的六个源码/测试文件与本日志；按本卡范围不改 PARITY。无依赖变更，无 commit/push，未运行 code-review 或任何 skill 安装流程。


## W1-h v2 学员视频核心链复核 — 2026-09-05

工作树: `feat/w1h-video` / `meetpr-rn-wt-w1h`。只在此 worktree 修改,没有 install、commit 或 push。按用户追加指令,没有调用 setup-matt-pocock-skills、code-review skill 或 issue-tracker 流程。

### 正典与现场核对

- 本 worktree 原缺 `docs/w1-reference/video-chain-v2.md`;从主仓只读核对后原样补入,依据 §1–4 和 §7。W1-d 的训练 tab/游标日和六形态强度结构保留。
- 开工前读 Expo **v57.0.0** SDK 总览、Camera、MediaLibrary、Notifications 文档,并核对已预装模块实际源码与类型。没有跑 install。
- consent key 已现场核对 iOS `202e95db:Modules/StudentKit/Sources/StudentKit/Features/VideoUpload/VideoAttachmentViewModel.swift`: `video_upload_consent_v1`。首弹四条文案沿用 `student.videoPrivacyCopy.copy001–004`,在调用时按设备语言翻译。
- app.json 的 camera/microphone/photos/add-only usage description 从 `202e95db:MeetPR/Resources/en.lproj/InfoPlist.strings` 原样取英文。没有修改 iOS 仓或上传协议 DTO。

### 改动清单

- `SetEntrySheet` 接回视频 chip 区,保留 W1-d 预填/建议/录入布局;上传前通过原保存队列冲刷当前数字并懒建日志,不关闭 sheet、不结算组、不触发休息计时。训练 hero 相机直达;组表恢复 `SetVideoUploadIndicator` 的静态状态色,没有加入组表播放入口。
- `CameraRecorder`:expo-camera 全屏后摄/720p/目标 2.75 Mbps,参数化 `maxDurationSeconds`(默认 120),录制/停止、已录时间与倒数、关闭、循环回放确认、重拍、使用。相册 toggle 默认开且持久化;进入确认态且开着时才请求 add-only 权限,保存失败 toast 后照常回调。无后摄隐藏拍摄入口;拒权显示设置引导;切后台/卸载时中止录制并回收未使用文件。
- `passthroughEligibility`:H.264、长边 ≤1280、视频 ≤3.5 Mbps、无音轨或 AAC ≤128 kbps;未知轨道数据保守转码。符合条件直接使用原文件;否则 compressor manual/maxSize 1280/bitrate 2750000。源与输出置于 app document 的 training-videos 目录;取消时收掉派生文件,保留可恢复的源直到导出结果持久化,然后只保留待上传/回放的文件以免重复计入本地容量。
- 新本地 Expo 模块 `modules/training-video`:仅提供后摄可用性和 MediaExtractor 轨道事实。**预装 compressor 2.0.3 的 getVideoMetaData 只有尺寸/时长,没有 codec/video bitrate/audio bitrate**,因此不能凭它臆测直通。缺少轨道 bitrate 时按该轨样本总字节/时长计算;资源在 finally 释放。
- 管线保持 attach → ensure set log → export → initiate → 5 MiB × 并发 3 → complete。初始数字请求先落本地,可恢复杀进程时还没完成的懒建日志。session 和每片 ETag 在下一阶段前 await 持久化;断点续传跳过已有片。PUT 403 删除旧附件并重新 initiate;complete 409 通过现有 URL 端点核对已就绪状态,收敛服务端 complete 成功但响应丢失的窗口。
- `UploadRetryScheduler`:1/2/5/10/15 分钟五轮、网络恢复立即插队、确定性 4xx 首次终态、未知按网络类、首次失败 30 分钟截止;失败次数与首次/最近失败时间持久化。根布局按登录学员启动/清理监听,冷启与回前台续传;用户切换取消旧任务。删换操作串行,取消在途请求并清远端/本地。
- 分片用独立 cache/video-parts 临时文件,expo/fetch PUT;成功、取消/删除、失败都 finally 回收,冷启动扫残片。采用 expo/fetch 的 File body,不把 Expo File/Blob 交给不兼容的 RN XMLHttpRequest。
- 上传正常路径去掉进度条/百分比/勾/转圈/处理中 spinner;附件只显示 Video、播放、Change、Delete。终态失败显示 Upload failed、Retry、Delete。`expo-notifications` 的 `video-upload` LOW 渠道聚合 N 条失败,无声无振动,拒权不影响上传。
- `localRetentionRemovals`:设备本地自然日(不是 04:00 gym-day)保留当天已上传文件,冷启动清非当天;超过 500 MiB 按最旧优先;删换立即清文件。`VideoPlayback` 用 react-native-video 全屏纯回放和系统播放/暂停/进度控制;本地存在优先本地,否则现取 `/uploads/:id/url`;错误一行提示+重新取源重试。
- package.json/app.json 补所需依赖/插件,包括 compressor 所需 Nitro 运行时。package-lock.json 从**已预装** node_modules/.package-lock.json 补齐缺失锁条目,没有安装或改写共享 node_modules。删除旧 `src/types/video-native-modules.d.ts` 假声明,使用真实依赖类型校验。
- 新增四个指定测试 seam;沿用 consent/model/runner 测试,把旧 1080p、启动即 failed、中文字面量的预期改成 v2 边界/恢复语义/英文文案。没有改 onboarding、growth、dashboard 或 backend。

### 验证与尚未完成的原生验收

- 首步接回后 `tsc`、legacy-token、no-literal-zh 守卫全绿。
- 按 seam 红→绿:重试决策表、四维直通边界、自然日/容量/删换/播放源、session+ETag+首次失败状态持久化、403 重新 initiate、三路径分片回收、complete 不删本地、complete 响应丢失收敛、5 MiB/并发 3。文件系统、网络与 AsyncStorage 在外部边界替身验证,不是实网视频上传验收。
- 最终 `npm run lint`:exit 0,0 errors/0 warnings (`/private/tmp/w1h-final-lint.log`)。
- 最终 `npx tsc --noEmit`:exit 0,无诊断 (`/private/tmp/w1h-final-tsc.log`)。
- 最终 `npx jest`:exit 0,**42 suites / 279 tests 全通过** (`/private/tmp/w1h-final-jest.log`)。
- `git diff --check` 干净;`expo config` 成功;Expo autolinking 识别 `com.meetpr.video.TrainingVideoModule`。Android Hermes JS bundle 导出成功(`/private/tmp/w1h-export`)。
- `npx expo run:android --device meetpr --no-install`:prebuild 成功,随后 ADB 因不能监听 5037 的 `Operation not permitted` 失败。独立 Gradle 尝试使用可写临时 GRADLE_USER_HOME,仍因 FileLockContentionHandler 的本地 socket 权限被拒而失败。**没有成功编译 APK,没有安装本卡代码到 AVD,没有伪造截图或声称真机/模拟器走查已完成**。
- 待具备原生执行环境后,必须补 AVD/真机录像→确认→上传→教练可播、拒权/系统中断、断网恢复/杀进程、上传后组内回放与截图。新 Kotlin 轨道模块、音视频方向、相册 add-only 和通知的设备行为尚未验证。

### 拿不准的 iOS 口径与安卓 v1 偏差

1. 真正杀进程/锁屏持续上传不具备 iOS background URLSession 等价能力。v1 是进程内上传 + 持久化 ETag + 冷启/回前台续传;原生前台服务/WorkManager 另开卡,PARITY 已标。
2. 打点/标注帧/角标浮层/剪辑/烧录没有夹入本卡。烧录导出仍是 W3-video 的安卓能力决策项,没有使用 FFmpegKit。
3. Expo v57 的 `videoQuality`/`videoBitrate` 是 CameraView props,而不是正典示例里 recordAsync 的 quality 参数;已按真实 SDK 使用。没有可配置帧率的公共 prop,因此目前采用 SDK/设备选定帧率,不能声称已实现 iOS「优先 60fps」;待真机确认默认帧率。转码方向/音轨/fast-start 依赖已选 compressor 的原生实现,仍需设备文件核验。
4. 五档延迟总和可超过 30 分钟;实现以首次失败 +30 分钟为硬上限,第五档定时会被剩余窗口截短。这与正典时间盒优先的口径一致,没有把窗口随重启或网络恢复延长。
5. 直通源不做 remux,按本卡明确许可直接上传原文件。新轨道读取模块是为让直通判断有真实数据,不是新导出功能。

### R1 — 相机/回放移除嵌套 Modal — 2026-09-05

- Gotcha: **嵌套 Modal 在 Fabric 不显示**。用户 AVD 现场(RN 0.86、`newArchEnabled=true`):相机组件 effect 已触发相机/麦克风权限申请并获授权,但 `dumpsys window` 只有 Activity + SetEntrySheet 两个 app 窗口;第二层 CameraRecorder Modal 未生成窗口,回放有同样结构问题。
- 新增 `OverlayHostProvider` / `useOverlayHost`:context 提供 `present(node, onRequestClose?)` 与 `dismiss()`,默认关闭行为为 dismiss;overlay 在 host 子树末尾用 absoluteFill + zIndex 1000/elevation 24 覆盖。存在 overlay 时订阅 BackHandler,关闭后释放监听。无 provider 返回 `isFallback: true`。
- SetEntrySheet 在 Modal 内、SafeAreaView 外放置 host,关闭 sheet 时 dismiss。**Android 外层 Modal 会先接管原生返回键**,所以还通过 host handle 把 Modal 的 `onRequestClose` 转给当前 overlay,没有 overlay 才关闭 sheet;provider 随 sheet 卸载时一起移除内容及监听。
- CameraRecorder / VideoPlayback 仅渲染全屏 View,保留 SafeAreaView、背景和关闭语义。VideoAttachmentControls 用 host 展示相机/回放,onClose/onUse dismiss;只有无 provider 时使用单层 Modal fallback。hero → sheet → initialCamera 自动开启和 Alert consent 保持。没有改上传管线、协议、DTO或依赖。
- 指定 seam 先红后绿:present/dismiss(缺模块→通过)、硬件返回回调(缺监听→通过)、父 Modal 转发当前 overlay/关闭 sheet(缺 handle→通过);无 provider fallback 标记通过。新增 4 个测试;现有 video-upload 与 SetEntrySheet suggestion 测试保持通过。
- 验证:`npm run lint` 0 errors/0 warnings;`npx tsc --noEmit` 无诊断;`npx jest` **43 suites / 283 tests 全绿**。日志:`/private/tmp/w1h-r1-{lint,tsc,jest}.log`。
- 原生验收受环境阻断:`npx expo run:android --device meetpr --no-install` 在 ADB start-server 阶段因监听 5037 的 `Operation not permitted` 失败(`/private/tmp/w1h-r1-android.log`)。本轮未能安装到 AVD、核验窗口数或取得截图;仍需现场验证相机可见/录制、使用后回到 sheet、回放可见、返回键先关 overlay 再关 sheet。
- 仅改用户指定组件、新 host/测试与本日志;按本次范围限制未改 PARITY。未 commit/push,未运行 code-review、技能安装或 tracker 流程。
## 2026-09-05 — W3-c 学员成长 tab 三种图表几何

- 范围：仅 `feat/w3c-charts` worktree，基于 `feat/w1g-history`。按本卡要求未 commit/push、未运行 code-review 或任何 skill 安装流程；未改 dashboard/training、e1RM 引擎、history/model.ts、依赖或凭证。
- 正典：已读 Expo SDK 57 版本文档、`docs/w3-reference/video-player-charts-v2.md` §4.2–4.5 / §5.4 / §6.3 W3-c、成长四态参照；只读核对 iOS `GrowthE1RMCard.swift`、`GrowthEmptyStates.swift`、`VolumeIntensityChart.swift` 的绘图实现。
- `charts/growth-geometry.ts`：非对称值域 padding、span ≥ 1、date axis/单点一秒兜底、plotPoint 时间钳位、当前标签位置、直线/闭合面积/原始点菱形、日期与轴标坐标；forming 比例点位、单条 cubic 控制点、可信值刻度与 recordedCount 钳位均落纯函数。
- `GrowthE1RMChart.tsx` 替换并删除旧 `E1RMChart.tsx`：320:118 自适应画布、L 轴/虚线中线、三段 gold 面积渐变、chartLine 直线、来源分色菱形、当前点及虚线引导/日期底色、三个 Y 标签（中间 textDim）、轴题及三日期（中点 x=173）。
- `GrowthFormingTrendChart.tsx` 接入 formingProgress；126pt 状态区内用 iOS 默认 68pt 画布、9pt 已记录点/19pt 最后点光环/7pt 未来槽位、进度点及富文本。无可信 currentKg 不制造数字刻度。zero 改为独立 64pt 幽灵图并固定 228pt 状态区；formingWindowSparse 固定 126pt。此分支只有旧 DashboardScreen 内 Sparkline，没有 `DashboardE1RMRail` 对应接线口，本卡只接成长卡；成长 tab 无 Sparkline。
- `charts/volume-geometry.ts` / `VolumeIntensityChart.tsx`：320:172 自适应、阶梯容量刻度、顶部二次曲线圆角柱/渐变、独立 RPE 标度（忽略旧 series.scale/rpePlotValue）、双层折线/点、DD/MM 日期及保留的奇数透明标签、9×9 图例。新增 `GrowthTrendEmptyState` 共用锁/空态 minHeight 172；外层卡 padding 14/15/12。数据继续来自现有 chartBuckets 尾六个 completed && !assumed ISO 周桶。
- 本卡列出的全部颜色 token 已在 `src/design/tokens.ts` 同时具备 light/dark 值，因此未改 tokens，也未在图表内硬编码颜色。
- TDD：growth/volume 两个指定纯函数 seam 按垂直切片先红后绿；新增 27 个几何用例覆盖要求及空日期、阈值边界、forming 比例点位/可信刻度。现有 model 与 growth-screen 测试无需改名，保持通过。
- 验证：`npm run lint` exit 0；`npx tsc --noEmit` exit 0；`npx jest` 33 suites / 239 tests 全绿。
- Android：执行 `CI=1 npx expo run:android --no-install --device meetpr --port 8081`，prebuild 成功且 package.json 无变化；随后 ADB 启动失败，`could not install *smartsocket* listener: Operation not permitted`，未能安装运行或取得本次模拟器截图。PARITY 保持 🔨，不能宣称像素验收完成。生成的 android 目录为 gitignored 本地构建产物。
- 几何待人工核验/已知细节：① 本卡和 §4.2 明确写 Int(high/mid/low)，故 RN 使用 trunc；Swift 文件实际先 rounded() 再 Int，按本卡优先实现并记录差异。② viewBox 随容器等比缩放，轴字通过纯函数反向补偿维持 iOS 固定 9pt（容量日期 8pt）；轴题/当前日期随 mockup 缩放。文字 central baseline 逐个设在 SvgText 上，避免仅设置在 G 上被 Android 丢弃。③ 当前日期标签底板按 IBM Plex Mono 10pt 字符推进估算（每字 6pt + 横 padding 2pt），实际字体垂直度量与 Android baseline 需截图核。④ forming 的 126pt 按 iOS 调用点解释为整个状态区，画布为默认 68pt；几何中的控制点偏移、点直径保持绝对 pt，不随容器宽度缩放。

### R2 — 相册附加后副本丢失 / 上传直接失败 — 2026-09-05

仅修改 `feat/w1h-video` / `meetpr-rn-wt-w1h`;未 commit/push,未安装依赖/skills,未运行 code-review 或 tracker 流程。按 diagnosing-bugs 六阶段和用户指定 manager/File/AsyncStorage seam 做逐项红→绿;上传协议、DTO、onboarding/growth/dashboard 未改。

1. **反馈环与最小复现**:先新增 `video-upload/__tests__/manager-attach.test.ts`,真实 manager/store/native/上传 runner,只替换原生文件系统、设备模块、存储与网络边界。File.copy 按 SDK 57 Android coroutine 异步完成,输入固定 350000 bytes、4 s、720p H.264;一次 attach 自带紧接的 sweep,ensureSetLog 暂停以检查尚未 prepared 的记录/磁盘。命令 `npx jest src/features/training/video-upload/__tests__/manager-attach.test.ts --runInBand` 实际红:记录是 documents/training-videos 新路径,但副本期望 `350000`,实际 `undefined`。去掉 UI/相册/真实网络后仍复现,无需第二次点击、第二次 attach 或启动监听。初次红测日志 `/private/tmp/w1h-r2-red.log`。
2. **复现与探针**:同一用例再次运行仍红。临时 `[DEBUG-w1h-r2]` 操作记录只有 `copy:ImagePicker/sample.mp4` → `delete:ImagePicker/sample.mp4`,随后异步 copy 的 `NoSuchFileException`;没有对 documents 文件的 delete,也没有进入元数据读取。诊断期间在 File 替身观察 rejection 以保存证据,最终测试已移除此 catch,让任何脱离调用链的 rejection 直接导致 Jest 失败。探针日志 `/private/tmp/w1h-r2-probe.log`。
3. **排序假设与证伪**:先向用户列出“未 await copy”“attach 后 sweep 清理”“重复 attach / hydrate 回滚”“prepare 后清源”四个预测,再逐项验证。现场最小复现中后面三项均非必要条件:350 KB 不触发容量淘汰、未上传不触发跨日清理;copy 只调用一次;prepare 尚未读取源。补充延迟 AsyncStorage hydrate 的交错用例确认已有 store 合并保护不回滚新 source,因此不改 store。
4. **正确假设 / A、B 的答案**:Expo **v57.0.0** 总览已读;实际预装 expo-file-system 的 `src/internal/NativeFileSystem.types.ts` 声明 `copy(...): Promise<void>`,Android `FileSystemModule.kt` 注册 `AsyncFunction("copy") Coroutine`。旧 `retainVideoSource()` 把 copy 当同步调用:启动复制后立刻同步删除 ImagePicker 原文件,并返回尚未成功生成的目标 URI。**保留副本在此复现中没有被谁删掉,而是尚未复制成功;日志中的 copy rejection 是这一次调用的延迟失败,不是第二次 copy 的证据。**调用链为 `VideoAttachmentControls.attach` → manager.attach → retainVideoSource → 未等待的 File.copy;UI 的 attach.catch 接不到被丢弃的 native Promise。execute 只 prepare 记录中的 source;只有需要转码时才对 compressor 输出另做 retain,并非再次复制 ImagePicker。一次只改“等待复制完成”这个变量(函数返回 Promise,两个调用点 await),单次 attach 立即转绿,同一保留文件以 350000 bytes 进入 prepare 并完成 mock 上传(`/private/tmp/w1h-r2-await.log`)。
5. **修复与回归切片**:
   - `native.ts`:await copy 后验证目标存在且 size >0,再删原文件/返回 URI;失败包装成 deterministic `VideoNativeError`,回收未发布目标,不留下虚假 record。转码输出 retain 同样 await。`deleteLocalVideo` 保留 best-effort cleanup 语义,同步 delete 异常返回封装后的 VideoNativeError;所有权转移处检查并抛出该错误。所有现存 File.copy/delete 和分片目录 delete 均在 try/catch 内,本管线无 File.move 调用。
   - `native-error.ts` 提取原错误类型并从 native 兼容 re-export;`multipart.ts` 的残片/目录删除错误同样封装,经 worker/manager catch 归为 deterministic,避免 native/multipart 循环依赖。
   - `manager.ts`:同 identity、同选片 URI 的并发 attach 共用在途 Promise,防止排队的第二次 attach 再读已删除的原片;复制失败也经共同 Promise 返回,finally 清去重项。并发红测原为第二项 rejected,修改后两项 fulfilled、一次 copy、一份保留文件(`/private/tmp/w1h-r2-concurrent-{red,green}.log`)。
   - **额外独立风险,不冒充现场主因**:异步 retain 扩大了“文件已复制、record 未发布”的窗口。人为让 manager.start 在此刻恢复,旧启动孤儿清理确实会删副本;新增交错用例先红(`Empty retained video`),再使 start 在有 attach 在途时跳过 orphan/残片清理后转绿(`/private/tmp/w1h-r2-startup-{red,green}.log`)。
   - `local-retention.ts` / manager.sweep:显式传 prepared,未 prepared 的源不进入按日或容量淘汰;容量压力用例先红后绿,已 prepared 文件仍按旧的 500 MiB/最旧优先规则处理。未 prepared 的源总量过大时允许暂时超过上限,优先保住唯一可恢复副本;350 KB 现场不属于容量分支。
   - **C**:仅在 ensureSetLog 边界把本地标记 `Set log unavailable`、当前 worktree 实际使用的 `Invalid set input`、`Selected day is no longer current` 转成带现有 i18n 文案的 deterministic VideoNativeError。网络/API 异常保留原分类;terminal 使用 `.copy` 而非覆盖成通用 processing。空重量用例原为 waiting,修改后立即 failed,保留文件,修正输入 Retry 能上传。附件行显示 `record.errorMessage`,本地 attach/remove/retry 异常显示 actionErrorMessage,Retry Promise 有 catch。没有增加翻译 key 或扩展 DTO。
   - 指定新 manager seam 共 11 项:单次 attach/即时 sweep/非空 prepare/源落盘,并发选片去重,copy rejection,两种日志校验及修正重试,分片删除失败,原片删除失败,启动清理交错,转码输出留存,延迟 hydrate,网络分类。local-retention 增加 1 项未 prepared 压力测试,旧容量测试明确为 prepared 后的待上传文件。
6. **清理与验证**:移除全部 `[DEBUG-w1h-r2]` 临时探针,未留下 throwaway 脚本。`npm run lint` 0 errors/0 warnings;`npx tsc --noEmit` 无诊断;`npx jest` **44 suites / 299 tests 全通过**,原有 43 套保留。最终日志 `/private/tmp/w1h-r2-{lint,tsc,jest}.log`;`git diff --check` 干净。PARITY 更新 R2 交付记录,仍标设备验收待补。

**原生验收限制**:`npx expo run:android --device meetpr --no-install` 实际运行,ADB start-server 因不能建立 smartsocket listener (`Operation not permitted`) exit 255,CLI 未能安装本轮代码(`/private/tmp/w1h-r2-android.log`)。本轮未取得 AVD 截图,也未声称真实 Global 上传成功。仍需在可用 ADB 环境重走用户 100 kg/空重量两条选片路径,核验 documents 副本存在、没有 unhandled copy rejection、上传/可读校验错误和 Retry 行为。

### R3 — Android 分片 PUT 的 NativeRequest headers 转换拒绝 — 2026-09-05

仅修改本 worktree 的 `multipart.ts`、`manager.ts`、对应两份测试与本日志。未 commit/push、安装依赖/skills、执行 code-review 或修改协议/DTO;按本卡范围未改 PARITY。

- **现场根因与对照证据（用户提供，本轮未重放真实预签名 URL）**：AVD integration/w1 dev bundle 已能 initiate 并写出第一片 350912 B，随后 `expo/fetch` 的 File body 在 `NativeRequest.start` 入参转换阶段立即被拒：`headers` 的数组元素无法转换为 Kotlin `Pair<String,String>`，含 null 值；即使完全省略 headers 仍复现。null 疑似来自 File body 的 Content-Type 推导，不能把 R2 的“去掉显式 header”当作完整修复。宿主机同一预签名 URL，`curl -X PUT --data-binary @file` 不带 Content-Type 得到 **200 + ETag**，加 `content-type: application/octet-stream` 得到 **403 SignatureDoesNotMatch**；AVD Chrome 能打开同域名并收到 AccessDenied XML。证据指向请求进入网络之前的原生参数转换失败，不能解释为域名不可达。
- **SDK 核对与替换原因**：已读 Expo v57.0.0 总览及 [FileSystem legacy 文档](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem-legacy/)。本轮开始时本地版本为 expo **57.0.7**、expo-modules-core **57.0.6**、expo-file-system **57.0.6**。legacy Android `createRequestBody` 的 BINARY_CONTENT 分支使用 `file.asRequestBody(null)`，仅从 `options.headers` 添加显式头。因此改为 `createUploadTask(part.url, temporary.uri, { httpMethod: 'PUT', uploadType: FileSystemUploadType.BINARY_CONTENT })`，完全不传 headers，绕开 expo/fetch File body 的 NativeRequest 参数组装。
- **响应与取消**：按 status 的 `[200,300)` 判断成功，其余抛 `PartUploadError(status)`；ETag 名称大小写不敏感，值原样保留，缺失仍抛错。60 s 到期调用 `cancelAsync()` 并归为 `PartUploadError(408)`；外部 signal 和同批 worker 失败通过内部 abort 取消在途任务。取消 Promise 与 uploadAsync 竞争，避免 native 取消已完成但 uploadAsync 不结算时挂住；取消 rejection 有处理，finally 移除监听/定时器并回收临时片。5 MiB 切片、并发 3、逐片 ETag 持久化、跳过已完成片与 403 重新 initiate 保持原流程。
- **错误诊断落盘**：`classify()` 分类规则不变；manager 在分类后的 catch 中把非 HTTP、非超时/取消的 network 类 Error（包括 native 调用拒绝和 TypeError）写入 `record.errorMessage`，随后沿用 waiting dispatch 一并持久化。使用不可变 store 更新，不制造瞬时 failed 状态、不扩展 model/DTO；确定性失败原有用户文案保持。旧 ensureSetLog 网络 TypeError 测试仅将 errorMessage 的 null 预期改为实际消息，仍断言 waiting/network。
- **先红后绿**：首个 PUT 用例让旧 expo/fetch 替身抛现场 NativeRequest headers 拒绝，实际红；切到 legacy 后绿。ETag 小写/混合大小写先因缺 ETag 红，再绿；60 s 与 abort 用例先因 cancelAsync 调用数为 0 红，再绿；manager 两类错误先因 errorMessage 为 null 红，再验证 waiting/network 和冷 hydration 后消息保留。另覆盖无 headers 的 PUT 参数、200 + ETag/etag/eTaG、199/300/403/500 错误状态、缺 ETag、成功/失败/取消后临时片回收。最后一次依赖可用时 `npx jest src/features/training/video-upload --runInBand`：**5 suites / 59 tests 全通过**，原有 47 项全部保留。

验证结果与环境阻断：
- `npm run lint`：exit 0，无诊断。
- `npx jest`：**43 suites 通过 / 1 suite 加载失败，310 tests 通过**；失败为未修改的 `src/analytics/__tests__/root-layout.test.tsx` 无法解析 `@expo-google-fonts/archivo/800ExtraBold`。日志 `/private/tmp/w1h-r3-jest.log`。
- `npx tsc --noEmit`：exit 2，仅报未修改的 `src/app/_layout.tsx:4–5` 无法解析 Archivo `800ExtraBold` / `900Black`。日志 `/private/tmp/w1h-r3-tsc.log`。
- 本 worktree `node_modules -> ../meetpr-rn/node_modules`。验证期间共享依赖发生外部变化：Archivo 于本机 05:52 变成目标含多个包参数的失效 symlink；随后定向 Jest 重跑又无法解析 expo-notifications / expo-localization（2 suites 无法加载、其余 3 suites / 26 tests 通过）。本轮没有执行任何安装或修改共享 node_modules；不能宣称最终全仓 Jest / tsc 绿，需共享依赖恢复后重新运行上述检查。
- 使用指定 PATH/JAVA_HOME/ANDROID_HOME 运行 `EXPO_OFFLINE=1 CI=1 npx expo run:android --device meetpr --no-install --no-bundler`，ADB start-server 因 `could not install *smartsocket* listener: Operation not permitted` exit 255，未能安装/取得截图。日志 `/private/tmp/w1h-r3-android.log`。真实 Global 分片 PUT + ETag + complete 仍待 AVD 现场复验。

### W1-h 补记(Claude,2026-09-05)— media3 版本冲突与播放器崩溃
- 现象:打开任何 `react-native-video` 播放器(学员组内回放、教练工作台)进程即崩,`NoSuchMethodError: DefaultLoadControl.<init>(DefaultAllocator,IIIIIZIZ)`,表现为 App 闪退回上一个任务。
- 根因:`expo-camera` → `androidx.camera:camera-video:1.6.0` → `androidx.media3:media3-container/muxer:1.9.0`,把 `media3-common/exoplayer` 约束到 1.9.0;`react-native-video 6.19.2` 按 1.8.0 编译,`RNVLoadControl` 调用的 protected 构造器在 1.9 变成 14 参签名。
- 修法:`patches/react-native-video+6.19.2.patch`(patch-package,`postinstall`)把 `RNVLoadControl` 换成 `DefaultLoadControl.Builder`(跨 1.8/1.9 稳定);放弃 `DependingOnMemory/DisableBuffering` 两种缓冲策略的按内存限流(本 App 不用)。升级 RNV 到已适配 media3 1.9 的版本后可删补丁。
- 顺带:共享 node_modules 用 `npm install --no-save` 预装 extras 时必须整份列表传入,否则会被 npm 剪掉;Gradle `--build-cache` 曾恢复出一份 7 月的旧 APK(缺新原生模块),排障时用 `--no-build-cache` + 删 `android/app/build`。
### R4 — 组内视频附件冷启动服务端回填 — 2026-09-05

工作树：`feat/w1h-r4-remote-attachments` / `meetpr-rn-wt-w1h-r4`。仅改此 worktree；未 commit/push、安装依赖/skills、运行 code-review 或修改上传协议/DTO、coach/feedback/history。

- **现场核对**：已读 AGENTS、PLAN、W1-h R1–R3、video-chain-v2 §4 与 [Expo SDK v57.0.0 文档](https://docs.expo.dev/versions/v57.0.0/)。指定 iOS 文件实际与卡面的一处描述不同：`BackendVideoAttachmentRepository.fetch(setLogID:)` / `fetchAll(studentID:)` 都过滤本地 `attachments.json`，不是 GET 学员视频列表。`TodayWorkoutView.swift:372` 在 `.task` 初次加载后调用 `videoViewModel.start`；ViewModel 先订阅事件、恢复上传，再读 manager 的本地学员附件写入组状态。`TodaySetRefSharingSource:140–150` 同样使用 manager 本地附件。本卡服务端回填按用户明确目标实现，不声称 iOS 已有这条全量 GET 链。
- **实现**：store 新增 `hydrateRemoteVideoAttachments(studentId, sets)`；先完成 AsyncStorage hydration，每次对当前日已有日志的组只调用一次 `videosRepository.list(studentId)`，按 `set_log_id` 归组，忽略 null 关联及范围外视频。本地无记录则写入 uploaded / attachmentId / setLogId / sizeBytes，localUri/source 为 null；本地已有记录优先保留，仅当同组 uploaded 的附件 ID 已不在远端列表中时移除记录。合并沿用串行持久化队列。读取/持久化异常静默，下次刷新重试。
- **触发与交错保护**：TodayWorkoutView 装载、选日/组日志 ID 变化触发；手动刷新、返回训练 tab 与回前台的既有刷新流程结束后也触发（包括 volatileOnly）。以组 ID 列表的稳定序列避免每次录入重绘都请求。逐组请求 token 让本地上传/删除/更换与较新请求优先，旧空响应不会删掉刚完成的上传，旧有视频响应不会复活已删记录。
- **播放与删换**：现有 SetVideoUploadIndicator / VideoAttachmentControls 已订阅同一个 selector，回填后直接显示 uploaded 图标及 Video / Play / Change / Delete。沿用 W3-a VideoPlayback → 共享播放器，localUri 为空时现取 `GET /uploads/:id/url`，短链不落盘。已核实 manager.remove 使用 `uploadsRepository.remove` → `DELETE /uploads/:id` 后清本地（404 视为已删）；attach 在发布新记录前先 removeRecord，因此 Change 保持先删远端的原流程。无需改这些组件或 manager。
- **先红后绿**：新 `video-upload/__tests__/remote-hydration.test.ts` 共 13 项，经真实 store/selector 与 AsyncStorage 重启 seam 验证，替换外部 API/存储边界。冷启动用例最初因缺回填入口红；本地优先最初丢失 localUri/status；远端删除最初仍 uploaded；静默失败最初 Promise rejected；上传完成交错最初被旧空响应清除，各切片逐步转绿。另覆盖持久化、null set_log_id、全日一次请求、范围/学员隔离、无日志不请求、失败重试、保留 uploading/failed、删除交错与响应倒序。
- **验证**：video-upload 相关 **9 suites / 81 tests** 通过；全仓 `npx jest --runInBand` **66 suites / 413 tests** 通过；`npm run lint` 无诊断；`npx tsc --noEmit` 无诊断；`git diff --check` 干净。日志 `/private/tmp/w1h-r4-{jest,lint,tsc}.log`。
- **设备验收受阻**：使用指定 PATH/JAVA_HOME/ANDROID_HOME 运行 `EXPO_OFFLINE=1 CI=1 npx expo run:android --device meetpr --no-install --no-bundler`，prebuild 成功，ADB start-server 因 `could not install *smartsocket* listener: Operation not permitted`（5037）exit 255。未安装本轮代码到 AVD、未取得截图，不能声称清数据/换机后的真实 Global 回填与播放已设备验收。日志 `/private/tmp/w1h-r4-android.log`；待可用 ADB 环境补清数据重登 → 训练组指示/附件区 → 云端播放 → Delete/Change 的走查证据。

## W2-a — 教练外壳、Dashboard、花名册与接收队列（2026-09-05）

### 改动清单

- `(coach)/_layout.tsx` 改为共享时钟/数据模型之上的 Stack；四 tab 路由迁入 `(coach)/(tabs)`，顺序 today / messages / students / profile。删除 planning 和旧 receiving 路由；profile 标题使用 `coach.shell.profile`。公开 URL 仍为 `/(coach)/today|messages|students|profile`。
- 注册 `/(coach)/student/[studentId]`（仅占位，W2-b 接手）与 `/(coach)/application/[requestId]`（已实现）；两者在 Tabs 之外，因此隐藏底栏。申请操作完成用返回关闭目的地，保留原花名册搜索/滚动实例。
- `CoachNowProvider` 是教练特性唯一的当前时间来源；AppState active、设备本地午夜推进。`CoachDataModel` 在日切/时区偏移变化时重拉花名册；在途请求结束后补取新窗口。异步结果发布时按最新 now 重算信号，避免旧请求恢复过期的 Awaiting Reply。
- Dashboard 六块、待办三态、接收成功横幅、ISO 自然周概况、四种格子/图例/星期头/完成率、恒可见 View All Students 已实现。屏幕只消费共享模型，不发请求。
- 花名册搜索/清除、新申请倒序段、四态与失败 overlay、异常分组、状态点/原因/活动/No Plan/分段进度/完成率色阶已实现。申请资料页直接复用 onboarding 读口，完整资料按八行展示；404/失败/无资料仍可 Accept/Ignore。
- 接收 sheet 恒发 `{skip_evaluation:true}`；拒绝 confirm 恒发严格 `{}`。成功摘除申请，接收刷新花名册并回传姓名；4xx 刷新结束后报对应文案。代次保护避免旧队列快照重新插回已处理申请；接收发生在旧花名册刷新中时补拉操作后的真值。接收/拒绝埋点分别为 `accepted_skip` / `rejected`。
- 新增 `api/domains/coach.ts`，zod 接受嵌套 profile / 旧 flat 学员摘要，队列 onboarding 复用现有 schema 的部分字段；`BIND_REQUEST_EXPIRED` 加入客户端已知错误码。plan/logs/feedback 复用既有 repositories；四学员滑动窗口、槽内串行，实际 HTTP 扇出也不超过四，按原序回填，单学员失败为空信号。plan/logs 复用 TanStack Query keys，先展示已有缓存再有界更新；feedback 与 bind queue 不做持久缓存。
- 新增 `domain/coach/{calendar,triage,week-overview,todo-list,formatting}`。教练计划日期只读复用 `recommendedDate`，优先展示 `shifted_to_date`；日志上界用次日本地日期（HTTP `to` 开区间）。不使用学员 04:00 切点。
- `TabBar` 增加可选教练颜色/圆点 badge 参数，现有学员默认参数保留。补齐 v3 所需细间距和申请/成功/漏练透明色 token；videoStage 色值核对 iOS `VideoColors.swift`，分别 `#1B2534` / `#2A3646`。

### 文案 / 正典核对

- 本卡新增界面未命中 key：**无**，没有新增 `TODO(i18n:missing)`。S/B/D、kg/cm、百分比和周号是正典中的数值记号；未知器械 token 原样展示。
- `t(key, params)` 补充命名占位符支持（`{name}` / `{student}` / `{waiting}` 等），保留已有位置参数行为；增加教练参数索引，避免用姓名判断复数。
- `coach.today.trainingDaysCompleted %lld %lld` 的提取 catalog 遗留 `%1$lld / %#@total@ completed`，现场核对 iOS xcstrings 的 `total` substitution 后转为 `{0} / {1} training days completed`，`.one` 为 `training day`，复数按第 2 参数。只改运行时 catalog，未动只读参照包。
- 正典边界：video queue / chat inbox 保留空输入及 `selectMessagesBadge` selector；Dashboard 需发起学员会话的待办先带 `studentId` 到 messages。真正的 coach chat context 激活、会话打开/失败 alert、polling/push 路由由 W2-c 接入；本卡不建立聊天连接。Profile 内容仍为已有占位，由 W2-d 替换 `(tabs)/profile.tsx` 的导出。
- §8 的“每学员三请求”指 plan/logs/feedback 三个 repository 读操作，其中 plan 实际包含 list + detail。本卡采用更严格的四 HTTP 并发上限，避免四学员各自再扇出时超过四。
- 没有 Planning UI/外链，没有评估 UI/评估读请求，没有修改 `(student)`、training、video-upload，没有加依赖、commit 或 push，没有运行 code-review/skill 安装。

### 验证与限制

- 按用户指定 seam 逐片红绿：漏练 1/2 天、7 天首尾、待回复三个分支、周一起算/ISO 跨年/±36h/格子/图例/取整、四段待办/未读总数/申请单复数、名单四态/异常/色阶/真实序列化请求体/错误映射。补覆盖滑动窗口与失败退化、4xx 刷新先于 banner、队列与接收竞态、缓存先画后更新、时钟重算/日切。
- `npm run lint` 通过；`npx tsc --noEmit` 通过；`npx jest --runInBand` **49 suites / 319 tests 通过**；`git diff --check` 通过。
- 常驻行为已核对当前安装的 Expo Router `BottomTabView`：`lazy:false` 首次渲染所有路由，以稳定 route.key 保留组件；`detachInactiveScreens:false` + `freezeOnBlur:false` 下，react-native-screens 的回退 View 按 activityState 改 display，未卸载子树。仍需模拟器实际确认滚动位/搜索及全屏返回。
- Android 静态 export 成功。共享 `node_modules -> ../meetpr-rn/node_modules` 的 Metro 转换缓存曾两次错误引用 W2-d 路由；**隔离 TMPDIR 后不再复现**，无仓库构建配置改动、无其他 worktree 改动。复现/验证命令：`mkdir -p /tmp/meetpr-w2a-metro` 后 `TMPDIR=/tmp/meetpr-w2a-metro npx expo export --platform android --output-dir /tmp/meetpr-w2a-export`。此构建问题以真实 CLI 打包作为回归检查，没有追加无法模拟跨进程缓存的单元测试。
- 已运行 `npx expo run:android --no-install`（设置 JAVA_HOME/ANDROID_HOME）；Expo prebuild 完成，但 ADB 启动报 `could not install *smartsocket* listener: Operation not permitted`，当前沙箱禁止监听，不能连接/启动 AVD `meetpr`。**未取得模拟器截图，不宣称 Android 视觉/端到端验收**。生成的 android 目录为 gitignored 构建产物。
## W2-b — Coach StudentDetail — 2026-09-05

范围:仅 `feat/w2b-student-detail` / `meetpr-rn-wt-w2b-student-detail`。已读 AGENTS、PLAN/PARITY、`coach-v2.md` §3/8/9/10/11/12、CoachKit catalog、现有 API/design/VideoPlayback,并读 Expo **v57.0.0** 文档。日期投影、周窗、问卷、训练日序号/日志计数对照 iOS `release/1.0 @ 202e95db` 原文件。按用户指示未 commit/push,未跑 code-review、skills 安装或 tracker 流程;未加依赖,未修改 `(student)` / training / video-upload 内部。

### 改动清单

- 新路由 `(coach)/student/[studentId]` → `StudentDetailScreen`:隐藏整个 tab rail,保留来路 history;自定义返回、姓名/状态胶囊、计划四态、设备自然周号、禁用 Remind/Week Summary;五段 chip、主体三态、下拉刷新。训练日与视频共用一层 Modal,不重建 W1-h 已踩坑的嵌套 Modal。
- `detail-week`:本地自然日(无 04:00 gym-day)、显式 `now`、周期前/中/后周窗、末周由最后实际计划日裁决(含 shifted date)、无计划今天前六天、7 天执行日、日志排序、完成统计(一组即可)、最近反馈/活动。
- Overview:训练行只展示有动作日,标题沿 iOS 的当前计划游标周 + 可见训练日序号;Adjusted/总顺延胶囊只读;readiness loaded/notFiled/unavailable 分开;最近反馈有值切 Feedback,空值切 Videos。DayDetail 按动作列只读组,logged fraction 计所有日志,保留 free-log/rest 分支。
- Videos:复用已有 `/students/:id/videos`,本地日倒序分组/行倒序,反馈状态兼容 video_id 与 legacy exercise 反馈。打开前短链校验失败有 wall banner;`CoachVideoPlayer` 包装 W1-h `VideoPlayback`,带动作/重量/次数/RPE/组序/教练名角标。缺少周窗外组信息时按视频日期附近补读日志,失败只让角标缺项显 `—`。短链不进缓存;播放 Retry 由原组件重新请求短链,无编辑/标记/导出入口。
- Growth:新增 coach exercise-stats DTO/read,仅渲染后端 family 当前值、points 与 trend;合计/进度/0–1 位格式位于独立 `coach-e1rm`,不 import 学员 e1RM 引擎。总卡 + 三主项卡,现有 Sparkline 高 90;new/unknown 无箭头;失败可 Retry。
- Feedback:只读归档与主题胶囊,`feedback.ts` 增加可空 video_id;无 composer、无 mark-read 写调用。Profile:1RM 禁用 Edit(含 hint),十行问卷,diet 恒 `—`,词汇映射来自正典,缺值明确留空占位。
- `coach.ts` 本 worktree 原不存在:新增本卡所需 students 兼容读模型与 exercise-stats;videos/readiness/onboarding 沿用已有读口,onboarding 任意 404 → null/unavailable。auth UserSchema 仅补可选 name,让登录响应中的教练名不被 Zod 丢弃;无姓名时使用既有 Coach fallback。
- 路由边界暂时拥有唯一时钟(首次/每分钟/本地午夜/AppState active 更新),所有详情函数/组件接必填 now;日切或时区 offset 改变重拉窗口与辅助资料。W2-a 共享 CoachNowProvider 合入时应将这一边界替换为共享时钟,不要保留两份来源。

### 文案、已知口径与合并注意

- 未命中 key: **0**(新增引用均通过 TranslationKey 类型检查)。规范化本卡既有 catalog 的 `coach.detail.feedbackMeta`、`coach.detail.weekProgress %lld %lld`、`coach.execution.loggedSetsFraction %lld %lld`、`coach.profile.age`、`coach.shared.readiness.fatigue`,将 Swift 命名/复数占位转为本仓 t(key, params) 支持的 `{0}/{1}`;未新增翻译 key。kg/S/B/D/W/D 为单位/记号。
- 日期展示走设备 languageTag,DATE 字符串按本地日解读,不复制 zh_Hans_CN 的视频/归档/注册日期硬编码。自然周优先 Intl.Locale weekInfo;Hermes 不提供时使用 expo-localization 的设备 firstWeekday 与地区的 minimum-days 规则(含 GB 跨年四日周)。未新增日期库。
- 未接聊天,右上聊天口不渲染,训练/readiness 提醒禁用;Week Summary 与 Edit 继续禁用并有 a11y hint。无计划旧文案按正典保留,没有发明 plan-web 入口。评估仅显示服务端已有状态胶囊,不请求评估、画横幅或开放适应周/顺延写口。
- W2-a 尚不在此 worktree:本卡只为现有 Tabs 增加隐藏详情目的地和 history 返回,没有改它负责的四 tab 外壳/花名册/待办。合并 coach.ts **取字段/函数并集**,保留详情路由路径;W2-a 新壳应继续在本详情目的地隐藏整条 rail。
- 设备 UI 与真实 Global 数据尚未验收。读取失败/空态由查询状态明确驱动;目前短链过期后走原播放器 Retry 重新取链,未修改 W1-h 播放器内部以自动续链。教练姓名是否由生产登录响应提供尚需现场核,不存在时明确显示既有 Coach fallback。

### 验证

- 指定三个 seam 先红后绿:周窗缺模块→绿,7 日/排序/完成统计缺函数→绿;合计缺模块→绿,进度超上限先得 2→clamp 后为 1,趋势/格式缺函数→绿;计划四态/readiness 缺模块或函数→绿。新增 **10 tests**。
- `npm run lint`:exit 0,0 errors/0 warnings;`npx tsc --noEmit`:exit 0;`npx jest`:**47 suites / 309 tests 全通过**。日志 `/private/tmp/w2b-{lint,tsc,jest}.log`。`git diff --check` 干净。
- `EXPO_PUBLIC_API_BASE_URL=https://api.meetpr.app npx expo export --platform android --output-dir /private/tmp/w2b-export`:Android Hermes bundle 成功,未新增依赖。日志 `/private/tmp/w2b-export.log`。
- 已实际运行 `EXPO_PUBLIC_API_BASE_URL=https://api.meetpr.app npx expo run:android --device meetpr --no-install`;ADB start-server 无法安装 smartsocket listener(`Operation not permitted`,exit 255),CLI 未能安装到 AVD。日志 `/private/tmp/w2b-android.log`。**没有本卡 AVD 截图,不声称已亲眼验收**。待可用 ADB 环境补五段/训练日/纯回放角标、短链 Retry、返回隐藏底栏与错误/空态截图;PARITY StudentDetail 按本卡要求标 🔨。
## W2-d — 教练 MyProfile / InviteCodes / Help / Privacy / 登出 — 2026-09-05

- 仅修改 `meetpr-rn-wt-w2d-coach-profile` / `feat/w2d-coach-profile`;没有 commit/push,没有 code-review、技能安装或 tracker 流程。先读 AGENTS、PLAN、coach-v2 §6/§8/§9.11/§10/§12、CoachKit catalog、i18n/design/session 与现有占位页登出路径;本 worktree 无 `src/features/auth/`。已读 Expo v57.0.0 总览与 clipboard 版本文档。
- 现场核 iOS HEAD `202e95dbbf88baf5778f2329f206f34e117a4dd0`: `RepositoryContracts/InviteCodeRepository.swift`、`CoreModels/Entities/Bind/InviteCode.swift`、`Domain/InviteCodeFormat.swift`、`Networking/DTO/BindDTOs.swift` / `APIClient+Bind.swift`。GET 响应 `{invite_codes:[...]}`,POST 返回单个 DTO;字段 `id/coach_id/code/type/max_uses/used_count/expires_at/revoked_at/label/created_at`。非时限码 **省略** `expires_in_days`(不能 null),时限要求整数 1–365;空白 label 省略,非空 trim 后上限 100。DELETE 204 不解 JSON,重复撤销仍可成功。无后端改动。
- 实装 profile 姓名(保留 UserSchema 可选 name,trim/fallback)、邀请码卡 loading/failed/empty、有永久码用量/裸码复制、2 秒 toast、General 三行、Help 四条 FAQ/静态禁用联系、Privacy 三行文档日期/只有有效配置 URL 的隐私行可点、静态版本行、登出确认遮罩/取消/忙态。session.logout 与根 Protected 路由完成身份清理和跳登录;不另造登出端点。英文文案全部来自现有 `t(key)`;保留正典现有 logoutMessage 提及 phone number 的文案,未擅改 Global 文案。
- 邀请码页:个人码 4-3-3 分组/用量/复制/重生成确认;无码只允许显式生成。次级单次/时限创建 sheet(7/30/自定义 Stepper 1–365,默认自定义 14),行内状态/复制,左滑撤销与 TalkBack 自定义撤销动作,失效段 opacity 0.5/不可复制。每次写尝试后重拉,无乐观补丁;刷新失败保留旧快照,旧 GET 不覆盖写后的列表。隐藏 invite-codes tab 项,保留 W2-a/b/c 屏及现有外壳结构;未加账号安全。两屏 focus/回前台刷新,当前屏统一注入时钟并每秒推进,未在领域规则或各行自取时钟;后续 W2-a 壳时钟可经 `clock` seam 接入。
- **剪贴板待交接:让 Claude 装** `expo-clipboard`(本 worktree 的 node_modules 为共享符号链接,现场确认缺包,未执行依赖安装)。按本卡许可先提供 `InviteClipboard.setString(value)` 注入接口;`clipboard.ts` 默认 adapter 明确失败,不会空操作后假报 Copied。Claude 安装 SDK 57 对应 `expo-clipboard` 后将该 adapter 接到 `await Clipboard.setStringAsync(value)`,重建 Android 原生包。当前裸码写入与 2 s toast 在注入的剪贴板边界验证通过,**默认原生复制尚不可用**。
- 按指定 seam 逐片红→绿:状态优先级/到期边界/ceil≥1、isDefunct、分组;profile 三副标题、真实 HTTP 加载后无 POST、显式生成 POST→GET、重复 DELETE 204→GET、裸码复制/失败无成功反馈。挂载真实 profile 验证加载和 toast;重复复制同一码的 2 秒计时新增红测发现旧 timer 被复用,用 copy revision 重启计时后转绿。补查时限 1/7/30/365、越界/小数不 POST、label trim/省略、刷新失败保留旧列表与写失败重拉。新增 2 suites / 23 tests。
- 最终检查:`npm run lint` 0 errors/0 warnings,`npx tsc --noEmit` 无诊断,`npx jest` **46 suites / 322 tests 全绿**。日志 `/private/tmp/w2d-{lint,tsc,jest}.log`;红/绿证据 `/private/tmp/w2d-*-red.log`、`w2d-repeat-copy.log` / `w2d-repeat-copy-green.log`。`git diff --check` 干净。Android Hermes bundle 导出成功(`/private/tmp/w2d-export`,日志 `w2d-export.log`);首次导出误用共享 Metro 缓存内相邻 W2-b 路由,`--clear` 后在本 worktree 成功,未修改相邻 worktree。
- **设备验收未完成**:`npx expo run:android --device meetpr --no-install` prebuild 成功,随后 ADB start-server 因监听 5037 的 `Operation not permitted` 失败(exit 255)。没有安装本轮 APK、没有取得 AVD 截图、没有以 Jest/bundle 替代原生验收。日志 `/private/tmp/w2d-android.log`。待依赖接线后现场补两屏/Help/Privacy/登出、剪贴板裸码、左滑撤销、键盘/Stepper 与截图。PARITY 仅教练 MyProfile/InviteCodes 行标 🔨。
## 2026-09-05 — W2-c 教练消息 / 待反馈视频 / 视频反馈 / Chat

- Worktree `feat/w2c-receiving`;仅本 worktree 改动,无 commit/push,未运行 code-review、skill 安装或新增依赖。
- 已读 AGENTS、PLAN、coach-v2 §4/5/8/9/10/12、CoachKit/ChatUI catalog、design v3、现有 feedback/videos/uploads/plans 和 VideoPlayback。Expo SDK 57 文档已现场读取: https://docs.expo.dev/versions/v57.0.0/ 。iOS 只读仓 HEAD 核实为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`。

### Chat DTO 现场核结论

现场文件(均相对 `apps/MeetPR-release`):

- `Modules/RepositoryContracts/Sources/RepositoryContracts/ChatRepository.swift`
- `Modules/Networking/Sources/Networking/DTO/ChatDTOs.swift`
- `Modules/Networking/Sources/Networking/NetworkChatRepository.swift`
- `Modules/Networking/Tests/NetworkingTests/ChatDTOTests.swift`(snake_case wire fixtures/编码断言)
- `Modules/ChatUI/Sources/ChatUI/ConversationViewModel.swift`、`ChatInboxViewModel.swift`

| HTTP | 实际 wire |
|---|---|
| `GET /conversations` | `{conversations:[{id,other_party:{id,display_name},last_message:{id,seq,kind,preview,created_at,sender_id}|null,last_message_at,unread_count,my_last_read,other_last_read}]}` |
| `POST /conversations` | body **`{other_user_id}`**,不是 student_id/other_party_id;响应 **`{conversation}`** |
| `GET /conversations/:id/messages` | `limit` 1–100(本卡 50);增量 **`since_seq`**,历史 **`before_seq`**;响应 `{messages,meta:{other_last_read,has_more}}` |
| message | `{id,conversation_id,seq,sender_id,kind,body,client_id,created_at,attachment_id?,image_url?,image_expires_in?,set_ref?,video_url?,video_expires_in?}`;kind 为 `text/image/set_ref` |
| `POST /conversations/:id/messages` | 文字 body **`{kind:"text",body,client_id}`**;响应 **`{message}`**;失败重试保留同一 client_id |
| `POST /conversations/:id/read` | body **`{message_id}`**,不能空 POST;响应 `{my_last_read:{message_id,seq},unread_count}` |

Swift CodingKeys 中的 `messageId`/`otherUserId` 经 codec 转 snake_case,不能原样当 HTTP 字段。进入会话拉最新页后对最新消息 read,空会话无游标不发 read;新页到达推进 read。按 seq 升序、ID 稳定并列、跨页 ID 去重;30 s 轮询防重入、离屏停止、回前台节流;增量和历史分页均处理。发送后的本地消息不推进抓取游标,避免跳过尚未抓取的中间消息。realtime 不做。

### 实装与接线

- `(coach)/messages` → `CoachReceivingScreen`:eyebrow、四态、每学员一行、未读点、视频计数胶囊、姓名开会话、下拉并发刷新。旧 `(coach)/receiving` 仅留同屏兼容入口,使尚未合并 W2-a 的壳也可进入本卡。
- W2-a 约定导出 `useCoachMessagesBadge` 位于 `features/coach/receiving/index.ts` 和 `use-coach-receiving.ts`。头部和 selector 共用 `inboxCount`,都按最新会话折叠后计数。未改 W2-a 的 `_layout`/Today/花名册/详情页;由 W2-a 将 tab 名换为 messages 并接 badge。
- 列表按设备本地训练日倒序,日内按 uploadedAt 倒序;工作台打开期间不 dismiss,返回且学生队列空时退出。全屏路由使用随焦点显示的 Modal 覆盖旧底栏,不侵入独立负责的 W2-a 壳。
- 队列聚合 students/videos/feedback/current plan,排除未挂计划、已答视频、legacy 已答动作;动作名只取当前计划槽位与 catalog。当前计划复用 `selectCurrentPlan`(published_at、created_at、id),计划失败只缺动作名;必要请求失败保留旧队列。每次至多 4 位学员聚合。
- 反馈成功先取消在途旧队列查询再按 video ID 摘除,防止旧快照恢复已反馈条目。发送前保存后继 ID,成功后在最新队列按身份查找,缺失落 first,空则 dismiss。Skip 环形。
- 工作台有短链失败/重试、播放进度、时间标记跳转、按时间排序的标记列表/删除/已有批注图、四格 set-info、反馈输入/发送/banner/Skip;三条请求链路各用 requestID + itemID 验证,切片清除播放位置/表单/批注状态。组数据拉近 5 年,按 plan exercise + set log ID 精确匹配。
- 标记 note 硬截 500 字符,wire level 恒 info;404 隐藏可选标记区,其余失败显示对应失败行。不做批注绘制/导出/realtime。
- Chat 为最小文字 composer(4000 字符、失败重试),显示文字与已有图片,结构化训练分享沿用 wire body 文本降级;未知学员状态返回 null,副标题整行不渲染。
- `t()` 支持本卡命名占位符的按序参数,并补 `pendingVideosAccessibility` 第二参数的复数计数索引。
- 现场发现现有 `StudentVideoSchema` 强制要求 iOS wire 中不存在的 exercise_name/set_index/weight_kg/reps;先用 pinned 最小响应跑红,再将这四个额外字段缺省归 null,保留原消费者类型和已有扩展响应兼容。

### 播放器边界与验证限制

- 卡同时要求复用 `training/video-upload/VideoPlayback.tsx` 与不改 training 内部。该组件只有独立全屏接口,没有进度、嵌入布局或 markers 插槽。已通过异步问题请求最小可选接口扩展;尚未收到答复,因此遵循不改 training 的明确边界,本卡 `VideoWorkbenchPlayer` 使用相同 `react-native-video` 依赖单独封装,**没有复用 VideoPlayback 组件本身**。若要求组件级复用,仍需确认允许该最小接口扩展。
- 使用 tdd 的指定公共 seam 做逐片 red→green:会话折叠/排序/预览/同源计数,排除规则/日期分组/自动退出,Skip/itemAfterSend,三资源请求防串片,消息排序/read/轮询/离屏迟到结果/未知状态。未启动 code-review 工作流。
- `npx expo run:android --no-install` 完成 prebuild 后被环境阻断:ADB 5037 listener `Operation not permitted`,未到 APK 编译/安装。未绕过沙箱,未取得 AVD `meetpr` 实机画面或截图,不可标记视觉验收通过。

### 最终验证结果

- `npm run lint`、`npx tsc --noEmit`、`git diff --check` 通过。
- 全量 `npx jest --runInBand`: **47 suites / 312 tests 通过**;指定 W2-c 三个测试文件共 13 项,含 `itemAfterSend`、请求双校验、已读回包即时应用与旧游标拒收。
- Android production JS/Hermes bundle 导出通过(1829 modules):`/tmp/meetpr-w2c-android-export`。使用本地 Expo CLI,`EXPO_OFFLINE=1`、Global API URL、显式本 worktree 的 `EXPO_ROUTER_APP_ROOT`、独立 `TMPDIR=/tmp/meetpr-w2c-metro`。首次 npx 导出遭 DNS 阻断;本地 CLI 初次读到共享缓存的另一 worktree 路由,隔离缓存后成功。未修改其它 worktree。
- Android APK/AVD 仍未验证,原因见上方 ADB socket 拒绝;bundle 成功不代表模拟器视觉验收通过。PARITY Receiving/Chat 均为 🔨。


## W3-i18n — 字面量收口 (2026-09-05)

- 范围：仅 `meetpr-rn-wt-w3i` / `feat/w3-i18n-sweep`；无 commit/push、安装或 code-review 流程。先读 AGENTS、PLAN、G0-b/R1、i18n runtime/matcher、八份正典与 RnExtras；已读 Expo SDK v57.0.0 文档。
- 实际基线：非测试源码 15 处 `TODO(i18n:missing)`、0 处 drift，另有旧 guard 内 2 个查找字符串。全部清零。旧 G0-b 的 80 行登记是历史记录，不是本次 checkout 残留数。
- 使用现有 `punctuationMatches` 对剩余 15 处逐项重扫：逐字/标点匹配均无结果，再按语义复用正典。新 guard 递归扫描整个 `src/**`，包括测试、catalog 和自身；搜索词分段构造以避免自命中，不设置路径豁免。
- `no-literal-zh` 删除 TODO/登记表放行机制及 login/onboarding 屏幕豁免；只排除翻译 catalog 和测试代码，不排除任何业务页面。收紧后另外检出旧 CN login 10 处中文调用，全部用 AppShell 正典替换；登录逻辑、布局与切轨行为未改。

### 替换清单（文件 → key）

| 文件 | 原文/位置 | 最终 key |
|---|---|---|
| `src/navigation/BindGate.tsx` | 绑定申请尚未完成，请重新输入邀请码。 | `student.rn.bind.incompleteRequest` |
| 同上 | 绑定教练；请输入邀请码（2 处） | `student.bindEnterCodeSubviews.copy001` |
| 同上 | 提交邀请码 | `student.bindEnterCodeSubviews.copy005` |
| 同上 | W1 接线 | `student.rn.bind.wiringPlaceholder` |
| 同上 | 完成训练信息 | `student.rn.bind.completeTrainingInfo` |
| 同上 | W1 接入学员 Onboarding。 | `student.rn.bind.onboardingPlaceholder` |
| 同上 | 等待教练确认 | `student.rn.bind.awaitingCoach` |
| 同上 | 绑定申请处理中，请稍后查看。 | `student.pendingBindView.copy003`（采用正典的 24–48 小时响应/7 天过期说明） |
| 同上 | 暂时无法检查绑定状态 | `student.bindGateView.copy002` |
| 同上 | 请稍后再试。 | `coach.planning.step7.tryAgainLater`（通用稍后重试语义） |
| `src/navigation/FeaturePlaceholderScreen.tsx` | W1 实装 | `student.rn.featurePlaceholder` |
| `src/app/(student)/growth-curve.tsx` | 成长曲线（页头） | `student.rn.growthCurve.title` |
| 同上 | 动作名 + 成长曲线 | `student.rn.growthCurve.liftTitle`；原 `student.growthCurveView.copy001` fallback 保留，使用整句插值保证英文间隔 |
| 同上 | 完整曲线将在成长页图表卡接入 | `student.rn.growthCurve.placeholder` |
| `src/app/login.tsx` | 登录失败，请稍后重试（2 处） | `appShell.auth.requestFailed` |
| 同上 | 手机号或密码不正确 | `appShell.auth.invalidCredentials` |
| 同上 | 尝试过于频繁，请稍后再试 | `appShell.auth.rateLimited` |
| 同上 | 登录你的训练账户 | `appShell.login.instructions` |
| 同上 | 手机号；请输入手机号 | `appShell.auth.phoneNumber`；`appShell.auth.phoneInputHint` |
| 同上 | 密码；请输入密码 | `appShell.auth.password`；`appShell.auth.passwordInputHint` |
| 同上 | 登录 | `appShell.login.signIn` |

### 新增 RnExtras key（9 个）

所有新增条目含 en/zh 与 `source` 来源文件；既有 15 个 `student.progression.*` key 不改。

| key | 未采用近似正典的原因 |
|---|---|
| `student.rn.bind.incompleteRequest` | rejected/expired/cancelled 共用中性提示，不能套用仅过期或邀请码无效的错误原因 |
| `student.rn.bind.wiringPlaceholder` | RN W1 接线占位，无 iOS 文案 |
| `student.rn.bind.completeTrainingInfo` | RN 通用训练信息标题；iOS 完成资料文案附带评估条件，不适合此封存分支 |
| `student.rn.bind.onboardingPlaceholder` | RN W1 onboarding 接入占位 |
| `student.rn.bind.awaitingCoach` | iOS 等待接收标题需要 coach name，当前占位 gate 没有该参数，不伪造教练名或传空串 |
| `student.rn.featurePlaceholder` | RN W1 实装占位 |
| `student.rn.growthCurve.title` | 正典无通用成长曲线标题；带 e1RM/数据点的图表 accessibility key 不是同一语义 |
| `student.rn.growthCurve.liftTitle` | 同上，含动作名的完整标题 |
| `student.rn.growthCurve.placeholder` | RN 图表接入占位，不冒充已接入图表的无数据态 |

### 复数核对与正典问题登记

- 只读核对 `/Users/david/Projects/apps/MeetPR-release/Modules/StudentKit/Sources/StudentKit/StudentStrings.swift`：全部 8 个非默认 countIndex 已镜像，7 个 index 1、1 个 index 2，无漏项。
- CoachKit 根目录没有直接匹配的 `*Strings*.swift`，实际文件位于 `Planning/` 与 `Features/**`。已递归核对 Strings、PlanningWorkspaceModels 与 Localizable.xcstrings，补齐 `PLURAL_COUNT_INDEX`：`coach.workspace.defaultDraftName %@ %lld` → 1、`coach.workspace.draftSummary %@ %@ %lld` → 2、`coach.workspace.publishedSummary %@ %lld` → 1。defaultDraftName 的 one/other 当前同文，但计数参数仍按 iOS weeks 镜像。其它可表示的多参数 one/other key 没有新增漏项。
- **已知 iOS 误译**：`student.trainingCalendarLogic.copy011` 的 zh 为「日」、en 为 `Sun`。iOS `TrainingCalendarLogic.swift:100` 把它拼到训练日动作名后，语义应是 day，不是星期日。两份 StudentKit JSON 均保留正典原字节。本 checkout 没有该 key 的运行时调用或 drift 标记；已有 `src/domain/plan/presentation.ts` 使用此前收货的 `student.progression.dayName`，本卡未扩改这条无标记调用，也未新增绕过正典的翻译。
- **既有 CoachKit runtime 差异**：开工时 `src/i18n/catalog/CoachKit.json` 已与 docs 正典有 7 项差异：`coach.shared.readiness.fatigue`、`coach.detail.feedbackMeta`、`coach.profile.age` 的具名占位符转位置占位符；`coach.detail.weekProgress %lld %lld`、`coach.execution.loggedSetsFraction %lld %lld`、`coach.today.trainingDaysCompleted %lld %lld` 的英文格式替换；另有 `coach.today.trainingDaysCompleted %lld %lld.one`。本卡不改该文件，不声称八份 runtime 与 docs 全部相同。
- docs CoachKit 的 6 个英文 key 保留 Apple `%#@...@` / `%1$lld` substitution：`coach.detail.weekProgress %lld %lld`、`coach.evaluation.remaining %lld %lld`、`coach.execution.loggedSetsFraction %lld %lld`、`coach.execution.setFraction %lld %lld`、`coach.planning.count.setsAndReps %lld %@ %lld`、`coach.today.trainingDaysCompleted %lld %lld`。其中前述 3 项 runtime 已有历史替换；其余 3 项仍不受当前 t formatter 支持。多计数单位需要独立复数选择，单加 countIndex 不能修复；登记留后续 formatter/导出契约卡，不在本次文案调用收口中改正典或扩展运行逻辑。

### 红绿与最终验证

- 用户预先指定的 seam：两个源码守卫及 `t()` 复数行为；相关四个页面未有既存快照/直接文案断言，未新增额外屏幕测试 seam。
- 新 guard 先红：`/private/tmp/w3-i18n-todo-red.log`，1 failed test，列出 17 行（15 处调用 + 旧 guard 2 处）。去豁免 guard 先红：`/private/tmp/w3-i18n-literal-red.log`，1 failed test，检出 25 处中文。替换后两守卫全绿：`/private/tmp/w3-i18n-guards-green.log`。
- 复数先红：`/private/tmp/w3-i18n-plural-red.log`，公开 `t()` seam 实际得到 `Alex · Strength · 1 weeks`，预期 `Alex · Strength · 1 week`；补索引后英文变绿。随后把测试中误写的中文空格校正为正典 `%lld周`，没有改翻译来迎合测试。最终覆盖 1/2 周、前置参数为数字 1 的干扰场景及 zh 保持原文。
- `npm run lint`：exit 0，0 errors / 0 warnings（`/private/tmp/w3-i18n-lint.log`）。
- `npx tsc --noEmit`：exit 0（`/private/tmp/w3-i18n-tsc.log`）。
- `npx jest`：exit 0，58 suites / 379 tests passed，0 snapshots（`/private/tmp/w3-i18n-jest.log`）。
- `git diff --check` 通过；`rg -n 'TODO\(i18n' src` 零命中。八份 docs 正典 SHA-256 与开工记录、HEAD 一致；八份 runtime 正典与各自 HEAD 一致，只有 RnExtras 新增条目。
- Android 视觉验证未完成：`adb devices` 启动 5037 smartsocket listener 被 sandbox 拒绝（`Operation not permitted`），没有可用模拟器连接。未运行依赖 ADB 的 `npx expo run:android`，未生成截图或 native 工程。PARITY 同步为已实装、待视觉走查。

## W3-a — 学员共享全屏播放器、打点/标注帧、反馈收件箱与详情（2026-09-05）

### 改动清单

- 本卡以 `docs/w3-reference/video-player-charts-v2.md` §0/1/3/5/6 和 David 本卡裁决为正典；已读 Expo SDK 57 versioned docs。仅在 `meetpr-rn-wt-w3a-player` 修改；未 commit/push、未加依赖、未运行 code-review 或技能安装流程。
- `features/video-player/FeedbackVideoPlayer.tsx`：共享 fullScreen surface，react-native-video `controls={false}`；自动播、中央自绘播放/暂停、末尾重播、36×36 关闭圆/eyebrow/四档 ASCII x 胶囊、rate 每次打开为 1、retry 换 item 保留会话 rate 并播放。失败换链静默留卡；成功关闭标注层；关闭键先暂停；卸载取消拖拽任务，Video 原生卸载释放播放。
- `rate.ts` / `time.ts` / `scrub-state.ts`：两套速率文案、不进位小时的 floor 时间、秒/毫秒钳位；250 ms 读取 native position；拖拽显示位置使用独立 React state（兼容本仓 React Compiler），80 ms 合并 seek，松手终态提交，generation 丢弃过期任务/读取。原生同位置 seek 可能没有 onSeek，保留最多 1 s acknowledgement 窗后恢复轮询，避免时间轴永久冻结。
- `FeedbackVideoScrubber` / `FeedbackVideoMarkerPanel`：gold500 轨道、videoStageBorder 底、mono 时间/a11y adjustable；面板黑 0.72、头行 count/失败、列表最高 190、空备注 fallback、pencil 标识与跳转。null/[] 隐藏，failed 显示空列表失败头；无进度刻度或 level 颜色。
- `annotation-select.ts` / `FeedbackVideoAnnotationOverlay`：普通行只 seek；有标注先 pause+seek 再覆盖；整面关闭热区、黑底 contain/白 spinner；图片失败先关层再恰好一次 refresh，不自动重试图片或续播。每次选中独立 generation，旧图片错误不能关闭新图，旧 load 事件不能清掉新图 spinner。
- `features/feedback` 与 `app/(student)/feedback/{index,[feedbackId],_layout}.tsx`：收件箱、详情、共享 playback session 与顶层单层 Modal。复用 Dashboard 反馈 VM 与 StudentVideos 查询关联元数据；详情 available/unavailable/none；反馈列表文本/相对时间/未读态/播放卡；短链失败按反馈行显示 copy002 / 详情 copy004。
- 打开契约：先 await markRead（沿用 iOS best effort），再 uploads.url，发布 playbackItem 后才 list markers。markers 映射为 loaded/failed/hidden；404、传输失败、取消隐藏，其他 HTTP/DTO 错误失败。回填验证 video id + session generation + 请求 generation；关闭/失焦清会话，同一视频重开也不会串入上一次响应。
- Dashboard 与训练页消息按钮跳反馈归档；路由不增加可见 tab。组内 `VideoPlayback` 变成源解析薄封装，继续走现有 OverlayHost；`markers={null}`，纯 selector 本地存在优先→远端→null，异步源入口只在需要远端时现取短链，初次和 retry 用同规则。
- `badge?: VideoBadgeInfo | null` 仅保留类型位，未渲染角标/压暗/导出按钮。聊天路径与 `src/features/coach/**` 零改动；协议/DTO、i18n 正典、依赖清单零改动。

### 与 iOS 的差异 / 拿不准处

- AVKit transport 按裁决换 Android 自绘中央钮；ultraThinMaterial 按裁决换 `rgba(0,0,0,0.35)`，描边白 0.18。未引 blur；烧录/导出完全不渲染，角标归 W3-b，工作台归 W3-d。
- iOS CoachFeedback 带内嵌 video，当前 RN FeedbackItem DTO 仅有 video_id。因此关联卡在展示边界 join 已有 `/students/:id/videos`，没有扩协议/DTO。视频查询未完成显示 loading，失败可重试，不把临时查询失败冒充已删除视频；实际生产关联与缺失卡仍需 AVD 走查。列表日期遵照本卡明确要求用相对时间（iOS 归档源码是 Today / 月日）。
- iOS 固定 ±50 ms seek tolerance：JS 调用 `seek(seconds, 0.05)` 保留意图，但已核本地 react-native-video 6.19.2 Android `VideoManagerModule.kt:48-50` 不使用 tolerance 参数，只传毫秒给 ExoPlayer。没有改 native/加依赖；不能声称 Android 已验证 ±50 ms，拖拽精度待模拟器/真机核。
- v3 token 守卫禁止 legacy `colors.amber`；失败卡图标使用已有语义 gold500。与 iOS amber 的色值差异待双端截图核，未绕过 token 守卫。
- 全屏播放器的真实拖拽跟手、原生末尾/断网/短链过期重试、标注层触摸/黑底 contain、旋转与 Fabric 叠层均尚未完成视觉验收，不标记为已走查对齐。

### 红绿及验证证据

- 按用户指定 seam 分片先红后绿：rate、time、scrub-state、markers-outcome、annotation-select、feedback-inbox-open-order；另在既有 local-retention seam 补 selector 三态。新增 17 项测试；旧 379 项保持绿。
- 红态日志：`/private/tmp/w3a-{rate,time,scrub,outcome,annotation,order,source,transport}-red.log`。scrub 还覆盖已进入队列的旧 callback；open-order 覆盖慢 markers、短链失败、取 URL 中关闭、同视频重开后的旧响应。
- `npm run lint`：exit 0，0 errors / 0 warnings，`/private/tmp/w3a-lint.log`。
- `npx tsc --noEmit`：exit 0，`/private/tmp/w3a-tsc.log`。
- `npx jest`：exit 0，64 suites / 396 tests passed，`/private/tmp/w3a-jest.log`。
- Android JS bundle：`npx expo export --platform android --output-dir /private/tmp/w3a-bundle` 成功，日志 `/private/tmp/w3a-bundle.log`。
- `npx expo run:android --device meetpr --no-install` 已执行：prebuild 成功、生成本 worktree 被忽略的 `android/`，package.json 无变化；ADB 5037 smartsocket listener 被 sandbox 拒绝（`Operation not permitted`），命令 exit 1，日志 `/private/tmp/w3a-android.log`。未完成原生 build/install、未取得 AVD 截图；未绕过沙箱或申请新增权限。
- PARITY 已更新 FeedbackInbox / FeedbackDetail 与 VideoPlayback / FeedbackVideoPlayer 行，保留 🔨（已实装、待视觉验收）。

## 2026-09-05 — W3-v（我的页）视觉对照修正

Worktree: `meetpr-rn-wt-w3v-profile`, branch `feat/w3v-profile`, base `feat/w1p-my-profile`. iOS checkout read-only, verified HEAD `202e95db`. Structure follows `docs/w1-reference/my-profile-v2.md` §0: seven loaded blocks and existing loading/empty/error fallback actions remain. No dependencies, settings/account behavior, API/storage changes, commit, push, code-review workflow, or skill installation.

### Checklist and exact iOS source evidence

Paths below are relative to `/Users/david/Projects/apps/MeetPR-release/Modules/`.

- [x] Header: profile-local `MyProfileHeader`, 97×24 mark row and trailing chat control, display 34 title, then mono 11 subtitle with tracking 0.44 and top margin −8; no Eyebrow. `StudentKit/Sources/StudentKit/Features/MyProfile/MyProfileView.swift:355–376`. Mark uses 16pt Archivo Black, eight offset outline copies, knockout fill, −0.11em tracking and extra R overlap: `DesignSystem/Sources/DesignSystem/Components/Brand/MeetPRMark.swift:11–60`.
- [x] Chat presentation: 44px surfaceCard circle, 21px textPrimary message outline, 18px unread badge, capped at 99+ while accessibility retains the full count: `DesignSystem/Sources/DesignSystem/Components/Buttons/HeaderChatButton.swift:21–68`. This base has no chat route or unread source (W1-p already recorded a disabled placeholder); screen remains disabled with count 0. The header accepts actual count/action inputs but this visual card does not introduce chat data or fake unread counts.
- [x] 1RM: body 13 semibold title then adjacent 44px info target on the left, muted lock on the right; lift labels body 10, values mono 26 bold plus mono 11 kg, including missing values; SBD label mono 12 semibold/tracking 0.36, trailing mono 24 bold total plus mono 12 semibold kg at 70% opacity; bottom body 11 lock note. `MyProfileView.swift:390–414,428–478`. SBD is explicitly **goldText**, not goldCTA: `MyProfileView.swift:448–461`; resolved light #9A4A06 / dark #F5A623 in `DesignSystem/Sources/DesignSystem/Tokens/Colors.swift:36–59`. Existing info Alert behavior preserved.
- [x] Recovery hero and recovery/injury group rows now share `MyProfileRecoveryRow`; v2 hero still opens readiness, group recovery/injury rows still open their respective editors. Header body 14 semibold, Notify coach body 10 medium with goldRGB 12% fill / 35% outline and micro radius 4. Source uses this subtly filled outline, not a solid goldSoft badge or full pill: `MyProfileView.swift:505–523`.
- [x] Recovery summaries rendered as up to three grey chips separated by 1×11 borderStrong vertical dividers; chip body 12 semibold, 9×3 padding, inset radius 10. Injury items use an alert outline, dangerMuted text, dangerRGB 10% fill / 40% outline. Empty injury state keeps a neutral chip. `MyProfileView.swift:524–579`; empty-injury style selection at `:157–160`. Readiness-first hero summaries and fallback assessment source: `MyProfileV3Presentation.swift:50–78`; area-name chips and other/empty fallbacks: `:81–90`. Added display-only `injuryChips`; retained existing aggregate summary/model contracts.
- [x] All four section labels use mono 11 regular, tracking 0.44, textFaint, no uppercase transform or gold rule, top spacing 2. The task's provisional mono 12/textTertiary differs from the pinned source; followed its “source exact” precedence: `MyProfileView.swift:681–693` and section top padding at `:146–147,166–167,202–203`.
- [x] Group surfaces: plain surfaceCard/radius 16, full-width 1px borderSubtle dividers. Value rows: label body 11 regular, content body 16 semibold (two lines), 3px gap, 16×14 padding, minimum height 68, chevron 15/textDim. Title-only rows body 15 semibold/minimum height 52. `MyProfileView.swift:584–607,627–649,654–677`. Existing account actions and danger styling remain.
- [x] Appearance row now presents the same existing theme state horizontally with right-side three chips: body 13 semibold, min-height 34, horizontal padding 10, gap 6, selected gold500 text/14% fill/50% outline; unselected surfaceElevated/borderDefault/textMuted. `StudentKit/Sources/StudentKit/Features/MyProfile/AppearancePreferenceRow.swift:11–33,40–68`. Profile-local presentation uses unchanged `useTheme().setAppearance` persistence; files under settings/account remain untouched, and their generic PreferenceChip is unchanged.

Typography families/weights checked against `DesignSystem/Sources/DesignSystem/Tokens/Typography.swift:72–145`; existing RN design tokens suffice, so no design token changes were needed. Expo SDK 57 versioned reference read before edits: https://docs.expo.dev/versions/v57.0.0/.

### Validation

- Header rendering test: title precedes subtitle, no Eyebrow, subtitle spacing/typography; red (missing header module) then green. Logs: `/private/tmp/w3v-profile-header-red.log`, `/private/tmp/w3v-profile-header-green.log`.
- Existing profile model seam retained; new injury area/other/empty chip test red (missing function) then green. Profile copy assertions use `t(key)`. Logs: `/private/tmp/w3v-profile-injuries-red.log`, `/private/tmp/w3v-profile-tests.log`.
- `npm run lint`: exit 0, no warnings. `/private/tmp/w3v-profile-lint.log`.
- `npx tsc --noEmit`: exit 0. `/private/tmp/w3v-profile-tsc.log`.
- `npx jest --runInBand`: exit 0, **39 suites / 294 tests passed**, no snapshots. `/private/tmp/w3v-profile-jest-serial.log`. Initial parallel `npx jest` hit disk `ENOSPC` in two transform caches and two unrelated test timeouts; serial full rerun passed without changing those tests. Existing Expo Go remote-notification warnings remain.
- Android command: `EXPO_OFFLINE=1 CI=1 npx expo run:android --no-install --device meetpr` with documented PATH/JAVA_HOME/ANDROID_HOME. First attempt hit ENOSPC during icon generation. Removed only this attempt's newly generated ignored `android/` directory and retried: prebuild succeeded, then ADB daemon smartsocket startup was denied (`Operation not permitted`, exit 255). `/private/tmp/w3v-profile-android.log`, `/private/tmp/w3v-profile-android-retry.log`.
- **视觉对照 pass（逐项源码核对）；Android 运行与双端截图验收待完成。** No screenshot or native runtime pass is claimed. Generated native output remains ignored, outside the submitted diff. Chat live unread remains deferred with the existing chat integration gap.
- `git diff --check`: passed. Changed source is limited to `src/features/profile/**`; documentation updates are this JOURNAL entry and the student MyProfile PARITY row.
## 2026-09-05 — W3-v 成长页视觉对照修正

- 工作树 `feat/w3v-growth`，base `feat/w3c-charts`。代码仅改 `src/features/history/{GrowthScreen,GrowthScreenHeader,GrowthE1RMCard}.tsx` 与现有 `__tests__/growth-screen.test.tsx`；另更新本日志和 PARITY。无依赖/token/model/统计计算/图表几何改动；iOS 仓只读，未 commit/push，未运行 code-review 或技能安装流程。
- 已读 AGENTS、PLAN、growth-tab-v2、video-player-charts-v2 §4、RN 子组件与 design，以及 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。现场确认 `/Users/david/Projects/apps/MeetPR-release` HEAD = `202e95dbbf88baf5778f2329f206f34e117a4dd0`。下列 Swift 路径相对该仓 `Modules/StudentKit/Sources/StudentKit/Features/TrainingHistory/`，DesignSystem 路径相对 `Modules/DesignSystem/Sources/DesignSystem/`。

### 完成清单与源码依据

- [x] Header：`TrainingHistoryView.swift:313–335` 的 97×24 mark、44pt chat 圆按钮、display 34（默认 extraBold）、body 12 / textFaint 副标题、14 间距和副标题 −8 top。加载/失败也保留 header；页面横 20、顶 6、底 28，section 间距 14（同文件 65–78、131–178）。字标按 `Components/Brand/MeetPRMark.swift:13–62` 的 Archivo Black 16、负 tracking、R 负间距、八向 stroke + bgBase knockout 本地实现，无新图片依赖。
- [x] Chat：`Components/Buttons/HeaderChatButton.swift:23–78` 的 21pt message 图标、surfaceCard 圆底、右上 18pt unread 胶囊、99+ 显示和完整 a11y count；label 使用 `trainingHistoryView.copy012`。复用 Dashboard 的 `selectUnreadFeedbackCount`，扣除本页已经打开详情的 locallyRead 项，读后角标消失。**临时跳转**复用 `DashboardScreen.tsx:110–113` 的 `bumpFeedbackJump()` → `/(student)/growth`，定位反馈段；当前 base 的 Dashboard header 本身还是通知铃铛，并无可导入的同名 HeaderChatButton。W3-a 落地后两处统一指向 `/(student)/feedback`，本卡未提前创建路由。
- [x] e1RM 卡头：`GrowthE1RMCard.swift:18–83`：标题 mono 12 semibold / textSecondary；视觉胶囊高 22，外层触控高 44，左右 padding 10/5，mono 11，金色 10pt chevron；头行 top −9。数值 mono 38 bold，kg mono 15 semibold（空值同样有后缀），首次估算 mono 12，delta mono 13 bold / goldText。外壳零 gap、padding 16、radius 16、无阴影，chart 外围 top 8（同文件 107–114），没有修改图表组件或坐标。
- [x] formingProgress：核对 `GrowthEmptyStates.swift:43–100`，保留 bgInset / radius 10、横 12 竖 9、行间 9、点间 4、点 7×7、gold500 实心/borderStrong 空心和 body 12 tertiary + mono 12 primary 富文本；显式尾部省略，最多两行。126 状态区和 68pt 图高沿 W3-c 保留。
- [x] section：保留 `GrowthSectionLabel` 真正的 mono 13 / textSecondary（`TrainingHistoryView.swift:340–351`），没有使用 Eyebrow；不是任务概述猜测的 mono 12 / textTertiary。
- [x] stats 三格：同文件 463–503，改为左对齐、上方 body 11 / textMuted 标签、下方 mono 30 bold 数值、同基线 mono 12 semibold kg、gap 4/2、padding 16、radius 16；零训练沿既有测试契约保留三个 “—”，使用 textDim。容量只改显示为分组整数，不改变 Σ weight×reps 或日/周去重。
- [x] 历史/反馈入口：同文件 508–538，clock/message outline 19pt（金色）、40×40 surfaceRaised 图标底 / radius 12；body 15 bold 标题、body 12 muted 副标题、14pt textDim chevron；横 15 竖 14、minHeight 68、radius 16，保留禁用态 opacity 0.55。`VolumeIntensityChart.swift:11–47` 的现有外框与图例尺寸已核，无几何变更。

### “以源码为准”的差异裁决

- 任务文字所述“金边金字”与 pinned `GrowthE1RMCard.swift:35–47` 不一致：真实源码是 textSecondary 字、borderStrong 边、**仅箭头 gold500**。本次依源码修正尺寸/字体/箭头，不改成金边金字。
- 任务文字所述 display 数值/body 首次估算与源码 67–77 不一致：依源码使用 mono 38 bold / mono 12。Header display 34 的默认字重是 extraBold（`Tokens/Typography.swift:80–90`），没有沿旧 LargeTitleBar 的 Black。
- 任务文字所述单行省略与 `GrowthEmptyStates.swift:56` 的 `.lineLimit(2)` 不一致：依源码保留两行尾部省略。section mono 13 / textSecondary 同上。这些差异均在实施时告知，不把文字概述当作新视觉规范。

### 验证

- TDD 使用用户指定的 GrowthScreen 渲染 seam：header/mark/chat/副标题顺序/无 Eyebrow/反馈跳转测试先红（缺少 mark），后绿；扩充既有归档阅读测试，未读 a11y count/可见角标/读后清零先红后绿。现有 history、模型与图表测试保持通过。
- `npm run lint` exit 0，`npx tsc --noEmit` exit 0，`npx jest --runInBand --silent` 33 suites / 240 tests 全绿，`git diff --check` exit 0。类型检查发现 RN 0.86 不再提供 absoluteFillObject，已使用 absoluteFill 并重跑全部检查。
- 首轮 Jest 因临时盘 ENOSPC 未能完成，清理本次生成的 transform cache 后重跑成功，没有删除用户数据或其它工作树文件。
- 按要求设置 PATH/JAVA_HOME/ANDROID_HOME 执行 `npx expo run:android --no-install --no-bundler`：prebuild 成功、package.json 无变化；ADB 在 `tcp:5037` 启动监听时被沙箱拒绝（`could not install *smartsocket* listener: Operation not permitted`，exit 255）。本次生成的 gitignored android 目录已清理。
- **源码视觉对照 pass；Android AVD 亲眼走查和双端并排截图未完成。** PARITY 保留 🔨，未将源码/测试通过冒充截图验收；字标描边、Android 字体基线/两行截断和图标形状仍需 AVD 截图确认。
## W3-v — Dashboard / 训练 tab 视觉对照修正（2026-09-05）

### 范围与基线

- 工作目录 `meetpr-rn-wt-w3v-dt`，分支 `feat/w3v-dashboard-training`，开工 clean；仅修改 dashboard/training 展示层、必要 design 组件和本日志/PARITY。不 commit/push、不安装技能、不跑 code-review、不加依赖；video-upload/feedback/coach 与数据、推进制模块零改动。
- 已读 AGENTS、PLAN、`core-training-loop-v2.md` §3/4、指定 RN 页面、Eyebrow/LargeTitleBar/tokens，以及 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。iOS 仓只读，HEAD 核实为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`；未使用该仓已修改的翻译资源。
- 任务速记中的部分数值与 pin 源码不同；按“以 202e95db 源码为准”执行，下表明确记录实际取值，不把速记值当作源码事实。

### 逐项源码依据

| 项 | iOS 依据（StudentKit/Features，除特别注明） | RN 修正 |
| --- | --- | --- |
| Eyebrow 清理 | `DashboardTodayScreen.swift:181–184`、`DashboardPlanWaitingState.swift:74–80`、`DashboardPrimaryAction.swift:75`；`TodayWorkoutScreen.swift:731–740` | 两屏及等待/下一节分支不再使用 Eyebrow；e1RM 区标题 mono 12 textSecondary、等待小结 mono 13 textSecondary、下一节 mono 12 gold500。保留全部 copy key 与原大小写。design Eyebrow 保留并增加默认 `testID=eyebrow`，其它调用方不受影响。 |
| Header | `DashboardHeader.swift:13–66`；DesignSystem `HeaderChatButton.swift:27–89` 与 `Spacing.swift:43` | mark 97×24 与日期共用左对齐 row、gap 10；日期 mono 12 / tracking 0.72 / textMuted；外层 gap 15。headline display 54、状态胶囊 mono 12 bold / surfaceElevated / borderStrong，消息按钮顶对齐、红色 18pt 未读角标。pin 实际按钮是 44 圆（minimumHitTarget），不是任务速记 52。 |
| 周进度段 | `DashboardHeader.swift:128–195` | 高 4、gap 5、current 宽 1.5 倍，整段 gold500→gold400→gold300 横向渐变；done textPrimary、upcoming borderStrong；空段保留底条。原 RN 通用 GoldProgressBar 已有渐变，但 current 只填 50% 且色标不同；改为本屏完整分段，不改通用进度条。保留静态金色光晕，未移植 iOS 无限 brightness/pulse 动画。 |
| 反馈卡 | `DashboardFeedbackCard.swift:121–156, 266–312`；`DashboardFeedbackText.swift:23–28` | 左侧 3pt 金条；7pt 金点 + body 13 bold 标题 + mono 10 bold 未读胶囊 + body 12 灰色星期（day_date 优先）；折叠正文 body 14、两行、行距 4，展开正文 body 13；body 12 展开/收起链接带 chevron，1 条反馈也可展开；空态 key 保留。pin 胶囊为 goldText 底 / inkOnGold 字、正文 14，不是速记的深金字 / 15。沿用现有反馈数据顺序、展开 state 与导航回调；未移植 iOS 卡叠层/展开动画。 |
| 本周进度与格子 | `DashboardWeekCalendar.swift:28–104, 154–174, 217–230` | 标题 mono 13、计数 mono 11 bold，均 textSecondary；右侧 calendar 11 textDisabled + mono 11 textMuted（pin 非 body 12）；格子 gap 6、minHeight 58、radius 12；done ✓ success、current 7pt 实心金点 + gold@0.12 + 1.5 金边、upcoming 7pt 空心 ghost + bgInset。D# mono 10（current bold，其它 semibold），日期 mono 10 并保持单行缩放。 |
| 体重/比赛 | `DashboardProfileMetricsView.swift:92–208` | 两卡 flex 1 等宽、间距 11；体重标签 body 11 + 秤图标；数值 mono 24 bold + 独立 body 13 semibold ` kg`，无大写 KG。比赛卡斜向 gold@0.13→surfaceCard（0.62 stop）、gold@0.3 边、旗/火图标、mono 24 bold 数值与 body 13 单位。pin 并非 display 30 + mono 单位。 |
| 训练 hero | `TodayWorkoutScreen.swift:438–477, 546, 590–650, 731–789` | 删除 hero 上方的重复标签；list 仅卡内 copy017 display 22，统计与处方 mono 12 textTertiary，动作行序号 mono 11 bold 金底、动作 body 14 bold。两态共用 3pt gold300→400→500 竖条、bgInset、左直角/右 16、borderStrong，padding 16 + 左 3。recording 单位按 pin 为 mono 16 bold `KG`，目标标签 mono 11 semibold / tracking 0.55，历史参考 mono 12 textTertiary，组进度 body 12、教练备注标签 mono 11。 |
| 训练周列表 | `TodayWorkout/TrainingCalendarView.swift:50–64, 72–95, 121–169, 193–262` | 标题 mono 12 textSecondary / 计数 mono 11 textMuted；周头 W display 13、当前周 pill mono 10 bold / tracking 0.6 / goldText / gold@0.14（pin 非 11 / @0.12），周摘要与 mono 11 meta 在同一行。展开日行放入同一张 radius 14 卡；current 圆底 @0.12、选中行 @0.08、done check-circle；D# mono 12、摘要 mono 10、推荐日期 body 10。不改周筛选、展开/选中逻辑。 |
| 其它 mono 复核 | DesignSystem `ExerciseCard.swift:220–226`、`SetRow.swift:86–101, 137–140`；`TodayWorkoutScreen.swift:374` | 组表表头改 mono 10、序号 mono 13 bold、重量 mono 15 bold、次数/RPE mono 14；保留处方摘要 mono 10。训练页未读数 pin 为 mono 9 bold，保持。指定 pin 文件未发现 9.5；不新增虚构 token。CompletionControls 无需改动。 |

- 渐变由新增 `design/GradientFill` 复用现有 react-native-svg；独立 id 防止多卡色标串用，纯装饰 absolute fill，不接收触摸。不修改通用 GoldProgressBar、全局 typography 或其它屏的 token 值。
- 这张卡收口指定静态展示差异；未把源码复核当作 Android 截图验收，也未声称反馈动画、进度脉冲与整屏剩余布局已经像素级一致。

### 红绿与验证

- 用户已指定 seam：渲染后的 Dashboard header 同行顺序/testID，以及两屏 `queryAllByTestId('eyebrow')` 为空。新增 `visual-parity.test.tsx` 从真实页面入口渲染，保留实际 VM/Query/Zustand；仅替换网络与 native/router 边界，无内部页面组件 mock。覆盖 training list/recording，两态均需出现计划汇总，只有 list 出现卡内标题。
- Header 红态 `/private/tmp/w3v-header-red.log`（缺失同行节点），绿态 `/private/tmp/w3v-header-green.log`；Dashboard Eyebrow 红态 `/private/tmp/w3v-dashboard-red.log`；训练 Eyebrow 红态 `/private/tmp/w3v-training-red.log`（均检出非零 Eyebrow），绿态 `/private/tmp/w3v-training-green.log`；两态覆盖 `/private/tmp/w3v-states.log`。
- `npm run lint`、`npx tsc --noEmit` 通过；全量 `npx jest` 65 suites / 400 tests passed，既有 396 项保持绿。日志 `/private/tmp/w3v-{lint,tsc,jest}.log`。`git diff --check` 通过。
- `npx expo run:android --device meetpr --no-install` 已执行：prebuild 生成被忽略的本 worktree android/，package.json 无改动；随后 ADB 5037 smartsocket listener 因 sandbox `Operation not permitted` 失败。日志 `/private/tmp/w3v-android.log`。未完成原生 build/install、未取得 AVD 截图，不绕过沙箱。
- Android JS bundle：`npx expo export --platform android --output-dir /private/tmp/w3v-bundle` 成功，日志 `/private/tmp/w3v-bundle.log`；此结果不替代原生安装和视觉验收。
- PARITY Dashboard/TodayWorkout 追加 **“视觉对照 pass 待 AVD 截图验收”**，保留历史收货状态；本卡视觉 pass 未签收。

## W3-v — SetEntrySheet 组录入页视觉对齐（2026-09-05）

### 改动与边界

- 本卡工作目录 `meetpr-rn-wt-w3v-setsheet` / `feat/w3v-set-sheet`；开工 clean。已读 AGENTS、PLAN、最近三段 JOURNAL、visual-controls、design/i18n 加载器及 Expo SDK 57 versioned docs；旧 visual-controls 的红色/旧控件形制按本卡明确规格和最近 W3-v v3 tokens 覆盖。只读核对 iOS `202e95db` 的 SetEntrySheet、SetEntryRPE/RPEScale/Tests、MeetPRNumberPad、PlateVisual、VideoAttachmentV3Controls。
- SetEntrySheet 删除重复重量/次数 TextInput 卡、处方行、教练备注胶囊、绿色建议重量胶囊与 `/ side`；改为 PlateVisual → collar/breakdown → 单套重量/次数步进器 → RPE → 视频卡，固定 footer。重量建议副注保留百分比来源/解析原因，其它原因使用 copy002；自动重量虚线 `[2,3]` 描边、小标与手改退出状态沿用现有 reducer。
- 新 `design/plate-visual.ts` 提供 clamp→0.25 取整、单侧贪心拆片、聚合文案和七档尺寸；policy 仅改 `plateLoadout` 复用拆片/文案，保留 perSideKg，空片按空杠/赛扣分支。新 PlateVisual 使用现有 SVG 依赖，148pt 画布按高度整体缩放（本页 108），实现七色片、端盖/肩/套筒、八边形赛扣/螺母纹/拨杆/圆钮，强制 LTR；渐变与金属常量集中 tokens，5kg/2.5kg 指定色标随主题。
- 新 NumberPad 页内 absolute 覆盖层（zIndex 100）低于现有 OverlayHost 相机/回放（1000）；无额外 Modal。键盘从下滑入、遮罩/Cancel/空 Confirm 取消、Android 返回优先关闭 overlay 再关键盘；确认重量保留四分之一精度，用 String 写回以避免既有 formatWeight 的一位小数格式抹掉 `.25`。主项 floor20、辅项 floor0；次数确认 clamp1–100，步进 floor0。输入时底层内容从 a11y 树隐藏。
- 新 SetEntryRPEScale 使用纯 `set-entry-rpe.ts` 的 329pt×3pt 中心点几何、半步吸附、6pt 意图锁与释放策略。单一 PanResponder 负责点按/横拖写入，无刻度 Pressable；纵向 scroll 意图不写，横拖释放不重读触点；捕获关闭并允许 Android native ScrollView 接管。初次写入清除无处方 placeholder；气泡跟随并横向夹边；整卡 adjustable ±0.5。PanResponder.create 只保存事件回调，React Compiler 对传入 ref 回调有保守误报，因此仅该构造调用局部注明并关闭 `react-hooks/refs`，事件外没有读取/写入手势 ref，未修改任何守卫。
- VideoAttachmentControls 自带 surfaceCard 外观，choices/preparing/attached/failed 四态右侧控件、描边动作钮、可播放标题、发送/送达副注及错误行；无相机时仍显示 disabled Record；Change 直接相册。本地 isPreparing 覆盖选片至 store 发布记录的间隙，通过目标 store 记录变更订阅清除，异常/结束兜底清除。RN 的 store `preparing` 显示 Processing，`waiting` 显示 Sending；上传管线本身未改。
- Props 类型与 HEAD 逐字比较一致；`initialCamera` 在首次内容布局滚动到底部一次，后续用户滚动不被强制复位。`ensureSetLog`/`onSave` 请求组装、保存 guard、collar 回调、建议引擎及埋点保持原语义；`store.ts`/`manager.ts`/`native.ts`/`multipart.ts`、TodayWorkoutView、suggestion-gating、set-entry-weight 均零 diff。

### 文案与已知差异

- 已通过实际 `t()` 测试确认 DesignSystem numberPad/action/plate 段可访问；有片赛扣 a11y 优先使用 `designSystem.plate.withCollars %@`。业务文案全部复用已有 key，无新增 key、无 missing 标记；KG、数字、数学步长/分隔符和键帽符号按本卡/iOS 固定形式保留。RPE 与空值分别复用既有 `chat.rpeMetric` / `coach.videoFeedback.missingValue` 同义 key。
- 删除不再引用的 RnExtras key：`student.progression.releaseToConfirm`、`student.progression.perSide`。`student.progression.saving` 仍被 CompletionControls 使用，保留。
- 与 iOS 已知偏差：**杠铃 PlateVisual 无阴影；返回用 Android 箭头**；SF Symbols 使用指定 MaterialCommunityIcons。RN baseline 对齐使用 Yoga `baseline`；未移植 iOS RPE 条/数字过渡与触觉反馈。PlateVisual 局部片角半径按本卡显式 2pt（当前公共 radius.micro 为4，未改公共 token）。窄屏/大字体动作文案允许在同一横排内压缩换行，44pt 命中高度保留，实际布局待 AVD 核实。
- 本卡环境明确无 ADB，不运行依赖设备的 expo run:android；未获得模拟器截图，不声称视觉一比一验收通过。PARITY 新增独立 SetEntrySheet 行，状态 🔨。

### 红绿、检查与审查

- 用户预先指定纯函数 seam，逐片 red→green：plateBreakdown、breakdownText、seDimensions、plateLoadout、append、snapped、RPE snap/index、中心点/边界/窄条、意图锁/松手、条高/亮条。红态记录 `/private/tmp/setsheet-{plate,breakdown,dimensions,policy,append,snapped,rpe-snap,rpe-geometry,rpe-intent,rpe-bars}-red.log`。
- `npm run lint` 与 `npx tsc --noEmit` 通过（本次没有 hovered 残余类型错误）；全量 `npx jest` **68 suites / 411 tests** 通过，既有 set-entry-weight、video-upload、overlay-host、suggestion-gating、两条 i18n 守卫与 tokens 守卫保持绿。日志 `/private/tmp/setsheet-{lint,tsc,jest}.log`；`git diff --check` 通过。
- 本地 Standards 核对：范围白名单、tokens/字体/i18n、Props 与受保护文件；Spec 核对：结构顺序、几何数值、状态/键盘层级、手势单一写入和保留管线。完整 code-review 技能未启动：缺 `docs/agents/issue-tracker.md`，已按技能原文要求告知需由用户调用 `$setup-matt-pocock-skills`；未静默配置，也未用本地自查冒充双 agent 审查。
- 未 commit/push、未增加依赖、未改 node_modules symlink。

## W3-v — 训练 tab 顶部当前周周历条（2026-09-05）

- 工作树 `feat/w3v-training-strip` / `meetpr-rn-wt-w3v-strip`；已读 AGENTS、PLAN、上段 W3-v 与 W1-h R4、`core-training-loop-v2.md` §训练 tab 和指定两屏。通过文档工具读取 [Expo v57.0.0 文档](https://docs.expo.dev/versions/v57.0.0/)；终端操作离线、不使用 ADB、不加依赖、不改 node_modules symlink、不 commit/push。
- 新增 `dashboard/WeekCalendar.tsx`，提供 progress/currentWeek 两种头部，共用单行推荐日期标签，头部至格子 gap 10。progress 保留原头部样式；currentWeek 使用 W# display14、当前周胶囊 mono10 bold / tracking 0.6 / goldText / gold500@0.14，右侧计数、1×10 分隔线、推荐日期。空 cells 返回 null。
- Dashboard 替换内联周历块。为避免新组件与 DashboardScreen 循环导入，额外将原 `WeekGrid` 完整迁入新文件并从旧入口兼容导出；已用源码逐字节比较确认格子函数未变，58 高、12 圆角、current 描边、字体与点击行为原样保留。这是“仅替换内联块”之外的组件归属调整，无额外展示变更。
- 训练条以 `currentWeekDays(plan.days)` 决定周号，调用已导出的 `progressSegments(weekDays, cursor?.id)` 构造状态，与 Dashboard `todayModel().segments` / 周格子共用同一函数；仅映射为既有 WeekGrid 形状并用 `recommendedDate` 填推荐日期，不增加第二套状态算法、不改数据层。点击沿用 `selectDay(id)`；无计划、当前周为空或 loading 时不显示。
- 顺序核对：现有页头 nav → ScrollView 首块当前周条 → 非 current 序列提示 → WorkoutBody（hero / 动作列表）→ 完成区 → TrainingCalendarView。原有条件 PRBanner 保留在条后、正文前。页头本身与 hero/动作列表/完成控件/底部周列表未改。ScrollView 块间距 **12 → 13**，顶部 **16 → 6**，底部 **120 → 28**，水平保持 `spacing.base = 16`。
- TDD 使用用户指定 WeekCalendar seam：currentWeek 文案/计数、progress 文案/计数、两态推荐文案、两态空 cells 共 4 项，分片红绿；首项初始因缺组件红，修正测试 fixture 日期补零后绿。红绿证据 `/private/tmp/w3v-strip-{current,progress,empty}-{red,green}.log`。既有整屏渲染测试追加 list/recording 的条目顺序断言，接线前两态均因缺当前周条红，接线后绿；日志 `/private/tmp/w3v-strip-integration-{red,green}.log`。
- 验证：全量 `npx jest --runInBand` **67 suites / 417 tests 通过**，包含 dashboard/training、两条 i18n 守卫与 tokens 守卫；`npx tsc --noEmit` 无诊断（本轮没有 hovered 错误）。lint 首次发现兼容导出位置导致的两条 import/first warning，移至 import 后重跑 `npm run lint` 无诊断；最终定向 2 suites / 8 tests 通过。日志 `/private/tmp/w3v-strip-{jest,tsc,lint}.log`。WeekGrid 原样迁移核对与 `git diff --check` 通过。
- 本地 Standards 核对：新增样式使用 useColors/font、复用翻译 key，无依赖或数据层变更；Spec 核对：两种头部、共享推进状态、空/加载隐藏及正文顺序符合卡面，格子迁移如上单列。正式 code-review 技能因缺 `docs/agents/issue-tracker.md` 未启动，已告知用户需 `$setup-matt-pocock-skills`，未静默生成配置。
- 本卡明确沙箱无 ADB，未运行 Android 安装、未获取截图；PARITY 仅追加顶部周历条顺序对齐说明，设备视觉验收仍待可用 AVD 环境完成。
## W3-v — ReadinessCheckinSheet 对齐与肌群线值修正（2026-09-05）

### 范围与正典

- 工作目录 `meetpr-rn-wt-w3v-readiness`，分支 `feat/w3v-readiness`，开工 clean。只改 ReadinessSheet、READINESS_MUSCLES、MuscleFatigueSchema 的 enum、相关测试和本日志/PARITY；不 commit/push、不加依赖、不动 node_modules symlink，TodayWorkoutView 调用与 Props 不变。
- 已读 AGENTS、PLAN、JOURNAL 最近两段、指定 RN 文件及 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。本机 iOS HEAD 核实为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`；全文只读核对 ReadinessCheckinSheet.swift、ReadinessCheckin.swift、MuscleGroup.swift、Spacing.swift。
- David 续判确认：网格最小宽 92、gap 4；393pt 屏扣左右各 12 后排三列，与其 iOS 模拟器截图一致，不强制四列。

### 实装

- 先修线值：按 iOS allowedMuscleGroups 顺序使用 `quad/hamstring/glute/back/chest/shoulder/triceps/core`；copy020–027 不变；MuscleFatigueSchema 收紧为这八项 enum。提交按白名单生成非零疲劳项，清空后不发送该肌群。
- Modal 保持全屏及禁用返回关闭；Skip 仍写 per-student/day 本地标记、FlowCancel 埋点并调用 onSkip。导航标题改 copy001 插值 step，body17 semibold 居中；Skip 为 body17 textMuted。
- ScrollView padding 12，题块 gap 24，题目与量表 gap 4。量表为左右 56 宽锚文案及五个 30 圆，gap 8；小于等于当前值填 gold500，当前值 2pt bgBase 内描边，其余 surfaceElevated。删除卡片、数字及独立端点行；a11y 使用 copy012。
- 第二步标题 body17、说明 body13；网格按实际容器 onLayout 自适应等宽，min 92/gap 4。chip 名称 body13，严重度 mono12 semibold 点行，零级空格保高；圆角 md，语义底/字/边色及 gold500 的 0.12/0.4 透明度；copy019 a11y，循环 0→1→2→3→0。
- footer 固定在 ScrollView 外，bgBase/padding12。Next 右对齐、非全宽，三项未填满禁用；提交兜底 copy001 保留。Back 使用非全宽 secondary，Done 使用非全宽 primary，提交中 loading；失败为 alert-outline + body13 dangerMuted，成功仍 onComplete。

### 红绿与验证

- 按用户指定公共 seam 使用 tdd：常量顺序红→绿、schema 拒绝旧 quads 红→绿、Next 门控/第二步标题红→绿、chip a11y/点行循环红→绿。对应日志 `/private/tmp/w3v-readiness-{constants,schema,step,chips}-{red,green}.log`。
- 提交 payload 测试加入时已因前述线值修复变绿；另暂时注入旧 quads 验证其敏感性，测试确实因 payload 收到 quads 而失败，随即恢复，日志 `/private/tmp/w3v-readiness-payload-mutation.log`。该检查是回归敏感性验证，不冒充原始 red→green。
- 新增两个测试文件共 8 项：上述行为与完整八项 payload、清空/无疲劳合法提交、失败重试保留答案、提交中禁用/loading。保留真实翻译/AppButton，按卡要求 mock useSubmitReadiness，AsyncStorage 使用官方 Jest mock。
- 首轮全量测试揭示旧 domain-schemas fixture 仍用 quads；仅将该 fixture/期望改为 quad。首轮 tsc 揭示新测试 key 数组需 as const，已修正。
- 最终 `npm run lint` exit 0（0 errors/warnings）、`npx tsc --noEmit` exit 0（无需忽略 hovered 或其它类型错误）、`npx jest` exit 0：**68 suites / 421 tests passed**。training 全部测试、两条 i18n 守卫和 tokens 守卫均绿。日志 `/private/tmp/w3v-readiness-{lint,tsc,jest}.log`；`git diff --check` 通过。
- 人工分轴核对：Standards——修改范围、语义颜色/字体、正典翻译调用符合本卡；Spec——逐项核对两步形制、线值与原行为，未发现剩余实现缺项。正式 code-review 技能流程未启动：该技能要求的 `docs/agents/issue-tracker.md` 缺失，已告知需由用户调用 `$setup-matt-pocock-skills`，未静默搭建 tracker 或运行双 agent review。
- 按本卡无 ADB 环境约束，未运行 expo run:android、未取得 Android 模拟器截图。源码核对及 Jest 不替代原生视觉验收；PARITY 保留 🔨 并标记待 AVD 截图验收。
## W3-b — 学员端 VideoBadge 角标浮层与 scrim（2026-09-05）

### 改动清单

- 基线：worktree `meetpr-rn-wt-w3b-badge` / `feat/w3b-video-badge`，开工 HEAD `d762620320490ce270279c6a38fbd0d8faf9d9e0`，工作区 clean。已读 AGENTS、PLAN、W3-a 日志、`video-player-charts-v2.md` §1.3–1.4 / §2 全文与调用点，并通过外部文档工具读取 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。没有 commit/push、增加依赖或更改 node_modules symlink。
- `badge-presentation.ts`：`presentBadge` trim 字符串并隐藏空值；weight/RPE 只接受有限数，以 en-US、无分组、0–1 位小数展示；hasLoad 用 weightText/reps 判定，零值保留；setOrdinal 原样透传。
- `badge-palette.ts`：固定 VideoBadgePalette，不入 tokens、不跟主题。`VideoBadgeLogoMark` 用 100×100 SVG 的琥珀圆盘、轨道弧、趋势折线、淡下划线和实心点。
- `VideoBadgeCard`：width/468 缩放所有卡内几何与字体；品牌头/组号、单行动作名、重量与次数、RPE 胶囊按参照实现，空字段隐藏，en 空 suffix 不生成 Text；署名仅在 includesCoachAttribution 且 coachName 非空时存在。屏上始终传 false。
- `VideoBadgeScrim`：复用已有 SVG GradientFill，绝对定位容器底部 44%，#050507 的 alpha 0→0.72；不接触摸且隐藏无障碍子树。
- `VideoBadgeOverlay` / `FeedbackVideoPlayer`：badge 非空才铺 scrim/角标；角标区 flex 贪心、底部居中、底距 13，卡宽容器宽×468/540，无上限；中央自绘按钮保留独立 center 层，角标与 center 使用 box-none。角标在打点面板/进度条之前，未改 markers、scrub、seek 逻辑；标注帧遮盖且禁用 controls 的触摸/无障碍。expanded 在播放器会话内持有，默认 true，不持久化；收起为 44 logo；allowsExpansion=false 恒收起、不可点且无障碍隐藏，仅预留，不接教练。
- `FeedbackPlaybackModal`：复用 W3-a 的 StudentVideos 查询关联 item.id，用 `feedbackVideoBadge` 将字串 weight/rpe 经 Number + finite 检查转换，缺失/非法置 null；动作名沿用 summary 的 trim 逻辑；set_index 在此展示映射 +1；无关联视频不传 badge，coachName=null。
- **⚖️David 本会话明确批准的 additive DTO 例外**：当前仓实际无 CoachFeedbackVideo，W3-a 使用的 StudentVideoSchema 原本无 rpe。因此仅在 `src/api/domains/videos.ts` 追加 `rpe: z.string().nullish()`，保留其余字段和请求不变；旧响应缺字段仍能解码，新响应 RPE 字串可到达展示边界。
- `VideoPlayback` / `VideoAttachmentControls` 只加 badge prop 透传；`SetEntrySheet` 只在现有 VideoAttachmentControls 调用增加 badge 对象，使用 exerciseName、当前 weightText/repsText/rpeText、draft.setIndex+1、coachName=null；未动其他视觉或输入/上传逻辑。

### 与 iOS 的已知偏差 / 待验收

- **⚖️David 2026-09-05：安卓 v1 不做角标烧录导出，播放器完全没有导出按钮**；不加 disabled 占位或导出权限流程。旧参照 §2.7 的“待拍板”由本次裁决覆盖。
- iOS 字标 PNG 在 Android 按本卡要求用 MeetPRMark 风格的 SVG 描边文字，填 ink、不做反色镂空；字体栅格化与 PNG 存在平台差异。
- 收起 logo 阴影用 RN shadowColor=black / opacity=.38 / radius=9 / offset y=4，加 Android elevation=9；Android elevation 的投影算法不等同 SwiftUI shadow，实际形状和浓度需设备截图核对。
- 沙箱无 ADB，本卡未运行原生 build/install 或截图，不重复尝试受限 ADB。横竖屏实际排版、长动作名缩放、打点面板较高时的布局、中央按钮/角标触摸区域与 TalkBack 仍需 AVD `meetpr` 验收；PARITY 保留 🔨。

### 红绿与验证

- 用户事先指定的三个 seam：presentBadge、真实 FeedbackVideoPlayer 的角标交互、反馈视频纯映射。先红后绿日志：`/private/tmp/w3b-presentation-red.log`、`w3b-numbers-red.log`、`w3b-overlay-red.log`、`w3b-scrim-red.log`、`w3b-mapping-red.log`；绿态及补充会话重置/标注帧回归见 `w3b-overlay-green.log`、`w3b-overlay-regression.log`。
- UI 测试仅替换 native Video/SafeArea/AsyncStorage 边界，保留真实播放器、角标组件、字体、翻译与标注选择逻辑。反馈测试从真实 StudentVideoSchema 解码至 badge，锁定 set_index=1→setOrdinal=2、100.00→100、8.0→8，并覆盖老响应缺 rpe 与无关联视频。
- 最终命令结果与审查结论见下。
- `npm run lint`：exit 0，0 errors / 0 warnings，日志 `/private/tmp/w3b-lint.log`。
- `npx tsc --noEmit`：exit 0，日志 `/private/tmp/w3b-tsc.log`；本次没有遗留或忽略 hovered 类型错误。
- 全量 `npx jest --runInBand`：exit 0，**71 suites / 431 tests passed**，包括原 video-player / feedback / video-upload、两条 i18n 守卫和 tokens 守卫，日志 `/private/tmp/w3b-jest.log`。新增 20 tests；`git diff --check` 通过。
- code-review 两轴独立子代理审查未提交工作区相对开工 HEAD 的 diff（包括新增文件）：**Standards 0 findings / Spec 0 findings**。仓库缺少 `docs/agents/issue-tracker.md`，已按技能提示用户运行 `/setup-matt-pocock-skills`；本次直接使用会话需求与已给定参照审查，没有创建 tracker 配置，也没有提交以迁就 committed-diff 流程。

## W3-v — Dashboard 教练反馈卡折叠叠层 / 展开行→详情（2026-09-05）

- 工作树 `feat/w3v-feedback-card` / `meetpr-rn-wt-w3v-feedback-card`，开工 clean；仅修改指定 dashboard 组件/model、测试、JOURNAL/PARITY。不 commit/push、不加依赖、不改 node_modules symlink、反馈 DTO、收件箱或详情屏。
- 已读 AGENTS、PLAN、JOURNAL 最近两段、指定 Dashboard/feedback 源码，以及本机 iOS `DashboardFeedbackCard.swift` 全文和 `DashboardFeedbackText.swift`。通过文档工具读取 [Expo SDK v57.0.0 文档](https://docs.expo.dev/versions/v57.0.0/)，终端验证离线，不使用 ADB。
- 抽出 `FeedbackCard.tsx`，保留原 props 并新增 `onOpenItem(item)`。RN 原 `pending` 为未读计数，没有 iOS 独立 pending presentation 分支；保持未读胶囊语义与 `copy007` 空态。状态仍为组件内 useState，直接切换，无高度 tween、rise-in 或持久化。
- 折叠整卡单 Pressable / `copy002(N)` a11y：按 posted_at 倒序取最新未读，否则最新；星期取该条 day_date 优先的既有 Intl 短星期。正文 body14 / lineHeight18 / 两行；底部 copy001(N) + 下箭头。表面 h16/v14、圆角12、3pt gold500 竖条；两层分别 bgStack / surfaceKey（内缩7、下移5）与 bgInset / surfaceKey（内缩14、下移11），外层底部预留11。
- 展开头部可折叠，右侧 copy005 + 上箭头，无星期；容器 h15/bottom4、无叠层。倒序各行展示 body13 semibold 标签、6pt 未读金点、copy006 + 右箭头，正文 body13 单行；行 v10、gap3、顶部1pt borderSubtle。移除教练名/相对时间。行点击 push `/(student)/feedback/{id}`，由原详情 `[feedbackId]` 与 markRead 接手；其它 openFeedback（消息按钮、等待态）不变。
- 用户确认 RN DTO 缺 iOS 内嵌 video 后，授权 Dashboard 展示层拼接：直接复用 W3-a 的 `useStudentVideos(studentId)` 与 `feedbackVideoAssociation(video_id, videos)`，不新增读口或关联算法。仅展示类型 `DashboardFeedbackItem` 可带 video，wire DTO 不变。`feedbackLabel` 复用 exerciseDisplayName，以现有 StudentVideo.exercise_name 作为可用名称；无关联用 copy001，有关联但名称缺失/视频暂不可用用 copy002，有 set_index 用 copy003 且仅显示层 +1。现有视频 DTO 没有 name_en，不伪造英文名称字段。
- TDD 使用指定组件与纯函数 seam，逐片先红后绿：最新未读预览、展开/倒序/金点/收起、原 item 回调、标签三分支与 set_index=0 边界；覆盖全已读、初始空态、展开后变空不残留 Collapse。在既有 Dashboard 渲染测试补视频读口关联、详情路径与消息按钮原路径断言。测试仅 mock native/router/network 边界，实际组件、关联函数和 Query 行为参与验证。
- 红绿日志：`/private/tmp/w3v-feedback-{collapsed,expand,open,label-none,label-video,label-set,row-label,navigation,empty}-{red,green}.log`。初期修正 test-renderer Pressable memo/host 选择器后继续验证真实交互；未使用实现快照或改翻译迎合断言。
- 本地 Standards 核对：颜色来自 useColors 语义 token、字体使用 font.body/mono、文案沿用指定 i18n key，改动范围符合约束。Spec 核对：叠层尺寸、头部收起、排序/未读优先、逐行标签与详情接线均符合卡面；发现展开后空态残留 Collapse，补红测后已修正。正式 code-review 因缺 `docs/agents/issue-tracker.md` 未启动；已按技能告知需 `$setup-matt-pocock-skills`，未静默配置。
- 沙箱无 ADB，未运行 Android 安装或取得截图；PARITY Dashboard 行已追加“W3-v:反馈卡折叠叠层/展开行→详情”，本卡视觉验收仍待可用 AVD 环境。
- 最终验证：`npm run lint` exit 0、无诊断；`npx tsc --noEmit` exit 0、无诊断（本轮无 hovered 错误）；全量 `npx jest` **68 suites / 428 tests passed**，含所有 dashboard 测试、`no-literal-zh` / `no-i18n-todo` 两条 i18n 守卫与 tokens 守卫。日志 `/private/tmp/w3v-feedback-{lint,tsc,jest}.log`；`git diff --check` 通过。
## 2026-09-05 — G0-c Global auth

- Card: `card-g0c-global-auth.md`; references: `global-auth.md` §§1–6 and `design-tokens-v3.md` §4. Read Expo SDK 57 versioned documentation before coding. Only this worktree changed; no install, commit, or push. The supplied package.json/package-lock.json dependency changes were preserved.
- Global is the default build track and API host; China retains its original host and CN form. Dynamic Expo config enables cleartext only for China and registers the inverted Google client scheme only for Global. `.env.example` contains a blank public Google client ID.
- Added nullable-phone/email user decoding, challenge/Google/email/register/recovery clients, all specified backend error codes, and three session actions through the existing authenticate generation guard and credential cleanup. Per-user AsyncStorage timezone reporting covers registration/Google, email login, bootstrap, and foreground changes; concurrent reports coalesce and failures are silent.
- Added Global login, registration, and two-step recovery screens using the existing v3 components, exact English copy, UTF-8 password validation, six ASCII digit code filtering, and a three-second bottom toast. Global forms remain mounted during authentication; CN behavior and CN tests are unchanged. AuthSession uses code + S256 PKCE, browser cancellation is silent, and the native intent filter leaves OAuth callbacks to AuthSession rather than routing them to an unmatched screen.

### Tests (written first)

Initial red run: all five named suites failed (6 failed tests; three suites could not load missing modules). After implementing their seams: 5 suites / 50 tests passed.

- `src/api/__tests__/auth-global.test.ts`: `accepts a Global user with nullable phone and email`; `registers email with the fixed student role and device timezone`; `accepts an empty 204 password reset request response`; `classifies the AUTH_EMAIL_TAKEN error envelope`.
- `src/features/auth/__tests__/validation.test.ts`: `email %s is valid: %s`; `password boundary %#`; `reset code %s` (single @, domain segments, trimmed email length, 7/8 characters, 72/73 UTF-8 bytes including multibyte/emoji, and six ASCII digits).
- `src/features/auth/__tests__/error-copy.test.ts`: `%s error copy` for every specified code; `fallback %#` for transport/server/decoding errors; `Google cancellation has no toast`.
- `src/api/__tests__/timezone-report.test.ts`: `email login reports a changed device timezone exactly once`; `email login does not report the same timezone`; `timezone PATCH failure does not fail email login or mark it reported`.
- `src/config/__tests__/build-track.test.ts`: `track %s` for unset/global and China environments.

Final requested checks:

- `npm run lint`: exit 0, no warnings or errors.
- `npx tsc --noEmit`: exit 0, no output.
- `npx jest`: exit 0; 31 passed / 31 suites; 228 passed / 228 tests; 0 snapshots; 3.235 s.
- Global/China `expo config --json` checks with a synthetic public client ID: Global `[meetpr, com.googleusercontent.apps.123-example]` and cleartext false; China `[meetpr]` and cleartext true.
- Offline Android Hermes export succeeded. Generated main Android manifest explicitly has `android:usesCleartextTraffic="false"`.
- `EXPO_OFFLINE=1 npx expo run:android --no-install`: prebuild succeeded, then exit 1 because ADB could not install its smartsocket listener (`Operation not permitted`, child exit 255). No emulator walkthrough or screenshots; PARITY remains implemented, not visually verified. Generated Android directory is ignored by git.
- Live Global backend and Google sign-in were not exercised: sandbox network restriction and card-documented external Google client / backend multiple-audience prerequisites. No credentials were requested or printed.
- Local review checked Standards (scope, CN preservation, v3 components, no dependencies added by this run) and Spec (wire format, exact copy, route behavior, build flags, timezone handling). Formal code-review skill workflow was unavailable because `docs/agents/issue-tracker.md` is absent; requires user invocation of `$setup-matt-pocock-skills`. No tracker scaffolding was created.

### Changed files

- `.env.example`, `app.config.ts`, `app.json`, `PARITY.md`, `docs/CODEX-JOURNAL.md`.
- `src/config/build-track.ts`, `src/config/__tests__/build-track.test.ts`.
- `src/api/auth.ts`, `src/api/client.ts`, `src/api/session.ts`, `src/api/timezone-store.ts`, `src/api/__tests__/auth-global.test.ts`, `src/api/__tests__/timezone-report.test.ts`.
- `src/app/_layout.tsx`, `src/app/login.tsx`, `src/app/register.tsx`, `src/app/forgot-password.tsx`, `src/app/+native-intent.tsx`.
- `src/design/Toast.tsx`.
- `src/features/auth/AuthForm.tsx`, `src/features/auth/GlobalLoginScreen.tsx`, `src/features/auth/GlobalRegisterScreen.tsx`, `src/features/auth/GlobalForgotPasswordScreen.tsx`, `src/features/auth/google-oauth.ts`, `src/features/auth/validation.ts`, `src/features/auth/error-copy.ts`, `src/features/auth/__tests__/validation.test.ts`, `src/features/auth/__tests__/error-copy.test.ts`.
- Pre-existing user changes preserved: `package.json`, `package-lock.json`.

### Claude 收货补记 G0-c(2026-09-05)

- 直改一处:`src/analytics/client.ts` `confirmPrivacyNotice` 不再 await 首次上送(iOS 口径:确认即放行,上送 best-effort);加 `waitForFlush` 选项供测试等待。模拟器上 DNS 故障时该 await 曾让隐私弹层的「知道了」永久禁用。
- 模拟器(重启后指定 DNS)亲验:Global 登录页全部元素;「Forgot password?」两步在 api.meetpr.app 上 204 → 进入 6 位码 + 新密码步。Google 通道待 David 建 Android OAuth client + backend #277 部署后再实测。

## W3-v — 训练完成流（庆祝页 / 训练回顾）与组间休息条（2026-09-05）

- 范围：`feat/w3v-completion` / `meetpr-rn-wt-w3v-completion`；开工 clean。已读 AGENTS、PLAN、最近三条日志与指定 RN/iOS 源码；iOS HEAD 核实 `202e95dbbf88baf5778f2329f206f34e117a4dd0`，只读。已读取 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。不 commit/push、不加依赖、不动 node_modules symlink、API/DTO、hold-to-complete、SetEntrySheet、WeekCalendar。
- `completion-presentation.ts` 移植 `WorkoutCompletionPresentation`：完成/失败口径、总次数/容量、主项与整体 RPE、处方 ±0.5 比较、(重量, 次数) 最佳组与严格 PR、教练/周日/日期/增幅/meta 文案。失败组计入完成总数、容量、RPE 和最佳组，庆祝成功数才排除失败；无历史基线 PR=false。RN PlanDay 不含 scheduledDate 或动作名称，增加纯展示输入 `date`、`exerciseNames`，调用端复用 recommendedDate / exerciseTitle / 已有 metadata resolver，日期星期复用现有 formatter。历史基线从已有 historyQuery 日志取成功且非 assumed 的最佳重量/次数，排除当前 planDay 动作日志；不把 e1RM 数字误当实际重量。
- 精度：已保存日志优先取原始 decimal；synthesizeDrafts 的显示字符串只留一位小数，不能用其重算回顾。未提供实际 RPE 时使用未舍入处方。无 sourceLog 的 draft 仍取录入字符串再回退处方；容量 en-US 千分位 0–2 位，主项整数平均不补小数，非整数与总体平均按一位小数四舍五入。
- `WorkoutCelebrationView`：静态奖章 SVG、底部椭圆 gold 渐变、教练回执、双列终值、meta、详细报告/完成两入口；streak 分支保留，v1 传 null。按 **spec 082：装饰动效全删**，无 rise-in/fade/ticker/光晕动画，阶段与 Modal 切换也不做动画。只保留按钮按压反馈和休息结束轻震动。`CelebrationEffects.swift` 终态 bloom 与 18 个 sparks 均透明，仅转写 96×104 奖章的两条 ribbon、58/44 圆和 checkmark 到 110×110 效果区。
- `CompletionControls`：单个 fullScreen Modal 内 celebration/review 两阶段；回顾改页头+教练胶囊、纵向渐变总容量卡与四格、条件 PR 行、逐动作表现与状态、三栏私密反思、固定底部 CTA。删旧 Done 右上按钮、大标题、独立最重组卡和旧统计卡。反思字段继续 goal/achieved/improve，输入即用现有 writeReview 保存，串行写入避免旧保存覆盖新内容；尚未完成回顾时保留已有 completedAt 或空字符串，finish 才写新时间戳，等待之前的保存后关闭并 navigate Today。Android 系统返回也走同一 finish，失败可重试，重复 finish 忽略。RnExtras 仅删除已无引用的 completedSets / privateNote 两 key。
- TodayWorkout 接线仅变完成阶段 state/props、结算成功进入 celebration、横幅进入 review、回顾保存和 finish；`WorkoutLogSave` 沿用原 date/sets。失败结算不展示完成流、undo 不开启庆祝；完成日保持 pinned dayID，避免服务端推进 cursor 后展示下一天。横幅改用 successRGB 的 14% / 40% 底/边，保留 16 padding、body16/13、11 chevron。
- RestTimer：surfaceElevated / radius md、左右 16 底 4、h16/v8、mono22 倒计时、金色图标、三颗描边小钮、remaining/total 高4金色条；Skip 改 `restTimerOverlay.copy001` 并按 iOS 立即关闭；无 Rest 标签或 💪，数字无过渡。自然结束轻震动一次、3s 后收起。新增卸载清理延迟关闭，避免旧计时器清掉后续实例；首次说明弹层 JSX 与样式不变。倒计时单独带完整 a11y label，操作钮仍可独立聚焦。

### 红绿与验证

- 使用 tdd 技能，用户指定 seam 已确认，无重复询问。分片红绿日志 `/private/tmp/w3v-completion-{presentation,exercises,copy,flow,rest,rest-expiry,precision,rpe-fallback}-*.log`；flow 首次绿跑修正 test-renderer 查找（AppButton 的 native button 按 accessibilityRole/Label 查，不假定 Pressable wrapper）。新增纯计算 12、两阶段 flow 3、休息条 4；真实 TodayWorkout 入口另外 3 个集成测试，网络/native/router 边界替换，组件/Query/store 保留。
- 集成覆盖成功结算→庆祝→完成→writeReview/Today 导航，横幅直进 review、反思即时持久化并重开读取、失败结算不打开流；flow 覆盖 review 完成、失败行 danger、等待反思写入、庆祝直接完成/防重复。休息条覆盖 Skip/a11y、±30/进度、震动一次/3秒关闭、卸载取消。
- `npm run lint` 通过、0 errors / warnings；`npx tsc --noEmit` 通过，本轮无 hovered 诊断；全量 `npx jest --runInBand` **71 suites / 439 tests 通过**，包括 training、两条 i18n 守卫与 tokens 守卫。日志 `/private/tmp/w3v-completion-{lint,tsc,jest}.log`。最后收敛休息条 progress 复用/a11y/小钮间距后，定向 4 tests、lint、tsc 与 git diff --check 再次通过（`/private/tmp/w3v-completion-rest-final.log`）。入口测试 mutation cache 使用 gcTime Infinity 并随 QueryClient 清理，避免测试结束后的默认 GC timeout 挂住进程。

### 本地核对与未验项

- Standards：限定文件、useColors/font、已有 svg/GradientFill、翻译 key、存储契约与不提交约束核对通过；无新增依赖和 DTO 变更。正式 code-review 技能要求 `docs/agents/issue-tracker.md`，仓内缺失；已告知需用户调用 `$setup-matt-pocock-skills`，未运行正式双 agent 审查、未静默配置。本段是本地核对，不冒充该技能结果。
- Spec：计算/两阶段/触发收尾/回顾布局/休息条按卡面接线；静态奖励终态按正典源码转写。**色彩限制**：RN 没有 iOS celebrationRibbonStart、celebrationMedalBottom；在不改 tokens 的范围内分别复用 gold500、gold700；medalInset 与 ring 使用已有 holdTrack、gold200（暗色与正典对应），阴影用静态 radial fill。上述专用渐变色及原生阴影不声明像素相等；待 AVD 对照。
- 本卡明确沙箱无 ADB，未运行 expo run:android、未获取模拟器截图、未做原生视觉验收。PARITY TodayWorkout 追加“W3-v:庆祝页/回顾页/休息条对齐 iOS;动效按 082 静态”，保留待截图标识。
## 2026-09-05 — W3-v Global auth visual parity

- Card: W3-v, `feat/w3v-global-auth`, T1; working baseline `7a8a137ca01accc451323a17e25a76472badb9bc`. Read AGENTS, PLAN, G0-c journal, `global-auth.md` §3, the local iOS GlobalAuth views/components, AuthSecureField and MeetPRMark, and Expo SDK 57 versioned docs before coding. Where the old reference prose differs, this card and the iOS source define the visual target.
- Shared top-aligned ScrollView retains KeyboardAvoidingView and adopts h24/top44/bottom26 padding, max width 520, outlined SVG wordmark, display44 hero, 44×3 gold rule and SVG radial gold background. All three screens use separate field boxes, semantic colors/fonts, password visibility controls and the dedicated 54-high gold CTA. Login uses a monochrome globe Google button, mono separator, plain gold links and inline privacy copy; Android SiwA remains omitted.
- Errors now render inline between fields and CTA using unchanged `globalAuthErrorMessage`. Reset success replaces the route with `/login` plus a `passwordReset=1` flag; login consumes the flag and shows the success copy once per arrival. A subsequent action/error replaces the success notice. Email blur validation, password validity and submission gates, request payloads, Google OAuth and session actions remain unchanged; password error/helper/placeholder presentation follows this card.
- Only the allowed auth components, new `MeetPRMark` and its barrel export, screen tests and the two delivery documents changed. `TextField`, `AppButton`, `Toast`, API/session/OAuth/validation/error-copy files were not modified. All requested tokens already existed. Stack header titles were already correct, so route files and `_layout.tsx` needed no change. `GradientFill.tsx` is absent from this baseline. No dependencies added; the pre-existing `node_modules` symlink was untouched; no commit/push.

### Tests — red before green

Added `src/features/auth/__tests__/global-auth-screens.test.tsx` through the user-approved screen seam with mocked session/OAuth/network/navigation boundaries and real visual components. Each vertical slice failed for its missing behavior before implementation, then passed:

- Login copy, initially disabled Sign in and password show/hide.
- Invalid email on blur, correction, enabled submission and mapped login failure inline with no `showToast` call.
- Registration subtitle, helper/placeholder/error copy and account-taken failure inline.
- Recovery Send code → unlabelled code input / Reset password, six ASCII digit filtering, unchanged reset payload and invalid-code error inline.
- Reset success route flag, login success notice and no replay on remount.
- Privacy URL failure replaces a prior reset-success notice inline rather than hiding the error.

Final checks after all source/test edits:

- `npm run lint`: exit 0, no warnings/errors.
- `npx tsc --noEmit`: exit 0, no generated-file exceptions needed.
- `npx jest --runInBand --silent`: exit 0; 32/32 suites, 234/234 tests. Includes existing auth validation/error-copy, API auth-global, new six screen tests and tokens guard.
- The two i18n guards are absent from this g0c baseline; David explicitly confirmed they belong to the later G0-b/i18n sweep branch and should be skipped for this card. Auth English literals retain the G0-c / reference §3 exception; no replacement guards added.
- Android emulator/screenshot and live backend verification were not attempted under the stated no-ADB/network sandbox constraint. PARITY remains implemented (`🔨`), awaiting visual walkthrough evidence.

### Local review

- Standards: checked scope, semantic token/font use, shared auth-only components, no dependency or forbidden-file changes. No remaining local findings.
- Spec: checked all ten visual requirements, retained requests/validation, inline error placement, reset notice consumption, existing Android headers and SiwA omission. No remaining source-level findings; Android visual parity still needs screenshots.
- Formal `code-review` skill workflow could not run because `docs/agents/issue-tracker.md` is missing. Its SKILL.md requires “If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`.” This was reported; no tracker scaffolding or formal parallel review was performed. The two axes above are a local review, not that formal workflow.

## W3-s — 学员端教练聊天（2026-09-05）

### 范围与改动清单

- Worktree `feat/w3s-student-chat`，开工 HEAD `1d35c8bbef93ca3e5a850ac97621926b49f023c7`，开工 clean；无 commit/push、不加依赖、不动 node_modules symlink。已读 AGENTS、PLAN、W2-c 与最近两段日志、指定 RN/iOS 文件；iOS 只读 HEAD 核实为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`。已读取 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。
- 新增 `chat/StudentConversationScreen.tsx`、`student-timeline.ts`、`open-coach-chat.ts` 与 `(student)/chat.tsx`；`(student)/_layout.tsx` 注册隐藏路由，选中 chat 时不绘制底栏。使用普通全屏路由，播放器仍是一个顶层 Modal，聊天本身不加 Modal。
- **入口按用户追加裁决收窄为 Dashboard/Training 两处页头**：只替换 onPress、禁用状态与角标来源，其他视觉、反馈卡/收件箱入口不变。当前 Growth/Profile 仍为占位屏，用户明确要求不动；**Growth/Profile 入口待其他分支合流后另卡接线**。
- `useOpenCoachChat` 取 accepted bind 的 coach_id，open 后带 conversationId/coachName navigate；同步 ref 锁防重复打开。独立 student-chat Query cache，30s 轮询、后台停用、回前台失效；仅当前绑定教练会话计数。未读合计 = 未看计划 1 + 反馈未读 + 聊天未读，保持 `useFeedbackInboxViewModel` 语义。计划复用 Dashboard 的 published selector、当前周算法、AsyncStorage 签名和 markDashboardPlanSeen。
- 屏内按时间与字符串 ID 合并消息/未看计划/反馈；黑金主题 header、空态、初次加载失败/重试、日期、文字/image 占位气泡、训练分享卡、计划卡、反馈/视频封面、pending/失败重试与纯文字 composer（4000 上限、1–5 行、无加号）。分享卡支持本卡明确要求的 `kind=set_ref`，兼容 iOS 解码后的 `text + set_ref`；显示动作/重量次数/RPE/组号/备注/视频和送达状态。
- `api/domains/chat.ts` 只补 SetRefV1 zod 结构和校验；decimal 保持 string，日期/版本/来源 ID/组号/次数范围/未知字段不合法时降级为 null，不让整页解析失败。未改 wire key 与其他 DTO，也未改教练端屏。
- 同步复用 `createConversationSync`：进入强刷、30s 轮询、回前台强刷、离屏 stop；since_seq 连续取完增量页，before_seq 历史分页，发送不推进抓取游标。read 回包取消旧列表查询后更新同一份页头 cache；other_last_read 按 seq 更新已读。pending 重试复用 client_id、轮询确认后消除相同 client_id 的 pending，发送成功触发同步。
- 行 onLayout + ScrollView viewport 计算反馈自高可见比例，≥55% 才发 read；同屏会话内同 ID 请求复用，视频点击与可见性共用去重。首个未读反馈底部定位；无未读到末项；近底跟随；历史加载锁定首个可见 ID 及相对偏移后恢复。首次原生 onScroll 不冒充用户拖动，避免覆盖初始未读锚点；离屏历史页/分享视频迟到结果按 focus generation 拒收。
- 视频复用 W3-a `FeedbackVideoPlayer` / `FeedbackPlaybackSession` / markers 读取与失败处理，分享视频通过消息页刷新签名 URL。当前 W3-b 未实装，按卡面不传 badge。
- 新增测试 `chat/__tests__/student-timeline.test.ts`、`student-conversation-screen.test.tsx`、`student-set-ref.test.ts`；Dashboard `visual-parity.test.tsx` 加两处真实页头开聊集成测试。更新本日志与 PARITY StudentChat 行。

### 与 iOS 的已知偏差 / 待收口

- **已收口：后端绑定失效三态映射。** iOS `NetworkChatRepository.swift:254` 的线值是 HTTP 403 / `CHAT_BIND_REQUIRED`。用户追加明确授权应用 `/private/tmp/w3s-chat-bind-required.patch`：在 `src/api/client.ts` 的已知错误码列表仅增加 `CHAT_BIND_REQUIRED`，在 `src/api/__tests__/api-auth-session.test.ts` 仅增加一条 HTTP contract test。这是**超出原文件白名单、经用户授权的最小 additive 变更**；未扩大其他 403 的映射。先只加测试跑红（原行为为 network / code undefined），再补错误码跑绿，证据 `/private/tmp/w3s-bind-code-{red,green}.log`。HTTP 响应中的错误码现在可到达现有 copy003/004 分支；未进行生产网络请求。
- 本卡按用户指定用**计划发布时间**（published_at，缺省 created_at）排序，iOS 当前 coordinator 的 occurredAt 是 plan.startDate；已看计划不出现。
- RN StudentVideo DTO 没有 durationSeconds/duration_seconds，且本卡禁止改视频 DTO；封面显示规定的 `—:—`，不虚构时长。formatter 已覆盖 `0:08` / `1:05` / 未知；动作/组号使用服务端已有可选扩展字段，缺失按 copy001 回退。
- iOS SF Symbols 改为已有 MaterialCommunityIcons，使用 useColors 语义色与 font.body/mono；播放器沿用 W3-a 原生实现。没有 Android 画面证据，不声明像素验收完成。

### 红绿与验证

- 使用 tdd 技能；本卡已明确公开 seam，不重复请求确认。按合并 → 可见比例 → 标签时长 → 未读合计 → 空会话 → 消息已读 → 反馈 → 计划 → 发送/重试 → 失败 → cache → 开聊 → 历史 → set-ref → 可见已读逐片红绿，日志 `/private/tmp/w3s-*-{red,green}.log`。补测首次原生滚动抢锚点先红再绿：`w3s-initial-native-scroll-{red,green}.log`。
- 全量 `npx jest --runInBand`：**74 suites / 466 tests 通过**，包含 dashboard / training / feedback / chat、两条 i18n 守卫和 tokens 守卫；追加错误码补丁后已重跑全量 lint / tsc / jest；日志 `/private/tmp/w3s-final-jest.log`。屏测试另覆盖三态 Alert（API 边界 mock；另有 HTTP 错误码保留 contract test）、开聊防重入、未读只计当前教练、分页恢复、回前台排空增量页、视频播放器/markers。
- `npm run lint` 无 errors / warnings（`/private/tmp/w3s-final-lint.log`）；`npx tsc --noEmit` 通过（`/private/tmp/w3s-final-tsc.log`，本轮无 hovered 诊断）；`git diff --check` 通过。
- 本地 Standards 核对：限定文件（加上本卡对应测试/台账及用户授权的 client.ts 最小 additive 变更）、tokens/font/翻译键、无新增依赖、无 coach 屏或其他域 DTO 变更、无 commit/push。Spec 核对：绑定错误码已按追加授权收口，Growth/Profile 按用户追补另卡，其余已实现；视频时长/原生视觉限制单列。
- 正式 code-review 技能要求 `docs/agents/issue-tracker.md`，本仓缺失；已告知需用户调用 `$setup-matt-pocock-skills`。未静默生成配置、未运行正式双 agent 审查；上段仅为本地核对。
- 用户明确本卡沙箱无 ADB；未运行 `expo run:android`、未取得 AVD `meetpr` 截图、未做原生视觉验收。PARITY 保持 🔨。

### Out of Scope（原卡原文，另卡）

- 组分享(set-ref sharing):hero 的「Ask coach」按钮、输入框左侧「＋」、`SetRefSharePicker`、staged set-ref 条与长度计数——本卡**不渲染「＋」**,composer 只有输入框 + 发送圆钮。
- 图片发送(iOS `sendImage` 学员端也没有入口)。
- 实时 WebSocket(iOS `ChatRealtimeRouter`);沿用 30 s 轮询 + 回前台刷新(与教练端 `createConversationSync` 一致)。
- 推送深链。
## W3-d — 教练工作台内嵌播放器与教练角标（2026-09-05）

### 范围与依据

- Worktree `meetpr-rn-wt-w3d-workbench-player` / `feat/w3d-workbench-player`，开工 HEAD `8c24914a73382ee4908e94c3cde2cd3ae852494b`，工作区 clean。未 commit/push、未加依赖、未更改 node_modules symlink。
- 已读 AGENTS、PLAN、W2-c/W3-a/W3-b 日志、参照包 `docs/w3-reference/video-player-charts-v2.md` §0.2/0.7/1.4/1.5/2.4、指定 RN 文件与本机 iOS Swift 正典；已通过外部文档工具读取 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。用户给定的 iOS `Features/VideoFeedback/VideoFeedbackDetailView.swift` 路径不存在，实际只读路径为 `Features/Receiving/VideoFeedbackDetailView.swift`，同时读了 `VideoFeedbackPlayerCard.swift`。
- **口径冲突以本卡明确要求为准**：本机 Swift 与参照 §0.4 的工作台 Slider 仍为 gold500、时间 textDisabled；本卡明确要求白色轨道系与白色 70% 时间字，因此工作台用白色填充/拇指、白色 20% 底轨、白色 70% 时间字，保持 Swift workbench 的零 padding/零背景与 mono11。全屏分支保持原金色轨道和原 padding。

### 实装

- `FeedbackVideoPlayer` 新增默认 `fullScreen` 的 `layout`、秒单位 `onProgress`、`onAddMarker`，以及外部标注选择/关闭接口；既有学员调用点不变。共享 session 继续负责 Video、250ms native position 轮询、80ms scrub seek/generation、重试与标注选择。
- `FeedbackVideoWorkbenchPlayer.tsx` 为工作台展示分支：外壳 gap11/padding12/textPrimary/radius16；270 高舞台、videoStageFill/videoStageBorder、radius10/1px 边；Video 不接触摸，按 scrim→56 圆钮→标注覆盖层→恒收起角标叠放。复用角标内部 13pt 底距，容器下移 3pt 得工作台 10pt；角标禁用交互并隐藏无障碍。四段等宽倍速分段器与仅有回调时出现的 Add marker 描边钮，字体用 font，新增颜色全从 useColors 语义 token 取得。
- workbench 初始暂停；暂停时选择倍速只保存下一次播放速率，播放/等待时即时应用。末尾点击先 seek0 再播；重试换 URL 保留会话倍速、关闭标注、重置进度并立即播，换链等待期间新选的倍速也生效。共享失败卡在工作台用深色舞台底/白字；全屏保持原失败卡外观。
- `VideoWorkbenchPlayer` 移除原生 controls、surfaceFocus 舞台、可 seek 时间 chips 与 Pill 重试，改为 DTO 展示映射薄封装；初次 URL loading/failed 也用工作台舞台与共享失败卡。`markers === null` 不向共享播放器传 Add marker。现有 slice/上传/markers API/DTO 均未改。
- `VideoFeedbackScreen` 用 PendingVideo 动作名、现有 SetLog 的重量/次数/RPE/set_index+1、当前 session 教练 name 组 badge；屏上不显示教练署名。Add marker 在打开原 sheet 时冻结 `max(0, round(seconds*1000))`，保存仍走现有秒入参 slice。播放 URL 续签直接走现有 uploadsRepository.url，避免重置外层 session/倍速。
- 教练列表普通行改为 View，无按钮角色或点击；有标注行 pause+seek 后在舞台内显示共享覆盖层，移除独立标注 Modal。选择按 id 关联当前 markers 新实例，同 id 新签名不重复 seek，移除后清空选择；图片失败关闭后恰好一次 refresh，旧 URL 错误和同 marker 关闭后重开的旧图片错误均不能影响当前覆盖层。
- 两个舞台 token 本来就存在，`tokens.ts` 未改。**⚖️无导出**：没有导出按钮、占位、权限/确认流程或“已存入相册”toast；原有发送反馈成功 toast 保留。

### 红绿、验证与审查限制

- 使用 tdd skill，seam 沿用本卡用户已指定的共享播放器、教练封装及教练列表；系统边界 mock 为 native Video/SafeArea/AsyncStorage/SecureStore、路由与 fetch，Screen 测试保留真实 slice、DTO 解码、查询缓存和共享播放器。新增 3 suites / 10 tests。
- 红绿记录：`/private/tmp/w3d-playback-{red,green}.log`、`w3d-controls-{red,green}.log`、`w3d-progress-{red,green}.log`、`w3d-wrapper-{red,green}.log`、`w3d-screen-{red,green}.log`、`w3d-annotation-{red,green}.log`、`w3d-retry-rate-{red,green}.log`、`w3d-reopen-{red,green}.log`；暂停倍速红态 `w3d-rate-red.log`，绿态见 targeted/final Jest。
- 覆盖初始 paused、中央切换/末尾重播、四段速度/暂停选速/重试中改速、条件 Add marker、无关闭键/打点面板/导出、恒收起角标、进度回调、coach 角标映射（set_index=1→2）、12.3456s→12346ms、普通行不可点/标注行 pause+seek、同 id URL 更新/删除清选择/旧图片事件拒收。
- `npm run lint`：exit 0，0 errors / 0 warnings，`/private/tmp/w3d-lint.log`。
- `npx tsc --noEmit`：exit 0，`/private/tmp/w3d-tsc.log`；本次无需忽略 hovered 或 typed-routes 类型错误。
- `npx jest --runInBand`：exit 0，**74 suites / 441 tests passed**，含原 video-player/coach 测试、两条 i18n 守卫与 tokens 守卫，`/private/tmp/w3d-jest.log`。
- `git diff --check` 通过。按 Standards 自查：修改路径在白名单内，无依赖/DTO/API/i18n catalog/token 扩张；按 Spec 自查：工作台布局/交互/角标/标注与本卡对应，记录了白色 scrubber 的明确覆盖口径。
- **正式 code-review 双子代理工作流未运行**：已读 `/Users/david/.codex/skills/code-review/SKILL.md`，其中要求 “If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`.”；本仓缺失该配置，已提示用户调用 `$setup-matt-pocock-skills`，未擅自创建 tracker，也未把自查声称为独立双轴 review。
- 沙箱无 ADB，本卡未重复尝试原生 build/install 或截图。270 舞台实际排版、Video/标注/scrim/logo 的 Fabric 叠层与触摸、TalkBack、长文案/横竖屏、原生缓冲与末尾状态仍待 AVD `meetpr` 截图验收。PARITY 的 CoachVideoPlayer 行标 🔨，注明「W3-d 工作台形态;⚖️无导出」。

## W3-s2 — 学员端组分享（2026-09-05）

### 范围与正典

- Worktree `feat/w3s-setref`，开工 HEAD `b5fc967a4a50f0c51a19fddd551d6acc447caeab`，开工 clean。只改卡面白名单与对应测试/守卫/台账；不加依赖、不改上传管线或教练端、不动 node_modules symlink、无 commit/push。
- 已读 AGENTS、PLAN、JOURNAL W3-s/W2-c、指定 RN 文件与本机 iOS SetRefV1/formatter/picker/presentation/send coordinator/card/Today sharing source/入口/NetworkChatRepository。只读 iOS HEAD 为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`；已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。追加核对 `StudentPlanProjection` 与 `PrescribedSet.rpe`：处方组号来自 `set_number`，legacy RPE 0 合法，区间/百分比/RIR 不冒充 RPE。
- 用户后续明确要求跳过 code-review 技能与 issue-tracker 配置；本卡未执行该技能、未生成配置、未派 review 子 agent。

### 实装

- `chatRepository.sendSetRef` 复用已有 `ChatSetRefSchema`，发送 `POST /conversations/:id/messages`，body 为 `{ kind: 'text', body, client_id, set_ref, video_id? }`。快照仍是驼峰字段，decimal 保持字符串；保留接收端 `ChatSetRefSchema.nullish().catch(null)` 整条快照降级语义，不另造 schema。
- `set-ref.ts` 提供中文正典首行/body、独立 i18n display 首行、十进制源字符串规范化与既有 schema 校验、UTF-16 4000 上限、候选构造、picker 状态机、四条件入口策略、精确 note 解析。note 保留 nil / 显式空串 / 非空三态；body 不匹配正典首行或 `首行\n` 时按普通文字呈现。保留 W3-s 已有 `kind=set_ref` 兼容；新发送统一 `kind=text`。
- 中文正典字面量仅放 `set-ref.ts` 的 `CANONICAL` 常量。`no-literal-zh` 增加**仅该文件**的豁免：这是与 iOS/plan-web 共用的消息协议线值，不是 UI 文案。其余新增 UI 全用既有 ChatUI/StudentKit key，颜色用 `useColors()`，字体用 `font.*`。
- 两入口共用 picker 数据源：读取当前计划 cursor day、设备训练日的日志与动作 catalog。logged 按后台完成时间倒序，并列按动作序/组序倒序；包含已有日志、重复记录、额外组与无剩余处方的动作。planned 按动作序/处方组号，排除已记录槽位，非法处方跳过；logged 非法数据保留行并显示 invalidSetRecord，确认时拒绝。消息日期使用计划日 scheduled/recommended date，与 iOS 一致；日志筛选使用实际 gym day。
- Modal 选组器实现加载、空态、加载失败、logged/planned 分节、默认当前 hero log 或首条、选择→确认→返回、视频默认开关、失败视频禁用、确认防重入与会话级 staged store。Android 系统返回关闭；确认 stage 后关闭，由训练入口导航、聊天入口留在当前会话。
- Training hero 右上 Ask coach 使用 36 高胶囊/44 命中区、准备 spinner。可编辑日、有组、有 accepted coach、聊天上下文可用四条件同时成立才显示。现有 `useOpenCoachChat.openCoachChat()` 会直接导航且不返回 ID，按文件白名单不改该模块：hero 在 `TodayWorkoutView` 调同一 `chatRepository.open` 并同步同一 conversations cache，取得 ID 后先开 picker，确认后才导航。原页头聊天行为保持；失败显示 trainingShareConversationFailed，离屏迟到结果不打开 picker。
- Chat composer 增加 34 圆形＋入口、staged 哑铃/摘要/移除条、可选备注 placeholder、错误与包含正典首行的 UTF-16 计数。有 staged 时备注可空，超长禁发；发送成功清 staged/原备注，新输入的文字不被迟到回包擦除。pending 重试固定 body/client_id/已解析 video_id；轮询发现相同 client_id 也确认并清 staged，覆盖 HTTP 回包丢失。
- 上传 store 在本卡生产代码中只读/订阅，不改上传流程。ready 直接携带 video_id；pending/preparing/uploading/waiting 等待该本地记录 uploaded；failed/removed/replaced 显示对应错误，移除 staged 可取消等待，卸载释放订阅。RN 的 attachmentId 属于可续期的远端上传会话，pending 也可能为空或旧 ID，因此冻结 `recordKey + createdAt` 作为本地附件身份，完成后取最新 attachmentId；远端会话 ID 更新不误判为更换视频。确认阶段同样处理“选择时 uploading、确认时已 uploaded”的竞态。
- 训练分享卡精修 3/4 宽、lg/md radius、两侧 gold 竖条、HH:mm、重量内嵌小号 kg、play-box 按钮、备注底与我方送达条；不匹配 body 不再近似剥离首行。

### 测试与验证

- 按卡面五组公开 seam 使用 TDD；红绿证据位于 `/private/tmp/w3s2-*-{red,green}.log`，覆盖 formatter/normalize/body、候选与状态机、wire send、picker、staged composer、入口可见性，并补确认竞态、上传会话续期、轮询确认、无处方日志的红绿回归。
- 纯函数测试覆盖三条 iOS 字面首行、有无备注、en/zh 摘要、非法组号/total/date/reps/decimal、100.00→100/8.0→8、4000/4001 UTF-16、候选顺序与 total/排除/video 三态、处方原组号与 legacy 0 RPE、note 三态和错配降级。
- UI/发送测试覆盖空态/加载失败/系统返回/选择返回确认、固定 client_id staging、uploading 默认开/failed 关且禁用、确认时完成和重复确认、staged placeholder/可空发送/成功清理、视频等待/失败/移除/替换/续期、HTTP 重试不变的 body/client_id/video_id、超长禁发、聊天＋真实 picker、轮询回执确认；训练覆盖 16 行可见性真值表、不可编辑 hero 不显示、Ask coach→picker→staged→聊天与会话失败 Alert。
- Android：按用户明确的沙箱无 ADB 约束，未运行 `expo run:android`，无 AVD `meetpr` 截图或原生视觉验收证据。PARITY 保持 🔨，不得记为已走查对齐。

- 最终 `npx jest --runInBand`：**77 suites / 511 tests 全通过**，含现有 chat/training、两条 i18n 守卫与 tokens 守卫；日志 `/private/tmp/w3s2-final-jest.log`。
- `npm run lint`：无 errors / warnings（`/private/tmp/w3s2-final-lint.log`）；`npx tsc --noEmit`：通过且无生成文件诊断（`/private/tmp/w3s2-final-tsc.log`）；`git diff --check`：通过。

### W3-s2 收货修正（Claude，2026-09-05）
- AVD 首发即失败：后端 `SetRefV1Schema` 是 **snake_case、`.strict()`、每个字段必填可空**（`exercise_name/set_number/set_total/weight_kg/reps/reps_max/rpe/day_date/set_log_id/plan_set_id`，仅 `v` 保持），iOS 靠 `MeetPRCodec` 的 `convertToSnakeCase` 落到同一形状；RN 之前收发都按 camelCase → 发送 400 `Unrecognized key(s)`，接收端 iOS 发来的组卡也会整条降级成文字。修法：`chat.ts` 新增 `SetRefWireSchema` + `toSetRefWire`（显式 `null`，不省字段）与 `ChatSetRefFromWireSchema`（wire→camel→原 `ChatSetRefSchema` 校验），内部类型不动。staging 探针：camelCase → `VALIDATION_ERROR Unrecognized key(s)`；snake_case → 只剩 `plan_set_id must identify …`（假 id）。
## W3-c — 教练详情成长卡 E1RMChart（2026-09-05）

### 范围与依据

- Worktree `meetpr-rn-wt-w3c-coach-chart` / `feat/w3c-coach-chart`，开工 HEAD `470e0a2d03b7be2ccf9a03e3a5f75b1a86507da5`，工作区 clean。已读 AGENTS、PLAN、PARITY、W2-b JOURNAL、`video-player-charts-v2.md` §4.1、`coach-v2.md` 110–125 行和指定本机 iOS E1RMChart / StudentGrowthView 正典；通过外部文档工具读取 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。开工时无 W3-c JOURNAL 段，指定的学员侧 `history/charts/{growth-geometry.ts,GrowthE1RMChart.tsx}` 在本 worktree 不存在，因此新增独立几何，没有修改或复制学员侧图表。
- 未 commit/push，未加依赖，未修改 node_modules symlink、DTO/API、tokens 或翻译 catalog。所需语义色与翻译 key 全部已存在。`kg` 保留 iOS/原组件的单位记号，其他文案均调用 t(key)，无 i18n TODO。

### 实装与数值

- `design/e1rm-chart.ts` 提供 yDomain/yTicks/xTicks/monotonePath/lineSegments/symbolRadius。Y padding = max(range×0.15, 5)，空为 [0,100]；整数刻度优选 3–4 个，候选步长为十进数量级上的 1/2/3/4/5/10，全部落在 domain 内。X 从去重且排序后的实际日期中等索引间隔取最多四个，保留首尾，单日期不重复。
- 新 `design/E1RMChart.tsx`，默认高 90，onLayout 获取实际宽度，不使用会缩放线宽/散点/字体的固定 viewBox。Y 标签区 `max(28, 最长整数字符数×6+8)` pt（常见 28–32），plot 左侧再留 4、右 4、顶 4；底部日期区 14，plot 与日期区间再留 4，90 高时 plot 的 y=4…72（高 68）。首尾 X 标签分别向内对齐，单日期散点/标签居中。
- Y 横网格 borderSubtle/1pt；两轴 mono10 medium/textMuted，X 无网格，月日使用 `designSystem.date.monthDay %@ %@` 与本地日历。相邻点各一段；curve 用共享相邻切线的 monotone 三次 Hermite（同号斜率调和平均，拐点切线零，同日期竖线），step 为 H→V 的 stepEnd。logged 线 chartLine/0.8、1.2pt、round，圆点面积 36→r=3.3851pt，全宽下不拉伸。
- 保留 points 与 smoothed/rawEligible 两种入参、origin/confidence/winnerPointID/marksRecord/lineInterpolation/onSelect 类型。imported 线按终点来源用 textTertiary/0.8、dash[5,3]，normal imported 散点 0.65；low diamond 面积24、0.35。教练映射只传 id/date/e1RMKg，默认 logged/normal，无虚线、标注、图例或点击行为。按本卡允许，记录点面积46/日期与 callout、imported 图例、nearest-point onSelect 行为仅留签名与普通 TODO，未启用。a11y 使用主线点数及单点专用 key，SVG 子树隐藏且不接触摸。
- GrowthSection 已替换三主项卡 Sparkline，id=`family-date`，DATE 字串通过既有 localDate 按设备日历解析，值 Number 转换。总卡 padding16/gap7，标题 mono12 textDisabled，display34/白数值 + baseline body13 textDisabled kg，沿用 Progress 高5/radius.micro/白填充与白底约14%；底行 body11 textDisabled、右侧 mono11。主项卡两个方向显式 padding15（覆盖 Card 原来的14/16），gap6；标题 mono12 semibold textSecondary，display30 + baseline body13 kg，无值 body15 semibold textTertiary，趋势 mono16 bold 对应 success/textTertiary/danger，new/unknown 无箭头；卡间距10。
- GrowthSection 新增 state/onRetry：loading 居中 spinner/top32；failed body15 semibold textTertiary 居中文案 + 现有主色 AppButton/coach.detail.retry；全空同字级与颜色、top32。StudentDetailScreen 成长段直接传 stats/state/onRetry，三态样式集中在 GrowthSection，重试沿用 model.growth.refetch()。

### 接线授权与视觉验收

- **⚖️David 本会话明确批准的白名单扩展**：`StudentDetailScreen.tsx` 仅修改成长段一处表达式（diff 1 行增/1 行删），将原三态条件替换为 GrowthSection 的 stats/state/onRetry 接线。没有修改其他屏幕段、全局 Loading/Empty 或 hook；加载/失败态现在已到达屏幕，接线无待确认事项。
- 沙箱无 ADB，未尝试原生 build/install、截图或把组件测试当作视觉验收。Swift Charts 自动刻度与本实现的实际日期采样/整数步长可能不同；monotone 采用连续三次曲线，本机 Swift 以每两点一个 series 声明 LineMark。刻度分布、字体基线、极窄屏标签、TalkBack 与最终90pt观感需 AVD `meetpr` 对照 iOS 截图；PARITY 保留 🔨。

### 红绿、检查与审查

- 使用 tdd skill；测试 seam 由用户预先指定。逐片红→绿证据 `/private/tmp/w3c-{domain,yticks,xticks,path,radius,cards,failure,states,padding}-{red,green}.log`。新增3 suites/14 tests，覆盖 Y domain、整数刻度、四日期/稀疏日期、单/双/三点路径与拐点、重复日期、分段曲线/stepEnd、面积换半径，三卡接线/无点隐藏、重试/加载/空态、Card padding，真实 SVG 轴/线/散点/单数 a11y/en-zh 日期。
- 接线完成后重跑：`npm run lint` exit0，无 errors/warnings，`/private/tmp/w3c-final-lint.log`；`npx tsc --noEmit` exit0，`/private/tmp/w3c-final-tsc.log`，没有忽略 hovered/typed-routes 错误。全量 `npx jest --runInBand` **77 suites / 455 tests passed**，包括 coach、两条 i18n 守卫、tokens 守卫，`/private/tmp/w3c-final-jest.log`。此前负时区 `TZ=America/Los_Angeles` 两个 UI suites/8 tests 通过，`/private/tmp/w3c-timezone.log`。`git diff --check` 通过。
- Standards 自查：原白名单及用户明确批准的 Screen 单处接线、语义 token/font/t(key)、无新依赖或 DTO 改动；修正了 Card 的 padding 简写无法覆盖既有轴向 padding 的问题。Spec 自查：图表、卡片及加载/失败/空态均已接；记录点/图例/选择行为按用户允许预留；视觉未验收。
- 正式 code-review 双代理工作流未启动：已读 `/Users/david/.codex/skills/code-review/SKILL.md`，要求 “If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`.”；本仓缺失该配置，已提示用户调用 `$setup-matt-pocock-skills`，未静默创建 tracker。上述自查不冒充独立双轴审查。


## W3-s3 — 教练端会话对齐（2026-09-05）

### 范围与正典

- Worktree `feat/w3s3-coach-conversation`，开工 clean；已读 AGENTS、PLAN、W2-c/W3-s/W3-s2 日志、指定 RN 与 iOS 正典文件；本机 iOS HEAD 为 `202e95dbbf88baf5778f2329f206f34e117a4dd0`。已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。
- 按用户给定组件 seam 使用 tdd，逐片红绿；遵照本卡指令跳过正式 code-review 技能与 issue-tracker 配置，不问配置、不生成配置、不派子 agent。无 commit/push、不加依赖、不动 node_modules symlink、不改 API/DTO/路由。
- 气泡色遵照卡面明确要求，取 `ConversationView` init 默认 `goldCTA` / `surfaceElevated`；本机 `CoachConversationDestination` 实际另传 `textPrimary` / `borderHairline`，此差异已在施工中说明。既有 goldCTA/goldSoft/白字 token 均可复用；仅补 `chatImageBackground` 对应 `ChatFullScreenImage` 的恒黑背景。

### 实装

- 教练页头：44×44 chevron 返回、居中姓名/body16 bold、已知状态 body11 danger/success 副标题、无状态不渲染，边界分割线 `borderDefault`。
- 时间线：16 padding/8 行距、初始贴底、近底 followLatest 与新 pending 跟随；首次原生滚动不覆盖初始定位。顶部 spinner sentinel 自动加载 before_seq 历史页，锁住首个可见消息 ID 与相对偏移，等待该行新布局后恢复，避免抢用旧坐标；分页使用 ref 防重入与 focus generation 拒收迟到结果。
- 定向文字气泡 body14、h12/v8、16 圆角与 5 尾角、对侧至少 32 留白；仅自己的普通文字显示 body12 read/delivered，other_last_read 单调推进。失败横幅 body13/goldCTA/goldSoft；空态和加载失败态按卡面图标/字号，加载态 spinner 与文案。
- pending 在时间线右侧显示 0.72 气泡、clock/sending 或 goldCTA retry，失败重试冻结原文字/client_id，保留新草稿；轮询确认同 client_id 后删除 pending，HTTP 随后失败不会复活错误行。
- compactPill：外 h12/v8、surfaceCard、borderDefault 胶囊、gap6、右 padding5、body14/1–5 行/4000 上限；34 圆形 arrow-up 发送键、空白禁用/0.65 透明度/发送 spinner，无附件入口。
- `StudentSetChatCard` 原样提取为 `ChatSetCard.tsx`，仅增加 `chat.setCard.<id>` testID；保留 75% 宽、lg radius、方向金条、HH:mm、内嵌 kg、视频键、备注与自己的送达 footer。学员/教练共用；教练仅 text+合法 presentation 转卡，outgoing=false，不泄露正典首行或额外送达文案。
- 将学员组分享视频的消息 URL 刷新/选择/离屏拒收提取为同文件 `useChatSetPlayback`。学员反馈专用 `useStudentChatPlayback`（feedback read/markers）保持原位；学员其余视觉与行为不变。教练复用全屏 `FeedbackVideoPlayer`，失败用现有播放错误呈现。
- `conversation-model.feedbackVideoBadge` 从 set_ref 组装数值指标与组序，教练传 `includesCoachAttribution=false`。**用户追加裁决：现有播放器 badge 是 W3-b 预留参数，本卡只组装并传参，待 W3-b 合流显示；不扩播放器文件。**
- 图片消息 75% 宽/4:3，加载 spinner 与失败占位，点开恒黑全屏并支持 close/Android 返回。保留 FullScreenDestination、initialDraft、收件箱 read 回包 cache 写回、30s 轮询与原有前台节流刷新。

### 验证与收货限制

- 新增 `coach-conversation-screen.test.tsx` 17 项、`chat-set-card.test.tsx` 5 项；覆盖标题/状态/返回、组卡与正典隐藏、双方送达、失败重试幂等与新草稿、发送禁用/无附件、自动分页偏移、空/失败态、图片全屏、URL 刷新与无教练归属 badge、首次滚动贴底、read cache/增量分页、轮询确认 pending。
- 红绿日志 `/private/tmp/w3s3-{card,header,share,read,send,composer,history,states,image,video,initial-scroll}-{red,green}.log`（部分步骤的复跑纳入后续 green 日志）。现有学员屏及 set-ref 测试原断言未修改，全绿。
- 最终全量 `npx jest --runInBand`：**79 suites / 533 tests 通过**，含两条 i18n 守卫与 tokens 守卫；日志 `/private/tmp/w3s3-final-jest.log`。
- `npm run lint` 无 errors/warnings；`npx tsc --noEmit` 通过，本轮无 hovered/typed-routes 生成文件诊断；日志 `/private/tmp/w3s3-final-{lint,tsc}.log`。`git diff --check` 通过。
- 本地 Standards 核对：仅白名单文件/新增测试/台账，颜色 useColors、字体 font、既有翻译键、无依赖与 API 变更。Spec 核对：卡面目标完成，badge 仅传参按追加裁决保留；学员端卡/视频提取外无改动。
- 按用户明确沙箱无 ADB 约束，未运行 `expo run:android`，未取得 AVD meetpr 截图，**不宣称原生视觉验收通过**。PARITY 教练 Chat 标为 🔨 待走查。

### W3-s3 收货修正(Claude,2026-09-05)
- 气泡色改回教练端 `CoachConversationDestination` 的覆盖值(自己 = `textPrimary`、对方 = `borderHairline`;pending 同 textPrimary@0.72),不用 `ConversationView` 默认的 goldCTA/surfaceElevated;错误横幅 goldCTA/goldSoft 不变。

## W3-e — 教练子页内联页头与待处理视频列表（2026-09-05）

### 范围与正典

- Worktree `feat/w3e-coach-subscreen-headers`，开工 clean；已读 AGENTS、PLAN、W2-c/W2-d/W3-s3 日志、指定 RN 文件，以及本机 iOS StudentPendingVideosView、InviteCodesView、StudentOnboardingProfileView、AcceptBindRequestSheet、CoachStudentFormatting、Typography/Radius/Spacing。已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。
- 按用户指定 CoachNavHeader / StudentPendingVideosScreen 公共 seam 使用 tdd 逐片红绿；按本卡明确约束不询问/创建 tracker 配置，跳过正式 tracker review 流程，末尾分别做本地 Standards / Spec 核对。无 commit/push、无依赖安装，node_modules symlink 保持原样。
- 现场差异按卡面明确值处理：原会话栏由 44 高按钮撑高，新组件统一 56 高、Ionicons chevron-back 22；iOS 待处理视频缩略块原用 bgStack，本卡指定 surfaceElevated；日期保留 RN 的 locale full date，日标题采用卡面 mono12 medium/0.6 字距。

### 实装

- 新增 `CoachNavHeader`：左右对称 44 区域，body16 bold 单行居中标题、可选 body11 副标题与 token tone、trailing 插槽；默认返回先 canGoBack，否则 navigate today。返回 a11y 复用 `coach.videoFeedback.back`。额外可选 subtitleTestID 仅用于保留会话原有测试标识。
- ConversationScreen 仅替换页头，保留原 onBack、danger/success 副标题、`coach.chat.subtitle` 和屏幕自己的 1px 分割线，既有测试原断言未改。
- 待处理列表采用共享页头；内容 h20/v14、日组距24、组内距8。行 padding16/gap16，52×52 缩略块/radius.inset/play-box20，动作名16 semibold（缺失复用 `coach.videoFeedback.trainingVideo`，a11y 同口径）、meta mono11 medium/0.8 字距、右 chevron13；保留 HH:mm 与现有 MB 舍入口径、原详情路由和 shouldDismissStudentList。
- pending 状态单独对齐：空态 check-circle-outline44、body20 bold 标题/body15 secondary 描述，失败态三角44与失败文案，二者 v18；加载 spinner v32。失败后通过原下拉刷新重试；普通收件箱 ReceivingState 保持原显示与重试按钮。
- 邀请码页去掉 ScrollView 中的 Capsule/大标题，在内容前接共享页头；其余内容不变。申请详情实际为全屏且 iOS 源码为自定义 header（并无 navigationTitle），沿用 `coach.applicationProfile.title` 与 waitingText，保留返回/接收/拒绝行为。AcceptBindRequestSheet 实际为底部 sheet，仅将页头标题改为 body16 bold 并水平居中，保留取消与 busy 行为、不加返回键。

### 验证与限制

- 新增两套组件测试共 10 项：标题/可选副标题、a11y/自定义返回、无历史回 today、有历史 back、trailing；待处理页姓名/无 Back 胶囊文案、动作名/回退/时间/大小/详情入口、空态/自动返回、加载、失败不退出。使用真实组件与 QueryClient 缓存，未 mock 内部 receiving hook。
- 红绿日志：`/private/tmp/w3e-{header,back,fallback,list-header,rows,empty}-{red,green}.log`。现有 coach/chat 断言未改；全量 `npx jest --runInBand` **81 suites / 543 tests 全绿**，含两条 i18n 守卫与 tokens 守卫；日志 `/private/tmp/w3e-final-jest.log`。
- `npm run lint` 与 `npx tsc --noEmit` 通过，无需忽略生成文件诊断；`git diff --check` 通过。日志 `/private/tmp/w3e-final-{lint,tsc}.log`。
- 本地 Standards：白名单内改动，新增颜色均 useColors token、字体 font、复用已有 en/zh 翻译键；未改 API/路由/播放器/VideoFeedbackScreen。Spec：页头与视频列表要求已落地，卡面和源码差异按上文记录；无其他业务行为扩展。
- 沙箱无 ADB，未运行 `expo run:android`、未取得 AVD meetpr 截图，**不宣称原生视觉验收完成**。PARITY 的 Receiving/InviteCodes 标为本轮 🔨 待走查，保留 integration/w2 既有走查记录。

## W3-r — 双端实时聊天通道（2026-09-05）

### 范围与正典

- Worktree `feat/w3r-realtime-chat`，开工 clean，HEAD `19e42439709997a0f215f06e0a2f2158be61bb78`。按卡面白名单实装；无 commit/push、不加依赖、不动 node_modules symlink、不改后端、既有 DTO 或 UI 文案。
- 已读 AGENTS、PLAN、W3-s/W3-s2/W3-s3 日志及指定 RN 文件；只读 iOS `202e95dbbf88baf5778f2329f206f34e117a4dd0` 的 RealtimeClient/RealtimeEvent、ChatRealtimeRouter、ChatInboxViewModel、ConversationViewModel+Loading、ChatSessionController。后端 SPEC 032、events.ts/hub.ts 使用 `git show feat/032-realtime-chat:<path>` 读取。已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。
- 卡面提到的 `src/config/build-track.ts` 在本 worktree 不存在；直接复用 `src/api/client.ts` 的 `API_BASE_URL`（由 `EXPO_PUBLIC_API_BASE_URL` 覆盖，现有默认值仍为 staging），没有另设主机或修改配置。access token 通过现有 `getAccessToken()` 获取，复用过期判断、单航班 refresh 与 session generation。
- 使用 tdd 技能，公开 seam 由卡面预先指定，不重复询问。按用户本卡约束，不要求／创建 issue-tracker 配置；最终 Standards 与 Spec 为本地核对，未执行正式双 agent review。

### 实装

- `src/api/realtime.ts`：纯逻辑客户端，注入 socket/sleep/jitter；RN 内建 WebSocket 第三参携带 Authorization。API URL 的协议转 ws/wss、路径追加 `/realtime`；只有 hello 才发布 connected。用现有 zod 校验信封、在客户端边界将 snake_case 指针转为 camelCase；未知 type、坏 JSON／坏 payload 静默忽略。
- 每次连接结束后 full jitter 退避，上限依次 1/2/4/8/16/30 秒，hello 后重置。disconnect 同步撤销当前 generation、发布 disconnected、关闭 socket、取消原生退避定时器；旧帧、旧 close/error 与迟到 token 不会影响新连接。开发态只用 `[realtime]` console.debug 记录状态迁移，不输出 token。不发送 JSON 心跳或任何业务帧，协议 pong 交由 Android OkHttp。
- `chat/realtime.ts`：按 authenticated user 建拆单例，在根布局仅加生命周期 hook。active 连接，其余 AppState 断开；前台以事件值为准；登出／换号拆 transport 与事件订阅。连接状态变化只替换轮询定时器，不重新执行会话 focus 初始加载。
- 两端收件箱 connected 时 `refetchInterval: false`，断线 30s。`chat.message` 和非本人的 `chat.read` 触发串行合并刷新；同一 QueryClient/query key 的 badge 与页面共享 worker。事件撞上现有初始加载／轮询时先加入进行中请求，再合并为一次追加刷新，避免丢事件或多打一轮。回前台失效刷新；学员查询尚未 enabled 时先标 stale，启用后再拉取。
- `conversation-model.ts`：默认 `CONVERSATION_POLL_MS = 3_000`，`CHAT_POLL_MS` 只供收件箱使用。force 刷新忙时记 pending、完成后再跑一次，stop 清 pending。按会话 ID 过滤；他人 read 仅在 seq 推进时处理，本地有对应消息则直接更新 other read 游标，否则强刷。
- 两屏共用 sync 与 focus 实时接线；连上停止轮询，断线每 3s、后台不请求、回前台强刷；保留 since_seq 排空、历史分页、pending 发送与 read cache 写回。HTTP 与实时游标均单调推进；实时刷新成功会清除旧的初始加载错误态。无新 UI 文案或功能。

### 红绿、检查与验收边界

- 新增 API 5 项、接线 11 项测试：覆盖握手／hello、退避与重置、坏帧／wire 映射、旧 generation、token 与构造失败、取消睡眠，以及登录／冷启／前后台／换号订阅、双端收件箱 interval 与并发合并、本人 read 忽略、双屏匹配／本地 read／3s 回落、初始 HTTP 竞态与加载失败恢复。
- 红绿证据 `/private/tmp/w3r-{api-handshake,api-retry,api-decode,lifecycle,inbox,conversation,screens,races,default-poll,recovery}-{red,green}.log`；补充传输取消验证 `/private/tmp/w3r-api-cancellation.log`。换号队列补测首跑即通过，证据 `/private/tmp/w3r-account-queue-red.log`（文件名保留执行时命名，不宣称该项曾失败）。
- 既有测试断言全部未改：旧 conversation-model 的 30s 节流用例仅显式传入 `pollInterval: 30_000`，继续验证其原节流／去并发／read 重试断言；analytics root-layout 的 session mock 仅补 `getState/subscribe` 以支持根布局新增生命周期。
- 全量 `npx jest --runInBand`：**83 suites / 559 tests 全绿**，含现有 chat/coach/student 测试、两条 i18n 守卫与 tokens 守卫。日志 `/private/tmp/w3r-final-jest.log`；新增 seam 复验日志 `/private/tmp/w3r-final-targeted.log`。
- `npm run lint` 通过，无 errors/warnings；`npx tsc --noEmit` 通过，无 hovered／typed-routes 生成文件诊断。日志 `/private/tmp/w3r-final-{lint,tsc}.log`。`git diff --check` 通过。
- Standards 本地核对：仅白名单源码／测试／台账，复用现有 token/API 配置，无依赖、文案、颜色字体、后端或 DTO 改动。Spec 本地核对：双端共享连接、事件筛选、串行合并、已读游标和两档回落轮询均有覆盖；无 typing／FCM／客户端业务帧。
- 用户明确沙箱无 ADB：未运行 `npx expo run:android`、未做真实 WebSocket 联调、无 AVD meetpr 截图，不声明原生验收通过。PARITY StudentChat／Receiving 已追加「W3-r 实时通道接入,断线回落轮询」，保持 🔨 待走查。

## 2026-09-21 — Build 22 parity acceptance

从 W3 `6429d50` 追齐 iOS `beta/1.0-22@0748931`。080–083 增量、独立双轴审查与 Android 定向视觉证据已落地；128 suites / 883 tests 通过，类型、lint、Android 构建通过。详细实现、复现步骤、截图与未完成的 Global/真机/分发门禁统一记录于 [验收报告](verification-build22-2026-09-21.md)。本轮没有认定 W3 全量通过。

## 2026-09-21 · W3 主干走查与 Global 教练文案

基于 2565c6e 补 ADB 教练/学员聊天、视频播放/倍速/seek/打点/反馈闭环。P-30 标题换行与 P-32 Global 退出提示已修复，6 suites / 30 tests、tsc/lint、QA Release、最终 ADB 截图通过。独立 Standards/Spec 收敛。P-31 字符串预览替换因无法区分同名用户文本撤回，仍开放 backend 契约小卡。原增量 PR #55 CI 全绿、可审未合。Global 方案 A 随后按 David 的本地保存授权完成建号，详见下条。详见 verification-w3-2026-09-21.md。

## 2026-09-21 · Global 专用账号与空账号聊天复验

真实建号、权限受限的本地凭证、双角色 Android 登录/绑定及聊天收发已取证。修复等待计划的聊天导航和空教练姓名回退；两卡均独立双轴 CLEAN，全量 128 suites / 886 tests、tsc/lint/Global QA Release 通过。完整记录和未过门禁仅维护于 [W3 记录](verification-w3-2026-09-21.md)。W3 未整体完成。

## 2026-09-22 · Global 训练、视频与反馈验收

专用账号真实计划、记组完成、Photos 上传、教练播放/打点/反馈、学员关联回放及 App 重启回读通过。G03 保留反馈内嵌英文动作名并统一所有入口，G04 修复 Today 排他查询上界漏当日及凌晨边界。128 suites / 897 tests、tsc/lint/Global QA Release、最终 ADB 复验与 Standards/Spec 独立审查通过。小屏/大字体/深色定向证据及开放项统一见 [Global 记录](verification-global-2026-09-22.md)；W3 未整体完成。

W3-V01 独立 T0 补丁收掉小屏 Appearance 词中折行及聊天标签溢出；实际三种外观切换和播放通过，默认层级保持。定向47/全量897 tests、tsc/lint/build、双轴增量 CLEAN，证据见同一 Global 记录。

追加 Global quick-log 当日补记：W1D4 60×5@8 于9/22提交，师生回读唯一记录、重启2/2及Bench e1RM76.9通过。教练改期POST返回403 AUTHORIZATION_FORBIDDEN，计划回读未改变；停止写重试，需核对Global部署能力，不据本地源码宣称线上已支持。

## 2026-09-23 — W3 acceptance completion

Starting RN7c0597c, pinned iOS0748931. P31 uses explicit optional preview_kind;
backend PR280 derives metadata from the visibility-filtered message. Known system
kinds localize; ordinary/legacy/unknown text remains unchanged. G05 defers initial
camera consent until native Modal onShow. V04 restores the specified coach marker card hierarchy; V05 fixes dark workbench control contrast while preserving Light. V06 waits for native onLoad before position polling so an unresolved pre-load query cannot freeze progress. V03 fixes compact coach headers and themed CTA contrast; default Light and small Dark were observed. V02 restores pinned settings hierarchy
and always-visible automatic rules without changing storage or scheduling.
Independent Standards/Spec CLEAN; RN131 suites908 tests plus tsc/lint/build pass.
Live dedicated-pair cross-date logging, multipart interruption/cold restart and
chat reconnect/retry verified. Current evidence/remaining gates are canonical in
docs/verification-w3-2026-09-23.md. No production deployment/migration/merge.

## 2026-10-02 — R1/R2 Profile fields, history entry and coach badges

- 任务：[R1-R2-CARD](../specs/build22-parity/R1-R2-CARD.md)。在 `fix/parity-r1-r2`、RN 基线 `a203d9c` 实装；iOS 只读参照固定 `beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea` 的 ProfileCardsSection、Step1BasicsSection、Step7ExtrasSection、MeetPRTabBar 与卡内截图。
- P2-13：Profile 复用向导 BasicStep、控件、翻译键与完整 Step1 校验；仅 Profile 启用 Units 两段、Gender 三列、生日滚轮、纵排身高体重及输入尾缀。单位切换重建输入文本，保留公制存储值；向导默认布局不变。basics 白名单仅五个资料字段。
- P2-12：把向导已有多行备注移入共享 CompetitionSection，Profile 与向导各呈现一次，备赛与不备赛均可填写。competition 白名单补 `note_to_coach`；所有 Profile 分区继续隔离字段并禁写三项 1RM。
- P2-14：历史移至页头下方靠右的金色图标、文字与 chevron 行，最小命中高度 44dp，保留按钮角色、可读标签及 `/training-history` stack 路由。P-33：教练壳移除 `badgeDot` 参数，沿用 TabBar 的 0 隐藏、数字、`99+`；计数来源、Tab 顺序与学员底栏未改。
- 红绿证据：在生产代码改动前，四个约定 seam 的定向测试为 **4 suites failed / 13 failed、22 passed**；缺失字段、校验、备注、数字角标与历史文字均触发预期失败。实装后同组 **4 suites / 35 tests passed**。新增测试仅位于 profilePatch、ProfileEditor → onboarding mutation、教练 tab 壳、训练页入口；覆盖分区字段严格隔离、1RM 禁写、单位切换、保存重开（合成返回值）、备注失败保留/重试与取消不写；无布局镜像测试。
- 最终自检：`npx jest --runInBand` **133 suites / 929 tests passed**；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 均通过。原始本机日志：`/private/tmp/r1r2-red.log`、`/private/tmp/r1r2-green.log`、`/private/tmp/r1r2-jest.log`、`/private/tmp/r1r2-tsc.log`、`/private/tmp/r1r2-lint.log`。
- 代码自审：按 review-loop 做独立只读双轴初审及定向复核。Standards 无实质发现；Spec 初审指出 Units/Gender 并排与输入尾缀不足，已通过仅 Profile 启用的共享控件布局补齐，复核无未决代码问题。仓内无 Matt tracker 配置，未声称执行 tracker 流程。
- **未做设备验证**：本机 ADB 二进制存在，但沙箱拒绝启动服务（`Operation not permitted`）。未运行设备构建/安装、未生成本卡实屏截图，未做真实服务端保存回读；Light/Dark、360×640dp、1.3 倍字体、历史返回状态与角标遮挡仍按卡交 Opus 收货，不以单测代替验收。
- 按派卡边界未 commit、未 push；未改 PARITY.md、走查清单或任务卡，无新增依赖或后端改动。

### 返修 1（2026-10-02）

- 在本卡第一轮未提交改动上，仅修复 Units 分段选中背景与 Profile 编辑标题。Dark 的选中段复用 `textDisabled`，轨道仍用 `bgStack`；Light 保持 `surfaceCard`。选中/未选中文字保持 `textPrimary` / `textSecondary`，`wrap` / `row`、Gender 与向导第 1 步布局未改。按现有 token 计算，Dark 选中背景与轨道对比为 2.53:1，主文字与选中背景为 6.32:1；此数值不代替实屏复验。
- 用 `git show` 只读核对固定 iOS SHA 的 `Modules/StudentKit/Sources/StudentKit/Features/MyProfile/ProfileCardsSection.swift` 中标题 switch（源码类型名为 `ProfileCardKind`）。新增编辑页专用映射，basics/background/environment/recovery/muscles/competition/injuries 分别复用现有 `student.profileCardsSection.copy002`–`008`；保留列表共用的 `profileTitles`，列表行标签不变。未新增色值、依赖或文案键。
- 在现有 ProfileEditor 测试中仅补两个标题断言，逐条先红后绿：basics 从 `Height / Body weight` 失败到 `Basic information` 通过；competition 从 `Meet date` 失败到 `Meet / notes` 通过。未加样式镜像测试。红绿日志：`/private/tmp/r1r2-repair1-basics-red.log`、`/private/tmp/r1r2-repair1-basics-green.log`、`/private/tmp/r1r2-repair1-competition-red.log`，最终绿见全量 Jest 日志。
- 自检：`npx jest --runInBand` **133 suites / 931 tests passed**；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 均通过。日志为 `/private/tmp/r1r2-repair1-{jest,tsc,lint}.log`。改前快照 `/private/tmp/r1r2-repair1-before` 与增量 `/private/tmp/r1r2-repair1.diff` 留作本机审查证据；其余第一轮文件逐字节核对未变。
- 独立只读代码审查（review-loop，本地批准卡为源）：Standards 0 项；Spec 代码增量 0 项，交付前已补本返修记录。仓内仍无 Matt tracker 配置，未声称运行 tracker 流程。此为代码自检，不代替 Opus 收货。
- **未做设备验证**：本次 ADB 启动仍被沙箱拒绝（`could not install *smartsocket* listener: Operation not permitted`）；Light/Dark 实屏与其余验收由 Opus 按返修清单复验。未 commit、未 push；未改 PARITY.md、走查清单、任务卡或其他第一轮实现。

## 2026-10-02 — E1RM imported baseline repair

- 任务：[E1RM-IMPORTED-BASELINE-CARD](../specs/build22-parity/E1RM-IMPORTED-BASELINE-CARD.md)。Opus 派卡；当前 `fix/e1rm-imported-baseline`，基线 `b996f7d`，未 commit、未 push。iOS 实现与测试仅以 `git show 03021ff6cbe82aba26827df70b48fb6451105c6d:<path>` 只读核对，未改 iOS 仓。已读 Expo SDK 57 文档。
- 原因复核：RN recorder 原先从全部可信点取异常基线，仅排除同 setLogId 的 imported；`loadGrowthHistory` 把真实日志回放的 logged 强改为 imported。iOS `E1RMHistoryReplayService` 排除 assumed，再经 Recorder 生成 logged；preserved imported 指导入估算，不能代替实测异常基线。iOS Recorder 分开 display 与 measured 基线，后者只取同学员同比赛主项的 normal + logged。
- 实装：保留 RN 既有展示/PR 路径，将异常基线改为可信实测，并通过既有 competition-family resolver 聚合当前学员同主项的各 exercise。回放保留 logged，沿用既有入选函数并按实际时间、set ID 排序。Progress 首读、下拉刷新与 reload 使用同一 `loadGrowthHistory` 入口，刷新快照写回对应 Query 缓存。
- 修复：识别“更早的可信导入 + 最早合格实练 low”主项，完整时序回放后只改其已有 logged 点的 confidence。已存估值、来源字段、point ID、导入及人工复核状态、无源日志点、退役动作/其他主项、其他学员和 PR（含已确认）保留。缺点回填与修复在一次提交中完成；新 snapshot/revision CAS 在共享串行写队列里检查后单次写盘。重复刷新无写入；并发写入则放弃本次结果，返回最新存量，下次重试。写失败返回旧快照，磁盘原文不变；无法读取的旧存储报错，禁止当空仓覆盖。不增加迁移标记、不清库、不生成追溯 PR。

### 原样真实案例与未决口径

- fixture 原样移植 iOS `ImportedBaselineTestSupport.swift`：38 组 = 5 assumed + 2 高次数 + 31 实练，重量、日期、次数、RPE 未改，标识符全部合成。
- **卡内有无法同时满足的约束，已向 David 提出，尚未取得变更入选规则的指示**：RN `E1RM_POLICY.minimumEligibleRPE = 7`，既有测试明确 RPE 6/6.5 不入选；固定 iOS 的 `E1RMEligibility` 已允许低于 7 的可计算 RPE。因此保留“阈值/公式/入选规则及既有断言不变”时，不能同时满足“31 个实练逐点与 iOS 一致”。本次未越权改这些规则，也未修改数据来伪造一致性。
- RN 原样案例结果：36 个存量点及 ID 全保留，5 imported 不变，13 个合格 logged 恢复 normal，18 个 RPE 6/6.5 的原 low 点保持不变；90 天快照由 formingWindowSparse 恢复 chart，5 个样本，current = 216.2162162162 kg。iOS 同输入为 31 normal、8 个样本、221.4285714286 kg。**逐点一致性验收未完成**；需 Opus/David 决定是否另卡追齐入选口径。本地测试绿不等于本卡全部收货。
- 新设备回放 seam：空仓回填三个不同日期深蹲实练 100/104/108 kg × 1 @10，均为 normal + logged；随后记录 140 kg × 1 @10（较历史最大值高约 29.6%）得到 logged + low，Progress 保持 108 kg。与 iOS 同输入的异常门结果一致：真实历史仍是实测基线，超过既有 18% 阈值被隔离。此用例验证回填后再记录；未宣称修复训练页新设备 First record 横幅，后者仍在 Out of Scope。

### 自检与审查证据

- 测试只加在卡内三个 seam。Recorder 导入低值/高值污染用例先红后绿；回填 origin 先红后绿；修复入口→真实仓储→growthSnapshot 的旧 low 恢复先红后绿。随后补同主项跨 exercise、回放同时间排序/入选、存储失败/并发复核/重开、数据与 PR 保留、零重复写、损坏存储不覆盖、原样真实案例与新设备用例。阈值/公式/入选的既有断言未改。
- 红绿原始日志在本机 `/private/tmp/e1rm-{recorder,history,repair,replay,family,corrupt,failure-screen}-{red,green}.log`（仅适用已生成的组合）；最终检查日志 `/private/tmp/e1rm-final-{jest,tsc,lint}.log`。`npx jest --runInBand`：134 suites / 943 tests passed；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过，未改 eslint/TypeScript 配置或增加 lint 豁免。
- review-loop 独立只读双轴自审：Standards 0 项；Spec 初审 1 项（修复写失败应继续显示旧快照），已补失败首屏红测试并修正，定向复核关闭。Spec 仍明确保留上述入选规则冲突，未宣称验收通过。仓内缺 Matt tracker 配置，已提示 `$setup-matt-pocock-skills`，仅执行本地批准卡的 review-loop，不冒称 tracker 工作流。
- **未做设备验证**：ADB 二进制存在，但启动服务被沙箱拒绝（`could not install *smartsocket* listener: Operation not permitted`）。未构建设备包、未安装、未做实屏或真实服务端联调；由 Opus 按卡收货。
- 只追加本节交付记录；未修改 PARITY.md、走查清单、任务卡、后端、依赖、公式或阈值。

### 返修 1（2026-10-02）

- 在本卡首轮未提交改动上仅处理 Opus 退回的三处；未回退其他工作，未 commit/push，未改 PARITY.md、走查清单或任务卡。仍由 Opus 按卡收货；未做设备验证。
- 入选规则按固定 iOS `03021ff6cbe82aba26827df70b48fb6451105c6d` 的 `E1RMEligibility.swift` 逐条追齐：移除旧 RPE 7 下限，仅排除 RPE > 10，完成/失败与次数上限保持原样；RPE < 6 和 nil 继续用现有 Epley 回落。这是修正 RN 基线漂移，不是新增产品规则；本节取代首轮记录中的未决入选口径。公式、10%/18% 异常阈值未变。
- 原样 38 组 fixture 现在恢复全部 31 个实练点为 normal，5 个真正 imported 点不动；90 天卡为 chart，8 个样本，current = 221.4285714286 kg，与固定 iOS 测试相同。Recorder 另覆盖 nil、5.5、6、6.5 的记录与估值；RPE > 10 与次数上限仍拦截。
- 旧 RN 回填点只要对应同学员的非 assumed 服务器日志，就把 origin 归正为 logged，并对受影响主项按完整真实日志时序重算置信度；origin 归正、置信度修复、缺点回填仍共用一次 CAS。保留 `imported-*` point ID、已存估值、全部来源字段和 PR；真正 assumed、无源点与其他主项不动。覆盖写失败原状保留、并发复核胜出、重开重试及重复刷新零写。
- 旧安装重放：先存 100/104/108 kg × 1 @10 的 `imported-*` 历史，再存旧代码标 low 的 140 kg 实练。升级后历史归正为 logged + normal，140 kg 仍 low，曲线当前值仍 108 kg：相对可信实练历史高约 29.6%，符合 iOS 既有 18% 异常门。另测 110 kg 的误标 low 恢复 normal，确认归正会重算后续实练而不只改 origin。
- 损坏存储仍由 `readE1RM` 抛错阻止写入；Progress 入口捕获读失败，使用本学员服务器日志生成只读曲线，PR 读取失败也降级。三种损坏原文均验证可生成 chart、重复读取与训练 Recorder best-effort 不抛出、零写入、原始字节不变。
- 先红后绿证据：`/private/tmp/e1rm-r1-{eligibility,migration,corrupt}-{red,green}.log`；迁移失败/并发保护补充日志 `/private/tmp/e1rm-r1-migration-protection.log`。新增测试留在既有 seam，入选既有断言按本次授权更新。
- 最终自检：`npx jest --runInBand` 134 suites / 952 tests passed；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过。日志 `/private/tmp/e1rm-r1-final-{jest,tsc,lint}.log`。首次全量曾在未修改的聊天滚动测试失败（期望 y=190、得到 y=30）；该 suite 独立复跑 33 tests 通过，随后全量通过，未修改聊天代码或测试。参数化测试的 TypeScript tuple 类型已修正，未改 eslint/TypeScript 配置或增加豁免。
- `review-loop` 独立只读自审，以开工已有 WIP 快照为基线，仅审本次返修增量：Standards 0 项；Spec 0 项。固定审查 diff 留本机 `/private/tmp/e1rm-r1.diff`；最终仅补测试 tuple 类型与本记录，无实现语义变更。此为开发自检，不代替 Opus 实屏收货。

## 2026-10-02 — D-19 camera review survives background (Phase 4–6)

- 任务：[D19-CAMERA-REVIEW-CARD](../specs/build22-parity/D19-CAMERA-REVIEW-CARD.md)。Opus 派卡，在 `fix/camera-review-survives-background`、基线 `5c4a59d` 的当前工作区修改；未 commit、未 push。未修改 PARITY.md、走查清单或任务卡。开工无 CONTEXT.md / FOLLOWUPS.md；已读仓规、卡片及 [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)、[Camera 文档](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)。
- **被证实的假设：#1，CameraRecorder 的 AppState 后台清理把已完成预览当成录制中断，一并清空 review 并删除 ownedUri。** 原诊断命令 `npx jest --runInBand --watchman=false --runTestsByPath src/features/training/video-upload/__tests__/camera-review.diagnose.test.tsx` 复现 2 红 2 绿：background 单事件或返回后预览消失、Retry / Use 不见、出现 00:00、本地文件被删；无打断及 inactive 对照正常。仅在清理条件加 `recordingActive.current`，同一诊断环变成 4 绿；未改父层或权限处理即可消除最小复现，#2 / #3 不是本环必要条件，不据此排除设备上其他问题。
- 正式回归：把诊断文件迁为 `camera-review.test.tsx`，删除观察日志与诊断命名。先撤回探针恢复旧条件，正式测试得到 2 红 2 绿（本机 `/private/tmp/d19-regression-red.log`），再应用已验证的单条件修复得到 4 绿；同步注释。实现只改后台清理触发条件，录制中断与卸载清理路径保持原样。
- 测试仅在批准的 CameraRecorder + AppState seam，共 9 条：无打断、inactive、background 返回、background 单事件四组保留预览及 Use 回调；正在录制切后台仍停止、删除即时或延迟返回的文件并可重录；Retry 删除旧文件、重录得到新 URI；Close camera 或父层卸载删除未使用文件；Use 交出文件后卸载不误删。使用假时钟先录制 3 秒，验证后台后同一 Video 实例及 URI、原生 controls 保留、不回到 00:00。原生播放时长显示未作设备验证；系统返回在此 seam 以父层卸载覆盖，未冒称执行设备 Back。调用点只读核对原有 onUse → attach 链路，未新增附件流程测试 seam 或进行真实上传。
- 自检：`npx jest --runInBand` **135 suites / 961 tests passed**（包含既有 local-retention）；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过。日志 `/private/tmp/d19-final-{jest,tsc,lint}.log`。未改 eslint / TypeScript 配置或新增豁免；`rg -n 'DEBUG-d19' src` 无匹配，诊断文件及临时观察日志已清理。
- **未做设备验证**：ADB 二进制存在，但 daemon 启动被沙箱拒绝：`could not install *smartsocket* listener: Operation not permitted`。未构建设备包、未安装、未做原生视频回放或真实上传验证；真机复验按卡由 Opus 出包后交 David，本记录是开发自检，不代替 Opus 收货。
- `review-loop` 独立只读双轴自审一轮：Standards 0 项；Spec 0 项。范围为 HEAD 上本卡 CameraRecorder 条件改动及未追踪的正式回归文件；审后仅追加本 JOURNAL 事实，无实现语义变更。仓内缺 Matt tracker 配置，已提示需 `$setup-matt-pocock-skills`，本次仅使用本地批准卡做 review-loop，未声称运行 tracker 流程或完成 Opus 验收。

## 2026-10-02 · WALKTHROUGH-BEHAVIOR：D-20 / D-28 / D-12（续接）

- Opus 派卡，工作区 `fix/walkthrough-behavior`，基线 `e93beb8`。接手 `git status` / `git diff` 核对 A 的 7 个受跟踪改动及 2 个新增测试，保留已有实现；任务卡为接手时已有未跟踪文件，未修改。没有 commit / push，未改 PARITY.md 或走查清单。没有 CONTEXT.md / FOLLOWUPS.md / 更近层 AGENTS.override.md。
- 测试仅在卡内约定 seam：TodayWorkoutView 提交、upload manager/runner、training-reminder 排期/处理器、settings-screens，以及 set-entry-rpe 手势归属。没有后端或用户数据操作；测试标识、视频与 URL 均为合成 fixture。

### A：现状复核与补充

- Complete set / Not completed 立即 busy 并禁用，ref 拦住同一事件周期重复提交；保存至多 30 秒，JS deadline 不依赖底层 abort 返回。失败保持 sheet / 输入，网络失败提示保留输入可重试。TodayWorkoutView 的重试沿用原 coached set upsert 键（plan_exercise_id + set_index），未改去重协议；不将测试 mock 的单次写入冒称生产服务端幂等验证。
- Sending 附件不会阻塞 TodayWorkoutView 记组，保存不删除本地视频。分片 PUT 的 60 秒兜底会直接结束等待，不再等待原生 cancel Promise；进入已有退避。无网恢复或网络类型改变会取消本次悬置 PUT 并重试，已持久化 session / parts 保留；不改分片协议。
- 定向复跑 `set-save` / `network-handover` / `multipart` / `retry-scheduler` / `manager-attach`：5 suites / 52 tests 通过，后三套原断言未改。补查切网同时删除附件：即时删除响应时原实现通过；延迟远端删除响应后得到 1 红 / 6 绿（等待删除时发生第二次 PUT），在 stop 清除 networkChanged、让显式删除/替换优先后转为 7 绿；连同 manager-attach 原断言共 20 绿。清理接手改动中的重复 import 和两个无用测试 helper，遵循现有 lint 配置。
- 上轮 A 的红测试日志不在本轮证据中；这里只记录接手 diff 与复跑结果。原生上传与取消双悬置是条件模拟，不等同于小米真机切网根因已证实。

### B：API 依据与实现进度

- 动手前读取 [Expo SDK 57 Notifications 文档](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) Permissions、handler、channel API，以及版本首页。本地实际 `expo-notifications` 为 **57.0.17**。配置声明 `android.permission.SCHEDULE_EXACT_ALARM`；没有使用 `USE_EXACT_ALARM`。
- 核对本地 `node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt`：API < 31 或 `AlarmManager.canScheduleExactAlarms()` 为 true 使用 `setExactAndAllowWhileIdle`，否则 `setAndAllowWhileIdle`；weekly 每次触发后继续排下一周。`NotificationPermissionsModule.kt` 与 `src/NotificationPermissions.types.ts` 仅暴露通知权限，不暴露精确闹钟授权。React Native PermissionsAndroid.check 底层为 `checkSelfPermission`，不能替代这个特殊授权查询。
- [Android 官方说明](https://developer.android.com/develop/background-work/services/alarms)要求用 `canScheduleExactAlarms()` 查询及 `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` 打开授权页，回收授权会终止进程并取消精确闹钟。已提出增加最小本地 Expo 模块查询并跳转的范围确认：卡片“原生配置只动 app.json”与现有 SDK 无查询接口的缺口，不能用虚构 API 或普通通知权限冒充解决。
- 前台策略只有 `src/notifications/handler.ts` 一处真实 `setNotificationHandler` 调用：训练提醒展示横幅、列表并响铃，上传失败继续不弹横幅、不响铃、进入列表。支持旧 identifier 与新 category；两个生产者安装同一策略。
- 训练提醒改用 HIGH 的 `training-reminder-v2`、默认声音，删除旧 `training-reminder` 渠道，渠道名称仍沿用现有翻译键。每个星期的 identifier、weekly 排期、登出取消与重新登录恢复逻辑保持。处理器测试先 1 红 / 9 绿，再 10 绿；渠道迁移测试先 1 红 / 10 绿，再 11 绿。
- **待完成**：精确闹钟授权查询、设置页入口/可能延迟提示、授权变化重排及三态回归；待范围答复，不宣称 B 全部完成。

### C：RPE 起手

- 先把约定手势归属 seam 的起手回放改成短纵向/45° 待判，得到 1 红 / 4 绿；实现后 5 绿。水平超过 6 dp 且占主导才锁 scrub；纵向达到 24 dp 且占主导才交滚动，对角保持待判。RN 坐标是 dp：诊断 AVD 420 dpi 的 40 px 约 15.2 dp，60 px 约 22.9 dp。
- 手指开始触摸刻度条时关闭父 ScrollView 的滚动，待判/拖动期间保持，明确纵向则恢复滚动；release / terminate 恢复。父层只在该刻度条交互期间处理滚动归属；几何、范围 5–10、0.5 步进与无障碍标签未变。
- **读代码发现的“中途停止”可能路径，仅列出，未按猜测修复**：① 原生触摸取消可进 `onPanResponderTerminate`，系统手势/窗口失焦等是否触发需设备事件；② 已被原生 ScrollView 接管后 JS 收不到 move（包括 JS 启动屏蔽尚未应用的竞态），应以触摸与滚动同一时间轴确认；③ SetEntrySheet 关闭/卸载（Back、selectedDraft 消失、账户/父页面生命周期）会移除 RPE 控件；④ PanResponder 的回调随 width/onChange 等依赖变化而更新，布局变动可能改变命中值，不能仅凭静态代码认定为中断原因。未宣称这些路径解释 David 的真机反馈。

### 最终自检与交接状态

- `npx jest --runInBand`：**137 suites / 975 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 均通过。完整本机日志 `/private/tmp/wb-final-{jest,tsc,lint}.log`。`rg -n 'DEBUG-wb' src` 无匹配；未改 eslint / TypeScript 配置。
- review-loop 独立只读双轴：Standards 最终 0 项未决 finding；初报“上传中删除漏远端清理”经 reducer 的 attachmentId 赋值证伪并撤回。延迟删除与切网竞态补红/绿后，两轴定向复审均无新增 finding。Spec 保留 **B 未完成** 及 **C 原生手势待验**，未宣称整卡完成或 Opus 验收通过。仓内缺 Matt tracker 配置；完整 tracker 工作流需 David 调用 `$setup-matt-pocock-skills`，本轮采用本地任务卡驱动的 review-loop。
- **未做设备验证**：`command -v adb` 不在 PATH；明确路径 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb` 存在，但 daemon 启动报 `could not install *smartsocket* listener: Operation not permitted`，沙箱不允许监听。未构建设备包、未安装、未做屏幕截图或 dumpsys，不用 Jest 代替卡内模拟器/小米真机验收。C 的 grant→React state→原生 scrollEnabled 存在异步应用窗口，快速起手与纵向交接必须按卡回放。
- A、C 已交开发实现；B 已交通知分流、新 HIGH 渠道、权限声明，剩余精确授权查询/入口/状态变化重排及其测试等待范围答复。只追加本 JOURNAL 一节记录，未修改其他正典文档或任务卡，未 commit / push。

### B 续接：精确闹钟授权（2026-10-02，范围答复后）

- 按卡末尾范围答复补齐 B 剩余开发实现，保留接手的 A、C、通知分流、HIGH 渠道和 app.json 权限改动。新增 `modules/training-reminder-alarm`，沿用 training-video 的本地 Expo 模块结构与自动链接；仅提供 `canScheduleExactAlarms` 和带本应用 package URI 的 `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` 入口。Android 12 以下查询为 true；模块 Manifest 声明与 app.json 相同的 `SCHEDULE_EXACT_ALARM`，不引依赖、不声明 `USE_EXACT_ALARM`。
- `training-reminder.ts` 提供安全 JS 桥接，非 Android、模块缺失、查询或跳转异常均返回 false。提醒页开启时查询并显示双语“可能延迟”说明及系统授权入口；拒绝授权保留开关、偏好和 weekly 排期。页面回前台重新查询，授权变化后重排，未变化/提醒关闭时不重排；异步查询检查页面生命周期、查询序号、账号及排期 revision，防止过期结果在登出后恢复提醒。实际精确/非精确定时仍由 Expo 57.0.17 原生 delegate 按系统权限选择，不另造定时器。
- TDD 使用卡内 `training-reminder.test.ts`、`settings-screens.test.tsx` seam，原生模块通过 Expo loader mock。逐项红→绿：授权查询缺失（1 红/11 绿）、开启后缺少延迟说明（1 红/2 绿）、缺少授权入口（1 红/3 绿）、回前台未重排（1 红/4 绿）；随后覆盖拒绝、撤销、关闭提醒、模块/平台降级、跳转失败与登出竞态。红日志在 `/private/tmp/walkfix2-b-red-{query,guidance,open,reschedule}.log`，两个定向 suite 最终 28 tests 通过。
- 最终开发自检：`npx jest --runInBand` **137 suites / 990 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 通过。没有改 eslint/TypeScript 配置；`rg -n 'DEBUG-wb' src` 无匹配。独立只读双轴审查：Standards 0 项；Spec 0 项，不替代 Opus 按卡验收。仍使用本地批准卡，未启用缺少配置的 Matt tracker 工作流。
- **Kotlin 已直接编译验证**：沙箱内调用缓存的 Kotlin 2.3.20 K2JVMCompiler，JVM target 17，使用真实 Android API 36、React Native 0.86.0、expo-modules-core 已编译类库，生成本模块及两个 AsyncFunction 的 class，退出码 0；未用 stub。脚本 `/private/tmp/walkfix2-b-compile-kotlin.py`，日志 `/private/tmp/walkfix2-b-kotlin.log`，输出 `/private/tmp/walkfix2-b-kotlin-classes/`。`npx expo-modules-autolinking resolve --platform android` 已发现新模块及 Kotlin 类。这是源码编译与自动链接发现检查，未执行完整 Gradle/APK 构建或设备安装。
- **设备验证未完成**：明确路径执行 `adb devices`，daemon 报 `could not install *smartsocket* listener: Operation not permitted`；沙箱不允许监听，未做模拟器截图、系统授权页实操、dumpsys 精确闹钟或横幅验收。设备清单仍交 Opus/David 按原卡执行。
- 本次只追加本卡 JOURNAL 记录，未修改 PARITY.md、任务卡或走查清单，未 commit/push。B 工作区 diff（包含接手的 B 改动）在 `/private/tmp/walkfix2-b-workspace.diff`。


## 2026-10-02 — WALKTHROUGH-SMALL-FIXES：九项开发实现

- Opus 派卡：[WALKTHROUGH-SMALL-FIXES-CARD](../specs/build22-parity/WALKTHROUGH-SMALL-FIXES-CARD.md)。当前工作区 `fix/walkthrough-small-fixes`，基线 `7574476`；未 commit、未 push。开工没有 CONTEXT.md / FOLLOWUPS.md；CLAUDE.md 仅引用 AGENTS.md。保留开工已有的未跟踪任务卡及参照截图，未修改 PARITY.md、走查清单、任务卡、依赖或 eslint / TypeScript 配置。
- 逐项动手前，以 `git -C /Users/david/Projects/apps/MeetPR show 0748931563fefea14e7f50a7c9ee7330b5501bea:<path>` 只读核对 iOS；另亲看 [D-11 固定参照截图](evidence/walkthrough-20261002/d11-ios-log-and-camera.png)。已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。下表 iOS 路径均相对此固定源码根目录，`Student/` 简写为 `Modules/StudentKit/Sources/StudentKit/Features/`。

| 项目 | 本次实现 | 对照的固定 iOS 文件 |
| --- | --- | --- |
| 1 · D-10 | 实际当前组卡片由 `WorkoutBody.tsx` 渲染。通过整卡 onLayout 更新金条显式高度，随 Coach note、按钮及字体换行后的卡片尺寸变化；保留原三段品牌金渐变。 | `Student/TodayWorkout/TodayWorkoutScreen.swift` 的 TodayWorkoutHero；入口 `Student/TodayWorkout/TodayWorkoutView.swift` |
| 2 · D-11 | Log 与摄像键放同一操作行，Log 占剩余宽度，右侧52dp方形描边 video-outline；沿用 Record this set 翻译键作为无障碍标签，保持 onVideo(active) / onRecord(active) 回调与可用相机条件。 | `Student/TodayWorkout/TodayWorkoutScreen.swift` 的 recordingHero 操作行；`Student/TodayWorkout/TodayWorkoutView.swift` 的 openVideoAction |
| 3 · D-13 | CameraRecorder 自身使用不透明 fullScreen Modal，黑底覆盖状态栏和导航栏区域，浅色状态栏内容；SafeArea 内左上角44dp圆形关闭图标，取景画面铺满拍摄内容区，计时与录制键叠在其上。预览保持原 Video controls / contain，底部保留 Retry / Use 与 Save to Photos；onRequestClose 复用原关闭回调。录制、授权、文件归属、后台保留预览与上传链路未改。 | `Student/VideoUpload/Camera/CameraRecorderView.swift`；`Student/VideoUpload/Camera/CameraRecorderComponents.swift` 的 RecorderCaptureView / RecorderReviewView / RecorderCloseButton |
| 4 · D-15 | iOS 原实现为说明与 collars 同行。按卡内兜底让完整说明独占一行布局区域，collars 下一行右对齐；保留 mono13，说明限制两行并由原生 adjustsFontSizeToFit 缩放，覆盖较长配重组合和1.3倍字体。 | `Student/TodayWorkout/SetEntrySheet.swift` 的 plateSection / collarToggle |
| 5 · D-21 | 视频操作键与键内文字不参与压缩；视频行和操作行允许按完整按钮换行，保留原 Change / Delete 行为与后续状态提示。 | `Student/VideoUpload/VideoAttachmentV3Controls.swift` 的 attached / actionButton；`Student/TodayWorkout/SetEntrySheet.swift` |
| 6 · D-02 | GlobalAuthField 空密码时使用正文 semibold16、零额外字距，并明确单行；有内容后恢复原 mono18 与2.52字距，显示/隐藏密码与受控/非受控输入均保留。注册、登录、找回密码共用此字段。 | `Modules/AppShell/Sources/AppShell/Auth/AuthSecureField.swift`；本项按卡修复 Android placeholder 继承样式问题 |
| 7 · D-07 | 查明该日期模板只有 DashboardScreen 一个生产调用方，传入 Intl 完整星期名；只删中文模板额外的“星期”，英文模板不变。 | `Student/Dashboard/DashboardTodayPresentation.swift` 的 headerDateText / weekdayLetter |
| 8 · D-27 | 新增局部共享 BrandSwitch，轨道 gold500 / borderStrong，滑块 gold200 / textMuted，全部来自现有主题 token。替换全仓三个原生 Switch 使用点：训练提醒、相机预览、聊天组选附带视频开关；不改状态与回调。 | `Student/MyProfile/TrainingReminderSettingsView.swift` 的 Toggle tint；`Student/VideoUpload/Camera/CameraRecorderComponents.swift` 的 Save to Photos Toggle；`Modules/ChatUI/Sources/ChatUI/SetRefSharePicker.swift` |
| 9 · D-30 | 仅两枚创建邀请码按钮使用缩小后的水平 padding 和随 fontScale 增大的 flexBasis；空间不足时整键换行，保留两行文字与原字体大小，不影响 Copy / Regenerate 或其他页面按钮。 | `Modules/CoachKit/Sources/CoachKit/Features/InviteCodes/InviteCodesView.swift` 的 secondarySection |

### 测试、自审与设备边界

- 仅修改卡内三处行为 seam：`set-ref-entry.test.tsx` 当前组摄像/Log 向各自回调交同一 draft；`camera-review.test.tsx` 关闭图标与原生 Modal 系统返回在录制/预览态调用关闭，并保留后台、Retry、Use 和文件清理覆盖；`i18n/__tests__/t.test.ts` 中英文 Today 日期模板输出。没有新增镜像样式测试。训练 seam 的相机可用性替身位于 expo-modules-core 原生加载边界。
- 日期先红（收到“10月2日 · 星期周五”）后绿；相机新增系统返回断言先因缺少 Modal 失败，接入后转绿。录制中关闭的测试模拟原生卸载后延迟返回 URI，不依赖 React 卸载时已经清空的 ref。摄像/Log 回调是保持已有行为，新增保护测试在布局改动前后均通过，不冒称该项行为原本失败。证据 `/private/tmp/smallfix-date-{red,green}.log`、`/private/tmp/smallfix-camera-{red,green}.log`、`/private/tmp/smallfix-actions-before.log`。
- review-loop 独立只读双轴初审：Standards 1 项（摄像键仅 minHeight + aspectRatio 未形成方形）；Spec 2 项（同一方形问题，以及长配重说明在360dp@1.3×仍需三行）。分别补明确52dp宽度、两行原生字体自适应后，定向复审两轴均无未决代码发现。RN 自带 Yoga 复现确认284dp操作行中 Log 为223×52dp、摄像键为52×52dp，原始证据 `/private/tmp/smallfix-review-yoga-fixed.{cpp,log}`；此为布局算法证据，不代替设备截图。缺 Matt tracker 配置，已提示完整流程需 `$setup-matt-pocock-skills`；本轮只使用本地批准卡。
- 最终开发自检：`npx jest --runInBand` **137 suites / 995 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 全通过。日志 `/private/tmp/smallfix-final-{jest,tsc,lint}.log`。新增文件仅 BrandSwitch；没有新增依赖、翻译键或配置豁免。
- **未做设备验证**：ADB 不在默认 PATH；明确路径 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb` 存在，但 `adb devices` 启动 daemon 报 `could not install *smartsocket* listener: Operation not permitted`，当前沙箱不允许监听。未构建设备包、未安装、未生成改后设备截图，未验证原生取景/录制/相册保存或真实上传。Light / Dark、360×640dp@1.3×与九项实屏清单仍交 Opus 按卡验收；本节记录开发实现及自检，不宣称功能验收通过。


### 返修第 1 轮（2026-10-02）

- 仅处理任务卡文末三处返修，保留开工已有 WIP；改前快照 `/private/tmp/smallfix-r1-before/`，本轮代码增量 `/private/tmp/smallfix-r1.diff`。未修改其余已通过项、任务卡、PARITY、依赖、eslint 或 TypeScript 配置。
- 第 1 项：删除 `heroHeight` 与整卡测高；金条恢复 `top: 0 / bottom: 0`，直接测量金条自身宽高。`GradientFill` 新增可选数值 `size`，同时传给 Svg / Rect，并以宽高作为 Svg key，在按钮晚出现或内容高度变化后重建原生绘制节点。保留 gold300 → gold400 → gold500 三段渐变；只有本卡金条传入 size，其他调用点仍用原来的百分比尺寸及色标，未改其渲染路径。
- 第 3 项：在 CameraRecorder 外围增加局部 `ColorSchemeProvider scheme="dark"`，取景、预览、权限状态及内部 AppButton / BrandSwitch 统一读取既有深色 token；Use 为金底深字，Retry 为深底浅字。作用域不写入 appearance 偏好、不更改外部主题；关闭、系统返回、录制、后台预览保留及 Retry / Use / Save to Photos 逻辑未改。只读核对固定 iOS `0748931563fefea14e7f50a7c9ee7330b5501bea` 的 `CameraRecorderComponents.swift`。
- 第 9 项关联返修：Copy / Regenerate 复用同屏已验收的 `createButtonStyle`（随 fontScale 增大的 flexBasis、现有 spacing.sm 水平内边距），在已有 flexWrap 容器里整键换行；Single Use / Time Limited 本身未改。
- 全量开发自检：`npx jest --runInBand` **137 suites / 995 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 通过。日志 `/private/tmp/smallfix-r1-{jest,tsc,lint}.log`。本轮为定向样式与绘制修正，沿用已有行为回归，没有新增镜像样式测试。
- **未做设备验证**：按本次沙箱无模拟器的条件，未构建、安装或运行设备包，未生成设备截图。金条实际像素范围（含按钮晚于首帧出现）、相机 Light / Dark 控件外观、邀请码 360dp @1.3× 完整文字仍待 Opus 按返修卡实屏复验；上述自动检查不代表视觉验收通过。未 commit、未 push。
- review-loop 独立只读审查（改前 WIP 快照为基线，仅审本轮增量）：Standards **0 项**；Spec **0 项**。缺 Matt tracker 配置，本轮使用本地批准卡，不冒称已执行 tracker 工作流。此为开发自审，不替代 Opus 收货。


## Spec 084 · CARD-A Android：序号、Today 编辑入口、PR 静默确认、提醒默认日与 D-31（2026-10-02）

### 基线与范围

- 按 `specs/084-walkthrough-polish/CARD-A-android.md` 与 SPEC §2、§3、§5、§6 实装，包含卡内 D-31；不含 B/C 卡。开工已读 AGENTS、CLAUDE（仅引用 AGENTS）、PLAN 与工程规约；仓内不存在 CONTEXT.md / FOLLOWUPS.md / 更深层 AGENTS。已读 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。
- 当前 worktree `meetpr-rn-wt-084a`，分支 `feat/084a-walkthrough-behaviors`，基线 `44b6c80`（与 `fix/walkthrough-small-fixes` 一致）。开工已有未跟踪 `specs/084-walkthrough-polish/`，保留原样。无 commit、无 push；正典 PARITY、spec 与收货记录未修改，本节是唯一文档增量。

### 实装与展示点清单

- `src/domain/plan/sequence.ts` 新增唯一序号入口 `weekDayOrdinals(weekDays)`，按既有 `sequenceDays` 排序，已完成日占号，同一 ID 重复出现只计一次；`dayCode(day, days)` 按所属周调用该入口。排序、日期、游标、完成/撤销、补录归日函数未改。
- 展示点逐项核对：① `dashboard/use-dashboard.ts` Today 标题（当前日及全完成末日）；② `DashboardScreen.tsx` 已完成日与下一练标签；③ `WeekCalendar.tsx` Today / Training 共用周条的可见 D 与无障碍 W#D#；④ `TodayWorkoutView.tsx` 训练标题、QuickLog 标题、补录成功提示、完成总结；⑤ `TrainingCalendarView.tsx` 计划周列表；⑥ `coach/student-detail/OverviewSection.tsx` 教练概览，改为同一入口，避免日历列表过滤/移日造成的下标偏差。
- 全仓查 `day_of_week`、`dayCode` 和 W/D 模板：历史 `HistoryEntriesView` 现状显示日历日期/星期与周标题，聊天 `ChatSetCard` / picker 现状显示日期/组号，没有直接输出 W#D# / D# 的生产位置；没有新增标签或改历史归日。`RnExtras.json` 没有需要转换的 D 模板；本卡仅从该目录同时删除中英文的 `prFirst`、`prPrevious`、`prTitle` 三个废弃键。教练排课 DAY n 不变。
- Today 体重/Meetday 四种空态/有值态均以既有 FeedbackPressable 包裹原 Card，保留外观，提供 button 语义、现有可读标签与按压反馈。经现有 `/(student)/profile` 路由参数进入同一个 ProfileEditor（basics / competition）；允许空档案复用已有空表单，不新增编辑界面。保存沿用 useUpsertOnboarding 与 onboarding query 失效，关闭或系统返回回 Today，不提交未保存表单；路由自身的 navigation 清理参数，避免影响后来聚焦的页面。
- 训练页移除 PRBanner、状态、定时消失逻辑及专用样式。现场录组产生的 PR 在原展示位置确认；进入训练页仍在原 1500ms 回放时机确认该学员全部积压事件，失败保留待下次访问重试，其他账号不受影响。Recorder、repository、点存储结构、Progress 与 PR 判定均未改。
- `training-reminder.ts` 默认值依次取：已保存设置原值；已发布计划游标所在周（全完成取最后周）的 recommendedDate 日历星期；档案训练日；周一/三/五。日期按日期字符串的 UTC 日历取星期，不经过设备时区偏移。`useReminderPreference` 只在未保存时加载现有计划缓存，加载完成再开放设置入口，摘要与设置页使用同一份推导值。SettingsScreen 的保存路径、Session 的“仅恢复已保存设置”行为与持久化格式无需改变，未保存默认值不落盘、不排期。
- D-31：对照既有 `docs/evidence/walkthrough-smallfix-20261002/video-row-360dp-1.3x.png` 中裁切现象，仅在系统字体大于 1× 时让 RPE 刻度行与数字按自然内容高度排版；默认字体保留原高度、字号、间距、颜色。PanResponder、命中计算和 PR #67 的手势逻辑未改；没有样式镜像测试。

### 约定 seam 与红→绿证据

| seam | 红测试观察 | 最终覆盖 / 证据 |
| --- | --- | --- |
| sequence 序号与标签 | 新序号入口缺失导致 1 红 / 13 绿 | 二/四/六/日 D1–D4、补早日重排、已完成占号、重复 ID 与空列表；`/private/tmp/084a-sequence-{red,green}.log` |
| 调用方标签 | WeekCalendar 未传入新标签函数所需的周上下文，调用失败 | 可见 D 与无障碍 W#D# 一致；`/private/tmp/084a-caller-{red,green}.log`。既有 use-dashboard 单训练日在周日的旧 W1D7 断言迁至 W1D1 |
| Dashboard 点击→编辑路由 | 空态/有值态都找不到可点击体重按钮，2 红 | 四种点击→正确编辑器；真实 Basic information 保存 83→84 后 Today 缓存刷新；空档案可打开；Meet / notes 系统返回不发 PUT；`/private/tmp/084a-cards-{red,green}.log` 与 `084a-cards-journey.log` |
| 训练页 PR 处理 | 首次记录/已有记录提升均仍渲染祝贺文本，2 红 | 两种现场 PR 均不展示、已确认、点保留；另补回放时机/全部积压/重进无提示/账号隔离测试，7/7；`/private/tmp/084a-pr-save-{red,green}.log`、`084a-pr-all-green.log` |
| 提醒默认推导 | 应为推荐日期星期 [6,1]，旧实现仍取档案 [2]，1 红 / 18 绿 | 锚点与移日、去重、已完成日、游标周、全部完成末周、draft 排除、档案/一三五回落、已保存空星期不变；`/private/tmp/084a-reminder-{red,green}.log` |

- 只在卡约定四类 seam 增改行为测试；重进 PR 与编辑页往返是在各自既有 seam 的补充覆盖，未冒称它们在补充时再次先红。D-31 无新增测试，原 RPE 手势测试随全量通过。
- 首轮全量 135/137 suites、1001/1003 tests：一处旧序号断言已随新口径修改；另一处未改动的 camera-review 测试报 `window.dispatchEvent is not a function`。相机单独复跑 12/12、最终全量也通过，未声称已查明该间歇错误根因，未改相机代码或豁免测试。编辑路径测试使用 mutation `gcTime: Infinity`，与仓内其他挂载测试相同，避免测试结束后遗留 GC 定时器。
- 最终 `npx jest --runInBand`：**137 suites / 1003 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 均通过。日志 `/private/tmp/084a-jest-final.log`、`084a-tsc-final.log`、`084a-lint-final.log`。未改 eslint / TypeScript 配置或依赖。

### Standards 自审

- 同一实现上下文自审，按 code-review 的 Standards 轴逐一读未提交 diff；不是独立收货。**未决代码发现 0 项**。
- 已核对：单一序号入口、已有设计 token / 反馈组件、无手势变更、翻译目录同步删除、未增加依赖/契约/持久化结构、只改卡内代码与约定 seam。清理横幅后未留未使用导入。检查修正了嵌套 Card 缩进与 route 参数清理归属。
- `docs/agents/issue-tracker.md` 不存在，本轮依用户指定本地批准卡完成自审，没有运行或冒称 tracker 工作流；需要该工作流时先由 David 运行 `$setup-matt-pocock-skills`。

### Spec 自审

- 同一实现上下文对照 CARD-A 与 SPEC 的范围、存量与验收清单。**未决代码发现 0 项**；设备项未验收。
- 已核对四类行为接线、全仓 D 展示清单、日期/推进/补录不变、Profile 编辑器及缓存复用、PR 点保留和静默确认、提醒三级回落及存量设置保留、D-31 默认尺寸与手势不变。没有混入 Plan summary 删除/翻周、登录改版、聊天/播放器改版等 B/C 卡内容。
- **未做设备验证**：当前沙箱没有模拟器，未构建/安装/运行设备包，未产生改后截图。Today、训练页、提醒设置页与组录入页的 Light / Dark，以及 360×640dp、字体 1.3× 下的 RPE 数字，均待 Opus 按卡实屏收货。已有截图只用于理解缺陷，自动测试不能替代 Global 联调、原生导航与视觉验收；不宣布功能验收通过。


## Spec 084 · CARD-B Android：登录顺序、训练周条与 Plan summary 移除（2026-10-02）

### 基线与范围

- 按 `specs/084-walkthrough-polish/CARD-B-android.md` 与 SPEC §1、§4 及其设计转写实装；基线 `7279d3056c3c1b32e68bce72109e6e8550023644`，分支 `feat/084b-week-strip-login`，worktree `meetpr-rn-wt-084b`。开工只有卡 B 为未跟踪文件，保留原样。
- 已读 AGENTS、CLAUDE（只引用 AGENTS）、PLAN、SPEC、任务卡及工程规约；仓内没有 CONTEXT.md / FOLLOWUPS.md / 更深层 AGENTS。已读 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。沿用既有设计 token 与卡 A 的序号入口。
- 不 commit、不 push；不改 PARITY、spec、收货记录、后端、依赖、eslint / TypeScript 配置或持久化结构。本节是唯一文档增量。

### 实装

- `GlobalLoginScreen.tsx` 仅移动既有入口：EMAIL → PASSWORD → Sign in → Create account / Forgot password? → or → Google → 法律文案。显示/隐藏密码、校验、错误展示、路由与 Google 回调保持原样；注册页没有第三方入口，未改。
- 新增纯函数 `src/domain/plan/week-strip.ts`，按计划训练日的实际周分组，提供周列表、完成数、单周序号、进度、当前/选中标记、左右相邻周默认日、返回今日状态和指示点数据。当前周翻回游标日，其他周选首日；已完成周保留；无有效选择时落在游标，全完成时沿用最后训练日回落。
- 新增 `TrainingWeekStrip.tsx`：44dp 左右箭头、W# / 状态胶囊 / 完成数、等宽训练日格、最多 8 周的小点。选中为 textPrimary 2dp 边框；当前日为 goldSoft 底、金色日期与空心圆；完成日绿色对勾。日期允许换行，不限制字体缩放；所有主题色使用现有 token。横滑只在横向位移大于 12dp 且超过纵向 1.5 倍时接管，释放超过 44dp 才翻周，与箭头使用相同目的日。
- `TodayWorkoutView.tsx` 使用周条选择驱动既有日状态；非当前日用 Back to today 替换三个圆形按钮，标题跟随所选 W#D#。新增下拉刷新；手动刷新清空周条选择，离开页面时清空临时选择，完成总结退出后回到当前日。复用既有查询、草稿、补录、计时与完成流程，保留 Today 明确传来的训练导航交接。
- 未来日由 `WorkoutBody.tsx` 复用原动作列表：推荐日期、训练日名称、动作/组数、处方摘要、当前该练的 W#D# 解锁提示。没有 Start / Quick log / 记组入口；当前日及完成日沿用原内容，PR #68 的金色竖条与 Log / 摄像机操作行未改。
- 删除 `TrainingCalendarView.tsx`、9 个 calendar 文案键（含单数键）、2 个替换后废弃的训练页文案键及 calendar 复数索引；删除旧 Plan summary / 原训练周条展示断言，保留既有 hero / 无眉标题断言。同步增加 8 个中英文周条键（含 summary 单数键），组数复用原单复数键；Today 页 WeekCalendar 未改。

### 约定 seam 与红→绿证据

| seam | 红测试观察 | 绿测试与覆盖 |
| --- | --- | --- |
| `global-auth-screens.test.tsx` | Google / or 仍排在 EMAIL 前，顺序断言失败 | 移动入口后 7/7；`/private/tmp/084b-auth-{red,green}.log` |
| `domain/plan/__tests__/week-strip.test.ts` | 首轮公开入口尚不存在；随后翻周目标与指示点分别返回 undefined | 逐项实装后 4/4；周/格状态、序号、独立选中、翻回游标、首尾禁用、8/9 周边界；`/private/tmp/084b-strip-{red,green}-{1,2,3}.log` |
| `quick-log-entry.test.tsx` 的一条新增挂载用例 | 找不到 Next week 入口，原 4 条通过 | 5/5；进入未来周无开练/补录、推荐日期与预览、返回当前训练日、无 Plan summary、圆形刷新入口被替换；`/private/tmp/084b-mount-{red,green}.log` |

- 仅在上述三处约定 seam 新增测试；纯函数的空计划/全部完成/移除选择/完成推进是补充覆盖，新增时已绿，不冒称它们也先失败。没有新增镜像样式、手势内部或其他 seam 的测试。
- 最终 `npx jest --runInBand`：**138 suites / 1008 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 通过。日志 `/private/tmp/084b-jest-final.log`、`084b-tsc-final.log`、`084b-lint-final.log`。全量包括 i18n 守卫及既有记组/计时/补录/完成测试；Jest 输出仍有 react-test-renderer / act、Expo 原生测试环境警告，未屏蔽或修改豁免。
- 首轮全量为 1009 tests；自审删除一个已失去全部断言的 Plan summary 专用测试后最终为 1008。未以删除测试掩盖失败。

### Standards 自审

- 同一实现上下文按 code-review Standards 轴读取全部本卡 diff（含新增文件），不是独立收货。**未决代码发现 0 项**。
- 已核对 token、FeedbackPressable、44dp 箭头命中区、严格类型、双语键、无新依赖与持久化修改。清理旧文案与空测试；未来预览同时处理动作数和组数单复数。没有修改配置、豁免 lint 或引入样式镜像测试。
- `docs/agents/issue-tracker.md` 不存在，本轮使用用户指定的本地批准卡；未运行或冒称 tracker 工作流。需要该工作流时先由 David 运行 `$setup-matt-pocock-skills`。

### Spec 自审

- 同一实现上下文逐项对照 CARD-B 与 SPEC §1 / §4。**未决代码发现 0 项**；设备验收未执行，不宣布功能验收通过。
- 自审修正：刷新/再次点选当前日时，若实际选中 ID 未变，仅重设临时选择，不清空依赖相同加载键的 review / e1RM 数据，避免清空后没有新一轮 effect 加载。周条选择不写存储；保留完成后的原总结流程，在退出总结时解除所选完成日，再回到推进后的游标。
- 已核对未来日只读、已完成日原有展示、首尾箭头、指示点、选中/当前双标记、Back to today、下拉刷新/页面失焦复位；登录入口行为与现有记组/休息/补录/完成路径均沿用。未混入卡 C、Today 周条、Progress、教练端、Google 接通或导航结构修改。
- **未做设备验证**：当前沙箱没有模拟器，未构建/安装/运行 Android 包，未生成设备截图。原生左右滑动与纵向滚动竞争、切 tab 实际往返、Light / Dark、360×640dp 与字体 1.3× 下的换行/命中/主按钮可达性仍待 Opus 按卡验收；自动测试不替代这些实屏证据。

### 改动摘录（完整改动留在未提交工作区）

```diff
-import { WeekCalendar } from '@/features/dashboard/WeekCalendar';
+import { TrainingWeekStrip } from './TrainingWeekStrip';
-import { TrainingCalendarView } from './TrainingCalendarView';
+  const weekStrip = trainingWeekStrip(orderedDays, requestedDayID);
+  const planDay = weekStrip.selectedDay;
-                label={t('student.todayWorkoutView.copy010')}
-                onPress={() => selectDay(cursor.id)}
+                label={t('student.trainingWeekStrip.backToToday')}
+                onPress={() => selectDay(null)}
```

### 返修第 1 轮（2026-10-02）

- 范围仅 `CARD-B-android.md` 文末两项：`TodayWorkoutView.tsx` 删除 `RefreshControl` 导入与 ScrollView 的 `refreshControl`，保留页头按钮及 `refreshToday()` 的 `selectDay(null)` 复位逻辑。
- `WorkoutBody.tsx` 的训练卡/预览卡共用动作小结改为两行：序号靠顶部，动作名在上、处方在下，两段各享有序号右侧全部可用宽度，间距复用 `spacing.xs`；没有省略、行数限制或关闭字体缩放。未触及记组状态的 Log/摄像机行。
- 全量检查：`npx jest --runInBand` **138 suites / 1008 tests passed**；`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）、`git diff --check` 均通过。日志：`/private/tmp/084b-repair1-{jest,tsc,lint}.log`；本轮代码差异：`/private/tmp/084b-repair1.diff`。
- 本轮为删除刷新控件与局部排版，沿用已有行为测试，未新增样式镜像测试；不冒称新增先红后绿证据。未改 eslint/TypeScript 配置、测试或其他原卡实现。
- 独立只读 code-review：Standards **0 项发现**；Spec **0 项发现**。Impeccable layout 静态扫描无发现。以上均不代表设备验收通过。
- **未做设备验证**：沙箱没有模拟器，未构建/安装/运行 Android 包或生成设备截图；默认屏宽与 360×640 dp @1.3×、Light / Dark 下的动作名实际换行及刷新交互仍待 Opus 实屏复验。
- 不 commit、不 push；只追加本卡返修记录，不改正典收货台账。前文的“新增下拉刷新”为首轮历史记录，本轮已按返修要求移除。

```diff
-import { ..., RefreshControl, ... } from 'react-native';
-<ScrollView ... refreshControl={<RefreshControl ... />}>
+<ScrollView contentContainerStyle={styles.content}>
-<Text>{动作名}</Text><Text>{处方}</Text>
+<View style={{ flex: 1, gap: spacing.xs }}>
+  <Text>{动作名}</Text>
+  <Text>{处方}</Text>
+</View>
```

- 返修第 2 轮（2026-10-02）：仅将 `WorkoutBody.tsx` 动作小结改为 `flexWrap` 自适应横排，名称与处方禁收缩并限制最大宽度，空间不足时处方整体下移，无屏宽/字体倍数分支；全量 `npx jest --runInBand` 138 suites / 1008 tests、`npx tsc --noEmit`、`npm run lint`、`git diff --check` 均通过；独立 Standards / Spec 审查各 0 项，日志 `/private/tmp/084b-repair2-{jest,tsc,lint}.log`，本轮差异 `/private/tmp/084b-repair2.diff`；ADB 启动被沙箱拒绝（Operation not permitted），未取得实屏截图，两种尺寸仍待 Opus 复验；其余已有改动未动，不 commit、不 push。

## 2026-10-02 · Spec 084 Card C Android：选组、训练卡、原地回看、休息说明

- 任务：`specs/084-walkthrough-polish/CARD-C-android.md`，参照 `SPEC.md` 设计定稿 §7–§10。开工已读 `AGENTS.md` / `CLAUDE.md`；仓内无 `CONTEXT.md`、`FOLLOWUPS.md`。分支 `feat/084c-chat-video-rest`，基点 `d96de06`，叠在 Card B 上。保留开工时已存在的未跟踪 Card C 文件；不 commit、不 push，不改 PARITY 或收货正典。
- 已查 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)、[react-native-video v6 events](https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/events/) 与 [React Native Modal](https://reactnative.dev/docs/modal)，并核对本地依赖声明；未新增依赖，未改 eslint / TypeScript 配置。

### 实装

- §7：两个入口共用一页 Ask coach：按计划动作身份分卡、三列组网格、卡 A 的 W#D#、问题输入、视频开关与发送复述。训练页预选当前日志或当前计划组；聊天入口未选时禁发。归一化失败的记录不会令视图抛错，超长问题给出既有长度提示并禁发。发送问题后沿原 staging / `sendSetRef` 通道自动提交，等待视频、冻结 body 和 clientId、失败重试、轮询确认、取消暂存继续沿用。`autoSend` 仅为内存 intent 标记，没有新增持久化结构或 wire 字段。
- §8：两端聊天共用“问题正文 → 浅色附件行 → 时间/既有送达状态”结构；无问题时不留正文空白。附件显示动作名与可用快照指标；有视频仍走既有 URL 更新与播放器，无视频点附件可查看该快照。旧 canonical 消息解析和非法快照的普通文本回退保留。
- §9：只为组录入新增 `SetVideoPlayer`：默认暂停、拖动、四档倍速、页内 Modal 放大/缩小、系统返回先缩小。播放状态在 Modal 切换之外保留；缩放与源重载忽略旧进度，等匹配的 `onSeek` 后恢复。以视频选择 `createdAt` 保持身份，压缩 URI / 上传 attachmentId 变化不重置进度与倍速。时间标签复用 `timeText`；倍速菜单处于播放器父边界内，留足四档高度。黑底覆盖系统栏区域，控件避开安全区；状态与 Replace / Delete 按钮组可整体换行。上传管理器、相机、独立 `FeedbackVideoPlayer`、打点和标注未改。
- §10：首次说明改底部可滚动弹层，三档时长经 `restSecondsForRPE({ mode: 'automatic' }, rpe)` 推导并本地化；中英文同步。沿用原 `restTimer.explained.<studentId>` 键与读取时机。链接打开现有 `RestTimerSettingsScreen`，先加载已保存偏好；设置打开期间避免计时结束直接卸载设置页，关闭后仍按原绝对结束时间结算。

### 测试与证据

新增测试仅落在卡片四个约定 seam；旧挂载测试随一页流程和附件文案同步，没有新增视图样式镜像测试。

| seam | 红 → 绿证据（本机临时日志） |
| --- | --- |
| 选组 presentation：分组、格子文案、预选/单选、禁发、复述；非法快照 | `/private/tmp/084c-picker-{red,green}.log`、`/private/tmp/084c-invalid-{red,green}.log` |
| `set-ref-entry.test.tsx` 挂载：两种入口参数的一页 staging、进入会话自动发送及离线同键重试；原有真实训练/聊天入口测试同步 | `/private/tmp/084c-entry-{red,green}.log`、`/private/tmp/084c-send-{red,green}.log` |
| 时间线 presentation：有话/无话、有无视频、缺字段与次数范围 | `/private/tmp/084c-chat-{red,green}.log` |
| 播放 reducer：暂停/播放、四档倍速、拖动、缩放/返回保持状态、忽略恢复前旧进度、源重载 | `/private/tmp/084c-video-{red,green}.log`、`/private/tmp/084c-seek-{red,green}.log`、`/private/tmp/084c-reload-{red,green}.log` |
| 休息说明：三档默认值、默认规则变化随动与中英文格式 | `/private/tmp/084c-rest-{red,green}.log` |

- 最终全量 `npx jest --runInBand`：**140 suites / 1017 tests passed**；`npx tsc --noEmit` 通过；`npm run lint` 通过（0 errors / 0 warnings）；`git diff --check` 通过。日志：`/private/tmp/084c-final-{jest,tsc,lint}.log`。lint 曾缓存编辑中途的旧 import 解析错误，经 `npm run lint -- --no-cache` 清除后重跑原命令；未更改规则或忽略错误。
- 完整实现差异（含新增 src 文件）：`/private/tmp/084c-implementation.diff`。

### Standards 自审

主代理读最终改动，并按 `review-loop` 使用独立只读 Standards reviewer；本仓缺 Matt tracker 配置，未声称运行依赖 tracker 的完整 `code-review` 流程。初审发现新增字号存在字面量，已改为现有 `fontMetrics`，颜色/间距/圆角沿用 `src/design`。定向复审无剩余 Standards finding；未改依赖、后端契约、持久化结构或规则配置。

### Spec 自审

独立只读 Spec reviewer 初审发现小屏倍速菜单裁切与父级边界外触摸风险，已移至播放器尺寸的直接子层并保证菜单空间。定向复审发现小数秒可能撑长标签，已改用现有 `timeText`。主代理补强解码器 seek 恢复与非法选组记录保护，均在约定 seam 留红绿证据；最终定向核实无剩余代码 finding。此结论只覆盖实现与自动检查，不替代 Opus 按卡验收。

**未做设备验证**：沙箱没有模拟器；未构建、安装或运行 Android 包，未取得设备截图。Light / Dark、360×640 dp / 字体 1.3×、原生播放器拖动/倍速/缩放/系统返回、系统栏与相册样片播放，以及实际联调仍待 Opus 按卡收货。未宣称功能验收通过。

### 改动摘录

```diff
- page: 'selection' | 'confirmation' = 'selection';
+ get canSend() { return this.selectedReference !== null; }
- body: canonicalBody(setRef), video
+ body: canonicalBody(setRef, question), video, autoSend: true
- <VideoPlayback ... /> // 点击 Video 后独立呈现
+ <VideoPlayback key={record.createdAt} inline ... />
+ if (uri && inline) return <SetVideoPlayer ... />;
+ restExplanationRows().map(row => /* 默认规则三行对照 */)
```

### 返修第 1 轮（2026-10-03）

- 范围：仅 CARD-C 文末第 1 轮的播放器缩放返修；以本轮开工时的未提交文件为基准，保留其余 Card C 改动。未改 eslint / TypeScript 配置、依赖、上传机制、聊天或独立 `FeedbackVideoPlayer`；不 commit、不 push。
- 复现：新增挂载测试先直接挂载 `SetVideoPlayer`，载入并播放到 24 秒、切为 1.5× 后点放大，原实现触发 Video 的卸载回调 **1 次**，断言失败。红证据：`/private/tmp/084c-r1-red.log`。原实现切换 `View` / `Modal` 根节点，并设置 `loaded=false`、`restoring=true`；这会重建 Video 并等待重新加载。内嵌区域在放大时消失，也会改变滚动内容高度；该滚动成因是代码层判断，未进行设备复现。
- 修复：新增仅用于组录入页的 `SetVideoPlayerHost`，Video 与自定义控件从首次挂载起就位于同一宿主。内嵌态按原位占位测量位置，并使用原生驱动的滚动位移及视口裁切；放大/缩小只切换宿主布局，原 ScrollView 和占位高度保持。使用现有 react-native-video 的 TextureView 支持变换和裁切；缩放不进入重新加载/恢复流程，真实源重载、拖动后的 seek 恢复保留。
- 宿主：组录入 Modal 将系统返回先交给视频宿主缩小；原相机 overlay 返回处理仍优先。底层内容在放大时不接收触摸/无障碍焦点，数字键盘打开时遮住视频层。系统栏区域由同一个透明系统栏 Modal 覆盖，控件仍使用安全区 inset。关闭组录入、删除或替换视频时沿原生命周期释放播放器。
- 回归 seam：最终测试升级为真实 `SetEntrySheet` 挂载，只替代原生模块边界；分别覆盖播放/暂停态下放大、按钮缩小、Android 返回先缩小、Video 实例一致且没有二次挂载、无重新 loading、倍速保持、ScrollView 实例保持、同路径重新选片建立新播放会话、离开时释放。既有 reducer 测试同步为缩放保持连续进度，源重载仍等待恢复；不写视图样式镜像测试。
- 最终检查：`npx jest --runInBand` **141 suites / 1019 tests passed**；`npx tsc --noEmit` 通过；`npm run lint` 通过（0 errors / 0 warnings）；`git diff --check` 通过。日志：`/private/tmp/084c-r1-final-{jest,tsc,lint}.log`。本轮两次全量 Jest 均通过，未复现收货方报告的偶发失败，无法提供对应失败用例名。
- Standards：按 `review-loop` 运行独立只读审查及后续定向复核，0 项剩余 finding。仓内缺少 `docs/agents/issue-tracker.md`，本次未声称执行依赖 tracker 的完整 `code-review`；若以后需要该流程，先由 David 调用 `$setup-matt-pocock-skills`，本轮本地双轴审查不受影响。
- Spec：独立只读初审指出两处布局问题，均已定向修复：菜单使用当前控件高度，占位单独保留内嵌高度；滚动内容高度变化时重新测量播放器位置。定向复核无剩余确定代码问题；不替代 Opus 收货。
- **未做设备验证**：沙箱没有模拟器，未构建/安装 Android 包、未拍设备截图。原生 TextureView 缩放无黑帧/无缓冲、缩小后的实际滚动位置、测量与触摸精度、系统栏、小屏及大字体仍需相册样片实屏验收；mocked 挂载测试只证明 React 生命周期及状态行为。
- 本轮独立差异（含新增文件，相对开工 WIP）：`/private/tmp/084c-r1.diff`。核心变更摘录：

```diff
- return state.expanded ? <Modal>{surface}</Modal> : surface;
+ host.update({ node: surface, anchor, expanded: state.expanded, collapse });
+ return <View ref={anchor} style={{ height: inlineHeight }} />;
- case 'expand': return { ...state, expanded: true, restoring: true };
+ case 'expand': return { ...state, expanded: true };
```
- 2026-10-03 · CARD-C 返修第 2 轮：仅修组录入播放器放大全屏的滚动偏移残留（RN Android Fabric 不恢复移除的原生动画属性；保持同一动画图，放大系数归零、缩小恢复，沿用 Modal 根层黑底及同一 Video 实例），补齐顶部 `Set n · 重量 × 次数 · RPE x`（缺项省略）；组信息挂载断言先红后绿，原同实例/播放与倍速/返回先缩小回归保留；全量 `npx jest --runInBand` 141 suites / 1019 tests、`npx tsc --noEmit`、`npm run lint`、`git diff --check` 均通过，review-loop 独立 Standards / Spec 各 0 finding；证据 `/private/tmp/084c-android-r2-{red,green,jest,tsc,lint}.log`，本轮差异 `/private/tmp/084c-android-r2.diff`；原生偏移原因由代码支持，未做设备验证（沙箱无模拟器），全屏覆盖/系统栏/无黑帧仍待设备收货；保留其他 WIP，不 commit、不 push。
- 2026-10-03 · CARD-C 追加改动（David 真机反馈）：仅改组录入播放器视图与对应测试；内嵌 / 放大态暂停时显示 56×56 半透明深色圆底白色播放按钮，播放隐藏，播完再次出现并从头重播，保留底部播放 / 暂停与现有无障碍文案。两种尺寸的挂载测试先红后绿，覆盖暂停恢复、结束 seek(0)、底部按钮及同一播放器实例；相关 2 suites / 7 tests、全量 `npx jest --runInBand` 141 suites / 1021 tests、`npx tsc --noEmit`、`npm run lint`、`git diff --check` 均通过；review-loop 独立 Standards / Spec 各 0 finding（本地审查，不依赖缺失的 tracker 配置）。日志 `/private/tmp/084c-central-play-{red,green,jest,tsc,lint}.log`，代码差异 `/private/tmp/084c-central-play.diff`。未做设备验证（沙箱没有模拟器）；未改 eslint / TypeScript 配置，保留原有 CARD-C 文档修改，不 commit、不 push。

## 2026-10-03 · INSTANT-COMPLETION：立即庆祝与后台同步

- 任务：`specs/build22-parity/INSTANT-COMPLETION-CARD.md`，分支 `fix/instant-completion-celebration`，开工 HEAD `eb6d6ae`。开工已读 AGENTS/CLAUDE、PLAN、build22 spec/验证记录与 Expo SDK 57 版本文档；仓内无 CONTEXT.md / FOLLOWUPS.md。任务卡为开工已有未跟踪文件，未修改。
- 实装：长按完成先进入 celebration、停止休息计时，再等待后台 mutation；请求在途显示 `Sending to your coach…` / `正在发送给教练…`，成功后恢复现有教练回执。完成请求 30 秒超时后取消传输并走原乐观缓存回滚，关闭尚在显示的完成流程并显示原失败提示；已记录组保留，可重试。Promise 竞速隔离迟到响应，所有结局清理超时计时器。成功缓存更新、刷新及返回 Today 保留；完成 mutation 不再等待后续刷新结束才结束 pending，undo 仍走原请求和等待刷新流程。
- TDD：使用卡约定的训练视图模型/交互 seam，挂载真实 TodayWorkoutView 与 QueryClient，只替代请求和原生边界。先以“请求未返回时已出现奖励页”断言复现红测试，再实现；随后分别以 30 秒假定时器及刷新悬挂场景复现红测试并修复。补充 503 回滚与重试、迟到成功不重开、不覆盖回滚、离开奖励页后失败、中英文回执测试，保留原正常完成/报告与反思持久化测试。
- 证据：`/private/tmp/instant-completion-red-{1,2,3}.log`、`/private/tmp/instant-completion-green-{1,2,3}.log`；最终定向 `/private/tmp/instant-completion-targeted.log`（11 tests）。全量 `npx jest --runInBand`：**141 suites / 1027 tests passed**；`npx tsc --noEmit`、`npm run lint` 与 `git diff --check` 通过。全量日志 `/private/tmp/instant-completion-{jest,tsc,lint}.log`。Jest 有 console 告警，未将测试通过表述为零告警；lint 无 errors/warnings。
- Standards：review-loop 独立只读审查 0 finding，确认超时清理、迟到响应隔离、回滚与 undo 路径。Spec：独立只读审查 0 finding，逐项对应卡内即时庆祝/文案/失败与超时/成功后续/undo；不替代 Opus 收货。缺失 `docs/agents/issue-tracker.md`，未声称执行依赖 tracker 的完整 code-review，已告知该流程需 `$setup-matt-pocock-skills`。
- **未做设备验证**：沙箱没有模拟器，未构建/安装 Android 包，未提供截图；8 秒延迟、503 与正常网络的设备验收仍由 Opus 按卡执行。测试仅证明 mocked 请求边界下的 React 状态与缓存行为，不代表 Global 联调完成。
- 未改上传、周条、backend、eslint/TypeScript 配置；未 commit、未 push。正典台账不在本轮改动内，仅在本 JOURNAL 追加记录。代码差异：`/private/tmp/instant-completion.diff`。

```diff
+ if (!undo) { setRestSeconds(null); setCompletionPhase('celebration'); }
  await (undo ? undoCompletion : completion).mutateAsync(planDay.id);
- if (!undo) { setRestSeconds(null); setCompletionPhase('celebration'); }
```
- 周条 7 天日历格追加（2026-10-03）：仅按 SPEC 末尾 §4 修订与卡 B 追加实装；分页数据源增加训练／休息日历格，复用推荐日期与卡 A 序号，保留原训练日列表供进度／翻周；视图改为星期→状态→D 序号→单行短日期，休息格约 0.7 宽、不可点并有中英文读屏描述，7 格按容器分配宽度、超过 7 格横向滚动（溢出时换周滑动留在换周行，避免抢滚动）。约定 seam 新增四项测试：普通四练、后移超 7 天、同日双练、七天全练；前三项逐个红→绿（`/private/tmp/084b-calendar-{red1,green1,red2,green2,red3,green3}.log`），第四项确认已有实现自然通过，另覆盖锚定星期、跨月与 DST 日期；没有样式镜像测试。最终全量 `npx jest --runInBand` **138 suites / 1012 tests passed**、`npx tsc --noEmit`、`npm run lint`（0 errors / 0 warnings）均通过，日志 `/private/tmp/084b-calendar-{jest,tsc,lint}.log`；Impeccable layout 静态扫描 0 项。本地 review-loop 独立只读 Standards：0 项；Spec：0 项确定实现违规，另记需求边界：首／末依训练序列取推荐日期（与 SPEC 文字和 iOS 同步实现一致），非单调推荐日期可能使范围外训练日不显示，需 Opus 确认两端展示规则，本次未擅改 min/max；缺 tracker 配置，未运行依赖 tracker 的 Matt 流程。**未做设备验证**：沙箱无模拟器，未构建／安装／实屏截图，360dp、大字体、Light / Dark、读屏和原生滚动仍待实屏复验，不宣称验收通过。不 commit、不 push；未动用户原有两份 spec 修改及 eslint／TypeScript 配置；本任务路径 `git diff --check` 通过，全树检查仅命中用户既有 `SPEC.md:162` EOF 空行，保留未动。本次代码差异：`/private/tmp/084b-calendar.diff`。
## 2026-10-03 · UPLOAD-PROGRESS-TIMEOUT：无进度超时与上传百分比

- 任务：`specs/build22-parity/UPLOAD-PROGRESS-TIMEOUT-CARD.md`；排障依据：`docs/diagnose-upload-cellular-2026-10-03.md` Phase 4。开工基线 `fix/upload-progress-timeout` @ `eb6d6ae`，与 `feat/084c-chat-video-rest` 顶一致；无 CONTEXT.md。开工已有任务卡和诊断记录两个未跟踪文件，未改它们。未 commit、未 push；文档仅在本 JOURNAL 末尾追加本节。
- 实现：每片连续 30 秒没有新增发送字节才超时，另设独立 10 分钟绝对上限；阈值放在 model 现有常量处，沿用 `PartUploadError(408)` 和原生取消路径。重复、倒退或非有限字节不续计时；结束后忽略迟到进度并清理计时器。
- 进度：按实际字节汇总已完成/续传分片与全部并发分片，末片按真实大小计权。manager 将 `onProgress` 接入既有 `progress` 字段；已有 session 开始重传时恢复 `uploading`，使 reducer 接收进度。视频行上传中显示 `Sending · 42%` / `发送中 · 42%`，取整数，0% 仅显示 Sending / 发送中；其他状态文案保持原样。
- 边界：分片仍为 5 MiB、并发数不变；没有改退避表、网络变化判定、压缩流程、后端契约、持久化结构、依赖或 eslint / TypeScript 配置。开工查阅 [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) 与 [FileSystem legacy 文档](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem-legacy/)，并核对已安装 SDK 回调类型。

### 红 → 绿与自动检查

测试限定在卡片的 multipart 与视频行状态两个 seam。逐项先运行红测试，再实装：

| 行为 | 本机证据 |
| --- | --- |
| 持续有进度的分片在 80 秒完成；原实现返回超时 | `/private/tmp/upload-slow-{red,green}.log` |
| 30 秒无进度取消并返回 408 | `/private/tmp/upload-idle-{red,green}.log` |
| 持续有进度仍在 10 分钟绝对上限取消 | `/private/tmp/upload-limit-{red,green}.log` |
| 12 MiB 文件：5 MiB 已完成 + 两片并发，正确计入 2 MiB 末片 | `/private/tmp/upload-bytes-{red,green}.log` |
| 中英文整数百分比、0% 不带百分比、等待态原文案 | `/private/tmp/upload-status-{red,green}.log` |
| 原生回调经 multipart、manager、store 到真实视频行；新/已有 session 都更新为 42%，完成后 Delivered | `/private/tmp/upload-wiring-{red,green}.log` |

接线测试最初缺 SafeArea 测试环境，补好环境后才记录有效行为红证据：原实现新 session 仍显示 Sending、已有 session 显示 Processing，均未出现 42%。另补重复/倒退字节不能延长超时、取消后迟到回调不更新进度及无残留定时器的回归。

- 全量 `npx jest --runInBand`：**142 suites / 1029 tests passed**，含 i18n 守卫；`npx tsc --noEmit` 通过；`npm run lint` 通过（0 errors / 0 warnings）；`git diff --check` 通过。日志 `/private/tmp/upload-final-{jest,tsc,lint}.log`。Jest 输出包含既有测试环境 console 警告，未抑制它们。
- 完整代码差异（含新增测试文件）：`/private/tmp/upload-progress-timeout.diff`。

### Standards 自审

主代理亲读最终 diff，并按 `review-loop` 执行独立只读 Standards 审查：**0 finding**，无硬性仓规违反或具实质影响的代码坏味道。缺少 `docs/agents/issue-tracker.md`，未声称运行依赖 tracker 的完整 `code-review` 流程；将来使用该流程需 David 先调用 `$setup-matt-pocock-skills`，本次本地双轴审查不受影响。

### Spec 自审

独立只读 Spec 审查：**0 finding**。卡片的无进度超时、绝对上限、字节进度接线、中英文文案与约束均有实现及自动测试依据；未扩大到切网判定或压缩卡住问题。本结论是开发自测与审查，不替代 Opus 收货。

**未做设备验证**：沙箱没有模拟器；未构建、安装或运行 Android 包，未取得设备截图。300 kbps 限速经虚拟网卡传 2.7 MB 分片、正常网速、分片挂住后约 30 秒超时并按既有退避重试成功，以及百分比真实显示与最终 Delivered，仍待 Opus 按原卡验收。没有宣称设备验收通过。

## 2026-10-03 — UPLOAD-PROGRESS-TIMEOUT 修订一：整体无进度计时

- 基线：`fix/upload-progress-timeout@9941e62`。仅实现任务卡文末「修订一」；未 commit、未 push。开工时卡片已有未提交修改，原样保留。本节只追加，不改已有记录或正典台账。
- 改动：`src/features/training/video-upload/multipart.ts` 与 `src/features/training/video-upload/__tests__/multipart.test.ts`。每次 `uploadFileParts` 调用独立持有共享无进度计时器；任一在途分片新增字节或成功完成即重置。整体连续 30 秒无进展，记录 `PartUploadError(408)` 并沿原有 abort 路径取消所有在途任务。完成任务先移出在途集合，再等待 `onPart`；在途清空与调用收尾均清理计时器。
- 保留每片 10 分钟硬上限、外部中止、百分比上报、退避时间表、并发数、分片大小、压缩参数及文案。
- 按 `tdd` 在卡片批准的公开 seam 上逐轮验证；原生上传与时钟使用 mock / Jest 假定时器。

| 测试名 | 红 → 绿证据 |
| --- | --- |
| `a part idle for 40 seconds succeeds while another part keeps making progress` | 改实现前：期望两片成功，实际 `Part upload returned 408`；1 failed / 24 passed。共享计时后：25 passed。日志 `/private/tmp/upload-revision1-red1.log`、`/private/tmp/upload-revision1-green1.log`。 |
| `completing a part gives the remaining part 30 seconds before an idle timeout` | 补完成事件处理前：剩余片提前取消，期望取消次数 0，实际 1；1 failed / 26 passed。补处理后：27 passed。日志 `/private/tmp/upload-revision1-red2.log`、`/private/tmp/upload-revision1-green2.log`。 |
| `30 seconds without progress on any part rejects with HTTP 408 and cancels both native tasks` | 新增守护用例直接通过（未宣称它曾红）：29,999 ms 两片均不取消，30,000 ms 返回 408，两片原生任务各取消一次，临时文件与计时器清理。 |

验证：

- `npm test -- --runInBand`：**142 suites / 1032 tests passed**（含原有用例）；日志 `/private/tmp/upload-revision1-full-test.log`。
- `npm run lint`：退出码 0，**0 errors / 0 warnings**；日志 `/private/tmp/upload-revision1-lint.log`。
- `npx tsc --noEmit`：退出码 0；日志 `/private/tmp/upload-revision1-tsc.log`。
- `git diff --check`：通过。
- 按 `review-loop` 对上述两个代码文件相对 HEAD 的 diff 做一轮独立只读审查。Standards：**0 finding**；Spec：**0 finding**。本仓仍缺 `docs/agents/issue-tracker.md`；完整 Matt tracker 流程需 `$setup-matt-pocock-skills`，本次使用无需 tracker 的本地双轴审查。按用户范围要求，审查记录仅写本节。

未覆盖验收：ADB 启动报 `could not install *smartsocket* listener: Operation not permitted`，当前沙箱无法连接模拟器；未执行 `hang_parts: 1` 的超时重传至送达、`part_bytes_per_second` 限速无超时及百分比递增的设备验证。真机流量下 20–30 秒视频送达与百分比显示仍由 David 验收。上述结果是开发自测与自审，不替代 Opus 收货。

## 2026-10-03 · UNVERIFIED-SWEEP-FIXES（Opus T1 派工）

- 基线 `d433ef3`，分支 `fix/unverified-sweep-20261003`；仅卡内四项，不 commit、不 push。开工唯一未跟踪文件为本卡；文档仅追加本节，不改正典台账。

### 第 4 项：修前根因与 seam

- 代码确认：`SetEntrySheet` 将 `Animated.ScrollView` 放在 `SetVideoPlayerHost` 的 children 分支；`SetVideoPlayer` 在此分支只返回 anchor 占位。实际画面和中央播放按钮经 `host.update` 挂入宿主后绘制的绝对定位兄弟层。因此画面命中覆盖层时，ScrollView 不在触摸祖先链；视觉上的内嵌不是触摸树内嵌，也没有转交纵向位移的代码。左右留白命中下方 ScrollView，解释卡内两组 swipe 的差异。
- 排查候选：①宿主兄弟覆盖层截断滚动祖先链（代码已确认）；②画面上的全屏 Pressable 抢占（排除：只有 56×56 中央按钮，外层 box-none）；③原生播放器启用触摸控制（`controls={false}`，本地 react-native-video 6.19.2 的 `setControls` 调用 `setUseController(false)`）；④进度条 responder（仅底部轨道，不覆盖画面）。故不是仅删进度条 responder 可以修复的问题。
- 原生复验受阻：已执行 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices`，ADB 监听器报 `Operation not permitted`，无法连接模拟器。未声称实机/模拟器复现或动态排除所有原生因素。依据卡明确允许的代码调查路径继续修复已确认的宿主缺口；diagnosing-bugs 原生复现/最小化环节受该限制，卡内 Opus 的既有复现作为症状来源。
- Jest seam 缺口：现有 react-test-renderer 将 Video 替换为 MockVideo，没有 Android 命中测试、原生 ScrollView 拦截或手势派发。直接调用 PanResponder/scrollTo 只能测试调用，无法让原版“画面起手不滚动”的真实症状变红；本项不新增这种充数测试。后续仍跑现有中央播放、暂停、缩放同实例回归，真实拖动按卡交 Opus 验收。
- 修复方向（本段在改动前记录）：仅为内嵌画面及中央播放覆盖区域添加纵向 PanResponder，将位移转给既有 viewport.scrollTo；点击不抢，横向不抢，进度条不接该 responder；放大态不挂接。保留同一 Video 实例及现有宿主布局。

### 实装结果与先红后绿

1. **倒计时**：根因是本地两个零点的实际毫秒差包含 DST 的 23/25 小时日，`ceil` 不等于日历日差。改用 `Date.UTC` 投影本地年月日再相减，保留同日 0 与过期负数；只读核对 iOS `CompetitionCountdownPresenter.daysUntil` 的 calendar day 口径。已搜索整个 `src/features/dashboard/`，没有其他“本地零点毫秒差 + ceil/floor”的同类写法；`utcDayDistance` 本就用 UTC，滚动 e1RM 窗口及相对反馈时间为时间戳口径，不改。
   - seam：`src/features/dashboard/__tests__/model.test.ts` → `competition calendar days in Europe/London`：`across DST end`、`back across DST start`、`on the same day`、`after expiry`。
   - 红：**2 failed / 14 passed / 16 total**，结束 DST 实际 32、预期 31；反向跨开始 DST 实际 −30、预期 −31。开始 DST 选择反向区间，因为未来正区间经旧 ceil 恰好正确，不能证明该缺陷；同日与普通过期例在旧实现已自然通过。
   - 绿：**16 passed / 0 failed**。无既有 TZ 测试惯例，选择测试内 Date 构造边界代理（Intl 显式 Europe/London）及 now 的本地年月日 getter 注入；保留真实 UTC/static 操作，finally 恢复全局 Date，不新增生产注入参数，不依赖宿主时区。
   - 日志：`/private/tmp/sweep-1-red.log`、`/private/tmp/sweep-1-green.log`。
2. **聊天训练卡**：根因是标题列 `flex: 1` 的零基准宽度使卡片的固有宽度依赖 note/footer。改为 `flexBasis: 'auto'` + grow/shrink，按内容取得宽度并受外层原有 `maxWidth: '88%'` 约束，左右对齐不变。
   - seam：`src/features/chat/__tests__/chat-set-card.test.tsx` → `card sizes its title from content without a note (outgoing: false/true)`，各覆盖带/不带视频；保留原有 5 例。
   - 红：**2 failed / 5 passed / 7 total**（原样式只有 flex:1，缺内容基准）；绿：**7 passed / 0 failed**。
   - 日志：`/private/tmp/sweep-2-red.log`、`/private/tmp/sweep-2-green.log`。
3. **上传状态行**：根因是状态组与其文字允许收缩，Change/Delete 固定占宽时将状态/Retry 压成窄列。状态与 Retry 保持同组自然宽度、不收缩，沿用外层 wrap 使操作组空间不足时另起一行；preparing 同样禁止收缩。按钮标签 numberOfLines=1，最小宽高均用 minimumHitTarget；未动任何上传重试、超时或文案。
   - seam：`src/features/training/video-upload/__tests__/set-video-player.test.tsx` → `video attachment status wraps as a group with single-line actions: failed/uploading/preparing/uploaded`。
   - 红：**4 failed / 4 passed / 8 total**（组无不收缩约束）；绿：**8 passed / 0 failed**，包括现有 4 项播放器用例。测试验证卡指定的样式契约，不声称测过 Yoga 实际排版。
   - 日志：`/private/tmp/sweep-3-red.log`、`/private/tmp/sweep-3-green.log`。
4. **画面起手滚动（已被 Opus 实屏否决，以下仅保留上一轮实现记录）**：默认尺寸下画面起手向下拖动 400/1500ms 后 RPE 坐标均仍为 431，留白起手可变为 794；JS 转发未生效且不提供惯性。该方案已在文末“返修一”撤除，不能视为修好。根因见本节修前调查。上一轮实现使用 View 的 `GestureResponderHandlers`，取全局 pageX/pageY 与起始滚动偏移，仅在单指纵向超过 spacing.xs 且大于横向位移时接管，并调用原 viewport.scrollTo；中央按钮覆盖区域走同一处理，进度条与放大态不挂接。早期 PanResponder.create 被 react-hooks/refs 判为 render 内可能访问 ref，已改为直接 responder 回调，未添加 disable、改配置或引入依赖。点按/播放状态与宿主实例生命周期不变。
   - 本项**无 Jest 原生滚动红例**，原因与交接验收按修前 seam 记录；没有新增与手势无关的测试冒充红例。既有中央播放/暂停/重播、缩放与系统返回同实例回归通过（并入全量）。`/private/tmp/sweep-4-regression.log` 为原有回归，不是拖动被吃掉的红绿证据。

### 最终验证与审查

- `npm test -- --runInBand`（全量）：**141 suites passed / 0 failed；1041 tests passed / 0 failed**。最终日志 `/private/tmp/sweep-final-test.log`；有既有 console warning，未声称零测试日志告警。
- `npm run lint`：**0 errors / 0 warnings**，退出 0。最终日志 `/private/tmp/sweep-final-lint.log`。开发中 refs 规则曾报 1 error，最终结构调整后通过。
- `npx tsc --noEmit`：**0 errors**，退出 0；`git diff --check` 通过。日志 `/private/tmp/sweep-final-tsc.log`。
- `review-loop` 本地独立只读双轴：Standards **0 finding**；Spec **0 finding**。手势实现改为直接 responder 后，两轴均定向复核 0 项确定问题。原生触摸、滚动边界和视觉排版仍有设备验证限制，此结论不替代 Opus 验收。仓内缺 `docs/agents/issue-tracker.md`，未冒称跑过依赖 tracker 的完整 `code-review`；该流程后续需 David 调用 `$setup-matt-pocock-skills`。
- Impeccable layout 按卡保持已有布局/视觉，机械扫描 0 finding；无新设计、导航或文案。开工已读取 Expo 57 版本文档 `https://docs.expo.dev/versions/v57.0.0/`。

### 改动文件（共 9 个）

- `src/features/dashboard/model.ts`
- `src/features/dashboard/__tests__/model.test.ts`
- `src/features/chat/ChatSetCard.tsx`
- `src/features/chat/__tests__/chat-set-card.test.tsx`
- `src/features/training/video-upload/VideoAttachmentControls.tsx`
- `src/features/training/video-upload/SetVideoPlayer.tsx`
- `src/features/training/video-upload/SetVideoPlayerHost.tsx`
- `src/features/training/video-upload/__tests__/set-video-player.test.tsx`
- `docs/CODEX-JOURNAL.md`（仅本卡末尾追加）

代码 diff：`/private/tmp/sweep-implementation.diff`；原有未跟踪任务卡保留未改。不 commit、不 push；没有改 iOS、上传重试/超时、文案或正典台账。

### 尚未覆盖的卡定验收

- §1：模拟器 Europe/London Today 上 2026-10-03→2026-11-03 的实际 31 天显示及同日 0 天表现。
- §2：收/发双侧、无 note/长 note、有/无视频的真实宽度和时间戳位置；Jest 只覆盖样式契约与既有内容回归。
- §3：360×640dp、字体 1.3× 的实际无词内断行及默认尺寸外观；四种状态的真实排版仍待设备检查。
- §4：按卡 adb swipe 从画面上下拖动、中央按钮起手让权、点按播放/暂停、进度条横向拖动与放大态行为，均待 Opus 实屏验收；本实现直接转交位移，没有新增惯性甩动行为。
- 未构建/安装 Android 包，未生成设备截图；ADB 被当前沙箱监听限制阻断，未绕过权限。自动检查通过不代表上述设备验收通过。


## 2026-10-03 · UNVERIFIED-SWEEP-FIXES · 返修一

### 范围与实现

- 本轮仅执行任务卡文末“返修一”。基线 `d433ef3` / `fix/unverified-sweep-20261003`，承接上一轮未提交工作树；不 commit、不 push。第 1、2、3 项已由 Opus 实屏验收，本轮不修改其实现与测试。5 个独立文件 SHA 校验一致；共享 `set-video-player.test.tsx` 中原上传状态行测试逐字保留。
- 更正上一节第 4 项结论：宿主绝对定位画面与 ScrollView 是兄弟层，画面触摸不在滚动祖先链中；上一轮 JS responder → scrollTo 转发被 Opus 实屏否决。本轮删除 `picturePanHandlers`、`pictureDrag`、全部转发回调、`GestureResponderHandlers` 类型、无用 spacing import 和旧转发注释，无残留 scrollTo 转发。
- 宿主内嵌覆盖层容器 `box-none`，视频画面与中央图标层 `none`。中央图标仅展示；ScrollView 内容中的 anchor 增加画面大小的 Pressable，底部排除实测控件条高度，沿现有 host/entry 通道调用当前 `togglePlayback`。未加载、失败或放大时锚点禁用。保持 Video 实例、播放状态和放大态按钮行为。
- 初审发现失败态 Retry 也落入 `none` 子树。补红测试后将错误展示层移为画面 sibling：内嵌错误层 `box-none`、文字 `none`，Retry 可点；不改重试/超时逻辑。放大态错误层仍覆盖全屏。
- 本轮仅修改：`src/features/training/video-upload/SetVideoPlayer.tsx`、`src/features/training/video-upload/SetVideoPlayerHost.tsx`、`src/features/training/video-upload/__tests__/set-video-player.test.tsx`、`docs/CODEX-JOURNAL.md`。任务卡未修改；正典台账未改。

### 先红后绿（卡定组件 seam）

| 测试名 | 红输出摘要 | 绿 |
| --- | --- | --- |
| `inline picture and central play display pass touches through while controls remain interactive` | 1 failed / 8 skipped；picture pointerEvents 预期 `none`，实际 undefined | 通过；同时验证中央图标非按钮、底部播放键及进度条 responder 的 seek |
| `the inline anchor toggles playback from inside the ScrollView and excludes the controls` | 1 failed / 9 skipped；ScrollView 内无锚点按钮 | 通过；校验控件高度扣除、加载禁用、播放/暂停与重播、实例不重挂 |
| `inline playback failure keeps Retry touchable outside the pass-through picture` | 审查返修前 1 failed / 11 skipped；Retry 祖先 pointerEvents 为 `none` | 通过；所有祖先均不禁用触摸，重试后 source 更新 |

- 放大态回归 `the expanded picture accepts touches and its central button plays without remounting` 通过；这是保留行为的回归，不冒称红例。原中央播放/重播、放大/收起/系统返回实例保持以及第 3 项 4 个状态测试全部保留。
- 定向最终：**1 suite / 12 tests passed，0 failed**。日志 `/private/tmp/sweep-rework1-green.log`。
- 红日志：`/private/tmp/sweep-rework1-red-layer.log`、`/private/tmp/sweep-rework1-red-anchor.log`、`/private/tmp/sweep-rework1-red-retry.log`。每个变更先运行确认红例，再实现相应修复。

### 最终检查与独立审查

- `npm test -- --runInBand` 全量：**141 suites passed / 1045 tests passed / 0 failed**，退出 0；`/private/tmp/sweep-rework1-full-test.log`。保留既有 console warning，不宣称测试日志零警告。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/sweep-rework1-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/sweep-rework1-tsc.log`。`git diff --check` 通过。
- `review-loop` 固定开工快照 diff，两个只读 reviewer 独立审查。Standards：初审 1 项 Retry 回归，定向修复后 0 未决。Spec：初审同一 Retry 回归，定向修复后 0 未决。不以本地审查替代 Opus 验收。
- 仓内仍缺 `docs/agents/issue-tracker.md`；使用本地 `review-loop`，未声称执行依赖 tracker 的完整 `code-review`。若启用该流程，仍需 David 调用 `$setup-matt-pocock-skills`；不阻塞本次已授权返修。
- 本轮改动 diff（相对开工脏树，不含第 1–3 项）：`/private/tmp/sweep-rework1.diff`。已读仓规指定 Expo 57 文档 `https://docs.expo.dev/versions/v57.0.0/`。

### 未覆盖的验收项

- Jest 使用 react-test-renderer / MockVideo，不能执行 Android 原生命中、ScrollView 拦截、惯性/回弹或拖动取消按压。pointerEvents 契约与回调测试不证明实际滚动成功。
- 本轮未构建/安装 Android 包、未做模拟器截图或实屏验收。按卡由 Opus 用 `adb shell input swipe 200 1000 200 1500 400`（另测 1500ms 慢拖）及 `adb shell input swipe 1040 1000 1040 1300 300` 验收：画面起手必须使 RPE 坐标变化；默认及小屏上下拖动、惯性、无误触播放、轻点播放/暂停、进度条可拖与放大态均待设备确认。失败态 Retry 的真实点击同样待设备回归。
- 第 1–3 项采用任务卡中 Opus 已通过的结论，不重新开启验收或改动。

## 2026-10-03 · T0 视频行 Replace 文案（Opus 派单）
- `fix/video-row-replace-copy` 基于 `0d74b64`：仅将 `StudentKit.json` 的 `student.videoAttachmentV3Controls.copy004.en` 从 `Change` 改为 `Replace`，中文“更换”不变；唯一运行时使用点为 `VideoAttachmentControls.tsx:198` 更换按钮，另见正式词库与 `docs/w0-reference/i18n/StudentKit.json:3838` 历史定义；测试无硬编码 `Change` 断言。
- 验证：全量 `npm test -- --runInBand` 142 suites / 1056 tests 全通过；`npm run lint` 0 errors / 0 warnings；词库差异校验通过。日志：`/private/tmp/video-row-replace-test.log`、`/private/tmp/video-row-replace-lint.log`。未做模拟器视觉验收；未 commit/push。
## 2026-10-03 — Opus 合并冲突卡：integration/land-main-20261003

- 当前 HEAD `0d74b64`，合并目标 origin/main / MERGE_HEAD `2bf4842`；仅处理两个冲突文件并追加本记录，不 add、commit、push 或 abort。
- `.github/workflows/ci.yml` 冲突取 origin/main 三行（含注释）：fetch base branch 后以 `git merge-base` 计算 BASE，保留 #12 后由 #15 修正的 docs-only 判断，避免旧 PR base.sha 导致误判。
- `src/api/auth.ts` 冲突取 HEAD 三行：phone nullable、email nullable/optional、name nullish，保留 Global 邮箱账号无手机号的形状。
- 核对 #19（`640a3bf`）：auth.ts 的 UserSchema.id 与 domains/shared.ts 的 UuidSchema 均保留非 RFC 4122 GUID 正则；domains/exercises.ts 保留 movement_pattern 数组 / 旧字符串 / null 兼容；domain-schemas.test.ts 两项回归仍在。无 #19 改动被覆盖，无需额外修改；其余自动合并文件未动。
- 验证：`npm test` 全量 142 suites / 1056 tests passed，0 failed；`npm run lint` 0 errors / 0 warnings；`npx tsc --noEmit` 0 errors，三项退出码均 0。原始日志：`/private/tmp/land-main-test.log`、`/private/tmp/land-main-lint.log`、`/private/tmp/land-main-tsc.log`。

## 2026-10-03 — Opus T1：Global 使用数据告知文案与正文滚动

### 范围与实现

- 卡：`specs/build22-parity/USAGE-NOTICE-COPY-CARD.md`；分支 `fix/usage-notice-copy`，开工 HEAD / 基线 `integration/land-main-20261003@9636521`。卡文件为开工已有的未跟踪输入，未修改。未 commit、push、暂存或改动其他工作树。
- `src/i18n/catalog/AppShell.json` 仅替换 `appShell.privacy.analytics.body` 的 en/zh，直接取卡中两段原文；独立逐字核对通过（en 639 / zh 182 字符）。标题与所有其他键值不变。
- `src/analytics/PrivacyNoticeSheet.tsx` 正文放入可收缩、不主动撑高的 ScrollView；sheet 限高 90%，标题、Privacy Policy 链接、Got it 按钮在滚动容器之外。原 tokens、间距、主题和确认流程保留；无溢出时随内容高度展示。
- 新增 `src/i18n/__tests__/usage-notice.test.ts` 与 `src/analytics/__tests__/PrivacyNoticeSheet.test.tsx`，使用卡内指定 seam。组件测试还验证链接 URL、确认回调与确认状态持久化；使用真实应用组件，仅 mock 原生存储/链接系统边界。
- `PARITY.md` 仅新增一行授权差异。仓内未发现 RN catalog 与 iOS 参照全目录逐键比对测试或 Meetday 白名单；测试中引用 `docs/w0-reference` 的仅 `src/i18n/__tests__/t.test.ts` 中 StudentKit 一个格式化用例。沿 Meetday 的台账登记方式处理，未新增豁免、未删测试、未修改参照包。

### 红 → 绿证据

1. `usage notice uses the approved Global copy verbatim in en` / `… in zh`：先运行两条失败，原因是正文包含 `90` / `Alibaba` / `阿里云`；替换文案后两条通过，同时断言含 DigitalOcean 且与定稿逐字一致。日志：`/private/tmp/usage-notice-copy-red.log`、`/private/tmp/usage-notice-copy-green.log`。
2. `privacy notice scrolls the full body while keeping the policy link and confirmation outside the scroll area`：先失败 `No instances found with node type: "ScrollView"`，随后添加滚动容器与限高；运行中修正测试的确认状态函数导入（从公开 analytics 入口读取），定向最终 **2 suites / 3 tests passed，0 failed**。日志：`/private/tmp/usage-notice-layout-red.log`、`/private/tmp/usage-notice-green.log`。
3. 首轮全量测试通过，tsc 暴露新增参数化用例 `as const` readonly tuple 与 Jest 回调签名不兼容，改为 `satisfies [Locale, string][]`，未改变测试行为；最终重新跑全量、lint、tsc 均通过。

### “90 天”排查与历史参照更正指针

- 全仓检索 `90\s*(天|days)`，并补搜 `retained for 90` / `保留\s*90\s*天` / `Alibaba Cloud` / `自建阿里云`。运行时使用数据旧表述只在本次已替换的 AppShell 正文，无其他运行时代码或文案需要同步。
- `docs/w0-reference/i18n/AppShell.json:87–88` 保留旧 en/zh：卡明确要求不改 iOS 历史参照。
- **更正 `docs/w1-reference/peripheral-screens.md:121` 的使用数据正文适用性**：其中“阿里云 / 不出境 / 90 天”是历史 CN 参照，已不适用于 RN Global；本卡定稿与 `src/i18n/catalog/AppShell.json` 为当前正文，美国 DigitalOcean、账号存续期间保留、删号后断开关联成为匿名记录。遵本次“仅 JOURNAL 末尾追加、PARITY 一行例外”的硬约束，原文未编辑，待 Opus 同步正典参照说明。
- 任务卡背景中的旧表述用于说明被修问题，保留不改。其余 StudentKit 的“90 days / 90天”、成长/历史测试、w1 训练/成长参照、既有 JOURNAL 及截图 XML 命中均是成长曲线时间窗口，不是使用数据保留期，不改。

### 最终验证与开发自审

- `npm test -- --runInBand`：**144 suites / 1059 tests passed，0 failed**，退出 0；`/private/tmp/usage-notice-full-test.log`。既有测试输出警告不作零警告承诺。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/usage-notice-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/usage-notice-tsc.log`。`git diff --check` 通过。
- `review-loop` 一轮独立只读双轴自审：Standards **0 项实质问题**；Spec **0 项实现问题 / 0 项越界**，模拟器证据缺口另列。固定 diff `/private/tmp/usage-notice-review.diff`（测试随后仅修复上述 TypeScript 类型标注）。自审不替代 Opus 收货。
- 仓内无 `docs/agents/issue-tracker.md`；本次执行不依赖 tracker 的本地 review-loop，未声称执行完整 tracker code-review。若启用后者需 David 调用 `$setup-matt-pocock-skills`，不影响本卡实现。
- 开工已读 Expo 57 指定文档 `https://docs.expo.dev/versions/v57.0.0/`。本卡只涉及 RN 现有 ScrollView 与文案，没有新增依赖。

### 未覆盖的验收项

- ADB 探测失败：`adb devices` 启动 daemon 时报告 `could not install *smartsocket* listener: Operation not permitted` / `cannot connect to daemon`，当前沙箱不允许提权。没有安装 fixture 包、清除应用数据或运行模拟器交互，也没有截图证据。
- 卡验收 1 未覆盖：全新安装首启英文最后一句可读、Got it 进入登录页、再次启动不再弹。Jest 的确认持久化和回调通过不等于设备流程通过。
- 卡验收 2 未覆盖：360×640dp、系统字体 1.3× 下实际滚动、正文无截断、Privacy Policy 与 Got it 可点；默认尺寸外观仍须实屏对照。react-test-renderer 不执行原生排版，结构断言不证明几何尺寸或触摸命中。
- 卡验收 3 自动检查已通过，最终是否收货由 Opus 按原卡判断。

## 2026-10-04 — Opus T2：D-16 安卓休息倒计时通知

### 范围与交付状态

- 输入：`specs/d16-rest-timer-notification/SPEC.md`、同目录 `CARD.md` 全文；当前分支 `feat/d16-rest-timer-notification`，HEAD `13c7eb1`，实现基线 `main@cab3b40`。开工工作树干净，未 commit、push、暂存或修改别的工作树。不存在仓内 CONTEXT.md / FOLLOWUPS.md / 更深层 AGENTS；CLAUDE.md 仅引用 AGENTS.md。
- 仅开发实装与自测完成，不宣布 Opus 验收通过。页内计时条的 JSX 布局、样式、文案、按钮规格保持原样；Skip handler 接入统一关闭。原说明/设置弹层继续暂停计时轮询，保留原墙钟终点口径。未新增依赖、权限或前台服务，未改变已有 expo-notifications 训练提醒/上传失败链路。
- 本树无 `android/`，依卡未生成原生工程、未安装或操控模拟器。读取了指定 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。

### 改动文件清单（20 个）

- 原生模块（新增 6）：`modules/rest-timer-notification/expo-module.config.json`、`android/build.gradle`、`android/src/main/AndroidManifest.xml`、`android/src/main/java/com/meetpr/resttimer/RestTimerNotificationModule.kt`、同目录 `RestTimerNotifications.kt`、`RestTimerReceiver.kt`（后五项均相对该模块目录）。
- 状态与接线（新增 3、修改 3）：`src/features/training/rest-timer-session.ts`、`rest-timer-notification.ts`、`RestTimerNotificationSession.tsx`；同目录 `RestTimer.tsx`、`TodayWorkoutView.tsx`；`src/app/_layout.tsx`。
- 文案（修改 1）：`src/i18n/catalog/RnExtras.json`，新增通知标题、结束正文、两个渠道名、+30s 五个 en/zh 键，Skip / Rest complete 复用现有键。
- 测试（新增 2、修改 3）：`src/features/training/__tests__/rest-timer-session.test.ts`、`rest-notification-routing.test.tsx`；同目录 `rest-timer.test.tsx`、`set-save.test.tsx`；`src/analytics/__tests__/root-layout.test.tsx`（仅补 router 系统 mock）。
- 记录（修改 2）：本 JOURNAL 末尾与 `PARITY.md` 一行授权差异。SPEC/CARD 未改。

### 全部“休息结束或终点变化”接线

| 路径 | 接线与结果 |
| --- | --- |
| 正常记组成功，且仍有未完成组 | 原有时长计算不变；递增 restGeneration 重新挂载会话，即使时长与上次相同也获得新终点；旧实例 cleanup 取消原通知。最后一次异步读取后校验焦点与 restRevision，旧保存回调不能复活已取消休息。 |
| 页内 -30s / +30s | `RestTimerSession.adjust` 更新墙钟终点，剩余夹在 0–900 秒；后台状态同步 show，降到 0 同步 hide。 |
| 页内 Skip | `close` 一次性关闭自身，立即 hide，然后只调用一次父 `endRest`。 |
| 前台走完 | `tick` 一次性发完成事件，hide，原 80 ms 轻震、Rest complete 文案和 3 秒自动关闭保留。 |
| 后台走完 | JS 不震动、不卸载、不取消原生闹钟；Receiver END 取消倒计时并发送结束通知。回前台清通知，计时条显示完成并自动关闭，不补第二次震动。 |
| 通知 Skip | Receiver 原子取消通知/闹钟、持久化 skipped；前台 consume 后关闭计时条，onClose 一次。 |
| 通知 +30s | Receiver 用持久化 endAt 加 30 秒并夹在 now+900 秒内，重发倒计时/闹钟并保存 changedEndAt；前台先 consume 再 hide，再按新终点计算剩余。 |
| 打开下一组（openDraft） | 先 `endRest` 再打开记录 sheet，因此打开下一组后切后台无上一段休息通知；本组成功保存仍按既有规则开始下一段休息。 |
| 完成当天 completeDay（非 undo） | 原清理点统一走 `endRest`，发请求前即结束休息；undo 不主动开启休息。 |
| quick-log 全部完成 | 原清理点统一走 `endRest`。 |
| 切换不同训练日（selectDay） | `endRest`，重复选择同一天保持现状。 |
| Training 跳转 handoff / jumpToken | 清录入状态时一并 `endRest`，使旧保存回调失效。 |
| 离开训练页（focus cleanup） | `endRest` + 焦点 false；失焦并返回也不会让旧异步回调重开休息。 |
| 页面卸载、退出登录、父级移除计时条、durationSeconds 变 null/变值 | RestTimer effect cleanup 取消间隔/自动消失任务并 hide；新实例不恢复旧原生状态。 |
| 首次说明与其休息设置弹层 | 初始存储读完且两弹层均关闭才解除 paused；未在走时后台不 show。保持原有墙钟终点，不另造冻结/延后时长行为。 |
| AppState 非 active / active | 非 active 且在走且已授权才 show；重复非 active 事件不覆盖原生 +30s。active 先 consume 三态再 hide；权限未授予不 show/hide/consume，也不请求权限。原生 foreground 生命周期额外及时清理通知/闹钟，保留待消费按钮状态。 |

### 红 → 绿证据（公开 seam）

1. 纯状态 `rest-timer-session.ts`：
   - `running rest publishes its wall-clock end only on entering background`：首次模块缺失导致 suite 红（0 tests executed），最小实现后 1/1 绿。`/private/tmp/d16-session-1-{red,green}.log`。
   - `adjustments clamp remaining rest to zero and fifteen minutes and replace background notification`：缺 adjust → 1 failed/1 passed → 2 passed；`d16-session-2-{red,green}.log`。
   - `foreground consumes unchanged / extended / skipped native state before hiding notifications`：缺消费/关闭状态 → 3 failed/2 passed → 5 passed；`d16-session-3-{red,green}.log`。
   - `pause, skip and expiry never publish a non-running rest`：缺 setPaused → 1 failed/5 passed → 6 passed；`d16-session-4-{red,green}.log`。
   - `repeated non-active events cannot overwrite a native extension`：show 收到 2 次而要求 1 次 → 1 failed/7 passed → 8 passed；`d16-session-5-{red,green}.log`。
   - `denied notification permission leaves every native operation untouched` 为补充约束用例，加入时已有权限门控，直接绿，未冒称独立红证据。最终该 seam 8/8 通过。
2. RestTimer 组件 seam：
   - `foreground remaining time follows the notification extension`：显示 2:00 而非 2:30 → 1 failed/4 passed → 5 passed；`d16-component-1-{red,green}.log`。初次测试的原生 mock 配置错误先修正，最终红日志为行为断言失败。
   - `notification Skip closes the overlay and calls onClose exactly once on foreground`：onClose 0 次 → 1 failed/5 passed → 两 seam 合跑 13 passed；`d16-component-2-{red,green}.log`。
   - `returning after background expiry clears notifications without a second vibration`：实际多震动一次 → 1 failed/9 passed → 10 passed；`d16-component-3-{red,green}.log`。
   - 补充通过：原四条前台外观/交互/震动/卸载回归，background expiry 无 JS 震动/关闭，说明弹层阻止后台通知，duration 变更与卸载取消。现有设置弹层亦接同一 paused 判定，但没有新增该弹层的独立交互测试。最终该 seam 10/10 通过。
3. 附加接线 seam：
   - `cold and warm notification taps open training only after student bootstrap and are consumed once`：新会话模块缺失导致 suite 红 → 1 passed；`d16-routing-{red,green}.log`。
   - `recording the next set closes the previous rest before returning to background`：打开下一组后仍见 Skip → 1 failed/7 passed → 8 passed；`d16-next-set-{red,green}.log`。
   - `a rest preference read cannot revive rest after leaving Training (return first: false / true)`：离页后两个分支均重现旧 Skip → 2 failed/8 passed → 10 passed；`d16-save-race-{red,green}.log`。先修正 AsyncStorage mock 递归，再取得该行为红证据。
4. 原生 Receiver seam：仓内现有两个本地 Android 模块没有 JUnit/Robolectric/仪器测试基础设施；本次未新增依赖或虚构 Receiver 自动化测试。+30 上限、skip 持久化、进程死亡后继续工作仍须 Opus 用设备验证，步骤见下。

### 原生实现与自动链接

- 模块结构、Gradle plugin 与现有两个本地模块一致；`expo-module.config.json` 注册 `com.meetpr.resttimer.RestTimerNotificationModule`。Expo 默认扫描 `./modules`，[官方自动链接说明](https://docs.expo.dev/modules/autolinking/)；现场 `npx expo-modules-autolinking resolve --platform android --json` 已解析本树 sourceDir、模块名与 classifier，输出 `/private/tmp/d16-autolinking.json`。
- 已有验收树的 `android/settings.gradle` 使用 `expoAutolinking.useExpoModules()`。同步完整模块目录及本次 JS 改动后重新跑 Gradle 即可发现新模块并合并 Manifest；不需要仅为此重新 prebuild。若验收树还没有 android，则先按该树原流程生成。必须重建并安装原生包，Metro reload/OTA 不能添加 Kotlin 模块。
- `NotificationCompat` 来自现有 expo-modules-core 的 `api androidx.core:core-ktx:1.17.0`，无新增 Maven/npm 依赖。模块 Manifest 只声明 `exported=false` Receiver，所有 PendingIntent 都是 IMMUTABLE。POST_NOTIFICATIONS / SCHEDULE_EXACT_ALARM 已由现有工程声明；现有生成的 app Manifest 也已有 VIBRATE，本卡未新增权限。
- SharedPreferences 保存终点、按钮变更、全部本地化文字和会话 token。Receiver 不调用 JS；相同锁串行化原生读写，过期 token 和旧终点 END 不影响新计时。foreground 清理保留未消费按钮状态；冷启动清理通知，不恢复页内计时。
- 缓存 Kotlin 2.1.20 编译器 + Android 36 android.jar + 本机已有 Expo/RN/AndroidX classpath，独立编译三份 Kotlin 源：退出 **0，0 errors，0 warnings**，class 输出 `/private/tmp/d16-kotlin/classes`。命令脚本 `/private/tmp/d16-compile-kotlin.py`，日志 `/private/tmp/d16-kotlin-compile.log`。这只证明 Kotlin/API 类型自洽，不等于 Manifest/Gradle/APK 整包构建通过。

### 开发自审与最终检查

- 本地 `review-loop` 独立 Standards / Spec 两轴初审均找到同一 P2：偏好读取 await 后复活已取消休息。补两条红测试、统一 endRest + revision 后，第二轮定向复审 Standards **0 剩余代码问题**，Spec **0 剩余代码问题**；平台差异与设备未验另列。快照 `/private/tmp/d16-review.diff`、`/private/tmp/d16-review-final.diff`。这是开发自审，不是 Opus 收货终审。
- 仓无 `docs/agents/issue-tracker.md`；本次跑无需 tracker 的本地 review-loop，没有声称执行 tracker code-review。若另启后者需 David 调用 `$setup-matt-pocock-skills`。
- `npm test -- --runInBand` 全量：**146 suites / 1077 tests passed，0 failed**，退出 0；`/private/tmp/d16-full-test.log`。有仓内既有 React/Expo 测试警告，不声称零测试 warning。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/d16-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/d16-tsc.log`。
- 首轮全量暴露根布局旧 router mock 缺 useRouter，补系统边界 mock 后通过。首轮 lint/tsc 暴露 effect/ref 和测试显式 Jest imports，均已修正；未降低 lint 或测试门槛。
- `git diff --check` 通过。所有日志均不含账号/凭证。

### 原生 Receiver / 模拟器验证入口（未执行）

遵 SPEC 原验收 1–11，不另定验收范围。安装新原生包后，从训练页真实记组开始倒计时再 Home：

```sh
adb shell input keyevent KEYCODE_HOME
adb shell dumpsys notification --noredact | rg -A30 'com.meetpr.app|rest-timer|rest-complete'
adb shell dumpsys alarm | rg -A15 'com.meetpr.resttimer|com.meetpr.app'
adb shell cmd statusbar expand-notifications
# 在通知上实际点 +30s / Skip；回 App 对照页内计时。
# debug 包可查看按钮的持久化状态；其中没有账号凭证。
adb shell run-as com.meetpr.app cat shared_prefs/rest-timer-notification.xml
# 返回后台后杀后台进程（不能用 force-stop；force-stop 会禁用闹钟，与回收不同）。
adb shell am kill com.meetpr.app
```

验证 Receiver action 的可选工程方法：`exported=false` 是硬约束，普通 `adb shell am broadcast` 会被系统拒绝，不能据此说按钮坏了，也不能为了测试把 Receiver 导出。优先用通知按钮自身的 PendingIntent。仅在可 root 的 AVD：`adb root` 后确认 `adb shell id` 为 uid=0，读取当前 prefs 的 token/endAt，再触发（每次新 rest 都须重新读取 token）：

```sh
adb shell am broadcast -n com.meetpr.app/com.meetpr.resttimer.RestTimerReceiver -a com.meetpr.resttimer.ADD_30 --es token '<当前 token>'
adb shell am broadcast -n com.meetpr.app/com.meetpr.resttimer.RestTimerReceiver -a com.meetpr.resttimer.SKIP --es token '<当前 token>'
# END 要当前 endAt 且真正已到终点；提前触发只会重新安排，不伪造提前完成。
adb shell am broadcast -n com.meetpr.app/com.meetpr.resttimer.RestTimerReceiver -a com.meetpr.resttimer.END --es token '<当前 token>' --el endAt '<当前 endAt>'
```

连点 +30s 后从 prefs 及通知对照不超过 900 秒；Skip 后查通知/闹钟均无残留、prefs skipped=true，回前台消费后 cleared。进程被杀后的按钮与结束提醒也按 SPEC 10 真实点击/等待。结束提醒精确定时权限未授权时允许晚到，不触发权限请求；锁屏用真实电源键/模拟器锁屏验证。

### 未覆盖的验收与需 Opus/David 判断的系统差异

- SPEC **1–10** 的模拟器实测均未执行：通知原生每秒跳动、≤1秒同步、锁屏可见、前台清理、按钮/上限、震动/横幅/路由、前台外观、权限关闭、最近任务划掉与回收后行为，都不能以 Jest 或独立 Kotlin 编译替代。以上代码自测仅提供对应 seam 证据。
- SPEC **11**：三项 JS 检查已通过；Gradle 原生整包编译仍由 Opus 在另一工作树执行，当前未覆盖。
- SPEC **12**：David 的 vivo 真机 1/2/6/10 全部未覆盖，尤其厂商后台定时限制。
- **SPEC“不可滑动清除”存在已证实的平台差异**：Android 14 起，普通 `setOngoing(true)` 通知在解锁状态下仍可被用户单独划除；锁屏及 Clear all 除外。[Android 官方说明](https://developer.android.com/about/versions/14/behavior-changes-all#non-dismissable-notifications)。本实现忠实使用 SPEC 指定 ongoing 原生方案，不用伪装电话/媒体通知或新增服务/权限绕过。该要求不能宣布全平台满足；请 Opus/David 决定验收口径。SPEC 原文未擅改，其余已授权实现未因此停工。

## D-16 返修一（2026-10-04，增补一；开发自测）

### 开工 API 核实（先于测试与实现）

- 基线 `feat/d16-rest-timer-notification@ea5be38`；开工 WIP 仅 SPEC/CARD，本轮保留，不 commit/push。未发现 CONTEXT/FOLLOWUPS；CLAUDE 仅引用 AGENTS。
- 已读 [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) 与 [Android Live Update 官方要求](https://developer.android.com/develop/ui/views/notifications/live-update)。
- 本机 Gradle 缓存 `androidx.core/core/1.17.0/1eb461d3499f5bb832dd45edd3982471a11a3f95/core-1.17.0.aar` 解出 classes.jar，经 JDK 21 `javap` 核实包含 `NotificationCompat.ProgressStyle`、`Builder.setRequestPromotedOngoing(boolean)`，无需平台 API fallback。证据 `/private/tmp/d16-core-api/api.txt`。
- `javap -c` 核实 `ProgressStyle.apply`：SDK >=36 转平台 ProgressStyle；SDK <36 调平台 `Builder.setProgress(max, min(progress,max), indeterminate)`，会画标准进度条，无需额外 fallback 分支。证据 `/private/tmp/d16-core-api/bytecode.txt`。模块将显式声明 `androidx.core:core:1.17.0`。

### 增量实现与兼容 API 调用清单

- JS：`TodayWorkoutView` 在真实记组触发休息时取得该组 `draft.exercise.exercise_id` 的已解析名称，缺失传空（不使用通用动作占位文案），通过 `RestTimer.exerciseName` → `RestTimerSession.start(seconds, body)` → 通知 adapter → Expo `show(endAtEpochMs, startedAtEpochMs, body, labels)`。开始时间只在 start 写入；页内加减、原生 +30s 回前台、反复前后台均不重置开始时间。
- Kotlin：`startedAt/endAt/body/token` 全存 SharedPreferences；每次 publish 用 `(now-startedAt)/(endAt-startedAt)` 算已休息比例，截断到 0–1000。+30s 保留 startedAt，扩大分母，剩余上限仍为 900 秒。图标五档原样拷贝且逐字节核对相同。
- 新增或变更的兼容 API 都在 `RestTimerNotifications.kt`：
  1. `publish` → `NotificationCompat.Builder.setRequestPromotedOngoing(true)`，交由系统决定是否提升，不读权限后弹请求、不设 shortCriticalText。
  2. `publish` → `NotificationCompat.ProgressStyle()`、`ProgressStyle.Segment(PROGRESS_MAX)`、`Segment.setColor(BRAND_GOLD)`、`ProgressStyle.addProgressSegment(...)`、`ProgressStyle.setProgress(progress)`、`Builder.setStyle(...)`。单段总长 1000，core 在 <36 内部调用标准 setProgress；代码没有直接平台 ProgressStyle 调用。
  3. `publish` → `Builder.setContentText(body.takeIf { it.isNotBlank() })`、`setColor(BRAND_GOLD)`、`setSmallIcon(R.drawable.ic_stat_meetpr)`、`setPriority(PRIORITY_DEFAULT)`、`setSound(null)`、`setVibrate(longArrayOf(0))`。移除 setSilent，避免兼容库自动分入 silent group；渠道负责默认重要度且无声无震。
  4. `receive/END` → `Builder.setSmallIcon(R.drawable.ic_stat_meetpr)`；结束提醒的其余 builder 配置不变。
- 沿用兼容调用：`isPermissionGranted` 的 `NotificationManagerCompat.from(...).areNotificationsEnabled()`；倒计时 builder 的 setContentTitle / setContentIntent / setWhen / setShowWhen / setUsesChronometer / setChronometerCountDown / setOngoing / setOnlyAlertOnce / setTimeoutAfter / setVisibility / addAction（两处）/ build；END builder 的 setContentTitle / setContentText / setContentIntent / setAutoCancel / setVisibility / setPriority / setSound / setVibrate / build。均经本机 core 1.17.0 classpath 独立 Kotlin 编译核对。
- 新渠道 `rest-timer-v2`：IMPORTANCE_DEFAULT、sound=null、vibration=false、VISIBILITY_PUBLIC；创建时删除旧 `rest-timer`；结束提醒渠道不变。品牌金沿用 tokens.gold500.light = #D97706。Manifest 唯一新增权限 POST_PROMOTED_NOTIFICATIONS；Receiver 仍 exported=false；所有 PendingIntent 仍 FLAG_IMMUTABLE；无前台服务、无其他新依赖。
- `RestTimer` 的页内 JSX、样式、文案、按钮处理均未修改。`RnExtras.json` 无需改动。

### 红 → 绿（公开 seam）

按三轮纵向推进，每轮先执行测试证实失败再实现：

1. `background progress keeps the original start across foreground time adjustments`：初跑期望 show(121000,1000,'')，实际只有 show(121000)；1 failed / 8 passed → 9 passed。日志 `/private/tmp/d16-r1-red-session.log`、`d16-r1-green-session.log`。
2. `background notification receives the rest start and exercise body (%s)`：参数 `Competition Deadlift` 和 `undefined`；初跑缺 startedAt/body，2 failed / 10 passed → 两个相关 suite 共 21 passed。日志 `/private/tmp/d16-r1-red-body.log`、`d16-r1-green-body.log`。
3. `saved set supplies its exercise name to the background rest notification (%s)`：真实 TodayWorkoutView 记组至原生边界；有名称案例初跑收到空串，1 failed / 11 passed → 12 passed。无名称案例初跑即绿，是空正文回归覆盖，不谎称该案例红过。日志 `/private/tmp/d16-r1-red-save.log`、`d16-r1-green-save.log`。

### TICK 排程、取消与 END 隔离

- `show` 先 hide 旧会话、写新 token，publish → schedule END + scheduleTick。`ADD_30` 写新终点后同一路径，重排 END 与 TICK。TICK 使用 action `com.meetpr.resttimer.TICK` / requestCode 4；END 使用独立 action / requestCode 3。
- `scheduleTick` 先取消旧 TICK，若 now+10000 < endAt，排单次 RTC_WAKEUP。精确定时可用时 setExactAndAllowWhileIdle，否则 setAndAllowWhileIdle；精确权限竞态被拒绝也回退非精确。每次有效 TICK 的 publish(rescheduleEnd=false) 后续排自己。Doze/厂商节流可令 10 秒更新延后，墙钟终点和系统 chronometer 不依赖刷新频率。
- Receiver 先读持久化 token/endAt，与 Intent token 不符直接 return，绝不取消或重排当前会话任何 alarm。到期 TICK 仅 cancelTick 并 return，保留 END 和持久化状态，让迟到的 END 发结束提醒。
- hide、Skip、END、进入前台（含冷启动）、JS close/卸载/页内跳过或减至零，均走 hide 取消 TICK；hide 同时删除 token，已排队的旧 TICK 即使到达也无效。publish 检测通知权限撤回也 hide。

### 自测、构建范围与自动链接

- `npm test -- --runInBand`：**146 suites / 1082 tests passed，0 failed**；`/private/tmp/d16-r1-full-test.log`。保留仓内既有 React/Expo 测试警告，不声称零测试 warning。
- `npm run lint`：**0 errors / 0 warnings**；`/private/tmp/d16-r1-lint.log`。
- `npx tsc --noEmit`：**0 errors**；`/private/tmp/d16-r1-tsc.log`。首跑发现新增测试监听器 string 比 AppStateStatus 宽，改为系统声明类型后通过。
- 独立原生检查：Android 36 AAPT2 编译五档真实 res、链接模块 Manifest（仅在临时副本补 package 供独立链接）、生成 R.java 并 javac；以真实 R class + Android 36 / core 1.17.0 / 现有 Expo/RN classpath 编译三份 Kotlin，**退出 0，0 errors / 0 warnings**。产物及脚本 `/private/tmp/d16-r1-native/`。这不等于 Gradle dependency resolution、Manifest merge 或 APK 构建通过。
- 本树仍无 android/，未运行 prebuild 或改验收树。模块注册及 expo-module.config.json 未变；验收树若第一版已经 autolink，只需同步 JS 与整个模块（包括 build.gradle、Manifest、res）并重新构建原生包，通常无需重新 prebuild。新树则按原 Expo prebuild/autolinking 生成工程。不能只 reload JS 使用旧原生包，因为 show 签名已改变。
- 本地 review-loop 双轴独立只读审查：Standards **0 硬违反 / 0 实质坏味道**；Spec **0 实现问题**。固定代码快照 `/private/tmp/d16-r1-review.diff`；审查后仅修正测试类型和追加交付记录，无产品语义变化。非 Opus 验收结论。仓缺 issue-tracker 配置，未声称执行 tracker code-review；后续该流程需 David 调用 `$setup-matt-pocock-skills`。

### Opus 的 adb 验证入口（未执行）

按 SPEC 原清单 13–19 收货，不替换或缩小验收范围。Android 16 和 15 各安装重新构建的包，由训练页真实记组开始休息后 Home：

```sh
adb shell input keyevent KEYCODE_HOME
adb shell cmd statusbar expand-notifications
adb shell dumpsys notification --noredact | rg -A60 'com.meetpr.app|rest-timer-v2|rest-timer|16001'
adb shell dumpsys alarm | rg -A20 'com.meetpr.resttimer|com.meetpr.app'
adb shell run-as com.meetpr.app cat shared_prefs/rest-timer-notification.xml
```

检查新渠道 importance=3、sound=null、无震动、旧渠道删除；通知为 MeetPR icon + 动作名/空正文 + 两按钮。检查 android.progress / android.progressMax 及 progress segments；Android 16 检查 FLAG_PROMOTED_ONGOING（dump 可能只输出 flags 十六进制，可按该 AVD SDK 的 FLAG_PROMOTED_ONGOING 常量解码），并亲看胶囊倒计时与锁屏。关闭系统实时更新后重复，确认标准通知、不崩溃、不弹请求。

等待 >30 秒再抓 notification/alarm，核对 progress 前进、chronometer 的 when 始终为原 endAt；+30s 后 progress 回退、startedAt 不变、END 的终点更新。Receiver exported=false，普通 shell broadcast 会被系统拒绝；不可为验证导出 Receiver。仅可 root 的 AVD：执行 `adb root` 且 `adb shell id` 确认为 uid=0，读取当前 token 后：

```sh
adb shell am broadcast -n com.meetpr.app/com.meetpr.resttimer.RestTimerReceiver -a com.meetpr.resttimer.TICK --es token '<当前 token>'
adb shell dumpsys alarm | rg -A20 'com.meetpr.resttimer|com.meetpr.app'
# 当前 END 必须保持同一终点；TICK 续排。旧 token 必须不刷新、不改 END 或当前 TICK。
adb shell am broadcast -n com.meetpr.app/com.meetpr.resttimer.RestTimerReceiver -a com.meetpr.resttimer.TICK --es token '<上一轮 token>'
```

分别 Skip / 回前台 / 自然走完后查 dumpsys alarm 无 TICK；再次广播旧 token，确认通知不复活。对 TICK 晚于终点、END 非精确定时迟到的场景，确认 TICK 不吞结束提醒。进程回收与原清单 1–11 依原 D-16 步骤执行，不用 force-stop 冒充系统回收。

### 未覆盖验收

- **13、14、15、16、17、18：设备验收全部未执行**。代码/API/资源自测不证明系统提升、排序展开、锁屏、实际进度刷新、alarm 残留清理或用户关闭提升后的设备表现。
- **19：部分覆盖**。原 11 的 Jest/lint/tsc 已全量通过；原 1–10 未复跑，11 的 Gradle 原生整包编译未执行，不能宣布 19 通过。卡指定 Opus 在验收树编译与收货。
- 20 的 vivo 真机未执行，仍由 David 负责。

### 本轮改动文件（18 个，另有用户原有 SPEC/CARD WIP 未改写）

- `modules/rest-timer-notification/android/build.gradle`
- `modules/rest-timer-notification/android/src/main/AndroidManifest.xml`
- `modules/rest-timer-notification/android/src/main/java/com/meetpr/resttimer/RestTimerNotificationModule.kt`
- `modules/rest-timer-notification/android/src/main/java/com/meetpr/resttimer/RestTimerNotifications.kt`
- `modules/rest-timer-notification/android/src/main/res/drawable-mdpi/ic_stat_meetpr.png`
- `modules/rest-timer-notification/android/src/main/res/drawable-hdpi/ic_stat_meetpr.png`
- `modules/rest-timer-notification/android/src/main/res/drawable-xhdpi/ic_stat_meetpr.png`
- `modules/rest-timer-notification/android/src/main/res/drawable-xxhdpi/ic_stat_meetpr.png`
- `modules/rest-timer-notification/android/src/main/res/drawable-xxxhdpi/ic_stat_meetpr.png`
- `src/features/training/rest-timer-session.ts`
- `src/features/training/rest-timer-notification.ts`
- `src/features/training/RestTimer.tsx`
- `src/features/training/TodayWorkoutView.tsx`
- `src/features/training/__tests__/rest-timer-session.test.ts`
- `src/features/training/__tests__/rest-timer.test.tsx`
- `src/features/training/__tests__/set-save.test.tsx`
- `docs/CODEX-JOURNAL.md`（仅追加本节）
- `PARITY.md`（原 D-16 行按卡追加一句）

## D-16 返修二（2026-10-04，增补二；开发自测）

### 实装前状态机与测试 seam

- 基线 `feat/d16-rest-timer-notification@3b0ce46`；开工仅 SPEC/CARD 有未提交改动，原样保留。本轮不 commit、不 push。按增补二实装，不改变 JS show/hide 时机和页内计时条。
- `IDLE → STARTING`：show 在同一把锁内写 SharedPreferences（token、起止时间、正文、labels），提前建渠道/构造通知/排 END 兜底，再请求启动服务；服务 onStartCommand 首先用预构造的通知 startForeground，之前不读磁盘、不排定时、不创建渠道。随后在锁内验证 token、前后台及权限。
- `STARTING → SERVICE`：服务成为唯一重发者，主线程 Handler 每秒按墙钟终点更新标题/短文本/进度，不排 TICK。Receiver ADD_30 在同一锁内改终点、重排 END 并唤醒服务立即刷新；END 到来且服务存活时只唤醒服务，由服务收尾。
- `STARTING → FALLBACK`：startForegroundService 或 startForeground 抛 RuntimeException（包含后台启动拒绝和 SecurityException），停止失败的服务，校验仍为当前 token 后改发系统计时控件通知，排 END + 10 秒 TICK。失效 token 不复活。FALLBACK 下 Receiver 负责重发/收尾。
- `SERVICE/FALLBACK → IDLE`：回前台/hide/Skip 先清 token、取消 END/TICK，再移除通知、移除 Handler 回调并停服务；保留 consumeState 所需按钮状态。自然到期的唯一 completion 入口也在同一锁下先消费 token、取消 END/TICK，再发一次 id=16002、移除 id=16001 并停服务；随后服务/旧 END 均因无 token 而无效。+30s 后旧 END 还需匹配 endAt 才能处理。
- 进程死亡不会持久化“服务存活”标记；新进程 Receiver 无服务 owner，凭持久化 token/endAt 发兜底提醒。服务 START_NOT_STICKY；划掉任务停止服务/通知但保留 END 与数据。onDestroy 不调用 hide，以免吞掉兜底或取消下一次休息。
- 测试 seam 沿用 SPEC 已批准的 JS→原生桥接；新增真实 i18n 英/中文标题模板断言（保留 `{0}`），不 mock 内部模块。原生仍无 Android 单测工程，设备/Gradle 由 Opus 在验收树完成，不以源码断言充当行为测试。

### 本轮文件与实现细节

- 新增：`modules/rest-timer-notification/android/src/main/java/com/meetpr/resttimer/RestTimerService.kt`；`src/features/training/__tests__/rest-timer-notification.test.ts`。
- 修改：模块 `android/src/main/AndroidManifest.xml`、`RestTimerNotifications.kt`；`src/features/training/rest-timer-notification.ts`、`src/i18n/catalog/RnExtras.json`；`PARITY.md` 与本 JOURNAL。SPEC/CARD 是开工前已有的 Opus WIP，本轮未修改。Receiver 和 Expo Module 源文件无需改动：仍委派同一同步 coordinator，labels Map 增加 titleTemplate，不变更 show 参数签名。
- 服务通知每秒按 `ceil(max(endAt-now,0)/1000)` 计算；标题补零 `mm:ss`，胶囊为 `m:ss`，Locale.ROOT 保证数字格式；不使用 chronometer/showWhen/timeoutAfter，避免重复倒计时或前台通知被超时提前移除。仍为相同 ProgressStyle、promoted 请求、渠道、图标、按钮。foregroundServiceBehavior=IMMEDIATE 避免系统默认推迟展示。fallback 才保留原 chronometer/timeoutAfter 及 10 秒 TICK。
- Service 的 onStartCommand 仅先解包 show 预构建的 Notification，立即在 try 内 startForeground（34+ 传 SPECIAL_USE）；没有预先读 SharedPreferences、构建通知、建渠道或排 alarm。两级启动拒绝均捕获 RuntimeException（覆盖 ForegroundServiceStartNotAllowedException、SecurityException）并恢复 fallback，不请求任何权限。onStartCommand 返回 START_NOT_STICKY。
- 回前台/hide 立即撤销 token/END/TICK，清 Handler 并 stopForeground(REMOVE)/stopSelf；尚未进入 onStartCommand 的请求由 stopService 取消。已交付的迟到 onStart 仍先履行前台提升，随后验证 token，按 startId 停旧请求；若已有新的有效 token，则立即恢复新 fallback，避免旧服务共用 id=16001 擦掉新通知。若已有有效 owner 则重发该 owner 的当前状态。hide 后没有 token，不会复活。
- 通知 ADD_30 写 endAt/changedEndAt 并重排 END，服务 handler 立即刷新；有 owner 时 END 只请求服务刷新，到期仍统一 complete。complete 在同一锁内先删除 token 并 commit，再取消 END/TICK、发 id=16002、停服务；旧 END/token、旧终点和后到的 handler 均无法重复发送。所有组件仍为同进程，未声明 android:process。此处是正常回调竞争的 at-most-once；不声称系统强杀恰在“持久化消费后、notify 前”也保证交付。
- onTaskRemoved 主动撤下服务及倒计时通知，保留持久状态/END。onDestroy 仅释放属于本实例的 owner 和 Handler，不调用 hide、不删除 token 或 alarm，因此 cold Receiver 可以兜底。厂商若同时删 END，按增补二“不保证划掉任务后继续倒计时”边界实测记录。
- 原生所有 timer/Receiver 入口使用同一对象 monitor；服务存在与否只存进程内引用，SharedPreferences 中没有可能跨进程残留的 alive 标记。

### 新增 Manifest 条目与发布备注

1. `uses-permission android.permission.FOREGROUND_SERVICE`。
2. `uses-permission android.permission.FOREGROUND_SERVICE_SPECIAL_USE`。
3. `.RestTimerService`：`exported=false`，`foregroundServiceType="specialUse"`；没有额外 process、intent-filter 或开机启动入口。
4. service 内 property：`android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` = `User-initiated rest countdown between workout sets after logging a set.`。

原有 POST_PROMOTED_NOTIFICATIONS 和非导出 Receiver 不变；无第三方依赖变化。docs 下没有分发/W4 文档，按 SPEC 在 PARITY 对应 D-16 行记录 Google Play specialUse 用途申报待办。

### 红 → 绿与构建边界

- 新增测试 `passes the localized countdown title template to native (en)`、`passes the localized countdown title template to native (zh)`，真实 i18n → 原生边界：初跑 **2 failed**（收到 labels 缺 titleTemplate），实现后 **2 passed**。日志 `/private/tmp/d16-r2-red.log`、`/private/tmp/d16-r2-green.log`。后续只调整 Jest 参数表类型，解决 tsc readonly tuple 类型错误，断言不变。
- 时间格式化留在 Kotlin notification builder 内；没有为 JS 复制另一份格式化实现，也没有以源码匹配代替服务行为测试。原生无 Android 单测工程；其时间边界和状态机仍需设备/原生 instrumentation 验证。
- 已读 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)、[Android 前台服务启动要求](https://developer.android.com/develop/background-work/services/fgs/launch)、[Live Update 文档](https://developer.android.com/develop/ui/views/notifications/live-update)。本机 core 1.17.0 javap 确认 setShortCriticalText 和 setForegroundServiceBehavior 存在。
- 独立 Kotlin 编译（四份模块源码，Android 36/core 1.17.0/本机现有 Expo/RN classpath）通过，0 errors / 0 warnings；Android 36 AAPT2 用模块真实 Manifest 的临时 package 副本链接通过。证据 `/private/tmp/d16-r2-native/`；初跑 Kotlin 发现 nullable Notification 不能传入三参数 startForeground，已在调用参数内明确非空并复编译通过。没有更改依赖、生成本树 android/ 或操作验收树。
- 这些独立检查不等于 Gradle dependency resolution、Manifest merge 或 APK 构建通过。已有 autolink 的验收树同步整个模块与 JS 后重新构建原生 APK即可合并服务/权限，通常不需重新 prebuild；新树仍需 Expo prebuild/autolinking。旧 APK 不能仅 reload JS 获得服务。

### Opus 验证入口（本轮未执行）

以下使用 `adb -s <serial>` 明确选择 Android 15、16 模拟器或 vivo。先安装重建的 APK，在训练页真实记组后按 Home；不要导出 Receiver/Service 来方便测试。

```sh
adb -s <serial> shell input keyevent KEYCODE_HOME
adb -s <serial> shell dumpsys activity services com.meetpr.app
adb -s <serial> shell dumpsys notification --noredact > /tmp/d16-before.txt
sleep 3
adb -s <serial> shell dumpsys notification --noredact > /tmp/d16-after.txt
rg -n -A45 'RestTimerService|16001|16002|android.title|android.progress|shortCritical|PROMOTED_ONGOING|chronometer' /tmp/d16-before.txt /tmp/d16-after.txt
adb -s <serial> shell dumpsys alarm > /tmp/d16-alarm.txt
rg -n -A12 'com.meetpr.app|resttimer|frozen' /tmp/d16-alarm.txt
```

- 21–22：两次 title 应减少约 3 秒；进度增加；胶囊时间随之变且无第二个 chronometer。按原 SPEC 实际看屏/截图；dumpsys promoted flag 不能单独证明卡片排序/胶囊/锁屏。
- 23：先从应用的“闹钟和提醒”系统设置关闭精确权限，再真实记组。观察终点后 ≤2 秒 id=16002 与震动，id=16001/服务/END/TICK 均清；继续等待兜底可能迟到的窗口，确认没有第二次提醒。核对 notification 历史/录屏，而非仅“只剩一个 id”证明没有重复震动。
- 24–26：通过真实通知按钮 +30s/Skip 和页内各结束路径操作，重复 services/alarm/notification；回前台应无 service、16001、16002、END/TICK。系统关闭通知权限后再记组，无 service/通知/权限请求。
- 27–28：vivo 同样留前后 title/终点 id=16002 与 alarm Removal history；锁屏另截图记录实际表现。不要把前台服务当作厂商绝不冻结的实测保证。
- 29：照 SPEC 原条目复跑，包括 Android 15 标准通知、退回实时更新禁用、锁屏、+30s 上限、Skip、回前台与旧 TICK 不复活。
- 退回路径/竞态：需在验收树 debug instrumentation 或 debugger 中分别令 startForegroundService 与 startForeground 抛启动拒绝/SecurityException，确认无服务而 16001 的 chronometer/END/TICK 仍在、按钮仍工作。加测 show(A) 排队→show(B) 被拒→A 迟到成功/失败：B 的 fallback 必须立即保留；hide 后到达的旧 start/END/TICK 不得复活。外部 adb 无权直接启动非导出 Service/Receiver；`am broadcast` 被拒不能算通过，过期 token/END 重放需用同 UID instrumentation。

### 未覆盖的验收条目

**21–29 全部未在设备上执行，不宣告任何一项完成。** 24–26、29 的 JS 既有行为有 Jest 回归覆盖，但不能替代服务生命周期/系统权限/通知 UI 的验收。Android 15/16 模拟器、vivo、锁屏表现、原生完整 Gradle/APK 构建以及强制启动失败退回路径，均按卡交 Opus 收货。验收清单不改写、不缩小。

### 本地双轴审查（不是 Opus 收货）

- 使用 review-loop 的本地文件流程，Standards 与 Spec 两个独立只读 reviewer。仓无 `docs/agents/issue-tracker.md`；未私建 tracker，也未声称执行依赖它的 code-review；后续启用该流程需 David 调用 `$setup-matt-pocock-skills`。
- Standards：0 硬违反 / 0 实质坏味道。Spec：初审 1 个 P2——迟到的旧 onStart 在 B 已 fallback 后会删共用通知 ID；已定向修复成功/失败两条启动路径，复审 0 未决 finding。固定 diff `/private/tmp/d16-r2-review.diff`、`/private/tmp/d16-r2-review-final.diff`，另审了两份 untracked 新文件。源码审查不代表设备验收。
- 最终核对：RestTimer.tsx、rest-timer-session.ts、RestTimerNotificationSession.tsx、TodayWorkoutView.tsx 均无 diff；无 package/lock/build.gradle 改动；HEAD 仍为 `3b0ce46`，index 无暂存改动；未 commit/push。

### 最终检查结果

- `npm test -- --runInBand`：**147 suites / 1084 tests passed，0 failed**（最终复跑 44.175s）；日志 `/private/tmp/d16-r2-full-test.log`。有仓内既有 React/Expo 测试警告，不声称测试日志零 warning。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/d16-r2-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/d16-r2-tsc.log`。
- `git diff --check`：通过。独立 Kotlin/AAPT2 检查已过，完整 Gradle/APK 和设备验收仍未执行。

## D-16 返修三 — 系统倒计时、自定义卡片与 AlarmClock（2026-10-04）

### 边界与文件

- 依据：`specs/d16-rest-timer-notification/SPEC.md` 全文，增补三整体取代增补二；`CARD.md` 返修三。接手 `feat/d16-rest-timer-notification@a771b52`，仅 SPEC/CARD 有 Opus 未提交修改，本轮未改这两文件。不 commit、不 push、不 stage。
- 修改 12 文件：`PARITY.md`、本 JOURNAL；模块 `android/src/main/AndroidManifest.xml`、`java/com/meetpr/resttimer/RestTimerNotificationModule.kt`、`RestTimerNotifications.kt`；`src/features/training/rest-timer-notification.ts`、`rest-timer-session.ts`；同目录 `__tests__/rest-timer-notification.test.ts`、`rest-timer-session.test.ts`、`rest-timer.test.tsx`、`set-save.test.tsx`；`src/i18n/catalog/RnExtras.json`。
- 新增 2 文件：模块 `android/src/main/res/layout/rest_timer_compact.xml`、`rest_timer_expanded.xml`。
- 删除 1 文件：模块 `android/src/main/java/com/meetpr/resttimer/RestTimerService.kt`。一并删除 Manifest 服务声明、specialUse 属性、FOREGROUND_SERVICE / FOREGROUND_SERVICE_SPECIAL_USE 权限；POST_PROMOTED_NOTIFICATIONS 保留。删除每秒刷新、TICK、ProgressStyle、进度计算、startedAt 整条传参、标题模板键、短文本计时、PARITY 的 Play 前台服务申报备注。历史 JOURNAL 保留原始事实，本节取代返修二的当前交付说明。
- `RestTimer.tsx`、`RestTimerNotificationSession.tsx`、`TodayWorkoutView.tsx` 无改动；页内外观和交互不变。JS show/hide/consumeState 调用条件与顺序不变，仅 show 缩为 `show(endAtEpochMs, body, labels)`，Expo Module 同步更新。依赖与锁文件无变化。

### 提升判断与失效

- `show` 先 hide 旧会话，再持久化 endAt/body/labels/token，排 END 并发布。低于 API 36 直接自定义卡片。API 36+ 首发无自定义视图的标准样式，带 requestPromotedOngoing、标题与页眉 Chronometer；同次发布调用安排主线程 Handler **仅一次 200ms 延迟**读取 `NotificationManager.getActiveNotifications()`，按 id=16001、tag=null 找实际 `Notification.FLAG_PROMOTED_ONGOING`。
- 已提升保留标准样式；未提升立即以同 id 重发 DecoratedCustomViewStyle，保留 onlyAlertOnce。没有厂商分支、轮询或周期刷新。200ms 是请求延迟，尚未设备测量实际调度延迟，不将源码值当作 ≤500ms 的实测证据。
- `cancelPromotionCheck()` 移除 callback 并递增 publication；hide/Skip/完成均经 clearTimer 调它，新 show 经 hide 调它，+30s 重发也调它。callback 在同一把锁内核对 publication、持久化 token、endAt，并检查前台/权限/终点；旧 callback 即使已出队也不能复活通知或覆盖新计时。
- **+30s 不等待 callback**：取消旧检查后同步读取当前实际提升 flag，有则标准、无则自定义，在 Receiver.onReceive 返回前发布完。这样杀进程后的冷 Receiver 不依赖进程稍后继续存活；endAt/changedEndAt/900 秒上限及 consumeState 契约保留。

### 布局与系统计时

- 两份 XML 均只用 RemoteViews 支持的 `LinearLayout`、`TextView`、`Chronometer`：水平一行，左侧加权列显示标题与动作名，右侧倒计时垂直居中；缺动作名时正文 GONE。左侧文字单行省略，左右间距 12dp。
- 收起/展开同结构，倒计时分别 **28sp / 36sp**，最小高度 48dp / 64dp；`fontFamily="monospace"`、`fontFeatureSettings="tnum"` 提供等宽数字。标题和数字用 `TextAppearance.Compat.Notification.Title`，正文用 `TextAppearance.Compat.Notification`，不设文字颜色或自定义背景，由系统通知主题提供明暗颜色。仍需实际浅色/深色截图确认可读性。
- RemoteViews 方法完整列表：`setTextViewText`（标题/正文）、`setViewVisibility`（空正文）、`setChronometer(id, base, null, true)`、`setChronometerCountDown(id, true)`；base 为 elapsedRealtime + 当前剩余毫秒。NotificationCompat 使用 `DecoratedCustomViewStyle`、`setCustomContentView`、`setCustomBigContentView`，标准页眉与 Skip/+30s actions 保留。
- 页眉仍用 setWhen(endAt)、setShowWhen(true)、setUsesChronometer(true)、setChronometerCountDown(true)；两种样式都有 setTimeoutAfter(remaining)。系统负责每秒显示与终点移除，不需 App 定期执行。MeetPR 图标、品牌金强调色与现有通知渠道不变。

### 结束定时的两条路径

1. API <31 或 canScheduleExactAlarms() 为真：`setAlarmClock(AlarmClockInfo(endAt, openIntent), END PendingIntent)`。状态栏可能有闹钟图标，尚未设备观察。
2. 精确权限为假，或检查/排 AlarmClock 抛 SecurityException：`setAndAllowWhileIdle(RTC_WAKEUP, endAt, END PendingIntent)`，可能迟到，不申请权限。

每次 +30s 先取消旧 END、按新终点重排，同时重算 Chronometer base 与 timeout。hide/Skip/完成取消 END；完成前清 token，同锁下防重复提醒。Receiver 验 token 和 endAt，旧 END 不得提前结束已延长的休息。冻结系统是否保留 AlarmClock 仍待 vivo 实测，测不过如实记录，不另加保活机制。

### 红 → 绿与检查证据

- 已批准 seam：SPEC 增补三的 JS 原生调用契约，以及原有 session/组件/记组集成测试；不新增原生测试基础设施或源码字符串断言。
- `passes a static localized title without a countdown template (en)`、`(zh)`：先 **2 failed**（旧代码仍传 titleTemplate），删除桥接参数和文案键后 **2 passed**。日志 `/private/tmp/d16-r3-red-title.log`、`d16-r3-green-title.log`。
- `background notification receives only the adjusted endpoint and exercise body`：先 **1 failed / 8 passed**（旧代码多传 startedAt），删除 session/adapter/Module 中无用开始时间并更新旧签名断言后，相关 **3 suites / 23 tests passed**。日志 `/private/tmp/d16-r3-red-endpoint.log`、`d16-r3-green-endpoint.log`。
- 首次全量 **2 failed / 1082 passed**：`saved set supplies its exercise name to the background rest notification (Competition Deadlift/undefined)` 仍断言旧 startedAt 参数；只更新这两个参数化集成断言后，全量 **147 suites / 1084 tests passed，0 failed**，16.278s。首次 `/private/tmp/d16-r3-test.log`，最终 `/private/tmp/d16-r3-test-final.log`。测试日志含仓内既有 React/Expo warning，不声称日志零警告。
- `npm run lint`：退出 0，0 errors / 0 warnings；`npx tsc --noEmit`：退出 0，0 errors。日志 `/private/tmp/d16-r3-lint.log`、`d16-r3-tsc.log`。`git diff --check` 通过。
- 本机 API 36 android.jar 经 javap 确认 FLAG_PROMOTED_ONGOING、RemoteViews 的两个 Chronometer 方法；已缓存 core 1.17.0 经 javap 确认 setRequestPromotedOngoing、自定义视图方法及 DecoratedCustomViewStyle。AAPT2 36 `compile --dir .../res` 退出 0，输出 `/private/tmp/d16-r3-res.zip`。这只证明资源编译及 API 存在，**未执行 Kotlin 编译、资源链接、完整 Gradle/APK 或设备运行**。
- 参考：[Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)、[Live Update 的样式及实际 flag](https://developer.android.com/develop/ui/views/notifications/live-update)、[通知自定义布局/文字主题](https://developer.android.com/develop/ui/views/notifications/custom-notification)、[RemoteViews](https://developer.android.com/reference/android/widget/RemoteViews)、[AlarmManager](https://developer.android.com/reference/android/app/AlarmManager)。

### 本地双轴自审（不是 Opus 收货）

- 两个独立只读 reviewer，固定点 a771b52，审 `git diff a771b52 --` 工作区增量，并另读两个 untracked XML；无新增提交。沿用 code-review 双轴，仓缺 `docs/agents/issue-tracker.md`，使用用户明确给出的本地 SPEC，不私建 tracker；后续若启用 tracker 流程需 David 调用 `$setup-matt-pocock-skills`。
- Standards：0 硬违规 / 0 实质 smell。Spec 初审 1 项 P2：冷 Receiver 的 +30s 异步降级可能在 onReceive 返回后被系统终止；已改为同步读取既有提升 flag 并发布，定向复审 **0 未决 finding**。审查不替代模拟器、vivo 或原生编译。

### Opus 验收入口与未覆盖条目

本树无 android/，按卡由 Opus 在验收树构建。模块路径、namespace 与 `expo-module.config.json` 未变，仍自动链接 `com.meetpr.resttimer.RestTimerNotificationModule`；同步本次模块目录时要真的删除 RestTimerService.kt（不能只覆盖复制），同步 JS 与文案后重建 APK。已有已链接的 Android 工程不因本次变化必须重新 prebuild；无 Android 工程的验收树才需正常 prebuild。Gradle 必须重新合并模块 Manifest 和资源，不能用旧 APK/仅 Metro 刷新验证本次原生能力。

**30–36 均未完成设备验收；37 只有 Jest 行为覆盖、未做系统权限与通知的设备回归；38 的三项 JS 检查已通过，原生编译未覆盖。** 不宣告任何整项验收通过。未缩小原清单，以下只是获取其证据的命令：

```sh
# 指定验收设备 serial；从真实训练页记组开始休息，再 Home。
adb -s SERIAL shell input keyevent KEYCODE_HOME
adb -s SERIAL shell dumpsys notification --noredact > /tmp/d16-r3-notification.txt
adb -s SERIAL shell dumpsys alarm > /tmp/d16-r3-alarm.txt
adb -s SERIAL shell dumpsys activity services com.meetpr.app > /tmp/d16-r3-services.txt
adb -s SERIAL shell cmd statusbar expand-notifications
adb -s SERIAL exec-out screencap -p > /tmp/d16-r3-before-kill.png
adb -s SERIAL shell am kill com.meetpr.app
adb -s SERIAL shell pidof com.meetpr.app
adb -s SERIAL exec-out screencap -p > /tmp/d16-r3-killed-1.png
sleep 4
adb -s SERIAL exec-out screencap -p > /tmp/d16-r3-killed-2.png
# 分别系统设置浅/深主题，每次重做真实记组与后台通知，截图对比。
adb -s SERIAL shell cmd uimode night no
adb -s SERIAL shell cmd uimode night yes
```

- 30/31：通知 dump 查自定义 contentView/bigContentView 或 PROMOTED_ONGOING flag；Android 16 开关实时更新后重新 show，各留胶囊/排序/大号计时截图。services 查无 RestTimerService，alarm 查无模块 TICK，通知无进度。回 App 对比剩余误差 ≤1 秒。
- 32/33：确认 am kill 后 pidof 无进程；两次截图计时仍跳动。分别冷进程点击真实 +30s/Skip，核对终点/超时/闹钟重设或全部取消，回 App 后状态一致。不能用 force-stop 替代 am kill。Receiver exported=false，shell `am broadcast` 不可当验收入口，也不为验证改 exported；过期 token/END 和 hide→新 show 竞态需同 UID instrumentation/debugger。
- 34：有精确权限时 dump 中的 `Next alarm clock`（或版本对应字段）应指向 MeetPR；等终点记录 id=16002、准时性、单次震动与闹钟图标。另关精确权限，核对非精确 fallback、不弹请求。hide/Skip/完成后 END 消失；只看最终一个 id 不能证明没有重复震动，需观察或录屏。
- 35：浅/深模式分别看收起和展开、长动作名与空动作名，确认文字/数字可读。
- 36：vivo 保持“允许后台高耗电”关闭；记录计时、两个按钮、锁屏、结束提醒到达与否。若 AlarmClock 仍被删，按 SPEC 记录该机无结束提醒，不追加机制。
- 37：按原清单重做前台、页内 Skip/下一组、系统关通知权限路径。38：原生 Gradle/APK 编译由 Opus 补证据。

### D-16 返修四（2026-10-04）
- 仅将结束定时改为 `setExactAndAllowWhileIdle(RTC_WAKEUP, endAt, intent)`；保留无权限或 `SecurityException` 时的 `setAndAllowWhileIdle`。已移除 `AlarmClockInfo` 调用，无多余导入；未 commit/push。
- 全量 `npm test`：147 suites / 1084 tests 通过；lint：0 errors / 0 warnings；tsc：0 errors（三项均退出 0，日志 `/private/tmp/d16-r4-{test,lint,tsc}.log`）。本树无原生单测基础设施及 android/，未做原生编译或设备验收，沿用卡中 Opus 验收树安排。
## 2026-10-04 — Opus T2：R3 视频剪辑（开发交接，未设备验收）

### 范围、现场与改动清单

- 按 `specs/build22-parity/R3-VIDEO-TRIM-CARD.md` 全文执行；开工分支 `feat/r3-video-trim`、HEAD/基线 `cab3b40`。任务卡是开工已有的未跟踪输入，未修改。未 commit、push、暂存或改动其他工作树；iOS 参照只读。
- 已读 AGENTS/CLAUDE、PLAN、build22 SPEC、验证入口和 audit P1-7/R3；本仓没有 CONTEXT/FOLLOWUPS。使用 tdd 与 review-loop；先读 Expo 57 指定文档。没有新增 JS 依赖，词库键值、压缩参数、上传流程和 iOS 均未修改。
- 原生（4 文件）：`modules/training-video/android/build.gradle`；`android/src/main/java/com/meetpr/video/TrainingVideoModule.kt`；新增同目录 `VideoTrimExporter.kt`、`VideoTrimMedia.kt`。
- 运行时代码（7 文件，均在 `src/features/training/video-upload/`）：修改 `CameraRecorder.tsx`、`VideoAttachmentControls.tsx`、`native.ts`；新增 `VideoTrimView.tsx`、`trim-native.ts`、`trim-selection.ts`、`trim-session.ts`。
- 测试（4 文件，同目录 `__tests__/`）：修改 `camera-review.test.tsx`；新增 `attachment-trim.test.tsx`、`trim-selection.test.ts`、`trim-session.test.ts`。
- 台账（2 文件）：本 JOURNAL 仅末尾追加本节；PARITY 仅更新 P1-7 总述及 VideoUpload 对应行，仍为开发实现/待验收。共 17 个改动/新增文件，不计原始任务卡。

### 实现与所有权

- 相册选片只呈现剪辑页；独立缓存工作副本读取到恰好一条视频轨且有效时长、播放器就绪后才能 Save。超长源片初始化为 0–120 秒。成功导出才调用现有 attach；关闭、读取失败、导出失败及迟到回调均不 remove/attach 原附件。
- 纯函数移植 iOS VideoTrimSelection：两端推动、0.1 秒最短区间（源片不足 0.1 秒时取全片，和 iOS 一致）、120 秒上限、无效时长。时间轴 10 帧、双把手、遮罩、选择时长、无障碍调整；拖动暂停并跳被拖端，区间末暂停回起点。顶栏/底栏及返回键在导出中禁用。
- 录制 Edit 与 Use 等宽并排；原有 Retry 保留在回看顶栏右侧。剪后替换回看源和时长，可再次 Edit；Use/Save to Photos 使用最终片段。AsyncStorage `training.video.trimHintDismissed.v1` 在“不再提醒”及一次成功剪辑后持久化；原 D-19 回看切后台存活行为继续通过 12 条既有回归。
- TrainingVideo 新增 `trimInfo(uri)`、`thumbnails(uri,count)`、`trim(uri,startMs,endMs)`、`cancelTrim(uri)`。MediaMetadataRetriever 取各均分区间中点缩略图，缩到不超过 320×180；单帧失败清理整批并回到占位，不阻止有效视频剪辑。
- Transformer 在主 Looper 创建/启动/取消；素材检查、码率测量、导出后回读放到 worker。ClippingConfiguration 配合 `Codec.EncoderFactory.videoNeedsEncoding() = true` 精确重编码视频，避免把之前关键帧带入或依赖播放器 edit list。保持源视频 MIME、显示分辨率及源码率目标，关闭编码降级，不加尺寸/帧率效果；音轨尽可能直接封装，保持其 MIME。设备编码器可能拒绝不支持的素材，走处理失败，不改换技术方案。
- 成功前原生回读：非空、恰好一条视频轨、实际时长与所选区间差 ≤100ms、有源音轨则结果必须有音轨、显示宽高一致。返回实际 durationMs；这些是运行时保护，不是已在设备验证准确度/旋转/同步的证据。
- TrimSession 只结算一次。失败、取消、卸载均取消原生导出；迟到缩略图/导出归清理，已交出成功结果不删除。相册 picker 缓存由调用方收尾；录制源在关闭剪辑时保持，成功应用才删除旧录制缓存。
- 所有剪辑 MP4/JPG 使用 `training-trim-` 前缀。初审发现裸 UUID MP4 会被另一组正在进行的 compressor 失败清理误删，已用真实 prepareTrainingVideo + 打开剪辑页并发测试先红后绿修正。`native.ts` 唯一变更为冷启动 cleanOrphanVideos 回收该前缀，保留 referencedUris；压缩及上传路径未改。

### Media3 版本依据、依赖与原生验证边界

- 尝试命令（已有 android 的主树，只用于依赖核实）：`JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew :app:dependencies --configuration debugRuntimeClasspath --offline --console=plain --project-cache-dir /private/tmp/r3-gradle-project-cache`。Gradle wrapper 因 `~/.gradle/wrapper/.../gradle-9.3.1-bin.zip.lck (Operation not permitted)` 失败；没有获得本次新生成的依赖报告，没有提权。原始输出 `/private/tmp/r3-media3-dependencies.log`。
- 加依赖前转为只读核实真实已解析产物：`/Users/david/Projects/apps/meetpr-rn-wt-build22-acceptance/android/app/build/outputs/logs/manifest-merger-debug-report.txt` 第 60–73 行（2026-09-21 留存）明确列出 muxer、exoplayer/dash/hls/smoothstreaming、extractor、container、datasource/okhttp、session、ui、database、decoder、common **全部 1.9.0**。摘录 `/private/tmp/r3-media3-resolved-evidence.txt`。
- 两树 `package-lock.json` SHA-256 均为 `a9c8cd7825946b215bc3dfabb4ca85c45c9278aa3b7e83d9995702589d5ac840`；`patches/react-native-video+6.19.2.patch` 均为 `50d68ba9ecc056a963a1d4ebc92b2f1e3e0c0fbe89a30853425a043a70f0173a`。本机 expo-camera 57.0.4 明确依赖 CameraX 1.6.0；Gradle 缓存 camera-video 1.6.0 的 POM 指定 media3-muxer/container 1.9.0，与实际构建报告一致。依赖树中 rn-video 旧声明的 1.8.0 不作为新增依赖版本。
- 新增直接依赖仅 `androidx.media3:media3-common:1.9.0` 与 `androidx.media3:media3-transformer:1.9.0`，复用同一个 media3Version。Transformer 所需其余 Media3 构件由同版传递依赖带入；没有 force/版本分叉或 FFmpegKit。
- 静态 API 校核：[Media3 1.9.0 Transformer](https://raw.githubusercontent.com/androidx/media/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/Transformer.java)、[Codec.EncoderFactory](https://raw.githubusercontent.com/androidx/media/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/Codec.java)、[DefaultEncoderFactory](https://raw.githubusercontent.com/androidx/media/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/DefaultEncoderFactory.java)；Expo Promise/Queues 对照本机 57.0.6 源码。未发现 Transformer 不可行的证据，未采用 MediaExtractor + MediaMuxer 替代方案。
- 本工作树无 android/；依用户分工，本轮没有 prebuild、Gradle assemble、装包、模拟器截图或真机操作。**Kotlin 与 Gradle 已做源码/API 自洽检查，但未取得 Kotlin 编译通过实证；必须由 Opus 在构建树运行依赖报告及 assembleDebug。**

### 五个 seam 的先红后绿证据

1. **区间纯函数，最终 9 tests。**
   - `initial range keeps an 8 second clip and caps a long source at 120 seconds`：先缺模块，补初始区间后 1 过。
   - `dragging the start past the end pushes the end and preserves the 0.1 second minimum`：先缺 moveTrimStart，补后 2 过。
   - `dragging the end before the start pushes the start and clamps to the source`：先缺 moveTrimEnd，补后 3 过。
   - `either handle pushes the opposite edge to keep the 120 second maximum`：先断言失败，补两端上限收窄后 4 过。
   - `invalid source duration %s cannot be saved`（0/NaN/Infinity/-1）与 `a source shorter than 0.1 seconds remains a valid whole clip like iOS`：5 失败/4 通过 → 时长归一化、有效性检查后 9 过。
   - 日志 `/private/tmp/r3-selection-{red,green}-{1..5}.log`，预期值来自 iOS VideoTrimSelectionTests 的固定例子，非重复实现计算。
2. **会话收尾，最终 5 tests。**
   - `save wins once and keeps only the delivered export`：缺模块 → 1 过。
   - `%s clears temporary files including late thumbnails and exports`（cancelled/failed）：2 失败/1 过 → 3 过。
   - `unmount cancels export once and a late export never invokes save`：1 失败/3 过 → 4 过。
   - 审查返修 `failure during export cancels native work even when unmount follows immediately`：cancelExport 期望 1 次、实际 0 次 → 修后 5 过。
   - 日志 `/private/tmp/r3-session-{red,green}-{1..4}.log`。
3. **VideoAttachmentControls，最终 13 tests。**
   - 首红 `Photos presents trim first and only Save attaches the exported file`：缺少 Edit video，选片已直接 attach → 接入真实 VideoTrimView 后 1 过；保存交给 attach 的是原生返回的导出 URI/实际时长。测试仅 mock 系统媒体/文件接口及卡规定的 attach/remove 观察边界，区间/会话/剪辑组件使用真实实现。
   - 初审返修 `a concurrent upload compression failure cannot delete the open trim session source`：工作副本实际出现在删除列表 → 独立前缀后通过；`cold startup reclaims abandoned trim files while preserving referenced and unrelated files`：孤儿未删除 → 冷启清理补齐后通过。
   - 额外通过：Replace 原附件在 close/back/read failure/export failure 后保留且不 attach/remove；180 秒素材、10 缩略图；导出中返回禁用、卸载取消、迟到结果；把手跳两端、2–6 秒播放回起点；0/2 视频轨失败；`a player failure during Save cancels export and never attaches a late output`。
   - 首红/绿 `/private/tmp/r3-attachment-red-1.log`、`r3-attachment-green-1.log`；返修红/绿 `/private/tmp/r3-files-{red,green}.log`、`r3-cold-cleanup-{red,green}.log`。补充防御性用例在既有实装后添加并直接通过，未伪称每条都见红。
4. **CameraRecorder，最终 16 tests（原有 12 + 新增 4）。**
   - `review offers Edit and a persistent do-not-remind trim hint`：缺 Edit，1 失败/12 过 → 13 过；测试包含卸载重进后提示仍隐藏。
   - `Edit then Save updates duration, suppresses the hint, and Use saves and delivers the trimmed file`：没有剪辑页，1 失败/13 过 → 14 过；覆盖剪后时长、Save to Photos、Use、切后台、旧录制清理与成功文件不被卸载删除。
   - 新增 `Edit %s retains the review and permits retry`（close/failure）2 条直接通过；D-19 原 12 条全部保留。
   - 日志 `/private/tmp/r3-camera-{red,green}-{1..2}.log`。
5. **原生导出没有 Jest seam。** Jest 的媒体调用是系统边界替身，不证明 Kotlin 编译、硬件编解码、导出实际起点/时长/音轨/方向或同步。模拟器步骤见下一节，未填写虚构红→绿结果。

### 提供给 Opus 的模拟器导出验证步骤（未执行）

1. 在有 android/ 的构建树接入本工作树改动，运行 `./gradlew :app:dependencies --configuration debugRuntimeClasspath`，确认所有 androidx.media3 仍为 1.9.0，再 `./gradlew assembleDebug`；安装至 AVD meetpr。所有操作仅用本地合成素材/fixture，不动生产训练数据。
2. 本机准备样片：`ffmpeg -f lavfi -i testsrc2=size=720x1280:rate=30:duration=8 -f lavfi -i sine=frequency=880:duration=8 -c:v libx264 -b:v 2M -g 90 -pix_fmt yuv420p -c:a aac -b:a 96k -shortest -movflags +faststart /tmp/r3-source.mp4`。关键帧间隔 3 秒，使 2 秒起点不是关键帧。
3. 将样片 push 到模拟器 Movies 并触发媒体扫描，Photos 选取；分别执行原卡验收 1–4。不动把手应 Selected 0:08；拖至约 2–6 秒应 Selected 0:04，Save 后播放器约 4 秒，fixture 日志写入次数为一。取消和 Replace 保留原附件分别核对。此流程时长读取还须区分后续压缩与原始 trim 输出。
4. 为独立检验精确原生区间，Opus 可在**临时调试 JS 入口（不提交）**使用同一模块，源文件预先复制到 app 缓存（`adb push /tmp/r3-source.mp4 /data/local/tmp/r3-source.mp4`，再 `adb shell run-as com.meetpr.app cp /data/local/tmp/r3-source.mp4 cache/r3-source.mp4`）：

   ```ts
   import { File, Paths } from 'expo-file-system';
   import { requireNativeModule } from 'expo-modules-core';
   const media = requireNativeModule('TrainingVideo');
   const output = await media.trim(new File(Paths.cache, 'r3-source.mp4').uri, 2000, 6000);
   console.log(output, await media.trimInfo(output.uri));
   ```

   此调用保留在临时测试入口的事件处理器中执行，记录返回的输出 basename。通过 `adb exec-out run-as com.meetpr.app cat cache/<输出basename> > /tmp/r3-trimmed.mp4` 拉出；不要选错误的 UUID 文件。`ffprobe -v error -show_entries format=duration:stream=codec_type,width,height:stream_tags=rotate:stream_side_data=rotation -of json /tmp/r3-trimmed.mp4` 应时长 3.9–4.1 秒、有 video/audio。另拉首帧与原片 2 秒帧并排确认，不能只看 duration；源片前一关键帧在 0 秒，可识别错误 GOP。听音/看画，验证方向与音画同步。对有 90/270 度旋转 metadata 的合成片再跑一次并检查显示方向。
5. 同一临时入口发起长素材 trim 后调用 `cancelTrim(同一源URI)`，原 Promise 应拒绝、输出不残留；退出剪辑/卸载后再检查缓存 `training-trim-*`，只允许交给回看/attach 的成功输出仍存在。完成后删除临时测试入口和本轮测试素材。
6. 按原卡继续覆盖 >120 秒源片、损坏/无视频轨、再次 Edit、提示持久化、回看切后台、360×640dp + 字体1.3×。真实相册与录制、音画同步及旋转由 David 真机执行。

### 最终检查、审查与未覆盖清单

- `npm test -- --runInBand` 最终 **147 suites / 1090 tests passed，0 failed**（本卡新增 31 tests；四个 seam 合计 43，含旧相机 12）；退出 0。`/private/tmp/r3-full-test.log`。
- `npm run lint` **0 errors / 0 warnings**、退出 0；`/private/tmp/r3-lint.log`。`npx tsc --noEmit` **0 errors**、退出 0；`/private/tmp/r3-tsc.log`。`git diff --check` 通过。
- 全量首跑为 146 suites 通过/1 失败、1089 tests 通过/1 失败：未修改的聊天用例 `initial scroll aligns the first unread feedback bottom, and prepending history preserves the visible message` 期望 y=190、收到 y=30。当前树定向 33/33 通过，cab3b40 的 /tmp 只读来源隔离副本定向亦 33/33，随后不改代码全量 1090/1090。无法稳定复现，未宣称根因已确定或已修；未改聊天代码。首跑 `/private/tmp/r3-full-test-first.log`，对照 `/private/tmp/r3-chat-recheck.log`、`r3-chat-baseline.log`。diagnosing-bugs 仅完成复现/对照；因非本卡稳定回归，未扩范围做假设修复。
- 独立 review-loop 初审：Standards 2 项（缓存所有权冲突、失败未取消）；Spec 1 项（同一失败未取消）。均先补红测试后修复，两轴定向复审各 **0 未决实现问题**。仓无 `docs/agents/issue-tracker.md`，已提示完整 tracker 流程需 `$setup-matt-pocock-skills`；本轮仅本地审查，未声称跑完整 tracker code-review 或验收放行。
- **未覆盖原卡验收 1–9 的真实模拟器/实屏部分**：Jest 可证明部分交互/清理/接线，不证明实际视频、手势命中、播放边界时序、训练日志唯一写入、上传、缩略图图像、精度/音轨/方向或字体布局。第 6 项原生媒体准确度尤其没有实测证据；第 7 项 180 秒仅为元数据替身。
- **第 10 项仅 JS 自动检查完成**，Gradle 依赖新解析、Kotlin 编译和 assembleDebug 未执行；**第 11 项真机全部未覆盖**。由 Opus/David 按原卡清单收货；PARITY 保留待验收状态。


## R3 视频剪辑 · 返修一（2026-10-04）

范围仅 `R3-VIDEO-TRIM-CARD.md` 文末返修一。保留接手时未提交的实现；本轮只改 `trim-native.ts`、`VideoTrimView.tsx`、`__tests__/attachment-trim.test.tsx` 和本 JOURNAL。未改原生、上传/压缩、布局、文案、PARITY；不 commit、不 push。改前快照 `/private/tmp/r3-revision1-before/`，本轮代码增量 `/private/tmp/r3-revision1.diff`。

### 原因与源码核实

- `node_modules/expo-file-system/android/src/main/java/expo/modules/filesystem/FileSystemModule.kt:203` 把 File.copy 注册成 `AsyncFunction("copy") Coroutine`；`:207` 的 `copySync` 才是同步入口。
- 同目录 `FileSystemPath.kt:163` 是 `suspend fun copy`，`:169–170` 在 `withContext(Dispatchers.IO)` 内执行 `file.copyTo(...)`。`src/internal/NativeFileSystem.types.ts:240` 也明确返回 `Promise<void>`。本轮读取了 Expo SDK 57 的版本文档，根因依据是本地实际安装源码。
- 原 `copyTrimSource` 未 await，紧接着检查 `copy.exists/size`，在副本尚未写完时抛 `Empty trim source`，由准备阶段空 catch 结算 failed，所以无原生异常仍会退回错误提示。延迟拷贝回归复现：完成拷贝后 trimInfo 预期 1 次、实得 0 次。
- 修复为 `copyTrimSource(): Promise<string>` 内 await copy，唯一调用方也 await；完成后先交 `current.own`，若已经关闭/卸载则删除迟到副本并停止读取，避免 await 引入的生命周期空档。

### 其余准备阶段核查

- URI：`expo-image-picker/android/src/main/java/expo/modules/imagepicker/MediaHandler.kt:101–108` 先复制到 cache，再 `outputFile.toUri()`，并用 `MediaMetadataRetriever.setDataSource(context, outputUri)` 读取；`:129` 原样返回该 URI。项目 `native.ts` 沿用 asset.uri。工作副本仍在本 App 的 Paths.cache，返回 file URI。
- 项目 `VideoTrimMedia.kt:38–40` 用 `Uri.parse` 后传给 `MediaExtractor.setDataSource(context, source, null)` 和 `MediaMetadataRetriever.setDataSource(context, source)`，`:76` 缩略图使用同一种重载；未发现把 file URI 错传成裸路径的接口问题，无需改原生。此为源码核查，不冒充本轮已做设备解码验证。
- `trimInfo` 拒绝、非单视频轨、无效时长仍 failed；`onLoad` 只设置 loaded，正常读取＋onLoad 后可 Save；`onError` 仍 failed 并阻止迟到导出被挂载；缩略图 Promise 拒绝仍降级为空占位，onLoad 后可继续 Save。既有测试和新增故障注入均通过。
- 准备日志保留于非 `__DEV__` 路径：`[VideoTrim] copyTrimSource / trimInfo / thumbnails / player.onError`，仅输出步骤及 name/message。含路径、URI 或反斜线的字段整体替换为 `[redacted]`，以覆盖带空格文件名；不打印 source、错误对象、stack 或播放器 target。

### 先红后绿证据

命令均为 `npm test -- --runInBand src/features/training/video-upload/__tests__/attachment-trim.test.tsx -t '<下列测试名前缀>'`，真实组件/会话/复制适配器参与，只有系统 File.copy 和媒体模块是边界桩。

1. `Photos waits for the working copy to finish before calling trimInfo`：红 1 failed（完成后期望调用 1 次，收到 0 次）→ 绿 1 passed；完成前确认 trimInfo 为 0、没有播放器，完成后确认调用一次并显示工作副本。日志 `/private/tmp/r3-revision1-copy-{red,green}.log`。
2. `closing during the working copy cleans its late result without reading it`：红 1 failed（关闭后期望调用 0 次，收到 1 次）→ 绿 1 passed；验证迟到副本被删除、不 attach。日志 `/private/tmp/r3-revision1-close-{red,green}.log`。
3. `preparation reports %s failures without paths outside development`，参数 `copyTrimSource` / `trimInfo` / `thumbnails` / `player.onError`：红 4 failed（warn 预期 1 次，收到 0 次）→ 绿 4 passed。强制 `__DEV__ = false`，注入含空格路径的错误，断言仅有步骤和脱敏 name/message；缩略图失败仍 Save 成功，其余失败仍显示处理错误且不 attach。日志 `/private/tmp/r3-revision1-warn-{red,green}.log`。

本轮新增 6 tests，相册剪辑 suite 现有 19 tests。原生/模拟器复验仍由 Opus 按原卡收货；本轮没有重建原生、装包或宣称模拟器症状已实测消失。

### 最终检查与独立审查

- `npm test -- --runInBand`：**147 suites / 1096 tests passed，0 failed**，退出 0（14.833 秒）；`/private/tmp/r3-revision1-full-test.log`。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/r3-revision1-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/r3-revision1-tsc.log`。首跑发现测试 `globalThis.__DEV__` 类型缺失，补测试侧显式类型后重跑以上三项均绿；首跑证据 `/private/tmp/r3-revision1-tsc-first.log`。
- `git diff --check` 通过。独立 review-loop 仅审改前快照到本轮代码的增量：Standards **0 findings**；Spec **0 实现 findings**，要求补齐本 JOURNAL 和最终检查证据（本节已补）。最后仅补测试侧类型声明，无运行时语义变化。
- 仓缺 `docs/agents/issue-tracker.md`，已说明完整 tracker 流程需 `$setup-matt-pocock-skills`；没有私建配置或声称完整 tracker code-review/产品验收放行。独立双轴报告记于本任务 JOURNAL，不另建正典台账。

## R3 视频剪辑 · 返修二（2026-10-04）

仅执行卡末 A、B、C、D；基线 `feat/r3-video-trim@cab3b40`，保留前两轮 WIP。改前快照 `/private/tmp/r3-repair2-baseline/`。不 commit/push，不加依赖，不改已通过的布局/文案/缩略图/精确原生导出；PARITY 等正典由 Opus 收货时定稿。无 CONTEXT/FOLLOWUPS；已读 AGENTS、CLAUDE、PLAN、build22 SPEC/验收记录、audit P1-7/R3 及 Expo v57 文档。

### A 原因（修复前记录）

- 排查候选：远端刷新删 store、stableSetId/key 重挂载、取消误调用 remove/删旧文件。
- `TodayWorkoutView` 的 AppState active 会 refresh 并触发 `hydrateRemoteVideoAttachments`；后者发现 uploaded attachment 不在远端同 setLog 列表中即 `delete records[key]`。`synthesizeDrafts` 的 stableSetId 固定为 planSet.id；取消只清 picker/trim 文件，没有调用 manager.remove。
- 验收 fixture（只读 `/Users/david/Projects/scratch/rn-r1r2-20261002/fixture/fixture-server.py:153–157`）的 `/uploads/:id/complete` 返回 ready 但不追加 videos，`/videos` 仍返回静态数组。这解释了“已 Delivered、无 DELETE、选片回来消失”的链路；不是据此宣称 Global 有同一服务端缺陷。
- 真实控件 + store 回归在 picker Promise 返回前注入上述缺项列表：close/back/read failure/export failure 四条都红，UI 实际变成 Record/Photos，预期 Delivered to coach 丢失。日志 `/private/tmp/r3-repair2-a-red.log`（4 failed）。
- 修复边界：选片开始到剪辑结算保护该组免受远端 reconciliation 覆盖，并失效跨越保护期的请求；不保存副本回灌，不恢复被用户显式删除的数据。结束后正常的新刷新仍可同步远端删除。只有 Save 才交给既有 attach 替换。

### B 原因（修复前记录）

- 核对候选：原素材 durationMs 泄漏、导出尾部帧/音轨对齐溢出、秒/毫秒混用。`attach({ ...videoToTrim, ...outcome.video })` 由导出返回值覆盖 durationMs；`retainVideoSource` 仅改 URI；Compressor 的 Android `getVideoMetaData` 明确 metadata duration 毫秒 /1000，单位正确。
- 红测从 130000ms picker 进入真实 trim 控件，原生边界返回 120021ms，断言 attach 参数确为 120021（已过），随后真实 `prepareTrainingVideo` 因严格 >120 校验拒绝（1 failed）。因此修复的是实际片段稍长的校验路径，不需再覆盖一次已正确的时长。120021 是定向故障注入值，不是这轮测得的设备值；ADB socket 被沙箱拒绝（Operation not permitted），无法读取当次失败文件的精确溢出量，需 Opus 回读。
- 选择卡允许的“一帧以内校验余量”：从现有 readTracks 返回实际 frameRate，阈值为 120 + min(0.1, 1/frameRate) 秒；未知/无效帧率余量为 0。保留原生 trim 端点/导出算法/码率/精度不变，仅扩充原生轨道元数据及对应类型，不加依赖。上限外超过一帧的输入仍拒绝。

### C 原因（修复前记录）

- 候选为 grant 之前位移丢失、拖动累计误差、轨道宽度或像素/dp 换算错误。原代码用 `onResponderGrant.pageX` 为起点，即使初始 touch down 更早也会重置；onMove 使用绝对 pageX 差值并非累计 delta。轨道按 onLayout 的 RN 坐标宽度与 source 秒数转换，没有物理像素混用。
- 在同一个控件 seam 重放按下→延迟 grant→绝对 move，四组期望完整 220/110/200/200 坐标位移，旧实现实际 185/105/123/87，4 failed，与卡里的偏差方向与数量一致。日志 `/private/tmp/r3-repair2-c-red.log`；最初测试误取组件父节点造成 TypeError 已纠正，不算行为红证据。
- 修复：在 start responder 协商（touch down）记录触点与当前把手的锚点，grant 不重设；每次绝对触点位置相对按下锚点还原把手秒数，等价于固定按下时触点到把手中心的偏移。纯函数独立测试、组件重放验证接线；真实系统接管时序/速度需 Opus 四组 adb 实屏复测。

### D 原因（修复前记录）

- 候选：跳转前旧进度误判终点、seek 未完成已开始比较、进度单位/时基错误。当前 seek 立即改 position 并发异步原生命令，onProgress 不检查跳转状态且没有 onSeek；Play 立即令 playing=true，所以上一轮右把手位置的迟到进度会触发 rewind。
- 依赖源码核实：react-native-video `Video.tsx` 的 seekCmd 为异步命令；Android ReactExoplayerView 的 progress Handler 单独派发 currentPosition，onVideoSeek 在 buffering/playing 状态变化另行派发；VideoEventEmitter 的 progress.currentTime 与 seek.seekTime 都除 1000 转秒。未发现单位不一致。
- 真实组件测试：选择 2–6、Play seek(2)，在完成前注入旧 6.55，paused 意外变 true（1 failed），复现提前回卷。日志 `/private/tmp/r3-repair2-d-red.log`。这证明回调竞态可导致卡述症状；没有设备事件 trace，不能声称本轮量到了屏内 1.75–3.2 的原生具体排程。
- 修复：追踪最新 pending seek；只有匹配目标的 onSeek 才解除保护。pending 时忽略 progress/end，不让旧回调写入 position 或回卷；确认后仍按既有区间终点规则停止/回起点。旧终点 onSeek 不得解除新起点 seek 的保护。

### 本轮改动文件

- A：`VideoAttachmentControls.tsx`、`store.ts`；回归 `__tests__/attachment-trim.test.tsx`、`__tests__/remote-hydration.test.ts`。
- B：`native.ts`、`passthrough.ts`、`modules/training-video/android/src/main/java/com/meetpr/video/TrainingVideoModule.kt`（只扩充 readTracks.frameRate）；回归 `__tests__/attachment-trim.test.tsx`。
- C：`VideoTrimView.tsx`、新增 `trim-gesture.ts`；回归 `__tests__/attachment-trim.test.tsx`、新增 `__tests__/trim-gesture.test.ts`。
- D：`VideoTrimView.tsx`；回归 `__tests__/attachment-trim.test.tsx`。
- 上述 JS 路径均相对 `src/features/training/video-upload/`；文档仅追加本 JOURNAL。本轮增量 `/private/tmp/r3-repair2.diff`。未改 VideoTrimExporter/VideoTrimMedia、gradle、CameraRecorder、trim-native、区间规则、文案、页面样式、PARITY 或任务卡的既有内容。

### 红 → 绿测试与输出摘要

命令：`npm test -- --runInBand src/features/training/video-upload/__tests__/attachment-trim.test.tsx -t '<测试名片段>'`；C 纯函数另外运行 trim-gesture.test.ts。

| 项 | 测试名 | 修前 → 修后 |
|---|---|---|
| A | `Replace %s keeps the displayed original video across the picker return refresh`（close/back/read failure/export failure） | 4 failed：UI 只有 Record/Photos，没有 Delivered；修后原 record、原 Video 实例与 URI 均保留。A 绿日志含 attachment + remote-hydration 共 36 passed |
| B | `a full-limit trim of a 130 second source prepares its actual exported duration within one frame` | 1 failed：attach 已是 120021ms，但 prepare 抛 exceeds 120-second；修后 1 passed，prepare 返回导出 URI |
| C | `handle follows the full %ipx drag even when responder grant is %ipx late`（四组） | 4 failed：实际位移 185/105/123/87；修后完整 220/110/200/200，计算误差 <0.000001 秒；另补 release 末位置断言直接通过 |
| C | `absolute touch position keeps the grab offset without accumulating move events` | 先缺少纯函数模块 suite failed；实现后固定 2→4→3→1 秒例子通过。C 绿日志共 29 passed |
| D | `pre-seek progress cannot end playback while the jump to the selection start is pending` | 1 failed：旧 6.55s 进度使 paused=true；修后旧 progress/旧 seek 均不结束播放，确认起点后 3.2s 继续、6s 停止回2s。D 绿日志 29 passed |

原始证据：`/private/tmp/r3-repair2-{a,b,c,d}-{red,green}.log`，C 纯函数首红 `r3-repair2-c-pure-red.log`。C 事件重放证明旧 grant 锚点会丢掉接管前位移，不证明设备的 down/grant 实际间隔；release 末事件也纳入绝对定位，避免丢最后一次位置。无真实手势调度 Jest seam，须设备复测。

额外边界测试为实现后补充、直接通过，未宣称先红：30/60/120fps 超过一帧、无效/未知帧率无余量（5 条）；Replace 期间发起但取消后才返回的刷新失效，后续正常刷新仍可同步远端删除（1 条）。既有录制/D-19、会话收尾、上传/重试回归继续覆盖。

### 独立审查与验证边界

- review-loop 固定本轮快照 diff，两个只读 reviewer：Standards **0 findings**；Spec **0 findings**。Matt tracker 配置仍缺，已提示完整流程需 `$setup-matt-pocock-skills`，本轮没有私建配置。review 后仅改测试文案键类型及补 release 断言，无运行时语义改动。
- Android SDK 36 的 `android.jar` 经 javap 确认 KEY_FRAME_RATE/getNumber/getInteger/getFloat 存在；getNumber 有 API 29 守卫，旧版按整数/浮点兼容。此为 API 检查，不是 Kotlin build 证据。本树无 android/，无新增依赖。
- **Opus 待实屏复测**：A 同一已上传组 Replace→×/系统返回/读失败/导出失败，原播放器与 Delivered 状态保留；fixture `/videos` 需如实返回新完成上传，避免后续正常刷新再次把它视为远端删除。B 原生重编译后，130s 素材不动把手 Save，回读实际输出 durationMs/frameRate，确认溢出不超过一帧且上传成功。C 按卡四组距离/时长滑动，左右把手与越界推动误差均≤10px。D 1.17–6.55s 区间及连续拖动后 Play，烧录时间码应到终点才停并回起点；旧进度不能提前回卷。
- 本轮 ADB 启动 socket 被沙箱拒绝，未装包或冒称实屏通过。保留原卡已实屏通过项目的既有证据；这些单测不替代 Opus 收货或 David 真机验收。

### 最终全量检查

- `npm test -- --runInBand`：**148 suites / 1113 tests passed，0 failed**，退出 0，15.705s；`/private/tmp/r3-repair2-full-test.log`。本轮新增 1 suite / 17 tests。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/r3-repair2-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/r3-repair2-tsc.log`。首跑 1 处新增测试 key:string 与翻译键联合类型不符，已改成 Parameters<typeof t>[0]；原日志 `/private/tmp/r3-repair2-tsc-first.log`。修正后以上三项全部重跑通过。
- `git diff --check`：通过；无临时 DEBUG 日志、无依赖变化、无 commit/push。前两轮未提交改动完整保留。

## R3 返修三（2026-10-04，Codex 开发自测；待 Opus 收货）

- 现场：`feat/r3-video-trim@1bca4a8`。开工时只有 `specs/build22-parity/R3-VIDEO-TRIM-CARD.md` 的返修三内容未提交，保留原样。本轮不 commit、不 push。
- 范围只覆盖卡片返修三：录制回看页直接剪辑，删 Edit/Duration/系统 controls；原片自动播放，区间循环，Use 按最终范围决定是否导出。无新增依赖、文案键、原生模块修改。已读取仓规、完整卡片、Expo SDK 57 版本文档。

### 文件与共用边界

本轮新增：`src/features/training/video-upload/TrimTimeline.tsx`、`useTrimPlayback.ts`、`useTrimSource.ts`。
本轮修改：同目录 `CameraRecorder.tsx`、`VideoTrimView.tsx`、`__tests__/camera-review.test.tsx`，以及本 JOURNAL、`PARITY.md` 的 VideoUpload 行。

- `TrimTimeline`：原胶片、把手、遮罩、选中框、时间标签及绝对触点接线原样移出。脚本逐字比对组件主体（除 export）为 True；继续使用原 `trim-gesture`，不另写算法。
- `useTrimPlayback`：共用原 `trim-selection`、拖动暂停/seek、最新 seek 完成门禁、播放区间检查。standalone 到终点暂停并回起点；review 到终点回起点继续。每次新录制 reset；metadata ready 不覆盖用户准备期的 Pause。
- `useTrimSource`：共用工作副本、轨道读取、10 张缩略图、脱敏警告、`TrimSession` 所有权。standalone 仍允许缩略图生成失败后继续；review 准备失败则隐藏时间轴和气泡，Use 交原片；缩略图尚未完成期间把手禁用、Use 交原片。
- 独立页顶栏、视频画面、底栏与样式不变；保存/失败/取消结算不变。`attachment-trim.test.tsx` 和相册入口未改，34 条原测试通过；独立页逐像素实屏回归仍待验。
- 原 CameraRecorder D-19 回归保留，仅将已经被本卡覆盖的 controls 预期改成无系统 controls；旧 Edit 场景测试由 inline trim 场景替换。

### 红 → 绿证据

seam 全部是卡内批准的 CameraRecorder 组件，native / 文件系统 / 播放器事件为外部边界桩。逐个行为写测试、执行失败后再实现。日志 `/private/tmp/r3-{red,green}-1.log` 至 `-9.log`；绿日志 1/6/7 含相册回归。

| 次序 | 测试名 | 红测现象 → 绿测结果 |
|---|---|---|
| 1 | `review shows the shared timeline and Selected without Edit, Duration or native controls` | 找不到 Selected 0:03；出现 Edit/Duration/controls → inline 时间轴与自动播放成立。原四条 D-19 的 controls 新预期也先红后绿 |
| 2 | `moving handles then Use exports the selected range, saves that file to Photos and releases the original` | trim 调用 0 次 → [1000,2000]ms 导出，Photos/onUse 都收到导出文件，原片/缩略图回收，真裁剪后持久化 |
| 3 | `review Play loops within the selection, ignores stale progress and preserves paused bounds across background` | 无 Play 胶囊 → 拖动保持暂停、后台返回保留区间，旧进度不提前回卷，终点回起点继续 |
| 4 | `hint bubble closes for this review only, while do-not-remind persists across reviews` | 旧提示仅单行 → 完整三行可缩放气泡；× 本次关闭、Retry 后再现；不再提醒持久化 |
| 5 | `export locks Retry, Close, back, handles, Play and Photos until completion` | Close 未禁用，Retry handler 可绕过 disabled → UI 禁用且处理器同步 ref 守卫，返回键无效 |
| 6 | `%s preparation failure hides trim tools and Use delivers the original`（thumbnails） | 缩略图失败后时间轴仍可用 → 隐藏剪辑工具、Use 原片。metadata 同行为先已绿 |
| 7 | `Retry resets the previous selection and keeps handles disabled while the next clip is preparing` | 下次录制准备时把手沿用旧 ready → 重置范围/loaded，新片 onLoad 后才可拖 |
| 8 | `Use during thumbnail preparation delivers the original and cleans late thumbnails without exporting` | 缩略图准备期间可拖 → 准备期禁拖、Use 不导出，晚到缩略图仍回收 |
| 9 | `pausing during preparation stays paused when metadata becomes ready` | metadata 到达覆盖手动 Pause → 保留暂停 |

另补边界测试（实现后直接绿，不冒称先红）：导出失败提示 copy011 并保留原片/范围，重试同区间；Retry/Close/unmount 处理晚到缩略图；export/Photos 两个异步窗口卸载不交付且删除输出；不动把手 Use 无导出、不持久化提示。CameraRecorder 最终 29 tests。

### 临时文件清理点

| 路径 | 清理与保留 |
|---|---|
| Retry | handler 先 `session.dispose()`，取消该工作 URI 导出，删工作副本/缩略图；删 owned 原片，再回相机。晚到文件由已结束 session 的 `own()` 立即删除 |
| 顶部 × / 系统返回 | 非 exporting/using 时 `close()` 使录制 generation 失效、停止录制，dispose 会话、删除 owned 原片后通知 onClose；导出期间无效 |
| Use 未裁剪或准备未完成/失败 | 不调用 trim；Photos/onUse 用原片。dispose 会话清工作副本/缩略图；原片所有权移交 onUse，组件不再删除它 |
| Use 裁剪成功 | 导出返回后立即 `current.own(output)`；Photos 完成后 `current.saved(output)` 保留输出并删工作副本/缩略图，再删原片、移交输出给 onUse；成功才持久化提示 |
| 组件卸载 | hook effect dispose 会话并 cancelTrim；CameraRecorder effect 删除 owned 原片；进行中的导出若稍后返回，own() 因会话已结束即删输出。等待 Photos 期间卸载同样删已 own 输出，不触发 onUse |
| 导出失败 | 沿用未改的 `VideoTrimExporter.fail()`：取消工作/Transformer 并删 job.output，再 reject。JS 不结算会话、不删原片/工作副本/缩略图，保留范围供重试；解除 using 并显示现有 copy011。最终离开仍走上述清理 |

### 气泡布局与自审

- Play 与气泡位于视频区域底部同一个绝对定位的纵向 View，间隔 space2；气泡出现自然将 Play 上推。容器 pointerEvents=box-none，不是 Modal，不挤占底部面板；气泡底部三角指向时间轴。
- 提示完整字符串，允许三行并 adjustsFontSizeToFit，ellipsizeMode=clip 禁止省略号；关闭按钮用既有 copy005。照片开关、把手、Play、Use 在气泡可见时仍可用；视频区域 minHeight=180dp。真实字体缩放下完整排版尚无实屏证据。
- review-loop 两位只读 reviewer 独立审查：Standards **0 未决 finding**；Spec **0 findings**，包含准备期 Pause 修复后的增量复核。固定初审快照 `/private/tmp/r3-review.diff`。仓内 Matt tracker 配置缺失，本地双轴审查以批准卡片为源，未私建配置；完整 tracker 流程需 David 日后调用 `$setup-matt-pocock-skills`。

### 最终检查与未覆盖验收

- `npm test -- --runInBand`：**148 suites / 1126 tests passed，0 failed**，退出 0，16.39s；`/private/tmp/r3-full-test.log`。
- `npm run lint`：**0 errors / 0 warnings**，退出 0；`/private/tmp/r3-lint.log`。
- `npx tsc --noEmit`：**0 errors**，退出 0；`/private/tmp/r3-tsc.log`。
- `git diff --check`：通过。首轮 tsc 的测试 mock 参数类型、lint 对嵌套 ref 推断及 effect 同步 setState 的问题已修正；以上是修正后的最终全量结果。
- ADB `devices` 因无法创建本地 smartsocket listener（Operation not permitted）失败，本树无 android/，本轮没有装包、原生重编译、屏幕截图或设备验收。没有请求放宽沙箱。
- **5a–5d、5f：组件层有上述行为覆盖；未覆盖真录制、原生播放实际循环、导出后挂载/时长、Photos 相册实际新增、系统后台恢复及气泡实屏。**
- **5e：未覆盖 360×640dp / 字体 1.3× 的实际排版、完整文案、触摸可达与实测视频区域高度。**
- **5g：原相册测试全部未改且绿、时间轴主体原样抽取；未覆盖设备逐像素与手势/播放回归。**
- **5h：全量 test/lint/tsc 已覆盖。** 以上仅开发自测，不宣布卡片通过收货。

## R3 返修四（2026-10-04，Codex 开发自测；待 Opus 收货）

- 现场 `feat/r3-video-trim@61fa6b8`，开工仅任务卡未提交。完整读取 AGENTS 与任务卡，以文末「返修四 / 定稿 A」为唯一增量；原任务卡改动保留原样。不 commit、不 push。
- 无新增颜色值、文案键、依赖或原生改动。两页共用 `TrimTimeline`、`TrimPlayButton` 与 `useTrimPlayback`；Use、Retry、导出、清理、相册入口和既有持久化流程保持原实现。
- 本轮文件：`CameraRecorder.tsx`、`VideoTrimView.tsx`、`TrimTimeline.tsx`、新增 `TrimPlayButton.tsx`、`useTrimPlayback.ts`、`trim-gesture.ts`；测试 `camera-review.test.tsx`、`attachment-trim.test.tsx`、`trim-gesture.test.ts`、新增 `trim-playback.test.tsx` / `trim-timeline.test.tsx`；本 JOURNAL 与 `PARITY.md`。代码和测试位于 `src/features/training/video-upload/`。

### 主题令牌（均由当前 useColors 解析）

| 界面元素 | 浅色令牌 | 深色令牌 |
|---|---|---|
| 两页页面、顶栏、底部面板 | bgBase | bgBase |
| 顶栏圆形关闭按钮底 / 图标；独立页标题 | surfaceRaised / textPrimary；textPrimary | surfaceRaised / textPrimary；textPrimary |
| Retry（沿用 AppButton link） | textMuted | textMuted |
| Save 与保存转圈 | gold500 | gold500 |
| 视频画面留边 | chatImageBackground | chatImageBackground |
| 圆形播放按钮底 / 白色图标 | numberPadScrim / inkOnCTAFill | numberPadScrim / inkOnCTAFill |
| 视频加载转圈与文字 | inkOnCTAFill | inkOnCTAFill |
| 缩略图占位 | surfaceRaised | surfaceRaised |
| 选框、把手 / 把手竖线 | gold500 / inkOnGold | gold500 / inkOnGold |
| 区间外遮罩 | bgBase，View opacity 0.62 | bgBase，View opacity 0.62 |
| 播放头填色 / 描边 | inkOnCTAFill / borderStrong | inkOnCTAFill / borderStrong |
| 时间气泡底 / 等宽文字 | gold500 / inkOnGold | gold500 / inkOnGold |
| 起止时间 / Selected | textTertiary / gold500 | textTertiary / gold500 |
| 裁剪提示气泡底与尖角 / 文案、关闭和不再提醒 | surfaceRaised / textSecondary | surfaceRaised / textSecondary |
| 错误文字 | danger | danger |
| Save to Photos 文字 | textPrimary | textPrimary |
| 开关开 / 关轨道；开 / 关滑块 | gold500 / borderStrong；gold200 / textMuted | gold500 / borderStrong；gold200 / textMuted |
| Use 主按钮底 / 字与转圈 | ctaBackground / ctaText | ctaBackground / ctaText |
| 状态栏图标（系统枚举，非颜色值） | dark-content | light-content |

黑底只留在视频画面；回看页不再用固定深色 provider。`inkOnCTAFill` 仅用于卡片要求保持白色的媒体图标、播放头及黑底加载提示，不用于页面文字。相机录制态原黑底与白字展示仍保留。气泡原来的透明结构样式不是新增色值。两页顶部按钮与视频水平边距均为 spacing.base；独立页时间轴移至视频下方并删除文字播放条；回看页把顶栏移出视频浮层。视频区域 minHeight 180dp，时间气泡单独预留 32dp 行。

### 手势、播放头与节流

- 胶片上有一个空的绝对定位 responder 层，后渲染的两个把手覆盖它，各自保持 minimumHitTarget=44dp 的命中宽度。播放头 responder 另外排除两端 ±22dp，故落在把手热区时不会开始 scrub；视觉播放头 pointerEvents=none。
- 按下时由 pageX−locationX 标定胶片原点，随后所有 move/release 使用 pageX 的绝对位置，经共享 `trimSecondsAtTouch` 换算并夹到整段 [0, duration]；不累计 dx，不受 responder 接管延迟影响。把手保持原有触点与中心偏移规则、即时精确 seek 和推动另一端的区间算法。
- 播放头每次事件立即更新位置、暂停，裁剪区间不动。拖动 seek 首次立即发出，此后按 100ms 窗口只保留最新目标，容差 0.1s。松手或手势终止清除 timer/排队目标，发容差 0 的精确 seek；reset/unmount 同样取消 timer。
- 只有最新精确 seek 的匹配 onSeek 才解锁进度；拖动期间、等待 seek 期间及暂停时的旧 onProgress 不会拉走播放头。播放时随进度前进；区间内从播放头续播，区间外回起点；终点回起点后，回看继续、独立页暂停。
- 播放头 adjustable 使用现有 timeline 标签，增减 1 秒并夹到整段。时间气泡使用 `MM:SS.hh` 与 mono 字体，水平位置夹在轨道容器内；拖把手取当前该端、拖播放头取当前播放位置。回看提示仅在拖动期间隐藏，松手恢复，不修改提示持久化状态。

### 红 → 绿测试与原始日志

seam 沿用卡内已批准的纯函数、hook、两页组件，逐行为先失败再实现。首轮测试桩导入顺序问题先修正，再确认行为性失败；未将测试环境故障充作功能红测。

| 测试名 | 红测 → 绿测 | 原始日志（/private/tmp/） |
|---|---|---|
| `playhead touch covers the whole source and clamps at both ends` | 缺函数 → 4s / 0s / 8s | r4-gesture-red.log / r4-gesture-green.log |
| `time bubble formats %s as %s`（3 条） | 缺函数 → 00:00.00 / 00:06.11 / 01:15.50 | 同上 |
| `scrubbing pauses playback and moves the playhead outside the selection without changing its bounds` | 无 scrub → 2–6s 区间不变、播放头到 7s 且暂停 | r4-playback-red.log / r4-playback-green.log |
| `drag seeks are throttled to the latest target and release seeks exactly without a late timer` | 3 次事件发 3 次 seek → 窗口内只发首次与最新，松手精确且无晚到 timer | r4-throttle-red.log / r4-throttle-green.log |
| `filmstrip taps and drags scrub the whole source while handle targets take priority` | 无 scrub responder → 胶片点拖、把手热区排除、时间气泡显示/消失 | r4-timeline-red.log / r4-timeline-green.log |
| `trim presentation uses %s theme tokens and icon-only playback`（两页 × 明暗，共 4 条） | 新布局关键节点缺失 → 主题、状态栏、无文字播放条、点击跳转、气泡金底与提示恢复成立 | r4-theme-red.log / r4-theme-green.log |
| `paused progress cannot pull the released playhead away from its exact target` | 4.25s 被旧 3.9s progress 拉走 → 保持 4.25s | r4-paused-red.log / r4-paused-green.log |

实现后追加、直接绿（不宣称先红）：区间内 / 外续播各 1 条；各页 progress 与终点规则各 1 条；reset/unmount 取消队列 1 条；adjustable 一秒步长、边界与禁用 1 条。新增共 2 suites / 18 tests。

原 `attachment-trim` / `camera-review` 的行为断言未删除或修改，仅 mount helper 接受主题参数并包裹主题 provider，新加上述两页双主题测试。首轮把节流也用于把手导致四条跟手测试失败，已恢复把手即时精确 seek，原四条断言原样通过；只有新增播放头使用节流。没有以改弱旧断言让测试变绿。

### 独立审查与验收边界

- `review-loop` 两个只读 reviewer 对固定 `/private/tmp/r4-review.diff` 独立审查：Standards **0 findings**；Spec **0 findings**。review 后仅追加无障碍边界测试及本文记录，无运行时代码变化。缺 Matt tracker 配置，已说明完整 tracker 流程需 `$setup-matt-pocock-skills`；未私建配置。本次本地双轴使用批准卡片为源。
- ADB `devices` 无法启动 smartsocket listener：`Operation not permitted`。本树没有 android/，本轮无装包、原生 build、改后截图或设备操作证据；不以旧截图或组件树代替实屏。
- **6a、6b 未覆盖实屏**：已测两页双主题关键令牌与状态栏，不证明与定稿 A 的实屏观感、系统切主题及真实缩略图对比度。
- **6c–6f 未覆盖设备层**：已测点拖、绝对位置、把手优先、气泡、seek 节流/精确 release、区间内外续播、循环/暂停与旧把手跟手；未实测原生画面跳转精度、连续进度的视觉平滑或手指下的实际跟手。
- **6g 未覆盖实屏复跑**：旧 Use 三路径、Photos 参数、Retry、D-19、提示持久化、相册取消/保存及清理测试保留通过；5b/5c/5d/5f/5g 的真实录制、导出上传、相册落盘、系统后台恢复以及 360×640dp + 1.3× 双主题实际排版仍待 Opus 收货。
- **6h**：最终全量检查见下。以上只报告开发自测，不宣布产品验收通过。

### 最终全量检查

- `npm test -- --runInBand`：**150 suites / 1144 tests passed，0 failed**，16.284s；`/private/tmp/r4-final-test.log`。
- `npm run lint`：**0 errors / 0 warnings**；`/private/tmp/r4-final-lint.log`。
- `npx tsc --noEmit`：**0 errors**；`/private/tmp/r4-final-tsc.log`。
- `git diff --check`：通过；HEAD 仍为 `61fa6b8`。未 commit、push、增依赖、改原生、增文案或修改用户任务卡。
- 首轮 lint / tsc 报告仅涉及新增测试的 hook harness 全局赋值、重复导入及类型 / 测试 helper 包裹问题，已修正后全量复跑。最终代码 diff（含新文件）见 `/private/tmp/r4-final.diff`；原始测试与审查日志留在 `/private/tmp/`，不包含账号或素材。

## 2026-10-09 · Spec 086 · Training 周条 2B 与 hero 教练备注（开发自测交付）

### 范围与现场

- 工作树 `/Users/david/Projects/apps/meetpr-rn-wt-086`，分支 `feat/086-training-strip-coach-note`，HEAD `6aa9397`。启动后在本目录 `mktemp` 试写并删除成功；开工工作区干净。未切换工作树，未 commit、push 或开 PR。
- 完整读取本仓 AGENTS、CLAUDE（仅引用 AGENTS）、086 SPEC/CARD、084 §4 及其修订；本仓没有 CONTEXT.md / FOLLOWUPS.md。已读 Expo SDK 57 版本文档。沿用现有 node_modules 软链，未安装依赖。
- 只改 Training 派生和学员界面，不改推进、推荐日期算法、API schema、本地存储、后端、dashboard 或教练端。不改 PARITY、SPEC、CARD。没有引入账号、密钥或令牌。

### 改动文件（13 个，含本节）

| 文件 | 改动 |
| --- | --- |
| `src/domain/plan/week-strip.ts` | 可选 today 默认 gymDayToday；cells/calendarCells 的训练格带 date/isBehind；daysBehind 只按 cursorDay 派生，以 UTC 日期差避免 DST 小时差影响。 |
| `src/features/training/TrainingWeekStrip.tsx` | 星期／状态／短日期或 Behind，删除 D 序号与休息日期；当前日实心点；读屏按新口径；固定两端箭头、中间可滚动格子；删除独立换周行与周数小点。 |
| `src/features/training/TodayWorkoutView.tsx` | 周次、胶囊、计数移入 Training history 同一行；当前周支持落后单复数与读屏；传入页面 today；重新聚焦立即更新时间；过期预览不传推荐日期。 |
| `src/features/training/WorkoutBody.tsx` | 推荐日期可缺省；可编辑 hero 的备注上移至动作名后、重量前，淡金块内组备注在先、动作备注在后；两段之间细线；正文 15/21 与次段 14/20，全文显示。已完成详情保留原备注块，分组表动作备注不变。 |
| `src/features/training/coach-notes.ts`（新增） | 独立备注派生函数，输入组备注、动作备注、动作显示名，输出小标题、正文、isPrimary；空白作无内容。 |
| `src/domain/plan/__tests__/week-strip.test.ts` | 新增格子落后、后移日期、cursor 天数与完成推进、默认 4 点日界线用例；旧断言原样保留。 |
| `src/features/training/__tests__/training-week-strip.test.tsx`（新增） | 三种第三行、无 D/休息日期/小点、读屏、换周按钮禁用与点击。 |
| `src/features/training/__tests__/coach-notes.test.ts`（新增） | 四种组合、空白、同文双备注、中英文标题、长正文与换组取值。 |
| `src/features/training/__tests__/completion-entry.test.tsx` | 直接挂载训练页验证胶囊与读屏、跨 4 点聚焦/前台恢复、非当前已完成周；未抽胶囊测试函数。 |
| `src/features/training/__tests__/quick-log-entry.test.tsx` | 旧未来预览用例固定时钟；新增已过期未来周预览隐藏日期但保留解锁说明与 Upcoming。 |
| `src/i18n/catalog/StudentKit.json` | Behind、落后天数及格子/胶囊读屏，中英文与 `.one` 单数键。 |
| `src/i18n/catalog/RnExtras.json` | 本组与动作名备注标题，中英文。 |
| `docs/CODEX-JOURNAL.md` | 追加本节原始证据、范围和验收边界。 |

新增颜色全部使用已有语义 token，落后状态为 goldText/goldSoft；备注字号与行高使用 fontMetrics。沿用页面原有分钟 tick 和 AppState 恢复刷新，仅在原聚焦回调中补时钟更新，没有新开定时器。旧备注标题仍用于已完成详情、分组表和历史页，故不删除共享 i18n 键。

### 先红后绿及原始日志

所有原始 stdout/stderr 均在 `/private/tmp/rn-086/`。下表日志前缀后接 `-red.log` / `-green.log`；每轮红测后才实现对应行为，没有通过删除或放宽旧断言变绿。

| seam / 测试 | 红测 → 绿测 | 日志前缀 |
| --- | --- | --- |
| `training cells independently mark only unfinished recommended dates before today as behind` | 缺 date/isBehind → 已完成 false、过期未完成 true、等于今天 false、未来 false、后移后未到期 false；两类 cells 同时验证。 | `01-cells` |
| `cursor days behind on %s is %i regardless of selection`（4 条）及 `days behind follows the shifted cursor, advances on completion and clears without a cursor` | 缺 daysBehind → 未到期/当天 0、1/18 天正确；点选别周不改 cursor 天数；后移按新日期算，完成推进后重算，全完/无计划为 0。 | `02-days` |
| `training cells show dates or Behind without D ordinals; rest cells expose only weekday and Rest` | 仍有 D1–D4 → 无 D，完成/当天/未来短日期及 Behind 正确，休息无日期，读屏正确。 | `03-cell-render` |
| `the compact strip contains only calendar cells and fixed navigation, without week heading or dots` | 独立 W1 行仍存在 → 周条只余格子与箭头，无点；首尾周箭头禁用和翻周目标正确。 | `04-strip-layout` |
| `training header shows cursor status on September %i`（3 条） | 页头无胶囊 → Current week / 1 day behind / 18 days behind 及对应读屏。 | `05-header` |
| `only a set note produces the primary this-set paragraph` | 目标函数模块尚不存在 → 单组备注主段与本组标题。 | `06-set-note` |
| `only an exercise note is primary and includes its display name` | 空白组备注被当正文 → 动作备注成为主段，带动作显示名。 | `07-exercise-note` |
| `both notes keep the set first and the exercise secondary, including identical copy` | 第二段缺失 → 组在先、动作为次段，即使正文相同也保留两条。 | `08-both-notes` |
| `missing or whitespace-only notes produce no block (%p, %p)`（4 条） | null/undefined 抛错、空串/空白产生段落 → 四种均输出空数组。 | `09-no-notes` |
| `an overdue future preview hides its old recommended date while keeping its unlock message` | 仍显示 Coach recommends Tue, 9/8 → 该行隐藏；解锁说明、Upcoming、只读规则保留。 | `10-preview` |
| `training header recalculates after 4am on focus without waiting for its minute tick` | 聚焦仍显示 Current week → 立即变为 1 day behind。 | `11-clock` |

`03-cell-render-red.log` 是首个测试桩缺 AsyncStorage native mock 的运行错误，不算行为红测；补齐系统边界 mock 后，实际行为红测保存在 `03-cell-render-red-behavior.log`。`06-set-note` 的红测为缺少指定纯函数模块，记录为导入失败，不宣称运行过函数断言。

已存在行为的额外覆盖直接绿，不冒称先红：

- `training header recalculates after 4am on foreground without waiting for its minute tick`：原 AppState 更新已有效，与 `11-clock` 同跑。
- `the default today follows the local 4am gym-day boundary`：补充 trainingWeekStrip 默认参数的端到端派生。既有 `training-policy.test.ts` 已覆盖 `gymDayText`（即 gymDayToday）03:59:59 / 04:00:00，不改原函数或原断言。
- `Chinese titles use the display name and keep the complete long note when the active set changes`：中英文标题、超过 200 字符正文、切组取值。
- `browsing a completed week keeps Completed instead of the overdue cursor count`：非当前已完成周不带天数。

后三条和相关 suite 的输出为 `12-additional-coverage-green.log`。所有新增测试均落在 CARD 列出的 domain、周条组件、备注纯函数及训练页挂载 seam；没有写样式数值断言。最后自审只简化了重复日期派生和备注分支，相关检查及全量重跑通过。

### 既有断言与 SPEC 疑点

- **既有断言修改：0 条**。`set-save`、`completion-entry`、`quick-log-entry`、`set-ref-entry` 原断言全部保留并通过。
- 旧 `quick-log-entry` 的 `browsing a future week is read-only and Back to today restores the current workout` 原先依赖机器当天，却断言 9/8 的推荐日期必出现。本次只将该用例时钟固定为本地 2026-09-07 12:00，确保其原本要验证的“未到期未来预览”前提成立；日期、解锁说明、Back to today 等原断言一字未改。另增独立已过期预览用例，避免漏掉新口径。
- `completion-entry` 的路由 focus 空桩改为可记录回调的 jest mock，供新的聚焦恢复用例调用；旧用例不触发该回调。没有改变旧行为预期。
- **SPEC/CARD 冲突**：SPEC「测试 seam」第 4 项要求旧入口测试“不改断言”；CARD「测试 seam」第 5 项允许必要时改旧断言。按用户优先级遵循 SPEC，处理如上。
- **未发现 SPEC 内部自相矛盾或需要产品取舍的事项**。完成格仍显示推荐日期，已落后的未完成格与其预览隐藏旧日期，按 §1 的完成状态表执行。§3 只变可编辑 hero，已完成详情不扩改。

### 独立自审与最终检查

- `review-loop` 对固定 `/private/tmp/rn-086/review.diff`（12 个代码/测试/文案文件，含 3 个新文件）执行两个只读独立 reviewer：**Standards 0 findings；Spec 0 findings**，一轮，无返修项。这不是 Opus 验收结论。
- 仓内无 `docs/agents/issue-tracker.md`；已告知完整 Matt tracker 工作流需要 `$setup-matt-pocock-skills`。未私建 tracker，本次本地双轴以批准 SPEC/CARD 为源。
- `npx jest --runInBand`：**155 suites / 1193 tests passed，0 failed**，20.083s。含全部 i18n 守卫和上述四个旧入口 suite；原始输出 `/private/tmp/rn-086/final-jest.log`。
- `npx tsc --noEmit`：**0 errors**，退出码 0；`/private/tmp/rn-086/final-tsc.log`（成功无输出）。
- `npm run lint`：**0 errors / 0 warnings**，退出码 0；`/private/tmp/rn-086/final-lint.log`。
- 首轮 lint 有 1 个 React Compiler `preserve-manual-memoization` 错误：聚焦回调推断依赖含 setRequestedDayID。将该稳定 setter 补入依赖后通过，未禁用规则。原始错误在 `lint-first.log`，修后结果在 `lint-second.log`，最终结果如上。
- `git diff --check` 通过。Impeccable layout 机械扫描输出 `[]`，记录在 `layout-scan.json`；该扫描不能验证原生排版。最终完整本地 diff 在 `/private/tmp/rn-086/final.diff`。

### 未做设备验证与三处实屏重点

**未做设备验证**：按 CARD，模拟器实屏、老用户升级第一屏、Light / Dark 与小屏大字号由 Opus 按原验收清单收货。本轮没有启动模拟器、原生构建/装包、截图、真实账号联调、TalkBack 或真实切后台验证；组件树与纯函数测试不代替这些证据。

最需要实屏确认的三处：

1. **2B 窄屏密度**：360×640 dp、系统字体 1.3×、双主题和中英文下，同一行的 Wn / 三位数落后胶囊 / 计数 / Training history，以及最窄训练格的 Behind / 已落后完整性；日期/状态的对比度和约 64dp 高度。
2. **周条交互与旧用户首屏**：落后两周以上时过期日期隐藏；首尾周禁用箭头、选中/当前标记、Back to today、跨 7 天横向滚动与滑动翻周、凌晨 4 点/前台恢复；真实已记录组、已完成日、休息计时保持。
3. **hero 备注与换组**：四种备注组合、两段排序和分隔、约 200 字符长正文及长动作名在双主题/大字号下不溢出，Ask coach / Log this set 不受挤压；记完一组后组备注更换、动作备注保留，已完成详情和分组表表现不变。

### 返修一（2026-10-09）

- 按 CARD「返修一」处理验收 10 的页头裁字：已查看 Opus 的 `50-small-18.png`，360×640 dp、字体 1.3× 下胶囊只显示 `18 days`。本次按返修明确允许 `Training history` 整体换到下一行，覆盖 SPEC 验收 10 原来的整行不换行要求。
- 仅修改 `src/features/training/TodayWorkoutView.tsx` 中该行的 5 处布局样式：`weekHistoryRow` 增加 `flexWrap: 'wrap'`；`weekHeading` 删除 `flex: 1`、`minWidth: 0`，改为 `flexShrink: 0`；`weekBadge`、`historyLabel` 的 `flexShrink` 从 1 改为 0；`historyLink` 的 `flexShrink` 从 1 改为 0，并增加 `marginLeft: 'auto'`。
- 原布局把左组限制在历史入口剩余的宽度，再压缩胶囊，导致单行文字的尾词被裁掉。现在左组按内容宽度参与排版，胶囊与历史入口不再承担收缩；Wn、完成数沿用默认不收缩。空间不足时外层以左组和完整历史入口为换行单位，自动左边距让历史入口换行后仍靠右；空间足够时保留同一行、左右两端对齐。原有单行 Text、字号、颜色、间距 token 和触控高度不变，胶囊不会通过折成两行解决拥挤。未改 JSX、文案、周条格子、备注或落后判定；未抽纯逻辑、未增加样式断言或依赖。
- 开工当前目录临时文件试写及删除成功；分支现场为 `feat/086-training-strip-coach-note`、HEAD `c2be1ab`。保留已有未提交实装，未 commit、push 或开 PR，未修改 `node_modules` 软链。
- 已读 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/) 与 [React Native Flexbox 文档](https://reactnative.dev/docs/flexbox)。本次为已给定复现与修法边界的样式返修，按用户要求不写样式测试；未执行新的设备复现或改后截图，不能以 Jest 通过声称实屏验收通过。改后的小屏 1.3×、三位数天数及宽屏同排由 Opus 复验。
- 三条命令均实际跑完，原始 stdout/stderr 在 `/private/tmp/rn-086-rework1/`：
  - `npx jest --runInBand`：退出码 0，**155 suites / 1193 tests passed，0 failed**，30.904s；`jest.log`。
  - `npx tsc --noEmit`：退出码 0，**0 errors**（无输出）；`tsc.log`。
  - `npm run lint`：退出码 0，**0 errors / 0 warnings**；`lint.log`。
- 本轮增量自审确认仅上述样式与本小节发生变化。`git diff --check` 通过；Impeccable layout 机械扫描输出 `[]`，仅作静态辅助，不代替原生排版验证。

### 返修二（2026-10-09）

- 按 SPEC 同日真机后修订与 CARD「返修二」完成四点。开工当前工作树试写并删除临时文件成功，分支 `feat/086-training-strip-coach-note`，HEAD `c26ace5`，原工作树干净。仓内无 CONTEXT.md / FOLLOWUPS.md / AGENTS.override.md。已读 AGENTS、CLAUDE、PLAN、SPEC 全文及 CARD，并核对 Expo SDK 57 版本文档。未 commit、push、开 PR 或安装依赖，未修改 node_modules 软链。

#### 改动文件（9 个，含本节）

| 文件 | 本轮改动 |
| --- | --- |
| `src/features/training/WorkoutBody.tsx` | 淡金块仅可编辑 hero 的动作 notes，标题复用 copy014，无后缀、分隔线或第二段；组备注回到上次成绩之后的小灰字块，可编辑/只读均仅显示非空组备注，取消动作备注回落。分动作组表不动。 |
| `src/features/training/coach-notes.ts` | 纯函数改为独立返回去首尾空白后的 exerciseNote / setNote，空值为 null；因不再组装标题段落，将 coachNoteParagraphs 改名为 workoutCoachNotes，移除动作名参数、isPrimary 与 i18n 依赖。 |
| `src/features/training/TrainingWeekStrip.tsx` | 实心/空心圆用 spacing.point10，对勾用 spacing.point14，放入 spacing.base（16）高的居中槽位；原格高、触控区域和颜色 token 保留。 |
| `src/features/training/TodayWorkoutView.tsx` | 历史入口文字与 accessibilityLabel 复用 student.trainingHistoryView.copy024（Training history / 训练历史）；build22-strings.ts 与其他调用不变。 |
| `src/i18n/catalog/RnExtras.json` | 删除 trainingCoachNote.thisSet / trainingCoachNote.exercise 两条键及其中英文；src 已无引用。 |
| `src/features/training/__tests__/coach-notes.test.ts` | 按独立来源重写纯函数断言，覆盖单来源、双来源、相同文字、null / undefined / 空串 / 空白。 |
| `src/features/training/__tests__/workout-coach-notes.test.tsx`（新增） | 挂载 WorkoutBody 验证英文/中文无后缀标题、超过 200 字符全文、备注在重量前/处方后、只读与编辑态、空白、换组不换动作备注及换动作更换备注；不写样式数值断言。 |
| `src/features/training/__tests__/quick-log-entry.test.tsx` | 只新增中文历史入口文字、读屏入口点击及路由回归；原断言不改。 |
| `docs/CODEX-JOURNAL.md` | 追加本节。 |

#### 改写首轮断言及原因

1. `only a set note produces the primary this-set paragraph`：改成 exerciseNote 为 null、setNote 独立返回；新版 §3 不允许组备注进入淡金块。
2. `only an exercise note is primary and includes its display name`：改成只返回动作内容、无组备注；标题在渲染 seam 检查为 Coach note / 教练备注，不再带动作名。
3. `both notes keep the set first and the exercise secondary, including identical copy`：改为两个独立字段，保留同文双来源用例；UI 分别渲染上下两块，不存在主次段落排序。
4. `missing or whitespace-only notes produce no block` 的四组数据：原空数组断言改为两个 null 字段，空白处理的业务约束保留。
5. `Chinese titles use the display name and keep the complete long note when the active set changes`：去除中文“本组/动作名”标题预期，长正文、中英文标题与换组/换动作验证移到实际 WorkoutBody 渲染 seam。纯函数不再承担翻译。

既有 set-save、completion-entry、quick-log-entry、set-ref-entry 的断言均未修改；没有放宽与本轮无关的断言。

#### 红绿证据

原始 stdout/stderr 在 `/private/tmp/rn-086/r2/`，每组的 `-red.log` / `-green.log`：

- `01-exercise`：旧函数返回带组备注及后缀标题的数组，动作字段断言失败 → 只从 exercise.notes 派生内容通过。
- `02-set`：缺独立 setNote 字段，9 条组合断言失败 → 按组来源单独 trim、不回落，通过。
- `03-exercise-render`：初次日志还含测试挂载生命周期错误；修正 fixture 的 set 参数与卸载后 renderer 重用后，`03-exercise-render-red-behavior.log` 明确两种语言均因 hero 缺标题/正文而失败 → 接入动作备注单块后通过。最初含测试桩错误的日志不作为纯行为红测。
- `04-set-render`：可编辑态组备注丢失、只读态未 trim → 两态都用独立组内容渲染，通过；后续空白与不回落断言一并通过。
- `05-history`：中文界面只有硬编码 Training history → 复用现有 i18n 后文字、读屏入口、路由通过。
- `06-coverage-green.log`：纯函数、备注渲染和周条共 20 项通过。补充换组/换动作与无动作备注覆盖直接绿，不冒称另有红测。

#### 疑点、审查与设备边界

- CARD 前文仍有“双段 + 本组/动作名后缀”，与修订 SPEC §3 不同；按 SPEC 和 CARD「返修二」执行，上述旧断言相应改写。未发现需产品取舍的新增问题。
- 当前本地 main 指向 `87c5535`，并非 SPEC 明确的 main@aeb1020；直接读其文件会得到另一版布局。本轮以 SPEC 基线 `aeb1020` 的原灰块及 CARD 明确的 bgInset / coachNoteText / 12 号为准。位置在上次成绩后，原 padding、圆角、字体、行高均未改。该基线差异已核实，不自行追随漂移的 main。
- review-loop 对 `/private/tmp/rn-086/r2/review.diff` 进行一轮两个只读独立审查：**Standards 0 findings；Spec 0 findings**。审查后仅修正新增测试的 TypeScript 表格泛型声明，无行为变化。主代理亲读完整增量；Impeccable layout 静态扫描 `layout-scan.json` 为 `[]`，不等于原生视觉验证。
- 仓内仍缺 docs/agents/issue-tracker.md；完整 Matt tracker 工作流需另行 `$setup-matt-pocock-skills`。本次本地双轴直接使用批准 SPEC/CARD，未私建配置。
- **未做设备验证**：尝试 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices -l` 退出 1。原始报错：`could not install *smartsocket* listener: Operation not permitted`，随后 `adb: failed to check server version: cannot connect to daemon`。ADB 原始启动日志保存为 `device-adb.log`；当前沙箱不能启动其监听端口，未绕过限制。按 CARD 交由 Opus 实屏复验：① 三种小图形的辨识度、槽位居中及格高；② 双主题/大字号下长动作备注与下方组备注；③ 360×640、1.3× 字体、三位数落后胶囊与中英文历史入口换行。没有宣称验收 7 / 8 / 8b / 10 实屏通过。

#### 三条最终命令

| 命令 | 最终结果 | 原始日志 |
| --- | --- | --- |
| `npx jest --runInBand` | 退出码 0；156 suites / 1204 tests passed，0 failed；18.241s | `/private/tmp/rn-086/r2/final-jest.log` |
| `npx tsc --noEmit` | 退出码 0；0 errors（无输出） | `/private/tmp/rn-086/r2/final-tsc.log` |
| `npm run lint` | 退出码 0；0 errors / 0 warnings | `/private/tmp/rn-086/r2/final-lint.log` |

TypeScript 首跑因新测试的 `test.each([... ] as const)` 产生 TS2345（readonly 元组与 Jest 可变参数类型不兼容），原报错保留在 `tsc-first.log`。改用显式可变元组泛型后重新跑完上述三条命令；未改断言、未禁用检查。最终 `git diff --check` 通过；完整增量（含新增测试）见 `/private/tmp/rn-086/r2/final.diff`。

### 返修三（2026-10-09）

- 当前目录临时文件试写及删除成功；分支 `feat/086-training-strip-coach-note`，HEAD `f6f66be`。已读 CARD「返修三」、SPEC §3 与 Expo SDK 57 文档；仓内无 CONTEXT.md。保留返修二全部未提交改动，本轮仅改以下两个实现文件、对应测试与本小节；未 commit、push、开 PR 或安装依赖，node_modules 软链未动。
- `TrainingWeekStrip.tsx`：实心/空心圆从 spacing.point10 改为 spacing.sm（8），对勾从 spacing.point14 改为 spacing.md（12）；statusSlot 固定高度 spacing.base（16）和格高不变。
- `WorkoutBody.tsx`：小灰块取已去首尾空白的组备注，仅不可编辑时回落到已去首尾空白的动作备注；沿用返修二纯函数的空白判空。灰块位置与样式不变，淡金块仍仅可编辑且有动作备注时出现，可编辑态取值不变。
- `workout-coach-notes.test.tsx`：将原“只读且无组备注时没有 Coach note/动作备注”改为“仅一块备注，在处方之后显示 trim 后的动作备注”，同时保留只读组备注优先、编辑态原预期，覆盖 null / 空串 / 纯空白组备注的回落及双空不显示。通过标题数量和内容位置验证只读无上方淡金块，未添加样式数值断言。
- 先改测试实跑红，再改实现实跑绿。原始 stdout/stderr：`/private/tmp/rn-086/r3/01-readonly-red.log`（退出 1，1 failed / 7 passed，失败原因是只读回落备注缺失）；`01-readonly-green.log`（退出 0，8 passed）。
- 最终三条命令均实跑完成，日志在 `/private/tmp/rn-086/r3/`：
  - `npx jest --runInBand`：退出 0，156 suites / 1204 tests passed，0 failed，18.235s；`final-jest.log`。
  - `npx tsc --noEmit`：退出 0，0 errors（无输出）；`final-tsc.log`。
  - `npm run lint`：退出 0，0 errors / 0 warnings；`final-lint.log`。
- 对启动时返修二快照的增量执行 code-review 两个只读独立审查：Standards 0 findings；Spec 0 findings。主代理核对本轮只触及上述四文件，其他未提交文件逐一哈希一致；`git diff --check` 通过。代码/测试增量见 `/private/tmp/rn-086/r3/review.diff`。
- 未做设备验证，未宣称实屏验收通过；按 CARD 由 Opus 复验圆点辨识度、三种状态对齐与格高，以及只读 hero 灰块回落/无淡金块。

## Spec 089 · 卡 A 数据层（2026-10-09）

- 工作树 `/Users/david/Projects/apps/meetpr-rn-wt-089`；分支 `feat/089-accessory-quick-log`；启动 HEAD `3a343b0`、工作树干净。首先在当前目录创建并删除临时文件成功。已完整读取 CONTEXT、AGENTS、SPEC、CARD-A，并读取 CLAUDE、PLAN、工程规约及 Expo SDK 57 文档；未找到仓内 FOLLOWUPS 或 AGENTS.override。
- 六组纯函数与测试全部交付。未接 UI、未改已有组件的渲染与行为；未改 API schema、后端、SPEC、CARD、PARITY；未 commit、push、开 PR、安装依赖。保留 `node_modules -> ../meetpr-rn/node_modules`。所有 fixture 均为合成数据，无真实账号或凭证。

### 文件清单（12 个，含本节）

| 文件 | 新增 / 改动 |
| --- | --- |
| `src/features/training/accessory-quick-log.ts` | 新增判定、行模型、可写性、coached 请求体、批量选择五组纯函数及行类型。 |
| `src/features/training/set-log-input.ts` | 新增从 QuickLogAttempt 原样提取的共享校验，返回逐字段错误。 |
| `src/features/training/quick-log.ts` | 逐行校验改用共享函数；日期、提交、重试行为不动。 |
| `src/features/training/policy.ts` | 新增辅助项休息优先级；继续导出原 `restDefaultSeconds` 入口。 |
| `src/features/settings/rest-timer.ts` | 两种偏好追加可选 accessory、默认常量与辅助项钳位；原 `restDefaultSeconds` 函数移入此文件，避免 policy 与 settings 循环依赖，函数体不变。 |
| `src/features/settings/storage.ts` | 两种偏好 schema 接受 accessory；custom 读回保留它；字段损坏仅回落该字段，不丢主项偏好；旧存储键和旧数据路径不变。 |
| `src/domain/measurement.ts` | 原样提取 onboarding 的 decimalInput、metricDisplay、metricStored 与 lb 因子；metricStored 追加 number 入参供已验证数据使用，string 路径保持原样。 |
| `src/features/onboarding/OnboardingSteps.tsx` | 仅改为引用提取后的函数与原因子，组件渲染、交互、换算精度不变。 |
| `src/features/training/__tests__/accessory-quick-log.test.ts` | 新增 48 项纯函数 seam 测试（含参数化用例）。 |
| `src/features/training/__tests__/training-policy.test.ts` | 追加辅助项休息优先级、0、负值及最大值边界；原断言不改。 |
| `src/features/settings/__tests__/rest-timer.test.ts` | 追加两种模式的默认/钳位/步进与存储兼容；原断言不改。 |
| `docs/CODEX-JOURNAL.md` | 追加本节。 |

### 先红后绿证据

原始 stdout/stderr 全部保存在 `/private/tmp/rn-089/a/`。下表每个前缀均对应 `-red.log`（退出 1）与 `-green.log`（退出 0），先运行红测后才实现该行为。参数化表中已有行为可直接通过，未声称每个已有分支都单独失败。

| 日志前缀 | seam / 红测原因 → 绿测行为 |
| --- | --- |
| `01-type` | 三种动作类型、未知字符串、null、undefined：模块尚不存在导致加载失败 → 类型字符串判定通过（6 项）。这是缺模块红测，不冒称断言红。 |
| `02-rows` | 固定重量处方、无上次记录：accessoryRows 未导出 → 两行 stableSetId / setIndex、处方重量次数、空 RPE / 占位通过。 |
| `03-placeholders` | 纯 RPE、RIR、重量区间：上次记录与 RPE/RIR 占位缺失 → 按组序匹配上次重量次数，RPE 仅占位、RIR 返回 kind/value，未定重量保持空串。 |
| `04-existing` | 已完成、失败、取消记录和视频标记：预填仍取处方 → 已有重量次数、学员 RPE 优先，null RPE 不回填处方，三种状态与调用方视频标记保留。 |
| `05-bodyweight` | 自重/大小写 BODYWEIGHT、普通备注、空白、null：3 个非空分支失败 → 自重显示 BW、普通备注保留原文、空白和自重备注为 null。 |
| `06-lb-rows` | lb 下处方、已有记录与上次重量仍为 kg → 复用 metricDisplay 换算，并保留合法 0；同时运行原 onboarding wizard 测试。 |
| `07-validation` | 可写性函数未导出 → 重量空白/负值/非有限/0/小数/逗号，次数 0/1/99/100/非整数/非有限，RPE 空/0/10/越界/非有限/小数与旧空白行为，自重仅忽略重量校验全部通过；quick-log 原测试原样通过。 |
| `08-request` | 请求函数未导出 → coached 形态、真实编辑值、RPE 空为 null / 带值 / 0、logged_date 可选均通过。 |
| `09-cancel` | 取消仍写 completed:true 且采用编辑值 → 显式取消保留原始 kg 十进制、次数、RPE，completed/failed 均 false；带视频拒绝取消；默认操作仍可覆盖完成行。 |
| `10-request-units` | BW 生成 NaN → 自重写 0、lb 55.1 写 25kg、0 写 0、Number 支持的 1e2 写 45.4kg；无效输入抛错。 |
| `11-complete-all` | 选择函数未导出 → 完成/失败两边均排除；未记录合法行按组序选中，空重量/非法次数跳过；编辑补重、空集合与输入不被排序改写通过。 |
| `12-rest-preference` | 新常量/函数未导出 → 两模式缺值及 NaN/±Infinity 为 60；30–300 钳位、67→60 / 68→75；主项 RPE 结果不变。 |
| `13-rest-policy` | resolver 未导出 → 教练 75 / 0 优先、超大值钳至 900、负值钳至 0、其次偏好 90、旧偏好缺字段 60。 |
| `14-storage` | 新字段被 schema 丢弃 → 两种模式 accessory 往返保留，旧数据无字段为 60，损坏的 accessory 不丢 custom 字段，v1 数字偏好继续读回。 |
| `15-lb-small` | 独立审查发现极小数被文本清洗改义；0.0000001 / 1e-7 本应按既有精度为 0，却实际得到 7.7 → converter 接受 number，保留原字符串路径，回归通过；相关四 suites / 111 tests 通过。 |

`quick-log.test.ts` 未改一字。其余新断言均在卡 A 的判定、行模型、校验、请求体、选择、休息/偏好边界内，没有增加 UI 测试或内部实现测试。

### 卡 B 对接签名

直接从下列文件导入；未改 training barrel。所有新函数无全局状态读取、无翻译调用或 I/O；存储仍使用原有 read/write 路径。

```ts
// src/features/training/set-log-input.ts
export type SetLogInput = {
  weightText: string;
  repsText: string;
  rpeText: string;
};
export type SetLogValidation = {
  writable: boolean;
  invalidFields: (keyof SetLogInput)[];
};
export function validateSetLogInput(input: SetLogInput): SetLogValidation;

// src/features/training/accessory-quick-log.ts
export function isAccessoryExercise(exerciseType: string | null | undefined): boolean;
export function accessoryRows(input: {
  drafts: readonly WorkoutSetDraft[];
  previousLogs: readonly SetLog[];
  unit: 'kg' | 'lb';
  videoById?: Readonly<Record<string, boolean>>;
}): AccessoryRow[];
export function accessoryRowWritable(row: AccessoryRow, edited: SetLogInput): SetLogValidation;
export type AccessoryLogOptions = {
  planExerciseId: string;
  loggedDate?: string;
  action?: 'complete' | 'cancel';
};
export function accessoryLogRequest(
  row: AccessoryRow, edited: SetLogInput, options: AccessoryLogOptions,
): SetLogUpsertRequest;
export function rowsToCompleteAll(
  rows: readonly AccessoryRow[], editedById: Readonly<Record<string, SetLogInput>>,
): { toWrite: AccessoryRow[]; skipped: AccessoryRow[] };

// src/features/settings/rest-timer.ts
export const ACCESSORY_REST_DEFAULT = 60;
export function accessoryRestSeconds(preference: RestTimerPreference): number;
export function restDefaultSeconds(rpe: number | null): number; // 原函数，policy 继续重导出

// src/features/training/policy.ts
export function resolveAccessoryRestSeconds(input: {
  prescribed: number | null | undefined;
  preference: RestTimerPreference;
}): number;

// src/domain/measurement.ts：已有换算提取后的共享接口
export const POUNDS_PER_KG = 2.2046226218;
export function decimalInput(value: string): string;
export function metricDisplay(value: string, factor: number): string;
export function metricStored(value: string | number, factor: number): string;
```

- `AccessoryRow` 携带 stableSetId、零基 setIndex、`status: 'pending' | 'complete' | 'failed'`、hasVideo、unit、三项输入文本、weightPlaceholder、`rpePlaceholder: string | { kind: 'rir'; value: number }`、isBodyweight、`previous: { weightText: string; reps: number } | null`、extraNote，以及用于取消时无损保留的 `recorded: Pick<SetLog, 'weight_kg' | 'reps' | 'rpe'> | null`。
- `previousLogs` 由调用方限定为同一动作的上一次训练；行模型只按 set_index 匹配。`videoById` 以 stableSetId 为键，缺失为 false。自重 weightText 为 `BW`，组件按 isBodyweight 禁用输入，请求写 0。
- `edited` 始终包含三项当前文本，rpeText 为实际 RPE；RIR 只是占位元数据。校验返回所有错误字段，复用 quick-log 的 Number 语义（例如逗号小数无效，纯空白 RPE 沿旧逻辑按 0）。
- 请求默认 `action: 'complete'`；卡 B 根据“完成行是否修改”决定覆盖还是显式传 cancel。取消读取 recorded，不采用未保存编辑、不做 lb 反换算。带视频、非完成或无源记录的取消抛 `Cannot cancel this set`；非法保存抛 `Invalid set input`。卡 B 应在调用前按 SPEC 展示视频提示及字段错误，不直接显示这些工程错误文字。
- rowsToCompleteAll 返回原行引用，未编辑行按预填校验；提交时仍需使用同一份 editedById（缺键用 row），逐条请求与失败反馈由卡 B 负责。RPE 未填写 null，与现有 set-save 路径相同。辅助项偏好由 accessoryRestSeconds 统一钳位，存储不迁移、不改键。

### SPEC 疑点与对接边界

1. 卡中所称 `resolveExerciseMetadata` 的现有实现实际是 `createExerciseMetadataResolver`，返回值没有 exercise_type。本卡采用卡内明确允许的“类型字符串”入参，卡 B 需从动作库取得 exercise_type，或在其接线范围补 resolver 字段；不能用计划 is_main_lift 代替。
2. 卡中请求体示例签名未给出记录/取消的区分参数。实现追加可选 action（默认 complete），取消保留服务端原值；不在数据层猜测按钮点击意图。这是接口补全，不改变 SPEC 的交互。
3. 仓内已有 lb 换算仅在 onboarding 组件私有函数里，并保留一位小数精度。已提取共享、沿用其精度与因子，0 单独保留；未新建另一套换算规则。极小数风险已按上述红绿回归修复。
4. 当前 RestTimerSettingsScreen 的模式切换尚不携带 accessory。按本卡“不得改 Profile 行为”的边界未接界面；卡 B 增加该设置时须在自动/自定义切换中保留 accessory。持久化本身已能保存两种形态。

无需要产品裁决而阻塞卡 A 的 SPEC 冲突；以上均为卡 B 必须知道的接口与现状。未宣称 UI、Global 联调或整项功能验收通过。

### 独立审查与最终验证

- 以启动 HEAD `3a343b0` 为基线，`review-loop` 派出两个只读 reviewer，对固定快照 `review.diff` 分别审 Standards / Spec。Standards：硬规范违反 0、正确性判断 1；Spec：1 finding。两轴指向同一个极小 lb 数值清洗错误（不是两个独立缺陷）。按 `15-lb-small` 先红后绿返修，再对 `review-fixed.diff` 定向复核：**Standards 0 剩余；Spec 0 剩余**。主代理已亲读全部实现及测试增量。
- 仓内缺 `docs/agents/issue-tracker.md`，完整 Matt tracker 流程需另行 `$setup-matt-pocock-skills`；本次采用 review-loop 的本地批准 SPEC/CARD 双轴审查，未私建配置。
- TypeScript 首跑：测试 fixture 的 load_mode 误写为 `weight`（TS2322），已改成 schema 规定的 `fixed_weight`，断言未放宽；原始报错 `tsc-first.log`。
- 首轮全量 lint 报 `restDefaultSeconds` 从 constants / policy 重复 barrel 导出。最终代码将原函数放入 settings/rest-timer、policy 重导出，constants 与原文件完全一致。第二次 lint 仍命中旧缓存；`npx eslint src/features/training/index.ts --no-cache` 退出 0，随后仅删除本工作树生成的 `.expo/cache/eslint/.cache_x6kso5` 并重跑原指定命令通过。原日志分别为 `pre-review-fix-lint.log`、`lint-stale-cache.log`、`lint-no-cache.log`，未改 lint 配置或关闭规则。

| 最终指定命令 | 实际结果 | 原始 stdout/stderr |
| --- | --- | --- |
| `npx jest --runInBand` | 退出 0；157 suites / 1264 tests passed，0 failed；29.829s | `/private/tmp/rn-089/a/final-jest.log` |
| `npx tsc --noEmit` | 退出 0；0 errors（无输出） | `/private/tmp/rn-089/a/final-tsc.log` |
| `npm run lint` | 退出 0；0 errors / 0 warnings | `/private/tmp/rn-089/a/final-lint.log` |

三条最终退出码另存同名 `.exit` 文件。最终 `git diff --check` 通过；指定保护文件与 quick-log 原测试无 diff。完整交付增量（含新文件与本节）为 `/private/tmp/rn-089/a/final.diff`。这是卡 A 自测及工程自审记录，整项功能收货仍由 Opus 按 SPEC 验收清单执行。

## Spec 089 · 卡 B 界面与保存接线（2026-10-10）

- 工作树 `/Users/david/Projects/apps/meetpr-rn-wt-089`，分支 `feat/089-accessory-quick-log`，启动 HEAD `84efbb5`、工作树干净。首先在指定目录创建并删除临时文件成功；没有切换工作目录。完整读取 CONTEXT、AGENTS、CLAUDE、SPEC（含屏幕稿和验收清单）、CARD-B、卡 A 对接记录，核对工程规约、PLAN 与 Expo SDK 57 文档。
- 三项均已接线：辅助项记录卡；逐组完成／取消／批量串行保存；Profile 辅助项休息时长。Card A 的判定、行模型、校验、请求体、批量选择、休息 resolver 原样复用，没有改其实现。所有写入进入 TodayWorkoutView 原 `commit`、串行队列和 mutation，沿用缓存／草稿更新、日期、PR 处理、埋点和失败提示。
- 未 commit、push、开 PR、安装依赖、改后端或 API schema。`node_modules` 仍为 `../meetpr-rn/node_modules` 符号链接。未改 SPEC、CARD、PARITY、SetEntrySheet、QuickLogSheet、Today 页、教练端、结算／撤销实现及分动作组表；主项 hero 原 JSX 保留在非辅助项分支。新增测试只使用合成数据，没有写入真实账号或凭证。

### 文件清单（13 个，含本节）

| 文件 | 改动 |
| --- | --- |
| `src/features/training/AccessoryLogCard.tsx` | 新组件：六列表格、以 stableSetId 保存输入、服务端记录变化后重置、同次历史回填、自重／RIR／视频、字段校验与读屏、单行防重复、取消保护、批量串行与动态跳过提示。输入复用 NumberPad 的 append 和 normalizeDecimalInput。 |
| `src/features/training/WorkoutBody.tsx` | 仅记录态、可编辑且动作库类型为 accessory 时替换 hero 内容；保留标题、Ask coach、086 备注和金色竖条；限定同动作、同训练日期和 plan_exercise_id 的上次记录，组号进入原 onRecord。 |
| `src/features/training/exercise-metadata.ts` | resolver 追加 exerciseType，读取动作库 exercise_type；无法解析仍为 null，绝不使用计划 is_main_lift。类型字段可选以兼容已有调用方构造的 metadata。 |
| `src/features/training/TodayWorkoutView.tsx` | 复用 commit 接收 Card A 请求；按动作库选择辅助项休息规则，覆盖完整录入入口；批量不起计时，最后未记录组不起计时；队列使用最新辅助项草稿；接单位偏好及原 ScrollView 的输入／键盘滚动。 |
| `src/features/training/RestTimer.tsx` | 追加默认开启的 showRPEExplanation 参数，辅助项跳过首次 RPE 说明，不改计时条、通知与加减／Skip。 |
| `src/features/settings/RestTimerSettingsScreen.tsx` | 新增两段标题及辅助项 30–300 秒、15 秒步进控件；直接保存；切换模式携带已有 accessory，旧偏好不强行增加默认字段。Profile 列表摘要未改。 |
| `src/i18n/catalog/RnExtras.json` | 新增辅助项中英文文案；Reps、Done、RPE 等等价文案复用已有键。 |
| `src/i18n/catalog/StudentKit.json` | 页底说明英文改为 These settings，中文对应改为“这些设置”。 |
| `src/features/training/__tests__/accessory-log-card.test.tsx` | 新增 1 项 WorkoutBody 渲染／交互测试，使用真实 metadata resolver 与 Card A。 |
| `src/features/training/__tests__/set-save.test.tsx` | 新增 11 项挂载训练页的保存测试（含参数化），保留原 12 项断言。 |
| `src/features/settings/__tests__/settings-screens.test.tsx` | 新增 1 项旧偏好显示／增减边界／保存／模式切换测试，原断言不改。 |
| `src/features/training/__tests__/exercise-metadata.test.ts` | 原有两处完整对象断言增加 exerciseType: strength，见下节；没有新增测试 seam。 |
| `docs/CODEX-JOURNAL.md` | 追加本节，未修改此前记录。 |

### 每次先红后绿及原始证据

原始 stdout/stderr 保存在 `/private/tmp/rn-089/b/`。下表每个前缀都有 `-red.log`、`-green.log` 及同名 `.exit`；红阶段退出 1，绿阶段退出 0。每轮观察失败后再实现对应行为；参数化用例中原本成立的分支不冒称单独失败。测试均在 Card B 批准的渲染、页面保存和设置屏边界，未对颜色／间距写断言。

| 日志前缀 | 测试与红 → 绿 |
| --- | --- |
| `01-settings` | `accessory rest upgrades old preferences...`：缺 Accessory exercises 文案 → 旧 custom 偏好显示 1:00、首次保存仅加 accessory，原 low/mid/high 不变；两模式可调、15 秒步进及 30/300 边界禁用、切换保留辅助项时长。 |
| `02-card` | `catalog accessories render...`：不存在行内输入 → catalog accessory 出现表格（计划 is_main_lift=true 也不影响）；主项／变式／未知／缺失类型、只读及未开始不出现；预填、空重量占位、空 RPE、RIR、BW、置灰、视频、常驻提示、备注、同次历史限定、点上次和组号通过。 |
| `03-save` | `accessory check saves ordinary data...` 三项：✓ 无保存 handler → 请求体、空 RPE 为 null、所填 RPE、乱序记组、保存中进度／禁用，60／学员 90／教练 75 秒三种休息；辅助项无 RPE 说明，末组不起计时且切下个动作。 |
| `04-cancel` | `an upgraded completed accessory row...`：取消错误写 completed:true 且 lb 往返丢原 kg 精度 → 显式 cancel 保留 80.123kg／次数／空 RPE；恢复 pending；55.1lb 写 25kg；改完成行数字为覆盖，失败保留输入和重试，沿用保存失败提示。 |
| `05-video` | `a completed accessory with ... video cannot be cancelled...` 两项：上传中／已上传虽然被 Card A 拒绝取消，但未显示提示 → 不发第二次请求，保持完成并展示真实 Toast 提示进入完整录入处理视频。 |
| `06-batch` | `complete all submits serially...` 三项：无批量按钮 → 慢请求期间主按钮和行 ✓ 禁用、按组序逐条提交；0／1／2 个空重量组、单复数提示；第二条失败即停，已写第一条保留；重试只补未写组，批量始终不起计时，全部完成后切下个动作。 |
| `07-queued` | `two accessory checks queued before the first response...`：两行同时点击时旧闭包误启动最后组休息 → 同组重复点击只发一次；不同组复用原队列，读取最新已保存草稿，最后组不残留休息。 |
| `08-full-entry-rest` | `an accessory recorded through its full entry...`：组号进入完整录入后保存仍起主项分档休息 → 页面按 catalog 判断，完整录入辅助项同样为 60 秒且不弹 RPE 说明；SetEntrySheet 不改。 |
| `09-overwrite-rest` | 加强上述 `an upgraded completed accessory row...`：完成行改数字保存后找不到 RestTimer → 同动作仍有 pending 组时覆盖成功也起 60 秒休息；主项仍保留原“不对完成行重复起计时”条件。 |
| `10-skip-count` | 加强上述 `complete all submits serially...`：补重量后仍显示旧跳过数量（1/2 两分支失败，0 分支已通过）→ 按当前行和编辑值派生数量，2→1→消失，不再保存旧计数。 |

中间测试环境／fixture 修正没有隐藏：`02-card-fixture-error.log` 为 RIR fixture 使用旧 intensity_mode 导致占位为 2，改为 schema 的 load_mode=rir/rir_target=2；`03-save-fixture-error.log` 为参数化测试请求 mock 调用未清空，修正 fixture 隔离；`05-video-fixture-error.log` 为真实 Toast 缺 SafeAreaProvider，补真实 provider。上述测试的行为断言未放宽。

### 原有断言改动及首轮检查

- 唯一改动的既有断言：`exercise-metadata.test.ts` 的 `keeps raw family while resolving per-student competition family` 中两处 `toEqual` 结果各增加 `exerciseType: 'strength'`。resolver 按卡要求增加字段，完整对象断言需承认该字段；name/rawFamily/competitionFamily 全保留，未改成宽松匹配。首次全量的实际失败见 `full-first.log`：157 suites / 1275 tests 通过，1 suite / 1 test 失败。并非功能回归被删测规避。
- 首轮指定回归集合 `regression-first.log`：8 suites / 99 tests 通过（当时尚未追加队列和完整录入休息两项）。最终全量包含 set-save、completion-entry、quick-log-entry、set-ref-entry、rest-timer、workout-coach-notes 与 i18n 守卫，全部通过。
- `tsc-first.log`：新增 fixture 的 optional failed 未提供默认值、Jest 参数化 readonly tuple 不兼容，以及页面传入 optional failed，3 个错误；按现有 schema 的 failed 默认 false 与可变测试 tuple 修正。`tsc-second.log` 已退出 0。
- `lint-first.log`：React 不允许 effect 同步 setState、render 直接写 ref，另有重复 type import 警告；改为派生弹层条件、effect 同步 ref 并合并 import，没有禁用规则或改 lint 配置。

### 独立双轴审查

- 使用 review-loop 两个只读 reviewer，固定初审快照 `review.diff`；Standards 0 finding，Spec 2 finding：完整录入辅助项仍套主项休息、跳过数量陈旧。按 `08`、`10` 各自红→绿修复；同时核实覆盖写入应按 §2 起计时，按 `09` 红→绿补齐。
- 固定返修快照 `review-fixed.diff` 定向复审：**Standards 0 新增发现；Spec 0 剩余发现**。主代理已读取最终实现／测试 diff；这是工程自审，不代替 Opus 的逐项收货。
- 本仓仍无 `docs/agents/issue-tracker.md`；完整 Matt tracker 流程需另行 `$setup-matt-pocock-skills`。本次按本地批准 SPEC/CARD 执行 review-loop，没有私建 tracker 或修改正典流程。

### SPEC 疑点与对接说明

1. “RPE 没填时请求不带值”按卡 A 已验收契约处理为 `rpe: null`，与完整录入保存路径一致，不改为省略字段；占位教练 RPE/RIR 从不自动写入。无 API schema 改动。
2. SetEntrySheet 当前使用自定义 NumberPad，没有可直接复用的 TextInput 过滤回调。新组件复用其 `src/design/number-pad.ts` 的 `append` 与 `normalizeDecimalInput`，采用数字／小数系统键盘；不改原完整录入、RPE 刻度或补记。
3. 屏幕稿固定列宽与 360dp 小屏要求存在空间压力；六列沿用稿中比例和现有 token，允许随可用宽度收缩，RIR 占位使用较小现有字号。没有引入另一套设计 token，但不能用组件测试证明小屏 1.3× 字号不截字，留实屏确认。
4. §4 的辅助项休息规则适用于动作类型，因此从组号进入完整录入后也在同一 commit 路径按辅助项处理；覆盖完成行成功且仍有未记录组时按 §2 起计时。这里只落实已批准条款，未改主项或补记规则。

未发现需要新增产品取舍而阻塞实装的 SPEC/CARD 冲突。

### 未做设备验证与最需要实屏确认的三处

**未做设备验证。** 没有启动模拟器、真机或 Global 联调；本卡代码与自动化自测完成，不宣称 SPEC 1–13 已验收。按 CARD-B 留给 Opus：

1. 360×640dp、系统字体 1.3×、Light/Dark 的六列表格；重点看 RIR 占位、lb 小数／大重量、已完成行输入框、视频组号及副标题尾部截断。
2. 系统键盘弹出、连续切换行和“上次”回填时，原 ScrollView 是否把当前输入完整滚到键盘上方，✓ 可点击且不误丢焦点。
3. 老用户升级第一屏及完整录入往返：部分已记组、远端／上传中视频标记、取消保护、覆盖、批量断网重试、末组前进与 60/90/教练休息；核实已有主项设置保留以及当天末组结算／撤销不变。

### 最终指定命令

| 命令 | 实际结果 | 原始 stdout/stderr |
| --- | --- | --- |
| `npx jest --runInBand` | 退出 0；158 suites / 1277 tests passed，0 failed；31.819s。包含全部 i18n 守卫。 | `/private/tmp/rn-089/b/final-jest.log` |
| `npx tsc --noEmit` | 退出 0；0 errors（无输出）。 | `/private/tmp/rn-089/b/final-tsc.log` |
| `npm run lint` | 退出 0；0 errors / 0 warnings。 | `/private/tmp/rn-089/b/final-lint.log` |

退出码另存同名 `.exit`。最终 `git diff --check` 通过。原始红绿日志、检查输出和完整交付 diff 均在 `/private/tmp/rn-089/b/`；本节追加后只再检查文档／diff，不重复无语义变动的全量测试。

### 返修一（2026-10-10）

范围：按 `CARD-B-ui.md` 文末六点，在首轮未提交工作上继续；启动临时文件试写／删除成功，分支现场为 `feat/089-accessory-quick-log`，HEAD `a58c7ef`。保留首轮全部改动；未安装依赖，未 commit／push／开 PR。

本轮只改 `WorkoutBody.tsx`、`AccessoryLogCard.tsx`、`accessory-log-card.test.tsx`、`src/design/AppButton.tsx` 和本 JOURNAL。改前快照在 `/private/tmp/rn-089/b-r1/baseline/`，便于将返修与首轮 WIP 分开。

1. `WorkoutBody` 为辅助项选历史时排除 `plan_exercise_id === active.exercise.id`；主项原有 `reference()` 路径不改。挂载测试点击记录第一组、更新当前记录与历史后，各行 Last 和无处方重量的占位保持前次训练值。
2. 重量错误态与能否提交分开：未动过的空重量保留普通描边、✓ 仍置灰；只修改次数或聚焦／失焦不触发重量错误。编辑成非法值或批量完成跳过的 pending 行才显示错误，补入合法重量后清除。是否编辑重量随该行记录 revision 重置。
3. 已完成行不显示教练 RPE/RIR 占位；实际记录的 RPE 保留，取消成 pending 后恢复处方占位。
4. **口径已由 David 转达 Opus 明确**：只看当前行模型 `isBodyweight`（当前计划组自重标记），不看历史重量，也不查历史计划。当前自重行 Last 显示 `BW × {次数}`／`自重 × {次数}`，点击仅填次数；当前非自重行照常显示并回填历史重量和次数，历史重量为 0 也显示 `0 × 8`。测试覆盖中英文、历史 0／90，以及已完成自重行回填相同次数后仍可取消、不会因复制历史重量而误变成覆盖。
5. 以 `stableSetId:field` 跟踪聚焦，使用 `colors.textPrimary` 深色描边；已完成行编辑时也有描边，失焦恢复。非法字段保留 `colors.danger`。未写死色值，保留已有键盘滚动回调。
6. `AppButton` 原来没有文本样式入口，增加可选 `labelStyle`；只有辅助项主按钮传 `textAlign: 'center'`。其他调用方的默认表现不变。

红绿命令均为 `npx jest src/features/training/__tests__/accessory-log-card.test.tsx --runInBand`。日志和退出码存 `/private/tmp/rn-089/b-r1/`：

| 点 | 红日志：实际症状 | 绿日志 |
| --- | --- | --- |
| 1 | `01-history-red.log`：记录后 Last 从三行历史值变为 `80 × 5 / — / —` | `01-history-green.log`，2 tests passed |
| 2 | `02-weight-red.log`：首屏空重量已呈错误态，期望 false、实际 true | `02-weight-green.log`，3 tests passed |
| 3 | `03-rpe-red.log`：完成行空 RPE 仍有 `8`／`RIR 2` 占位 | `03-rpe-green.log`，5 tests passed |
| 4 | `04-bodyweight-red.log`：期望 `BW × 8`／`自重 × 8`，实际 `0 × 8` | `04-bodyweight-green.log`，7 tests passed |

第 2 点只用 `colors.danger` 判断是否进入错误态，不固定色值、间距或列宽。第 4 点第一次复跑（`04-bodyweight-first-check.log`）揭示本轮第 1 点测试的自重行仍期望旧显示 `50 × 10`；按新口径改成 `BW × 10`，保存前后相等与其他断言保留。TypeScript 首跑（`tsc-first.log`，退出 2）发现新增测试用了 `zh-Hans` 而仓内 Locale 为 `en | zh`，已改为 `zh`，未放宽断言；最终全量再次验证。

独立工程自审：`review-loop` 两个只读 reviewer 按固定 `review.diff` 分轴审查，**Standards 0 findings；Spec 0 findings**。主代理已读完整本轮 diff。仓内缺 `docs/agents/issue-tracker.md`，完整 Matt tracker 流程需另行 `$setup-matt-pocock-skills`；本次按本地已批准卡执行，无新配置。这是开发自测／自审，不代表 Opus 功能收货。

疑点：第 4 点数据辨识疑问已按上述明确口径关闭；**无待裁决产品疑点**。未做设备验证，按卡交 Opus 复验：① Light/Dark 下普通／错误／完成行聚焦描边；② 360×640dp、1.3× 字号下按钮折行居中；③ 系统键盘切换输入时的可见性与焦点恢复。无 Global 联调或整项验收通过的声明。

本轮最终指定命令：

| 命令 | 最终结果 | 原始输出 |
| --- | --- | --- |
| `npx jest --runInBand` | 退出 0；158 suites / 1283 tests passed，0 failed；35.079s | `/private/tmp/rn-089/b-r1/final-jest.log` |
| `npx tsc --noEmit` | 退出 0；0 errors（无输出） | `/private/tmp/rn-089/b-r1/final-tsc.log` |
| `npm run lint` | 退出 0；0 errors / 0 warnings | `/private/tmp/rn-089/b-r1/final-lint.log` |

每条退出码另存同名 `.exit`。最终 `git diff --check` 通过；本轮交付增量（相对启动时首轮 WIP，含本节）存 `/private/tmp/rn-089/b-r1/final.diff`。未改卡 A 纯函数、API schema、i18n 目录及首轮其余文件。

## 2026-10-10 · Spec 090 训练流程（Codex 开发交付，待 Opus 收货）

工作树 `/Users/david/Projects/apps/meetpr-rn-wt-090`，分支 `feat/090-training-flow`，开工 HEAD `2e932ae`；目录内 `mktemp .codex-write-probe.XXXXXX` 试写和删除均退出 0，初始工作区干净。已全文读取 CONTEXT、AGENTS、090 SPEC/CARD，并读取 Expo SDK 57 版本文档。未 commit、push、安装依赖、修改 API/schema/存储键或正典台账；`node_modules` 保持 `../meetpr-rn/node_modules` 符号链接。

### Files changed（本卡共 14 个文件）

- `src/features/training/exercise-progress.ts`：S1 分区和 S2 分段模型；hero、分区、分段共享 `needsSetResult`，失败计为结果，assumed 不计。
- `src/features/training/SetProgressBar.tsx`：主项/变式 hero 的分段条；实测尺寸传给 GradientFill，尺寸 key 重建，读屏隐藏。
- `src/features/training/WorkoutBody.tsx`：记录态可编辑非预览的上收/退回、hero 隐藏、完成行文案和读屏、单份组表渲染、上收反馈与滚动通知。
- `src/design/TrainingRewardMotion.tsx`：RollUpCard 增加可选 completed 外观；默认分支保留，展开复用 RollUpBody。
- `src/features/training/hold-to-complete.ts`：completionAvailability 派生 sticky 标志。
- `src/features/training/TodayWorkoutView.tsx`：单颗按钮在滚动区/吸底区切换、实测底部留白、hero 滚动和键盘/拖动保护、按训练日重置上收状态。
- `src/features/training/RestTimer.tsx`：仅增加 overlay 布局测量回调；不改计时、触感、通知或停靠行为。
- `src/features/training/SetEntrySheet.tsx`：片数说明与 collars 同行；Weight/Reps 输入行 48、数字字号 30、标题间距 4；RPE 卡/刻度和配片图高度保留，长数值单行缩放。
- `src/i18n/catalog/RnExtras.json`：完成行单复数及读屏中英文。
- `src/features/training/__tests__/exercise-progress.test.ts`：S1 八种情形、S2 四种情形。
- `src/features/training/__tests__/training-flow.test.tsx`：上收顺序/文案/展开编辑、全部完成与取消、辅助项无分段、未开始/只读/预览隔离、恢复日志首屏不触发滚动通知。
- `src/features/training/__tests__/hold-to-complete.test.ts`：追加吸底/非吸底两条。
- `src/features/training/__tests__/completion-entry.test.tsx`：追加真实 TodayWorkoutView 单颗吸底按钮及取消后恢复的组件测试。
- `docs/CODEX-JOURNAL.md`：仅末尾追加本节。

### TDD 证据

按已批准 S1–S4 逐 seam 先红后绿，再补同一 seam 的边界覆盖；不加录入页样式快照。

| Seam | 首次红输出（原始日志在 `/private/tmp/`） | 随后绿证据 |
| --- | --- | --- |
| S1 | `090-s1-red.log`：`Cannot find module '../exercise-progress'`；`Test Suites: 1 failed, 1 total` | `090-s1-green.log`：7 tests passed；最终拆开失败/assumed 用例，S1 为 8 条 |
| S2 | `090-s2-red.log`：`TypeError: (0 , _exerciseProgress.setProgressSegments) is not a function`；`Tests: 1 failed, 7 passed, 8 total` | `090-s2-green.log`：11 tests passed（当时 S1 为 7 条，S2 为 4 条）；最终该文件 12 条 |
| S3 | `090-s3-red.log`：`Expected: true / Received: undefined`；`Tests: 1 failed, 7 passed, 8 total` | `090-s3-green.log`：9 tests passed，含所有既有断言 |
| S4 上收 | `090-s4-body-red.log`：完成文案索引 `Expected: > -1 / Received: -1`；`Tests: 1 failed, 1 total` | `090-s4-body-green.log`：上收/编辑与既有 coach-notes 共 9 tests passed |
| S4 吸底 | `090-s4-dock-red.log`：滚动区内按钮 `Expected length: 0 / Received length: 1`；`Tests: 1 failed, 17 skipped, 18 total` | `090-s4-dock-green.log`：单颗吸底与取消恢复 2 tests passed；最终全量覆盖所有新增用例 |

既有测试断言没有删除或修改。`Ask coach conversation failure` 的旧 fixture 恰好是当天全部记完，090 明确要求此时 hero 消失；仅将该用例的 sets 响应改为未记录，继续验证原来的分享失败提示与不导航断言。相邻成功分享用例本来就采用这一前提。此处不是放宽断言。

S3 兼容说明：旧测试对 `{ button, pill }` 做完整对象相等断言，CARD 又要求在同一返回值新增吸底标志。`sticky` 因此作为不可枚举只读 getter 提供，值严格为 `button && remainingSets === 0`，原枚举形状/原断言均保留。调用方直接读 `.sticky`；对象展开和序列化不会携带该派生属性。

### 实现假设与待实屏核验

- 滚动沿用 TodayWorkoutView 的 scroll ref。现场 089 只有 accessory input 避让键盘逻辑，没有用户拖动保护；本次补 keyboard 可见、拖动和惯性滚动判断。只有本次新完成动作且仍有 hero 时置 pending，收到新 hero 的 native onLayout 后滚到 `max(0, hero.y - spacing.md)`，y 是 ScrollView 内容坐标；此时再次检查键盘和用户滚动，受阻即放弃，不在结束操作后补抢滚动。切训练日清 pending。按训练日 key 初始化完成集合，恢复已有日志不播上收、不滚动。
- 滚动假设 hero 不高于可用视口；超长教练备注或辅助项很多组时整张卡可能高于屏幕，此时只能保证从顶部开始可见。实际落点及过渡期间测量/滚动的观感须在设备核验。
- 上收/替换使用 RN LayoutAnimation，时长 `motion.base`；分段反馈用 `motion.fast`。均复用系统减少动态效果判定，首帧无进场过渡。完成行仍复用既有 RollUpBody 展开/收起能力。
- 吸底区绝对定位于现有 Screen 底部（现有 tab 内容区域内），默认高度由 `completionControlHeight + 2 * spacing.md + hairlineWidth` 得到，onLayout 后用实测高度；内容 paddingBottom 为 dock 实测高度 + rest 避让高度 + 常规间距。页面仅挂载一颗 HoldToCompleteButton，其长按/触感/完成回调不改。吸底与留白也沿用原按钮的 loaded/recording 页面门控，加载/错误页不显示完成入口。
- 休息条仍按原 bottom=4 停靠；通过可选 onOverlayLayout 上报实际高度，吸底按钮 bottom 为该高度 + spacing.xs。第一次测量前临时采用 spacing.xxxl，条高改变会重新测量；列表留白同步包含这段高度。是否与 tab/safe area 完全贴合交 Opus 实屏核验。
- 录入页加减按钮与数值框命中高度 48，collars 仍至少 44；片数说明允许换行且开关不压缩。仅 Weight/Reps 标题使用 compact 样式，RPE header、卡和刻度不变；数值单行缩放以避免长重量被截断。首屏是否完整露出 Record/Photos 需 Pixel 默认尺寸和 vivo X200 Pro 验证，尤其有建议说明/长片数说明时。
- **已知稿差异，待 Opus 确认**：浅色 successSoft 文案叠 successTint/bgBase，按 sRGB 计算对比度约 3.86:1，不能满足 12 号正文 4.5:1。现有 token 无更深绿，本次完成文案/尖括号浅色采用现有 textPrimary（约 13.65:1），深色保留 successSoft（约 9.06:1），对勾和淡绿底不变。未新增颜色 token，不能据此宣称与深绿文字稿完全一致。

### 独立开发自审

按 review-loop 对 HEAD `2e932ae` 之后工作区 diff 与新增文件做只读双轴自审，未把自测当作 Opus 验收。

- Standards：初审无阻断违规；曾提出 sticky 不可枚举 getter 的接口意外性建议。定向复核确认 CARD 的两项兼容约束后撤回，最终无未决 Standards finding；直接读取限制仍如实记录。
- Spec：初审无确定阻断；补充对比度审查发现上述浅色绿色 token 缺口，采用可读的现有 token 并保留稿差异待收货。实屏事项没有用组件测试替代。
- 仓内没有 `docs/agents/issue-tracker.md`；完整 Matt tracker 流程需另行 `$setup-matt-pocock-skills`，本次仅执行无需 tracker 的本地双轴流程，未新建配置。

### 最终指定验证

`npm test -- --runInBand`，退出 0（`/private/tmp/090-test-final.log`）：

```text
Test Suites: 160 passed, 160 total
Tests:       1303 passed, 1303 total
Snapshots:   0 total
Time:        32.502 s
Ran all test suites.
```

`npx tsc --noEmit`，退出 0，无输出（`/private/tmp/090-tsc-final.log`）。

`npm run lint`，退出 0，0 errors / 0 warnings（`/private/tmp/090-lint-final.log`）：

```text
## Spec 085 卡 A（2026-10-09，Codex 开发自测；待 Opus 收货）

### 实现要点与范围

- 首条命令 `touch .codex-write-probe && rm .codex-write-probe` 成功，始终在指定可写工作树 `/Users/david/Projects/apps/meetpr-rn-wt-085` 实装。现场分支 `feat/085-today-final-walkthrough`，HEAD `1643fdf`，基线 `aeb1020`；开工工作区干净。仓内无 CONTEXT.md / FOLLOWUPS.md / AGENTS.override.md；CLAUDE.md 仅引用 AGENTS.md。
- 只新增 `src/domain/meet/weight-class.ts`、`src/features/onboarding/meet.ts`、`src/domain/profile/body-weight.ts` 与各自目录下的三个测试文件；现有文件仅追加本 JOURNAL。不修改任何现有源文件，不接 UI，不加文案、依赖或 DTO，不读写存储，不调用 `t()`，不改后端与草稿结构。
- 级别表逐项照 SPEC，CPA 女子末段 `90 / 100 / 100+`，IPL 女子末段 `100 / 110 / 110+`。新模块提供严格固定格式解析、格式化和按档案性别/唯一级别归属选表；旧手填值保持不识别，未接入任何展示或写入路径。
- 比赛保存与移除各只返回三个字段，类型直接兼容 `OnboardingUpsertInput`；校验复用现有 `onboardingDateBounds(now).competition`，另检查真实日历日期、必填赛事方与合法级别。未知/未选赛事方时级别也无法判为有效。
- 体重输入保留首个小数点和两位小数；kg/lb 保存为两位 kg 字符串，校验换算及舍入后的值均在 `(0, 500)` 内；lb 系数严格使用卡内 `2.2046226218`。读回去尾零，展示固定两位；`183.26 lb → 83.13 kg → 183.27 lb → 83.13 kg` 稳定。
- 新文件未被现有 App 代码引用，因此未接入新的可见行为。没有运行模拟器或 UI 验收，本卡仅报告开发纯函数自测，不宣布整份 Spec 085 产品验收完成。

### 红 → 绿测试与原始日志

测试仅调用卡内三个新文件的导出函数，无内部 mock。按公开行为逐段加入测试，看到失败后再实现该段；参数化各例的名称与结果均保留在原始日志。日志根目录：`/private/tmp/rn-085-card-a/`，下表文件名均相对此目录。

| 测试名 / 参数化用例 | 红 → 绿 | 原始日志 |
|---|---|---|
| `lists the four supported federations in picker order`（1） | 新模块不存在，suite 无法加载 → 通过 | `01-tables-red.log` / `01-tables-green.log` |
| `returns the approved %s %s open classes`（四家 × 男女，8） | 同上 → 八张表逐项一致 | 同上 |
| `round-trips %s %s in the fixed wire format`（5，含 120+ / 67.5 / 100+ / 84+、首尾空白） | 导出函数缺失 → 固定文字与解析结果通过 | `02-format-red.log` / `02-format-green.log` |
| `leaves unrecognized class %j as legacy text`（18，空/null/undefined、83kg/-93/IPF 83/IPF、未知赛事方、表外/青年级别及格式错误） | 导出函数缺失 → 全部返回 null | 同上 |
| `throws for a class outside %s: %s`（5） | 缺函数产生 TypeError，不符合 RangeError 断言 → 全部按编程错误抛 RangeError | 同上 |
| `chooses table for %s %s / profile %s as %s`（10） | 导出函数缺失 → 男/女优先、未知性别唯一归属、重叠/不归属/未选默认男表通过 | `03-sex-red.log` / `03-sex-green.log` |
| `saves only the three meet fields in an onboarding-compatible patch`（1） | 新模块不存在，suite 无法加载 → 精确三个保存字段通过 | `04-patch-red.log` / `04-patch-green.log` |
| `removes the meet by clearing exactly its three fields`（1） | 同上 → false/null/null 通过 | 同上 |
| `reports missing or invalid meet fields for %j`（18） | 导出函数缺失 → 三项逐一缺失、非法赛事方/级别、上下越界、无效日历日期通过 | `05-validation-red.log` / `05-validation-green.log` |
| `accepts a complete meet on %s including date bounds`（4） | 导出函数缺失 → 今天/区间内/闰日/十年后边界通过 | 同上 |
| `accepts a class from either sex table`（1） | 导出函数缺失 → 女子独有级别通过 | 同上 |
| `clamps the ten-year date bound for leap day`（1） | 导出函数缺失 → 2038-02-28 合法、03-01 越界通过 | 同上 |
| `filters body weight input %j to %j`（8） | 新模块不存在，suite 无法加载 → 包含 `83.256 → 83.25`、`8a3..2 → 83.2` 的全部过滤例通过 | `06-filter-red.log` / `06-filter-green.log` |
| `converts %j %s into storable kg %j`（23） | 导出函数缺失 → kg 固定两位、lb 换算、0/空/500、非有限/非数字与舍入后边界通过 | `07-storage-red.log` / `07-storage-green.log` |
| `reads stored %j kg as %s input %j`（14） | 导出函数缺失 → kg 去尾零、lb 换算、空/非法值通过 | `08-readback-red.log` / `08-readback-green.log` |
| `keeps stored kg stable when %s lb is read back and saved`（2，183.25/183.26） | 读回函数缺失 → 读回后再保存 kg 不变 | 同上 |
| `formats body weight %j as %s`（6，卡内三例各测 number/string） | 导出函数缺失 → 83.00 / 83.50 / 83.26 通过 | `09-display-red.log` / `09-display-green.log` |

共新增 **3 suites / 126 tests**。01/04/06 的红测是新模块尚不存在导致加载失败（0 tests executed），其余为导出函数尚未实现的用例失败，未将这些记录写成已执行的行为断言失败。抛错断言初稿过宽，缺函数也可满足 `toThrow()`；实现前改为 `toThrow(RangeError)` 并重新确认 02 的 28 条新用例全部失败，才实现对应函数。

### 差异、审查与边界

- **SPEC 与卡的一处冲突**：卡写 `bodyWeightKgFromInput` 的 kg 分支“原样（去掉多余的尾随小数点）”；SPEC §2「存储」明确“公制原样存两位”。按用户规定以 SPEC 为准，返回 `83.00` / `83.50` 等固定两位字符串；对应测试也按 SPEC。没有发现阻碍卡 A 的 SPEC 自相矛盾，没有自行改变已批准产品口径。
- 首轮 `npx tsc --noEmit` 有 **7 个 TS2345**，均来自新增 Jest 参数表的 `as const` 只读元组与 callback 类型不兼容；改为显式 `test.each` 元组类型，未改断言或运行时行为。原始失败保留 `first-tsc.log`。首轮全量 Jest/lint 已通过，分别保留 `first-jest.log` / `first-lint.log`。
- `code-review` 两个只读子代理分别直接审查六个新增文件（未跟踪文件不在普通 git diff 内）：**Standards 0 findings；Spec 0 findings**。测试类型修正和空行整理不改语义。这里只是开发自审，不替代 Opus 逐项收货。
- 仓内没有 `docs/agents/issue-tracker.md`，未私建配置；本次使用用户提供的 SPEC 与卡完成本地审查。未来如需完整 Matt tracker 流程，应由 David 调用 `$setup-matt-pocock-skills`；不阻塞本卡已授权的代码工作。
- 没有 commit、push、PR、依赖安装或正典台账修改。PARITY 与卡 B 界面接线留给后续批准范围。

### 最终全量检查

- `npx jest --runInBand`：**156 suites / 1295 tests passed，0 failed，0 snapshots**，15.666s，退出码 0；`/private/tmp/rn-085-card-a/final-jest.log`。
- `npx tsc --noEmit`：**0 errors**，退出码 0；`/private/tmp/rn-085-card-a/final-tsc.log`（成功无输出）。
- `npm run lint`：**0 errors / 0 warnings**，退出码 0；`/private/tmp/rn-085-card-a/final-lint.log`。
- 新增代码与测试完整 diff：`/private/tmp/rn-085-card-a/final-code.diff`。本地检查结果不等于 CI 或 UI 验收。

### 交付末次现场核对

- `git diff --check` 通过；工作区改动仅本 JOURNAL 与六个新文件。尝试 `touch /Users/david/Projects/scratch/rn-085-today-20261009/done-a` 被沙箱拒绝，原始错误：`touch: /Users/david/Projects/scratch/rn-085-today-20261009/done-a: Operation not permitted`。按用户要求忽略标记文件步骤，不改去其他工作目录。
- 末次核对发现本会话之外将 HEAD 从 `1643fdf` 更新为 `28376ac`（`Reduce the Today day card in spec 085 to an overview that hands off to Training`）。已读取该提交完整 diff：仅修改 SPEC 的 Today/UI 部分，卡 A 的体重、比赛与级别表条款未变；本会话没有执行 commit/push。
- **末次新发现的 SPEC 文本矛盾，停止继续动作并留待 Opus 澄清**：新提交的验收项 1b 同时写“动作数与组数”和“卡内没有组数、次数、重量”。可能涉及汇总组数与逐动作明细的区分，但本会话不自行裁决。发现时卡 A 代码、全部检查及上述记录已经完成；没有实现或修改 §1 UI，也未因该句更改卡 A。此条取代前文“没有发现”对末次 SPEC 版本的适用性。

## Spec 085 卡 B（2026-10-09，Codex 开发自测；待 Opus 收货）

### 实现要点与文件落点

- 现场起点：`feat/085-today-final-walkthrough` / `bfb53c5`，工作区最初干净；第一条命令 `touch .codex-write-probe && rm .codex-write-probe` 退出码 0。仅在本 worktree 实装，未安装依赖，未 commit / push / stash / PR。
- 已读本仓 AGENTS、CLAUDE（仅引用 AGENTS）、SPEC 与卡 B 全文、PLAN、工程流程及记忆索引；未发现 CONTEXT、FOLLOWUPS 或更近的 AGENTS.override。已查 Expo SDK 57 版本文档。复用卡 A 的三个纯函数文件，三者 diff 均为空；API schema、本地草稿 schema、依赖、训练页、教练端、Tab 栏均未改。
- Today：`src/features/dashboard/WeekCalendar.tsx` 用显式 `todaySelection` 隔离选中描边与当前日金色标记；`DashboardScreen.tsx` 接入可点概览、按 sort_order 解析的一行动作名、全天合计、所选日 handoff、体重与比赛单项入口和级别原文；`use-dashboard.ts` 重新聚焦清选择、默认选择当天刚完成日（含跨周完成）、e1RM rails 使用所选日。页头与底部开练行为保留。
- 营养：新增 `src/features/dashboard/NutritionPlaceholder.tsx`，随体重 / Meetday 行显示；四格纯展示，整卡无障碍读一句，无点击、请求或埋点。
- 共用表单：`src/features/onboarding/OnboardingSteps.tsx` 抽出共用 `WeightSection`、独立 `NoteSection`，重接 Meet 日期/赛事方/四列级别与性别表切换；引导第 7 步展开/移除、末尾留言。`controls.tsx` 为现有 FieldLabel 增加错误态，为 ChoiceGroup 增加局部 Meet 外观与尾行占位。`model.ts` 接卡 A 校验/patch，体重保存固定两位；`OnboardingWizard.tsx` 只扩展错误字段类型，草稿结构不变。
- Profile：`src/features/profile/model.ts` 新增 weight/note 白名单与三行值；`ProfileEditor.tsx` 单项体重、Meet、Note 内容隔离及移除确认；`MyProfileScreen.tsx` Meet 后紧接 Note，Basic information 行使用定稿标题；`components.tsx` 仅新增可选 valueLines，Note 单行截断；`src/app/(student)/profile.tsx` 扩展入口白名单。旧手填级别直到保存才覆盖，取消不写；Note 沿用原来的 trim/空值规则。
- 文案：新增中英文位于 `src/i18n/catalog/RnExtras.json`；复用现有 Save、Cancel、Completed、Body weight、Meet、Meet date 等等价键。删除 `StudentKit.json` 中本卡失效的 `step7ExtrasSection.copy004–008`、`myProfileView.copy008–009`、`profileCardsSection.copy007`，不存在残留源代码引用。
- 测试文件：`src/features/onboarding/__tests__/model.test.ts`；`src/features/profile/__tests__/model.test.ts`、`editor.test.tsx`；`src/features/dashboard/__tests__/week-calendar.test.tsx`、`visual-parity.test.tsx`、`use-dashboard.test.tsx`。只在卡 B 四处 seam 新增测试；`src/features/onboarding/__tests__/wizard.test.tsx` 仅修正既有精度断言，没有新增边界。

### 红 → 绿测试

| 边界 / 行为 | 实际红测 | 绿测结果 |
| --- | --- | --- |
| onboarding model：收起第 7 步 | 原来返回 isCompeting 缺项（1 failed） | 未展开校验通过，false/null/null，留言保留 |
| onboarding model：展开三项必填 | 缺赛事方/级别却返回空错误（1 failed） | 旧手填值不算完整；新格式合法可提交；该文件 27 tests 通过 |
| profile model：weight/note/competition 白名单、行值与两位数 | 4 个 patch 断言失败；行值测试初稿 fixture 缺字段，修正 fixture 后重新确认预期值失败 | 该文件 23 tests 通过；不发送别区字段或 1RM |
| profile editor：体重单项 | 新 section 未实现，5 tests 渲染失败（标题键未定义） | kg/lb 输入第三位截断，83.25 / 183.25 分别存 83.25 / 83.12；读回再存不变；空/0/500 拦截 |
| profile editor：Meet 与 Note | 3 failed：旧标题、无旧值提示、无 Remove meet | 赛事方/级别缺项不写，换赛事方清级别；三字段保存；确认移除；取消不写；Note 保存/重开/失败重试保留；该文件 16 tests 通过 |
| dashboard visual：概览、入口、完成态与营养 | 4 failed：仍路由 basics、旧体重显示、概览不存在 | 选中概览、动作顺序与未知动作跳过、单行截断、handoff、开练仍当前日、完成态和不可点营养通过 |
| dashboard visual：摘要与 e1RM | 摘要实际为 Exercises: N · Sets: M（1 failed）；选 D2 无 Bench press chart（1 failed） | 概览文案按定稿、图表使用 D2 主项 |
| dashboard week-calendar | 缺少独立当前日可访问标记（1 failed）；初稿用 host onPress 的测试调用修为现有 FeedbackPressable | 点选 Upcoming/Completed 时 selected 跟随，当前日标记不移动 |
| dashboard hook | refocus 后仍 day-2（1 failed）；扩展跨周 fixture 后再次返回 day-2（1 failed） | 重聚焦回当前日；当天完成周末日后仍默认刚完成日 |
| dashboard visual：Profile 三行标题 | Basic information 实际仍为 Height / Body weight（1 failed） | 按屏幕稿标题，Meet/Note 行存在，留言单行 |

新增 16 tests（1295 → 1311），suite 数保持 156。红测结果来自实际命令输出；渲染错误与 fixture 错误没有冒充行为断言失败。首次完整 Jest 为 155 suites / 1310 tests 通过、1 suite / 1 test 失败：仅旧英制体重精度断言；修正见下表。所有原有测试保留，未删除测试以换取绿色。

### 修改的旧断言（逐项）

| 文件 / 原用例 | 修改 | 原因 |
| --- | --- | --- |
| profile/editor：competition editor title | `Meet / notes` → `Meet` | SPEC §3 独立比赛编辑页 |
| profile/editor：basics saves units… | lb 读回 `176.4` → `176.37`；首次保存和重开保存两处 `80` → `80.00` | 两位换算与固定两位存储；身高断言未改 |
| profile/editor：switching units after metric edits… | `198.4` → `198.42`，保存 `90` → `90.00` | 同上 |
| profile/editor：meet notes save…（true/false 两例） | 改在 `note` 页挂载/重开；精确 patch 从四个比赛/留言字段改为仅 `note_to_coach` | Note 独立页面和白名单；多行读回断言保留 |
| profile/editor：failed save retains notes / cancelling edited notes | 挂载从 competition 改 note；原失败保留、重试、取消零写入断言不变 | 原留言行为迁到新入口，并非删除或弱化 |
| profile/model：basics submits only its own fields | `weight_kg: '80'` → `'80.00'` | 公制存储也固定两位 |
| profile/model：competition submits only its own fields | fixture/预期 `'83'` → `'IPF · 83 kg'`；精确 patch 去掉 `note_to_coach` | 保存必须使用合法新格式，留言分离；另测旧值原样显示 |
| onboarding/model：tomorrow birthday and yesterday competition… | fixture 增加 `targetWeightClass: 'IPF · 83 kg'`，日期断言全部保留 | 排除新必填项干扰，继续单独验证原日期上下界 |
| onboarding/wizard：imperial weight input preserves raw text… | `1`、`1.` lb 对应 kg 从 `0.5` → `0.45`，`70.5` lb 从 `32` → `31.98`；blur/切回 lb 从 `1.1` → `0.99`，切 kg 从 `0.5` → `0.45` | 新两位 kg 精度；原逐次按键、blur 和单位切换覆盖全部保留 |
| dashboard/visual-parity：Today metric cards…（空/有值两例） | route params / ProfileEditor section `basics` → `weight`；无障碍体重 `83 kg` / `84 kg` → `83.00 kg` / `84.00 kg` | 单项页与固定两位显示；原 Save 即时返回刷新、Cancel 无写入仍保留 |

### 差异、审查与验证边界

- 没有发现当前 SPEC 内阻碍实现的自相矛盾。卡 A JOURNAL 尾部记录的“概览卡有没有组数”矛盾已由当前 SPEC 1b 明确区分为全天合计与逐动作明细，不再适用。
- 基线与说明文字有两处差异：现有 `daySummary` 英文实际为 `Exercises: N · Sets: M`，所以只为 Today 概览新增定稿格式，未改训练页共用摘要；现有 e1RM rails 实际取当前日，所以修正 hook 数据选择使其符合 SPEC 所选日要求，没有修改 e1RM 卡本身。
- SPEC 测试 seam 列表主要描述卡 A + 卡 B 全部范围，卡 B 进一步指定 UI/model 落点；按用户明确指定的卡 B 四边界写测试。仅旧 wizard 精度断言必须同步，不在该文件扩展测试范围。
- `code-review` 两个只读子代理：Standards 首轮 1 项（旧键）；Spec 首轮 4 项（跨周完成、CPA 女子尾行四列、旧键、旧值等宽样式）。均定向修复并复审：Standards 0 剩余、Spec 0 剩余。之后 Basic information 标题按稿补齐并有红绿测试；重复 Meet 文案改为复用已有等价键。
- 仓内仍无 `docs/agents/issue-tracker.md`；本任务已有明确 SPEC/卡，未私建配置，不阻塞本地开发自审。若以后需依赖 tracker 流程，应由 David 调用 `$setup-matt-pocock-skills`。
- **未做设备验证**。没有运行模拟器、Global 联调或三个真实升级账号验收；沙箱中的挂载/fixture 测试不代表 Opus 的实屏收货，也未修改 PARITY 或收货清单。
- 最需要实屏确认的三处：① Today 周条双标记、概览单行截断、跳训练再返回重置，特别是本周末日刚完成的跨周场景；② Body weight 数字键盘、kg/lb 两位输入与保存/取消回 Today 的即时更新；③ Meet 日期轮、四列级别（CPA 女子尾行、other 性别切表）、错误标题/移除确认及引导展开收起，在 Light/Dark、360×640 dp、字体 1.3× 下的布局。

### 最终全量检查

- `npx jest --runInBand`：**156/156 suites、1311/1311 tests passed，0 failed，0 snapshots**，17.059s，退出码 0（包含 i18n 守卫）。仍有测试环境既有 Expo notifications / React act 提示，不将它们宣称为设备日志或真实设备验证。
- `npx tsc --noEmit`：**0 errors**，退出码 0（成功无输出）。
- `npm run lint`：**0 errors / 0 warnings**，退出码 0。
- `git diff --check`：通过。所有检查在本 worktree 运行；交付时 HEAD 仍为 `bfb53c5`。命令临时日志清理，不纳入交付；完整变更可直接查看本 worktree 未提交 diff。

## Spec 085 卡 B 返修一

2026-10-09；工作树 `meetpr-rn-wt-085`，HEAD `8d92ed7`。开工先执行 PATH 设置与 `.codex-write-probe` 创建/删除，退出码 0；无 CONTEXT.md / FOLLOWUPS.md。保留接手时卡 B 全部未提交改动，仅执行 CARD-B-ui.md「返修一」八项；未安装依赖，未 commit / push。

### 八项修改与断言

| 项 | 完成内容 | 本轮断言变动 |
| --- | --- | --- |
| 1 | Profile 基础信息行恢复 `student.myProfileView.copy009`，StudentKit 恢复中英文；编辑页仍为 Basic information。 | dashboard/visual-parity 的 Profile 行标题断言从 Basic information 恢复为 Height / Body weight；Meet/Note 与留言断言保留。 |
| 2 | WeightSection 增加 labelKey 参数；BodyMeasurementsSection 使用原 copy003，覆盖 Basic information 与引导第 1 步，非堆叠布局保留单位括号；单项页默认仍为 Weight。 | 无断言改动；原编辑页标题、体重输入/换算与向导测试保持。 |
| 3 | 概览动作数、组数分别选择 `.one` 键，再组合摘要；中文显示不变。 | dashboard/visual-parity 新增 2 tests：1 exercise · 3 sets、3 exercises · 1 set。 |
| 4 | 仅 Profile Meet 页遇 federation 或 weightClass 缺项时显示指定中英文提示；仅日期错误和保存请求失败仍用旧提示；向导未改。 | profile/editor 新增 4 tests：en/zh 各覆盖未选赛事方、选赛事方后缺级别，以及只有日期无效时保留旧提示；均断言不调用 upsert。 |
| 5 | RnExtras 新增 student.rn.meet.title（Meet / 比赛）；替换 Profile 行、编辑页和引导区块三处教练命名空间借用。 | 无断言改动；已有 Meet 标题断言保持。 |
| 6 | 级别尾行补位复用真实格子的 choice/equalChoice/meetChoice 样式，包含相同边框、内边距与 flex，透明占位保留相同行间 gap。 | 按卡片要求不写样式断言。 |
| 7 | 仅 meet 外观的赛事方/级别文字设单行、adjustsFontSizeToFit、minimumFontScale=0.85。 | 按卡片要求不写样式断言。 |
| 8 | DashboardScreen、OnboardingSteps、ProfileEditor、onboarding/model、profile/model 新增 import 移回对应第三方、@/、相对路径分组。 | 无断言改动。 |

### 红绿证据与检查

- 第 3 项逐例先红后绿：第一例实际收到 `1 exercises · 3 sets`，1 failed；实现动作单数后 1 passed。第二例实际收到 `3 exercises · 1 sets`，1 failed；实现组数单数后 2 passed。
- 第 4 项新增中英文缺项用例先得到 2 failed（缺少指定提示）；实现后两例转绿。日期回归初稿使用过去日期，被真实 DateWheel 自动夹到今天，产生 2 个 fixture 失败；改用下一年的 `02-30`（范围内但无效），不改生产日期行为，最后四例全部通过。fixture 失败不记作功能红测。
- `npx jest --runInBand`：**156/156 suites、1317/1317 tests passed，0 failed，0 snapshots**；18.597s，退出码 0。比返修前新增 6 tests。
- `npx tsc --noEmit`：**0 errors**，退出码 0。
- `npm run lint`：**0 problems（0 errors / 0 warnings）**，退出码 0。
- `git diff --check`：通过。

### 范围与验收边界

八项全部实装，无未完成项、无自行改变口径。第 1 项行标题与第 4 项提示语按后出的「返修一」及本次用户指令覆盖 SPEC 原转写/通用提示；未改 SPEC、PARITY 或其他正典台账。其余接手时的文件改动保留，不计作本轮新改动。

**未做设备验证**，按卡约定由 Opus 实屏收货。最需复核三处：CPA 女子尾行是否与满行等宽；360×640 dp / 字体 1.3× 的 `140+ kg` 与赛事方文字是否完整；Basic information / 引导第 1 步与单项页的字段标题区别。自动化通过不代表这些视觉项已经验收。

独立只读双轴自审（仅本轮返修差分）：**Standards 0 项、Spec 0 项发现**。已有本地卡片作为来源；仓内缺少 `docs/agents/issue-tracker.md` 的已知配置缺口未触发 tracker 流程，未新增配置。

## Spec 085 卡 B 返修二

2026-10-09；工作树 `meetpr-rn-wt-085`，HEAD `ce7145c`。开工写入探针通过；保留卡 B 与返修一的未提交改动，仅执行 CARD-B-ui.md「返修二」第 9、10 项。未安装依赖，未 commit / push。

- 第 9 项：`src/features/onboarding/controls.tsx` 的 `meetSelected` 背景与描边改为 `colors.ctaBackground`，`meetSelectedText` 改为 `colors.ctaText`，覆盖选中的赛事方 / 级别块。
- 第 10 项：`src/features/dashboard/DashboardScreen.tsx` 概览状态小标的非当前日背景分支由 `colors.bgStack` 改为 `colors.surfaceRaised`；`Today's session` 保持 `colors.goldSoft`。`src/features/dashboard/NutritionPlaceholder.tsx` 的 `Coming soon` 小标及四个营养小格（共用 map 样式）背景同样改为 `colors.surfaceRaised`。其他背景未改。
- 本轮没有新增或修改测试断言。
- `npx jest --runInBand`：**156/156 suites、1317/1317 tests passed，0 failed，0 snapshots**；17.483s，退出码 0。
- `npx tsc --noEmit`：**0 errors**，退出码 0。
- `npm run lint`：**0 errors / 0 warnings**，退出码 0。
- `git diff --check`：通过。未做设备验证，视觉验收按卡片约定由 Opus 完成。

## Spec 088 · CARD-1-redesign · 第一步（2026-10-09）

工作树 `meetpr-rn-wt-088`，分支 `feat/088-profile-redesign`。只做 SPEC §1–§3。首个工具动作 `touch .codex-write-probe && rm .codex-write-probe` 退出码 0，探针已删除。未切换工作树、未重装依赖、未 commit/push/建 PR；未写 specs 或 PARITY。实屏验收由 Opus 按任务卡负责，本节记录开发自测，不宣布功能验收通过。

### 文件改动

- `src/app/_layout.tsx`：根 Stack 注册三个学员二级路由；新增 `src/app/profile/about.tsx`、`health.tsx`、`settings.tsx`，仅 re-export。
- `src/features/profile/MyProfileScreen.tsx`：身份摘要卡、五行、下拉刷新与加载/失败/无档案状态；保留直接编辑入参。
- 新增 `src/features/profile/ProfileIdentityCard.tsx`、`ProfileAboutScreen.tsx`、`ProfileHealthScreen.tsx`、`ProfileSettingsScreen.tsx`、`ProfilePage.tsx`：身份、二级页、标题导航、行展示；现有编辑与偏好/安全流程复用。
- `src/features/profile/model.ts`：新增首字母、身份回落、已通过绑定教练名、五行摘要纯函数；原 `oneRMValues`、`profileRowValues` 算法未改。
- `src/features/profile/MyProfileHeader.tsx`：移除副标题；`MyProfileAppearanceRow.tsx`：三等宽外观块，使用 `ctaBackground` / `ctaText`。
- `src/features/profile/components.tsx`：删除无生产调用方的旧小标题、旧值行；分隔线新增默认关闭的 `inset` 参数，旧设置页布局保持原样。删除 `src/features/profile/MyProfileCards.tsx`（旧 1RM / Recovery 行）；旧 `MyProfileFallbackRows` 随首页替换删除，其偏好与退出能力移至 Settings。
- `src/features/account/AccountSecuritySection.tsx`：仅替换入口行样式、移除自带小标题，原三个弹层逻辑未改。
- `src/features/profile/ProfileEditor.tsx`：仅 injuries 保存按钮上方增加灰字；`src/features/training/ReadinessSheet.tsx`：仅最终提交步骤增加同一灰字。
- `src/i18n/catalog/RnExtras.json`：新增中英文 profile 文案。Squat / Deadlift 复用既有键，Bench 使用短标签新键；守卫不要求清理孤儿键，旧目录键保留。
- `src/features/history/ProgressMenuRow.tsx`、`ProgressPageHeader.tsx`：从本地 `origin/feat/087-progress-menu` 原样取出，内容未修改；补充一确认 Opus 已逐字节核对。
- 测试：新增 profile 的 `profile-home.test.tsx`、`profile-pages.test.tsx`；追加 `model.test.ts`、`editor.test.tsx`、training 的 `readiness-sheet.test.tsx`；迁移 `header.test.tsx` 及补充一授权的 dashboard `visual-parity.test.tsx` 旧首页断言。

### 先红后绿与检查过程

按卡中的 seam 顺序推进：

1. model 首字母新增测试先失败：`TypeError: (0 , _model2.profileInitials) is not a function`，1 failed / 23 passed；实现后 24 passed。身份/绑定/菜单三个测试先失败，3 failed / 24 passed；实现后 27 passed。
2. 首页测试先 14 failed / 14 total；接入新首页后 14 passed。随后增加绑定状态、失败刷新缓存等回归保护。
3. 二级页测试先因缺少 `../ProfileAboutScreen` 模块失败；实现后用现有文案及合法单位修正 fixture（这类 fixture 修正不算功能 red），10 passed。追加偏好读取失败重试、二级页重试、en/zh 与 Light/Dark 的组件检查。
4. injuries 与 Readiness 通知提示先 2 failed / 31 passed；仅加入灰字后通过。其余编辑 section 不显示提示，旧表单断言未改。
5. 首页/编辑/Readiness/Today 定向检查 7 suites / 101 tests passed；现有偏好、账号相关、引导、i18n 守卫均随全量运行。

双轴只读自审：Standards 的共享分隔线越界、重复文案键已修正并复核；Spec 的共享分隔线问题已修正，右侧长值截断问题见下方待决定项。仓内无 `docs/agents/issue-tracker.md`，本卡文件已提供明确来源，未启用 tracker 或新增配置。

期间命令收集脚本误用 zsh 保留变量 `status`，出现原始错误 `zsh:3: read-only variable: status`（一次为 `zsh:10`）；检查命令本体已执行，随后改用 `check_exit` 重跑并取得真实退出码。新增主题参数表的 readonly tuple 曾触发 TS2345，已改为显式可变 tuple 类型并重跑。

### SPEC 验收 1–12 对应测试

以下均为测试文件中的实际测试名；参数化测试以模板列出。组件树检查不等于原生布局、真账号或覆盖安装验收。

| 项 | 测试名与证据边界 |
| --- | --- |
| 1 | `home shows identity and exactly five ordered entries without old groups or sign out`；`profile header keeps the title without its old subtitle or an Eyebrow`。1080×2400 首屏一屏放完由 Opus 实屏核对。 |
| 2 | `profile initials cover words, CJK, email and empty identity`；`profile identity falls back from supplied name to email to phone without reading login name`；`coach identity requires an accepted binding and a nonblank name`；`identity exposes only a named accepted coach (%s) and no avatar action`。首步只传 email/phone，不读取登录 name。 |
| 3 | 原有 `1RM total requires all three lifts and missing values display an em dash` 保持；`home shows identity and exactly five ordered entries without old groups or sign out` 覆盖 302.5 / 115 / 225 / 642.5；`training grid opens the unchanged 1RM explanation`。 |
| 4 | `profile menu preserves filled legacy values and supplies every empty fallback`：身高单项、体重单项、完整/空白、伤病计数/other、Meet、Added、Settings 空值。 |
| 5 | `About me preserves four ordered rows and opens each existing editor`；`saving basics updates About me and the mounted home through the shared cache`；`Health uses %s recovery and opens the existing sheets`（today/onboarding/empty）。现有 model 摘要与 editor 保存测试保持。 |
| 6 | `%s editor shows the coach notice only for injuries above Save`（injuries/basics/background/competition/note/weight）；`the shared Profile and Today readiness sheet shows the coach notice only above the final submission`。Today 与 Profile 使用同一 ReadinessSheet；未另外跑设备开练。 |
| 7 | `Settings switches appearance persistently and opens both existing preference screens`；`%s storage failure retains the existing retry behavior`；`Settings opens the unchanged %s modal`；`Settings can sign out and clear cached data even when the profile request fails`。原 `manual rest keeps automatic reference rules visible and persists a selected duration`、`enabling without exact alarm authorization keeps weekly reminders and explains possible delays` 等设置测试保持。原生重启与登录页切换待实屏；组件验证 ThemeProvider 重挂载恢复偏好及既有 logout 调用。 |
| 8 | 原 `Today metric cards open the existing Profile editors (has values: %s)` 的体重/Meet 路由、保存、返回断言保留并通过；`direct editSection %s opens and closes without a secondary page` 覆盖 basics/competition/weight/note。`src/app/(student)/profile.tsx` 未改。 |
| 9 | `Settings remains available when profile is %s`（pending/error/empty）；`a failed refresh hides stale values while keeping identity and every destination available`；`secondary profile page renders load failure and retries before revealing editors`；档案失败的退出测试同第 7 项。 |
| 10 | 第 1、4、5、9 项测试保护数据派生、旧编辑入口、空档案与退出；`profile rows preserve legacy meet text, separate the first note line, and pad weight` 原断言保留。下方完整映射表覆盖 17 项及消息入口。真实老用户覆盖安装、新注册流程未运行，交 Opus。 |
| 11 | `identity keeps full decimal values, truncation and theme tokens in %s/%s`（en/zh × light/dark）；`Settings switches appearance persistently and opens both existing preference screens`。前者检查小数完整值、身份文本单行属性和主题 token，不证明 360×640 dp / 字体 1.3× 原生几何；原样 087 行的长值截断仍是已知缺口。 |
| 12 | 三条全量命令真实输出附后；i18n、现有功能测试随全量运行；PARITY 由 Opus 写，本次未修改。 |

### 改前 17 项信息与入口的落点

| 原信息 / 入口 | 新落点 |
| --- | --- |
| 1 Current 1RM：Squat、Bench Press、Deadlift、SBD total、说明弹窗 | 首页身份卡 Squat / Bench / Deadlift / Total 四格；数字由原 oneRMValues 派生；四格及锁定说明共同打开原说明弹窗。 |
| 2 Recovery assessment | Health & recovery 第 1 行，今天打卡优先、引导值回落；打开原 ReadinessSheet。 |
| 3 Injury history | Health & recovery 第 2 行；原伤病编辑页，通知灰字移到保存上方。 |
| 4 Muscles to improve | About me 第 4 行，打开原肌群编辑。 |
| 5 Appearance | Settings → Preferences 第 1 行，System / Light / Dark，原持久化行为。 |
| 6 Rest between sets | Settings → Preferences 第 2 行，原组间休息设置页及失败重试。 |
| 7 Training reminders | Settings → Preferences 第 3 行，原提醒设置页及失败重试。 |
| 8 Meet | 首页第 3 行直接打开原 competition 编辑；原日期 / 赛事方 / 级别值保留。 |
| 9 Note to coach | 首页第 4 行，摘要 Added / —；直接打开原留言编辑，完整留言仍在编辑页。 |
| 10 Height / Body weight | 首页 About me 右值；About me 第 1 行改称 Basic information，原单位 / 性别 / 生日 / 身高 / 体重编辑保留。Today 单独体重入口不变。 |
| 11 Training background | About me 第 2 行，原摘要与编辑。 |
| 12 Training environment | About me 第 3 行，原摘要与编辑。 |
| 13 Change password | Settings → Account 第 1 行，原弹层。 |
| 14 Export training data | Settings → Account 第 2 行，原导出弹层。 |
| 15 Delete account | Settings → Account 第 3 行，名称红色，原删号弹层；测试只打开，不执行删除。 |
| 16 Sign out | Settings 页底 secondary 描边按钮，原 client.clear() + logout()，不新增确认。 |
| 另：原分组/通知信息 | 首页旧分组小标题、副文、Notify coach 胶囊按 SPEC 删除；分组由五入口、二级页标题及 Preferences / Account 表达；通知含义保留在伤病保存与 Readiness 最终提交上方。 |
| 17 消息按钮 | 首页原 MyProfileHeader 右上按钮，原未读角标和 openCoachChat 逻辑保留。 |

以上 17 项包含消息按钮，另补原分组/通知信息的迁移说明。

### 旧断言迁移（补充一授权）

`src/features/dashboard/__tests__/visual-parity.test.tsx` 仅改 import 与以下旧 Profile 断言；同一测试的 Today 体重卡 → edit=weight → 编辑 → 保存 → returnTo=today，以及 Meet 路径断言未改。

迁移前：

```tsx
expect(renderer.root.findAllByType(MyProfileValueRow).map(node => node.props.title)).toEqual(expect.arrayContaining(['Height / Body weight', 'Meet', 'Note to coach']));
const noteRow = renderer.root.findAllByType(MyProfileValueRow).find(node => node.props.title === 'Note to coach')!;
expect(noteRow.props.value).toBe('Existing note');
expect(noteRow.props.valueLines).toBe(1);
```

迁移后：

```tsx
expect(renderer.root.findAllByType(ProgressMenuRow).map(node => node.props.title)).toEqual(expect.arrayContaining(['About me', 'Meet', 'Note to coach']));
const noteRow = renderer.root.findAllByType(ProgressMenuRow).find(node => node.props.title === 'Note to coach')!;
expect(noteRow.props.value).toBe('Added');
expect(renderer.root.findAllByType(ProgressMenuRow).find(node => node.props.title === 'About me')!.props.value).toBe('180 cm · 83.00 kg');
```

`header.test.tsx`：`expect(subtitle).toBeGreaterThan(title)` 改为 `expect(subtitle).toBe(-1)`；原副标题样式断言 `expect(StyleSheet.flatten(texts[subtitle].props.style)).toMatchObject({ fontSize: 11, letterSpacing: 0.44, marginTop: -8 })` 删除，因为 SPEC 明确移除整个副标题。标题存在与无 Eyebrow 两条断言保留。未发现其它旧组件专属测试；旧 MyProfileValueRow、OneRMCard、RecoveryRow 未为迁就测试保留。

### 未做 / 存疑 / pending Opus decision（待 Opus 决定）

- 已知未完成点：原样 `ProgressMenuRow` 的右侧 Text 没有 `numberOfLines`，长值会换行，不能宣称满足 SPEC 的“截断值、不截断名称”。任务卡要求两个 087 文件逐字节不改，当前组件也没有值文本的样式/行数插槽；本次保留原文件，不采用字符数猜测截断或调用组件内部结构的适配。请 Opus 决定统一修复 087 组件并放宽字节约束，或提供 profile 适配接口；该点仍待完成，不因检查绿而宣称验收通过。
- 未执行 Android 实屏、1080×2400 首屏、360×640 dp / 1.3× 字体、TalkBack、覆盖安装、真实账号与后端联调。按卡交 Opus 收货；ThemeProvider 重挂载测试不等于进程重启，mock logout 不等于实屏登录页验证。
- 第二步头像上传、图片选择/相机、GET /me、后端名字、第三步教练端均按范围未做；无新增接口或后端改动。头像入参留可选 URL/回调，首步不会读取或调用。
- Fetch 原始错误：`error: cannot open '/Users/david/Projects/apps/meetpr-rn/.git/worktrees/meetpr-rn-wt-088/FETCH_HEAD': Operation not permitted`。任务卡补充一已豁免，本地引用与导入文件由 Opus 确认；不是剩余阻塞。
- 无其它未定产品口径。临时 `.codex-088-*.log` 在输出归档后删除。

### 最终三项检查的原始尾部输出

`npx jest --runInBand`，退出码 0：

```text

Test Suites: 158 passed, 158 total
Tests:       1365 passed, 1365 total
Snapshots:   0 total
Time:        18.925 s
Ran all test suites.
```

`npx tsc --noEmit`，退出码 0；原始 stdout / stderr 为空，无可摘录行。命令收集器输出：

```text
tsc exit code: 0
```

`npm run lint`，退出码 0；原始尾部输出：

```text

> meetpr-rn@1.0.0 lint
> expo lint
```

各最终命令退出码存同名 `.exit`；首轮 lint 的两条重复 import 警告已修，随后完整复跑以上三个命令。`git diff --check` 通过。

未做项：未运行模拟器/真机，不声明滚动落点、过渡观感、tab/计时条叠放、录入页视频行首屏、深色/中文/磅单位实屏通过；按 CARD 留 Opus 与 David 验证。浅色完成文案的稿差异仍待 Opus 确认。未改 PARITY/收货记录，未做 Global 联调、后端或 iOS 工作。


### 返修一（2026-10-10，按 Opus 实屏反馈）

在 `feat/090-training-flow` / HEAD `2e932ae` 的首轮未提交改动上继续，保留全部既有 WIP 及已暂存的 CARD/SPEC 修订。开工用 `mktemp .codex-write-probe.XXXXXX` 试写并删除，输出 `writable`，退出 0。只执行 CARD「返修一」两项；不 commit、不 push、不更新正典台账。以下说明替代本节首轮的 hero 滚动目标与 sticky 不可枚举兼容说明；浅色完成文案已由 Opus 接受，本轮未改样式。

本轮 Files changed（相对开工 WIP，仅 7 个文件）：

- `src/features/training/WorkoutBody.tsx`：新完成项按计划顺序选最后一个，将其 ID 通知页面；测量完成区和完成行的位置，去掉 hero 滚动测量。
- `src/features/training/TodayWorkoutView.tsx`：待滚动目标改为具体动作 ID，只有目标行布局可触发一次滚动；原键盘、拖动、惯性滚动、切训练日清理及减少动态效果保护保留。
- `src/features/training/hold-to-complete.ts`：返回普通 `{ button, pill, sticky }`，移除 `Object.defineProperty` 和类型断言；三个标志计算口径不变。
- `src/features/training/__tests__/completion-entry.test.tsx`：增加 9 条页面层滚动用例，覆盖首个完成、输入乱序的批量完成、已有更晚完成行、全部完成无 hero、减少动态效果、键盘与拖动在完成前/布局前介入、惯性滚动；同时断言恢复已有记录不滚动、同一完成只滚一次、受阻后不补抢滚动。
- `src/features/training/__tests__/training-flow.test.tsx`：恢复记录用例名称由 hero reveal 改为 completed-row reveal，保留全部旧断言，追加通知目标为 `Bench` 的断言。
- `src/features/training/__tests__/hold-to-complete.test.ts`：仅三条旧完整对象相等断言补 `sticky`（逐条见下）。
- `docs/CODEX-JOURNAL.md`：仅追加本小节。

先红后绿（依次完成 S4、S3；原始日志与对应退出码均在 `/private/tmp/`）：

| 项目 | 红证据 | 绿证据 |
| --- | --- | --- |
| S4 滚动目标 | `090-r1-scroll-red.log`，退出 1：期望 `{ animated: true, y: 228 }`，实际 `{ animated: true, y: 288 }`；`Tests: 1 failed, 19 skipped, 20 total` | 修复后首条通过，再扩充边界；最终 `090-r1-scroll-green.log`，退出 0：`Test Suites: 2 passed, 2 total` / `Tests: 32 passed, 32 total` |
| S3 普通字段 | `090-r1-sticky-red.log`，退出 1：完整相等对象期望 `sticky: false`，收到的可枚举对象缺失该字段；`Tests: 1 failed, 8 passed, 9 total` | `090-r1-sticky-green.log`，退出 0：`Test Suites: 1 passed, 1 total` / `Tests: 9 passed, 9 total` |

改过的旧断言清单（均位于 `hold-to-complete.test.ts` 的 `zero real groups cannot complete; all logged hides remaining pill but keeps button`；按 CARD 返修一第 2 条明确放行）：

1. `realCount: 0, remainingSets: 5`：`{ button: false, pill: false }` → `{ button: false, pill: false, sticky: false }`。
2. `realCount: 1, remainingSets: 4`：`{ button: true, pill: true }` → `{ button: true, pill: true, sticky: false }`。
3. `realCount: 5, remainingSets: 0`：`{ button: true, pill: false }` → `{ button: true, pill: false, sticky: true }`。

三条均保持原 button/pill 期望，仅补普通字段的契约。全仓查找 `completionAvailability` 后未发现其他完整对象相等断言需要调整；未删旧断言，未改首轮已有其他测试 fixture。

滚动计算与验证边界：完成区是 ScrollView 内容的直接子视图，行位置相对完成区；请求 `max(0, completedSection.y + row.y - spacing.md)`。完成区/行的 onLayout 先后均可补齐坐标，首次收到目标行布局后消费待滚动 ID；批量时按 `sort_order` 选本批最后一行，不取所有已完成行中的最后一行。全部完成没有 hero 时仍可定位刚完成行。Jest 在原生边界提供布局事件并检查 ScrollView 的 scrollTo 参数；原生滚动范围会限制实际落点，设备上的落点与过渡观感仍由 Opus 复验，本轮未跑模拟器/真机，不以组件测试替代实屏验收。

只读独立自审：按 `review-loop` 对开工快照与当前代码增量做一轮双轴审查，Standards **0 findings**，Spec **0 findings**；没有返修项。固定审查差异 `/private/tmp/090-r1-review.diff`，开工快照 `/private/tmp/090-r1-before.json`；未调用缺少 tracker 配置的完整 Matt 分支审查流程。主代理已读完整增量。

最终指定命令及结尾：

`npm test -- --runInBand`，退出 0（`/private/tmp/090-r1-test-final.log`）：

```text
Test Suites: 160 passed, 160 total
Tests:       1312 passed, 1312 total
Snapshots:   0 total
Time:        36.255 s
Ran all test suites.
```

`npx tsc --noEmit`，退出 0，无输出（`/private/tmp/090-r1-tsc-final.log`）。

`npm run lint`，退出 0，0 errors / 0 warnings（`/private/tmp/090-r1-lint-final.log`）：

```text
`git diff --check` 通过；两份 087 组件只读字节核对通过。本次唯一文档改动为追加本节 `docs/CODEX-JOURNAL.md`。

### 返修一（2026-10-09，按 Opus 实屏收货修订）

在本卡全部未提交改动上追加返修，未 commit/push，未修改 specs / PARITY。依据 CARD-1-redesign「返修一」和修订后的 SPEC §1、§2 Settings。Opus 本轮已提供首页、三个二级页、编辑页、Dark、Today 直达、断网、退出及覆盖安装验收反馈；此处不将反馈冒记为 Codex 设备实测。

五项改动：

1. `ProgressMenuRow.tsx` 按新授权修改：名称和值放入 `flexWrap: 'wrap'`、`justifyContent: 'space-between'` 的横向容器；名称单行且不收缩，值不收缩、最大宽度为容器宽度，无行数截断，使用 simple 文本换行及禁用自动连字符。同行可容纳时右对齐，超宽时整块落到下一行左侧；图标、箭头与最小行高保持。空串不渲染值 Text；入参、按钮读屏标签不变。`ProgressPageHeader.tsx` 仍与原引用逐字节相同。
2. `model.ts` 首页菜单派生在无伤病时使用新键 `student.rn.profile.noInjuries`；`RnExtras.json` 为 `No injuries` / `无伤病`。原 `injurySummary`、`injuryChips` 和二级页伤病文案未改。
3. `MyProfileScreen.tsx` 只在没有档案数据且加载/失败时留空；有缓存的刷新失败保留四格及五行值，同时显示重试。`ProfileAboutScreen.tsx`、`ProfileHealthScreen.tsx` 优先显示缓存数据，失败时补重试区；`ProfileSettingsScreen.tsx` 保留偏好/账号内容并补档案请求失败重试。无缓存的首页加载/失败/无档案测试保持通过。
4. `profileInitials` 只返回字母/文字首字母，否则空串；`ProfileIdentityCard.tsx` 空首字母时显示 `account-outline`、`colors.textMuted`，头像仍不可点，不显示数字或加号。
5. `ProfilePage.tsx` 的 `ProfilePageRow singleLine` 使用与首页同样的换行规则，去掉值的单行裁切。普通二级详情行仍保持最多两行的原规则。

对应测试与先红后绿：

| 项 | 测试名 | 实际结果 |
| --- | --- | --- |
| 1、5 | 新 `profile-rows.test.tsx`：`%s omits an empty value without changing the button label or minimum height`；`%s allows the complete value to wrap below the unshrinking title and keeps its accessible label`（menu/settings） | 改布局前 4 failed；实现后 4 passed。验证节点、布局属性、读屏与点击，不模拟 Yoga 原生几何。 |
| 2 | `home uses shorter empty injury copy only in %s`（en/zh）；更新 `profile menu preserves filled legacy values and supplies every empty fallback` 的首页空伤病预期 | 3 failed / 26 passed → 29 passed；同时断言原 injurySummary / injuryChips 文案不变。 |
| 3 | 将 `a failed refresh hides stale values while keeping identity and every destination available` 改为 `a failed refresh retains cached values and shows retry with every destination available`，旧两个 not.toContain 改为 toContain，并增加重试文案存在；新增 `secondary $Component.name retains cached content and exposes retry after refresh failure`（About/Health/Settings） | 4 failed / 36 passed → 40 passed；验证缓存值保留、重试入口与再次请求。 |
| 4 | `nonletter identity %s has no initials`（占位手机号、数字、符号、emoji、空串）；`phone or empty identity %s uses a noninteractive account icon` | 6 failed / 49 passed → 55 passed；空串纯函数分支原本已通过。原词语、CJK、邮箱首字母回归保持。 |

本轮仅迁移上述两类已被新口径替代的旧断言（首页无伤病文案；刷新失败隐藏缓存值），其余原断言保留。新增测试清理函数最初直接返回 `act()`，tsc 报 TS2322（DebugPromiseLike 不是 Jest callback 返回类型）；改为块体、不返回 act 值后 tsc 通过，并复跑全量 Jest / lint。

独立只读双轴复审：Standards 0 项、Spec 0 项遗留。上一轮“右值截断待 Opus 决定”已由本轮授权和新的整体换行口径解决，不再待决定。五项无未实装内容、无新增待产品决定项；原生小屏/大字体下的具体排版仍按卡交 Opus 在模拟器复看，组件测试不能替代该项。

最终检查输出如下（临时 `.codex-088-*.log` 在归档后删除）：

`npx jest --runInBand`，退出码 0：

```text

Test Suites: 159 passed, 159 total
Tests:       1381 passed, 1381 total
Snapshots:   0 total
Time:        37.404 s
Ran all test suites.
```

`npx tsc --noEmit`，退出码 0，原始 stdout / stderr 为空。收集器输出：

```text
tsc exit code: 0
```

`npm run lint`，退出码 0，原始输出：

```text

> meetpr-rn@1.0.0 lint
> expo lint
```

三条退出码分别保存为同名 `.exit`；`git diff --check` 通过。本轮最终增量含 JOURNAL 存 `/private/tmp/090-r1-final.diff`。未做项仅本轮原生实屏复验；无未完成的已授权代码项。
`git diff --check` 通过；`ProgressPageHeader` 只读字节核对通过；临时日志已删除。
