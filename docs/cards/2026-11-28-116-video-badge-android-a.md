# 卡 A：spec 116 视频角标新样式 + 打点上进度条（安卓 RN）

先读仓根 CONTEXT.md 与 CLAUDE.md（指向 AGENTS.md），再读 `specs/116-video-badge/SPEC.md` 与同目录 `approved-prototype.html`（配图 `approved-prototype.png`）。SPEC 是验收范围的唯一依据，本卡只补安卓的落点与约束；二者冲突以 SPEC 为准并在 JOURNAL 里指出。

工作目录 = 本 worktree `/Users/david/Projects/apps/meetpr-rn-wt-116-video-badge`（分支 `feat/116-video-badge`，基于 `origin/main`）。级别 T2，P2（目标再下一个 CN 包，不进下一个）。不 commit、不 push、不开 PR（由 Claude 收货时做）。JOURNAL 写到 `docs/journal/2026-11-28-116-video-badge-android-a.md`，写明每条测试先红后绿的证据、未做与未验的项。

## 本卡范围

SPEC 第一节（卡片样式）、第二节里的「App 内回放」、第四节（打点上进度条）。**不做**：把角标烧进视频、录完存相册、回放页存相册按钮、录完预览页显示角标——这些在卡 B，本卡结束后接着派。

## 现状落点（origin/main，开工先核实）

- 卡片：`src/features/video-player/VideoBadgeCard.tsx`、`badge-palette.ts`、`VideoBadgeLogoMark.tsx`；呈现模型 `badge-presentation.ts`（`presentBadge`）；展开收起 `VideoBadgeOverlay.tsx`（卡宽 `width*468/540`，居中，收起为 44 的圆盘）；暗渐变 `VideoBadgeScrim.tsx`。
- 全屏播放器 `FeedbackVideoPlayer.tsx`：视频 → `VideoBadgeScrim` → 顶栏 → 播放键 → `VideoBadgeOverlay` → `FeedbackVideoMarkerPanel`（黑 72% 底、列表最高 190）→ 进度条 `FeedbackVideoScrubber.tsx`（自绘轨道，不画打点）。打点面板显隐由 `src/features/feedback/markers-outcome.ts` 的 `markerPanelVisible` 决定。
- 教练工作台 `FeedbackVideoWorkbenchPlayer.tsx`（角标固定收起）与 `coach/video-feedback/VideoFeedbackScreen.tsx` 里画面外的打点列表：**本卡不改它们的布局与行为**；只在删除暗渐变时同步去掉引用。
- 字标：`src/design/MeetPRMark.tsx` + `wordmark-artwork.ts`（#226 换成了带金章的定稿）。字体：`font.body` = IBM Plex Sans，`font.mono` = IBM Plex Mono。

## 要做的事

1. **卡片**：按 SPEC 第一节重写 `VideoBadgeCard`。删除 `VideoBadgeScrim`、金色 RPE 胶囊、教练名一行（`includesCoachAttribution` 一并删）。字标用 `docs/brand/meetpr-wordmark-plain-on-dark.svg` 的原始路径数据（放进 `wordmark-artwork.ts` 或角标专用文件，不重画）；`MeetPRMark` 在页头等处的用法不动。数字用 `font.body` 的 500 / 600。
2. **两种形态**：外传形态无组序；App 内形态带「第 N 组」。用一个明确的 prop 区分（卡 B 会用外传形态出图），不要靠隐含条件。
3. **版式几何纯函数**：新增 `scale = min(宽, 高×9/16)/540` 及卡片位置的纯函数（外传：左 44、底 214），App 内与卡 B 共用。
4. **App 内位置与收起**：按 SPEC 第二节。卡片与圆盘靠左；底边在进度条之上并为浮出点评留一行，有无打点位置不变；默认展开。
5. **打点上进度条**：按 SPEC 第四节。全屏播放器不再渲染 `FeedbackVideoMarkerPanel`；原有能力（点一条 = `selection.select(marker)`、带批注显示铅笔、加载失败提示与重试）迁到刻度与浮出点评上；现有 testID 尽量保留在等价控件上。新增打点时间窗纯函数。
6. **字符串**：不新增用户可见文案；三种语言下不截断。

## 约束

- 交付红线：不让已上线功能失效。普通聊天视频、教练工作台、已完成训练回看、相机录制与上传的行为不变。
- 不加新依赖。守仓内 lint 与 TypeScript 配置。
- 仓库公开：不得提交真实训练视频或带真人的截图。
- 本机 gotcha 见 AGENTS.md（PATH、JAVA_HOME、ANDROID_HOME）。沙箱里 adb 不可用，不必尝试驱动模拟器；模拟器验收由 Claude 收货时在 AVD `meetpr16`（5570）上做，`meetpr`（5556）不要碰。

## 测试 seam（先红后绿，只在这些边界加测试）

1. `src/features/video-player/__tests__/badge-presentation.test.ts`：四种数据状态、外传形态无组序、全空不显示。
2. 新增版式几何纯函数测试：1080×1920、1920×1080、1080×1440 下的 scale 与卡片位置。
3. 新增打点时间窗纯函数测试：2.4 秒边界、相邻打点顶替、空列表、暂停在窗内。
4. `video-badge-overlay.test.tsx`（现有组件 seam）：有角标的播放器不再渲染暗渐变；默认展开、点击收起再展开；带打点时进度条出现与打点数相同的刻度、不再出现打点面板；点刻度触发与原列表行相同的选中。原来断言暗渐变与居中半宽卡片的用例按新规格改写。
5. `workbench-player.test.tsx` 现有断言（含没有 `feedback.video.export`）保持通过。

## 验收（Codex 自测只算开发的一部分）

`npx tsc --noEmit`、lint、相关 jest 用例全绿，并贴出命令与结果摘要。没做到的逐条写进 JOURNAL，不要写成已验证。
