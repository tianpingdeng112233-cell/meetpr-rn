# Spec 084 卡 C（安卓）· 收货记录 · 2026-10-03

卡：[CARD-C-android](../specs/084-walkthrough-polish/CARD-C-android.md)，口径见同目录 SPEC「设计定稿」§7–§10。RN 基线 `d96de06`（PR #70 顶）。实装方 Codex，收货方 Opus，返修 2 轮。

环境：AVD `meetpr`（Android 15）+ 本地合成 API 与合成账号，debug 签名 fixture 包；相册里放了合成的 8 秒样片。Light / Dark 都看过。未做真机验证，未在 Global 真账号上验证。

## 逐项结论

| 验收项 | 结论 | 证据 |
|---|---|---|
| §7 Ask coach 选组 | 通过。训练页入口预选当前组；按动作分组的三列格子，可改选；问题输入；底部复述 "Sends Set 2 of Squat with your question"；一步发送 | [截图](evidence/spec084c-20261002/ask-coach-picker-dark.png) |
| §8 聊天训练卡 | 通过。新发消息是一个气泡：问题在上、附件行在下；历史上只发组没写话的消息只显示附件行，不留空白；气泡下 `时间 · Delivered` | [截图](evidence/spec084c-20261002/chat-set-bubbles-dark.png) |
| §9 原地播放 | 通过（返修 2 轮后）。内嵌：播放 / 暂停、细进度条、四档倍速向上展开收起、放大。放大：铺满整屏，顶部条为动作名与 `Set 2 · 152kg × 5 · RPE 8`；返回键先缩小；放大与缩小都不重新加载，播放中保持播放，进度与倍速保持，缩小后页面停在播放器处 | [倍速](evidence/spec084c-20261002/inline-player-speed-menu.png)、[放大与缩小](evidence/spec084c-20261002/expanded-and-shrunk.png) |
| §10 休息说明 | 通过。清空数据后首次记组弹出；2 / 3 / 4 min 与默认规则一致；Got it 关闭；链接进入 Rest between sets | [截图](evidence/spec084c-20261002/rest-explanation-sheet.png) |

## 返修

1. 第 1 轮：放大 / 缩小时播放器被重新挂载（放大态黑屏加载图标，缩小后内嵌位置也重新加载，页面滚回顶部）。改为同一个播放实例。
2. 第 2 轮：放大层被限制在组录入页的滚动区域里，只占屏幕上方约六成，下面露出上传状态与 Complete set，顶部信息条缺失。改为铺满整屏并补上信息条。

## 没验到的

- 教练端会话页的同一条气泡（未用教练账号走）。
- 360×640 dp 与字体 1.3×。
- 上传在本地合成 API 上必然失败，状态行只看到 Upload failed / Could not process video；Change 文案沿用现有（设计稿写的是 Replace，两端一致保持 Change）。
- jest 全量首轮有过一次 1 个用例偶发失败，之后连续 5 次全绿，未定位到具体用例。

## 自动检查

收货方复跑：`npx jest --runInBand` 141 suites / 1019 tests、`npx tsc --noEmit`、`npm run lint` 通过。
