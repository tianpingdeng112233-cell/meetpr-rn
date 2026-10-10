# 卡:MEETPR 字标三处统一(T0)

先读仓根 `AGENTS.md`(本仓无 CONTEXT.md)。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-wordmark`,分支 `fix/wordmark-unify`(基于 `main@aeb1020`)。

## 背景

仓里有三处各画各的 MEETPR 字标,字距口径不一:

| 位置 | 文件 | 现状 |
|---|---|---|
| 学员四个 Tab 页头 | `src/features/dashboard/MeetPRMark.tsx` | 字距 0、无 R 额外重叠(9/25 `7716eb5` 调过) |
| 登录/注册/找回密码 | `src/design/MeetPRMark.tsx`(经 `AuthForm.tsx`) | 字距 -0.11em、R 再收 -0.13em,字母互相咬合 |
| 视频角标卡 | `src/features/video-player/VideoBadgeCard.tsx` 内联 SVG | 字距 -1.76、R `dx=-2.08`,同样咬合 |

David 2026-10-09 拍板:**以页头那版为准**,三处同一口径。

## 目标

三处用同一个字标组件,画法 = 现页头版:`viewBox 0 0 97 24`、`x=3 y=18`、16 号 display black、`letterSpacing=0`、整串 `MEETPR`(不拆 TSpan)、描边 5.12 圆角连接、上层反色填充。

## 文件范围

- `src/design/MeetPRMark.tsx`:改成唯一实现。入参至少覆盖:`testID`、尺寸(按 16 号等比缩放)、描边色与填充色(默认 `colors.textPrimary` / `colors.bgBase`)、可选 `accessibilityLabel`。
- `src/features/dashboard/MeetPRMark.tsx`:删除;`DashboardScreen`、`TodayWorkoutView`、`MyProfileHeader`、`GrowthScreenHeader` 改从 `@/design` 引入。
- `src/features/auth/AuthForm.tsx`:继续 15 号。
- `src/features/video-player/VideoBadgeCard.tsx`:内联 SVG 换成组件,颜色仍用 `palette.ink` / `palette.wordmarkCounter`,高度仍 `16 * s`,保留 `accessibilityLabel="MEETPR"`。
- 对应测试文件。

## 约束

- 页头四处渲染结果不得变化(尺寸、97×24 槽位、testID `dashboard-mark` / `growth-header-mark`)。
- 登录页标题与字标的相对位置不动:字标外框高度保持现值(`fontSize / 0.34`)、字形在框内垂直居中、左对齐,只换字形画法。
- 角标卡布局不动(宽 `97/24*16*s`、高 `16*s`)。
- 不新增依赖、不改原生、不改文案、不动 iOS 仓。不改 `PARITY.md`(由 Opus 收货后定稿)。
- 不 commit、不 push。

## 测试 seam(先红后绿)

组件渲染层一处即可:新增 `src/design/__tests__/MeetPRMark.test.tsx`,断言默认、登录(15 号)、角标(自定义颜色)三种用法下,两层 SvgText 的 `letterSpacing` 均为 0、子节点是整串 `MEETPR` 且不含 TSpan;角标用法颜色取自入参。再在 `VideoBadgeCard` 现有测试里加一条:卡内不再出现 `letterSpacing={-1.76}` 的 SvgText。

## 验收标准

1. 全仓 `grep -rn "MEETP<" src` 无结果;`src/features/dashboard/MeetPRMark.tsx` 不存在。
2. `npm test -- --runInBand`、`npm run lint`、`npx tsc --noEmit` 全绿,新测试改前红、改后绿(JOURNAL 里贴红的那次输出一行)。
3. 页头既有测试不改断言即通过。

## 交付

`docs/CODEX-JOURNAL.md` 追加一节(改了什么、三条命令的结果数字、未覆盖项)。实屏(登录页、角标卡、四个页头,浅/深色)由 Opus 在模拟器收货。
