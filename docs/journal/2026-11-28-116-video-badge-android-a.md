# 116 Android 卡 A · 全屏回放角标与打点

分支 `feat/116-video-badge`，起点 `d7a8cd8`。开工时工作树干净，已在本目录创建、写入并删除临时文件。依据本仓 SPEC 和定稿 HTML、PNG 实装，当前为开发自测，待 AVD 收货。

## 改动文件

下表除聊天文件及本 JOURNAL 外，路径均相对 `src/features/video-player/`。

| 文件 | 变更 |
| --- | --- |
| `badge-presentation.ts`、`badge-palette.ts`、`VideoBadgeCard.tsx` | 内容收窄的角标、缺值布局、回放与外传形态。重量、次数、RPE 和动作名全空时返回空。 |
| `badge-wordmark.ts`（新增） | 保留指定 plain SVG 的原始路径。组件测试对照仓内 SVG 全文。 |
| `video-badge-layout.ts`（新增）、`VideoBadgeOverlay.tsx` | 按容器宽高换算位置与尺寸。卡片和收起圆盘共用左缘与底边。 |
| `FeedbackVideoPlayer.tsx`、`FeedbackVideoScrubber.tsx` | 对接全屏回放、最近刻度命中、拖动、选中与批注。普通聊天使用原有进度条样式。 |
| `marker-window.ts`、`FeedbackVideoMarkerCue.tsx`（新增） | 按播放位置关联点评，支持三行预览、全文、铅笔、淡入淡出与失败重试。 |
| `VideoBadgeScrim.tsx`（删除）、`FeedbackVideoWorkbenchPlayer.tsx` | 移除暗渐变及工作台对它的引用。工作台固定圆盘仍使用原尺寸与居中位置。 |
| `src/features/chat/conversation-model.ts`、`src/features/chat/ConversationScreen.tsx` | 删除聊天组快照的教练署名参数，保留已有快照字段兼容性。 |
| `__tests__/badge-presentation.test.ts`、`__tests__/video-badge-overlay.test.tsx` | 更新原测试边界，覆盖导出形态、三语组序、回放控件和重试。 |
| `__tests__/video-badge-layout.test.ts`、`__tests__/marker-window.test.ts`（新增） | 覆盖三种视频比例、矮横屏触控区和毫秒级时间窗。 |
| `docs/journal/2026-11-28-116-video-badge-android-a.md`（新增） | 本卡自测与交接记录。 |

## 红绿记录

逐项命令均在本 worktree 根运行。表中的参数追加在 `npx jest --runInBand --watchman=false --silent` 后。

| 卡片 seam / 命令参数 | 红 | 绿 |
| --- | --- | --- |
| 1 · `badge-presentation.test` | 2 项失败，旧模型仍给出教练字段，只有组序或教练名时仍返回对象。 | 15/15。含四种原型数据、仅 RPE、全空、非有限数、导出隐藏组序。 |
| 2 · `video-badge-layout.test` | 首轮缺少模块。另补 760×360 回放，原底距 56.25dp，达不到点评与触控所需的 80.75dp。 | 4/4。1080×1920、1920×1080、1080×1440 的导出比例依次为 2、1.125、1.5，左距 / 底距依次为 88 / 428、49.5 / 240.75、66 / 321。 |
| 3 · `marker-window.test` | 首轮缺少模块。 | 3/3。起始时刻包含，2400ms 排除，相邻点按时间顶替。空列表与暂停在窗内均覆盖。 |
| 4 · `video-badge-overlay.test` | 初轮 5 失败、3 通过。旧卡缺外传字标，暗渐变和列表仍在，刻度与重试入口缺失。另以 `-t 'leaving a selected'` 单跑，离窗后重看仍显示全文，预期三行。 | 12/12。覆盖默认展开、双向切换、换片重置、三语组序、刻度数、相邻命中、批注与点评互选、失败重试和离窗复位。 |
| 5 · `src/features/video-player/__tests__/workbench-player.test.tsx` | 实装前基线 5/5。这项是保留断言的回归检查。 | 实装后仍为 5/5，含固定圆盘、无导出按钮、原播放和调速行为。 |

五个 seam 合跑命令为 `npx jest --runInBand --watchman=false --silent 'src/features/video-player/__tests__/(badge-presentation|video-badge-layout|marker-window|video-badge-overlay|workbench-player).test'`，5 套、39 项全过。`npx tsc --noEmit` 和 `npm run lint` 均退出 0。

最终全仓运行 `npx jest --runInBand --watchman=false --silent`，234 套、2549 项全部通过（65.031 秒），含相机录制、上传、工作台与已完成训练回看回归。

## 给卡 B 的接口与本卡取舍

- 卡 B 可用 `videoBadgeLayout(width, height, 'export')` 取得 `scale`、`left`、`bottom`。传入含方向的渲染尺寸，三者使用同一长度单位。用 `<VideoBadgeCard info={info} form="export" scale={scale} />` 渲染内容。卡片自适应宽度，由调用方定位和处理位图像素密度。
- 回放以原型 150u 底距为基准。矮横屏或较大系统字号下，优先容纳最多三行点评和 44dp 触控区。卡片的位置与打点数量无关。遇到较高点评时可用进度条的下边距，后续短点评保留已用过的高度。选中时解除三行截断，超出可用空间的全文可以滚动。
- 现有全屏面板代码只提供加载失败文案。接入已有 `onMarkersRefresh` 并复用 `chat.retry`，三种语言沿用现有词条。工作台画面外的列表未改动。
- SPEC 与卡 A 没有待决产品问题。原型采用一行短点评，矮屏和多行情况按 SPEC 的触控、全文和角标位置要求处理。

## 验收边界

| SPEC 项 | 本次证据与待验 |
| --- | --- |
| 1–4 | 已核对字标、几何、数据形态和 App 无暗渐变。亮暗视频可读性、实际卡宽、截断、横拍占高及导出像素待设备与卡 B。 |
| 5–8 | 烧录、录完存相册、原片回退、回放保存按钮及录完预览归卡 B，本次未实装或验收。 |
| 9–10 | Jest 覆盖时间窗、双刻度最近命中、跳转、批注、失败反馈与重试回调。原生触摸、淡入淡出、TalkBack 和联网重试成功待设备实测。 |
| 11 | 无角标普通聊天的组件回归通过，模拟器外观待验。 |
| 12 | 未用历史账号做升级、首屏、旧视频回放与相册内容核验。 |
| 13 | 英文、简中、繁中组序文本通过组件测试。三语字体、超长动作名与多行点评的实际排版待验。 |

沙箱无 adb，本卡按约定将 Android 视觉、触控与升级验收留给收货方的 AVD `meetpr16`（5570）。未添加依赖、视频、截图或用户数据，未提交或推送。
