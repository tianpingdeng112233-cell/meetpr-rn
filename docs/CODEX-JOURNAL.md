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
