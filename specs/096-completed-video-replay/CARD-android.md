# 卡 096-A · 安卓 RN 学员端：已完成训练回看视频

先读仓根 `CONTEXT.md`（有则读）、`AGENTS.md`，再读同目录 `SPEC.md`（正典，共识与口径不得改）和 `SCREENS.html`（已定稿屏幕稿，浏览器打开即可）。

## 目标
SPEC 共识 1–4 在安卓学员端落地：已完成训练日总结卡、训练记录页，有视频的组行尾显示播放图标，点开只读播放；被教练点评过的视频播放时右上角显示「教练已点评 ›」，点它跳到学员反馈详情 `src/app/(student)/feedback/[feedbackId].tsx`。

## 屏幕稿转写（一比一）
- 图标：MaterialCommunityIcons `play-circle-outline`，22pt，颜色浅灰 `#9CA3AF`（暗色 `#6B6B72`），点击区 ≥44pt（`spacing.minimumHitTarget`），放在组行最右；没视频的行不占位以外什么都不放。
- 总结卡（`WorkoutBody.tsx` 里 `completed-day-card` 的展开行）与训练记录页（`HistoryEntriesView.tsx` 的 `HistoryExerciseBlock` 每组行，含额外组/自加动作行）都加；其余布局、间距、文案不动。
- 播放器：复用训练中单组播放器（`video-upload/` 下现有组件），只读模式隐藏删除/重录/换片；可以用全屏 Modal 承载，左上角关闭，底部进度条和「动作 · 第 N 组 · 重量 × 次数 · RPE」信息行沿用现有。
- 「教练已点评 ›」：画面右上角胶囊标签，半透明深底白字（稿上 rgba(17,24,39,.72)，1px rgba(255,255,255,.18) 描边，高 30），文案走 i18n（zh-Hans 源，zh-Hant 用 094 的生成脚本产出，en「Coach reviewed」）。

## 口径
照 SPEC「口径」节：数据用 `videosRepository.list` 按 `set_log_id` 对应；上传中/失败沿用 `SetVideoUploadIndicator` 不出播放图标；「已点评」= 学员反馈列表中 `video_id` 匹配的条目，多条取最新；只有标记无反馈不算。不改后端，不新增接口。

## 文件范围
`src/features/training/WorkoutBody.tsx`、`src/features/training/video-upload/*`、`src/features/history/HistoryEntriesView.tsx`（及其 model/use-history 如需取视频）、新增一个纯函数文件（判定「已点评」与「某组可播视频」）、i18n 文案文件、对应 `__tests__`。超出此范围先停下在 JOURNAL 写明原因。

## 测试 seam（先红后绿）
照 SPEC「测试 seam」安卓部分：总结卡组件测试三例（有视频→图标、无→无、上传中→无）；判定纯函数单测；训练记录页一例；播放器只读一例。

## 验收
SPEC 验收清单 1–10 中安卓部分全部自测；Android 模拟器（AVD `meetpr`）用 fixture 截图：总结卡展开带图标、播放中带标签、训练记录页带图标、老账号第一屏。截图放 `docs/evidence/spec096-<日期>/`。全量 `npm test`、`npx tsc --noEmit`、lint 绿。

## 交付
JOURNAL 写 `docs/journal/2026-10-24-096-A.md`（做了什么、偏差、证据路径）。不 commit、不 push，留工作区给 Opus 收货。
