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
