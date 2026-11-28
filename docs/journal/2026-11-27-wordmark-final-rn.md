# Android 定稿字标 · 2026-11-27

分支 `feat/wordmark-final`，基线 `origin/main@7e59646`。开工时已在指定 worktree 创建并删除临时文件，沿用已安装的依赖。

## 实装

- `MeetPRMark` 通过 `SvgXml` 渲染两份定稿 SVG 原文，按 2443∶605 等比缩放。`auto` 读取 `useTheme().scheme`，支持 App 内的主题设置。
- 成长、我的页头高 18 dp。字标比旧槽位矮 6 dp，间距从 14 调至 20 dp，大标题顶部仍在页头起点下方 38 dp。保留 `growth-header-mark`。
- AuthForm 高 23 dp，移除旧字号固定框。视频角标固定用深色背景版，高 21 × s，与左侧图标继续垂直居中。
- 删除旧的描边文字和 `wordmarkCounter`。品牌目录 README 已补充素材用途和各处尺寸。

## 验证

- 实装前运行 `npm test -- --runInBand --watchman=false MeetPRMark.test video-badge-overlay.test`。2 个套件中 5 项失败、5 项通过。旧组件没有渲染 SvgXml，视频角标仍传入旧字号和颜色。
- `npx tsc --noEmit` 通过，0 条诊断。`CI=1 EXPO_NO_TELEMETRY=1 npm run lint` 通过，0 错误、0 警告。
- 首轮全量 `npm test -- --watchman=false --maxWorkers=3` 有 217 个套件通过、13 个失败（2319 项通过、197 项失败），包括测试和初始化超时。两项字标相关套件已转绿。
- 全量 `npm test -- --runInBand --watchman=false` 有 229 个套件通过、1 个失败（2513 项通过、3 项失败）。剩余 3 项均在 `all-day-view.test.tsx` 超出 Jest 默认的 5 秒上限。
- 全量 `npm test -- --runInBand --watchman=false --testTimeout=30000` 通过。230/230 个套件、2516/2516 项通过，0 项失败。30 秒超时仅用于此次命令。
- `rg -n 'MEETPR' src` 只命中视频角标的无障碍标签及其测试。

## 文案记录

`src/i18n/catalog/CoachKit.json:2572` 的 `coach.profile.internalBeta` 中文为「内测」。`src/i18n/generated/search-zh.json:4635` 也含「内测」。两处均保留原文。

## 待收货

沙箱无 adb，按卡片约定跳过 Android 截图。成长、我的、登录注册和视频角标的实屏视觉验收留给收货环节。

## Opus 收货（2026-11-27）
- 读全量 diff：页头间距 14→20 抵消字标由 24 变 18，大标题位置不变；SVG 字符串与 docs/brand 逐字节一致（测试守护）。
- 演示模式 release 包（applicationId 改为 com.meetpr.app.wordmark 并排装，meetpr16@5570）实屏：成长、我的在 App 内设置「浅色/深色」下各截一张，字标浅深切换正确。截图见 `wordmark-final-rn-evidence/`。
- 未完成：视频角标未在 App 内亲眼看到。演示数据里本组视频的内嵌播放器不显示角标，带角标的播放器只在教练反馈/聊天分享视频里出现，演示数据没有这类视频。登录页因演示模式直接进主页，也未截到。
