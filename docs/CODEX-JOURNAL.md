# CODEX-JOURNAL

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
