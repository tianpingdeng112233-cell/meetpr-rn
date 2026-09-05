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
| `src/features/training/TodayWorkoutView.tsx:82` | 🎉 今天你的；e1RM 突破! | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:86` | (此前 ${formatWeight(event.previousMaxE1RMKg)} kg) | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:87` | ,第一个纪录点 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:451` | 今日状态已填写 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:453` | 今日状态已跳过 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:464` | 刷新训练 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/TodayWorkoutView.tsx:472` | 今日休息；这天休息；看本周计划 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TodayWorkoutView.tsx:475` | 历史记录 · 不可修改；未到训练日 · 仅预览 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:83` | 上一段日期 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:87` | 下一段日期 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/TrainingCalendarView.tsx:97` | 月 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/training/WorkoutBody.tsx:59` | 下一组 · | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:124` | ${formatWeight(perSideKg)}kg 片 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:196` | 建议 · 同上组 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:208` | 建议 · 基于 e1RM ${formatWeight(e1RMKg)} | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/policy.ts:219` | 建议 · 上次重量 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/features/training/save-errors.ts:5` | 训练日已切换,本组无法保存。你的输入仍保留在本页,请刷新训练页后重新记录。 | missing: W1-d/W1-f 推进制复核卡重写,随卡消灭 |
| `src/navigation/BindGate.tsx:43` | 绑定申请尚未完成，请重新输入邀请码。 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:114` | 绑定教练 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:119` | 请输入邀请码 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:124` | 提交邀请码 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:125` | W1 接线 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:132` | 完成训练信息 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:133` | W1 接入学员 Onboarding。 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:140` | 等待教练确认 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:141` | 绑定申请处理中，请稍后查看。 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:147` | 暂时无法检查绑定状态 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
| `src/navigation/BindGate.tsx:148` | 请稍后再试。 | missing: 将被 W1-i / W1-g 分支替换,合并后消失 |
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
