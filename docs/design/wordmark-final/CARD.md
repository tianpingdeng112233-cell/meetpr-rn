# 卡 RN：两端 App 定稿字标 · 安卓（meetpr-rn，worktree `/Users/david/Projects/apps/meetpr-rn-wt-wordmark`，分支 `feat/wordmark-final`，基于 origin/main@7e59646）

## 目标
把现行描边文字字标 `MeetPRMark` 换成定稿字标图形；视频角标字标换成暗色版。

## 文件范围
- `docs/brand/meetpr-wordmark-final.svg`、`docs/brand/meetpr-wordmark-final-on-dark.svg`（已放好，勿改字节）；`docs/brand/README.md` 补一节「字标」：两份文件用途、深浅对应、各处高度。
- `src/design/MeetPRMark.tsx`：改为用 `react-native-svg`（已在依赖中）渲染定稿 SVG。若 metro 没配 svg transformer，就生成一个 TS 模块导出两份 SVG 原文字符串用 `SvgXml` 渲染，并加测试断言该字符串与 `docs/brand/` 文件内容逐字节一致（防漂移）。新 props：`height`（必填或默认 18）、`variant?: 'auto' | 'onLight' | 'onDark'`、`testID`、`accessibilityLabel`；`auto` 跟随 `src/design/theme.tsx` 解析后的主题（含 App 内主题设置覆盖系统的情况），不要直接读系统 `useColorScheme`。宽 = 高 × 2443/605。删掉 `strokeColor`/`fillColor` 等旧 props。
- 调用方：`features/history/GrowthScreenHeader.tsx`、`features/profile/MyProfileHeader.tsx`（18 高，保留 testID `growth-header-mark`）；`features/auth/AuthForm.tsx`（23 高，删掉 `styles.wordmark` 那套按旧字号推算的固定框）；`features/video-player/VideoBadgeCard.tsx`（暗色版，`height = 21 * s`，s 为现有缩放系数；与左侧 `VideoBadgeLogoMark` 垂直居中如原）。`badge-palette.ts` 的 `wordmarkCounter` 等因此无用的 token 删掉。
- 不碰教练端界面、App 图标、启动屏 `splash-icon.png`。

## 验收标准
1. 成长、我的页头字标为定稿图形，18 高，浅色主题浅色版、深色主题暗色版；大标题位置不跳。
2. 登录注册页字标 23 高，浅深随主题。
3. 视频角标字标为暗色版，基准 21 高（随 s 缩放），比例不变形。
4. 全仓再无描边文字字标代码（`grep -rn "MEETPR" src` 只剩 accessibilityLabel 等非绘制用途）。
5. `npx tsc --noEmit`、`npm test`（jest）、lint 全绿。

## 测试 seam（先红后绿，越少越好）
- `MeetPRMark` 渲染测试：light 主题下渲染浅色版、dark 主题下渲染暗色版、`variant='onDark'` 在 light 主题下仍为暗色版；尺寸 height=18 时 width≈72.7。
- SVG 字符串与 `docs/brand` 文件一致性测试（若采用字符串模块方案）。
- 更新已有 `video-player/__tests__/video-badge-overlay.test.tsx` 中与旧字标相关的断言。
- 沙箱里 adb 不可用，安卓截图由 Opus 收货时做，你不用截。
