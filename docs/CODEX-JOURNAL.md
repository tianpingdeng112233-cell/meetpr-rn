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
| `src/features/dashboard/model.ts:438` | 当前计划未生效,暂时不能顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:439` | 只能顺延今天的训练 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:440` | 今天的训练已经开始,不能顺延或撤销 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:441` | 只有计划所属学员可以顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:442` | 当前没有可撤销的顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:443` | 只能在顺延当天撤销,请联系教练调整计划 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:457` | 无法顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:460` | 当前计划暂不支持顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:462` | 顺延失败,请检查网络后重试 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:463` | 撤销顺延失败,请检查网络后重试 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
| `src/features/dashboard/model.ts:468` | 无法顺延；当前计划暂不支持顺延 | drift: 待 W1 复核卡处理；保留旧交互口径，不译。 |
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
