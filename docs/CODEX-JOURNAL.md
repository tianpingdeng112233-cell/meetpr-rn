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
