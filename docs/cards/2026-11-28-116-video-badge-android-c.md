# 卡 C：spec 116 终审修复 + 圆盘放大（安卓 RN）

先读仓根 CONTEXT.md 与 CLAUDE.md（指向 AGENTS.md），再读 `specs/116-video-badge/SPEC.md`（第一节第一行与第三节硬约束刚更新过）、卡 B 及其 JOURNAL（`docs/journal/2026-11-28-116-video-badge-android-b.md`，含两轮返修与 Claude 收货记录）。

工作目录 = 本 worktree `/Users/david/Projects/apps/meetpr-rn-wt-116-video-badge`（分支 `feat/116-video-badge`，卡 A、B 已提交）。T2，P2。不 commit、不 push。JOURNAL 写到 `docs/journal/2026-11-28-116-video-badge-android-c.md`。工作树里的 `android/` 是 Claude 的验收产物，不要删。

## 背景

卡 B 两轮返修后，Claude 在模拟器 meetpr16 上验过：冷启动、录完预览页角标、录完存相册（恰好一条带角标视频）、学员组视频展开态的新角标卡与收起、回放页存相册（转圈 → 已保存 → 相册新增一条）。独立终审又查出下面三处必须在合并前修；另外 David 追加了一处视觉调整。

## 要做的事

1. **学员看教练反馈视频时「存到相册」失败**。`FeedbackPlaybackModal.tsx` 把带 `allowGalleryExport` 的 `FeedbackVideoPlayer` 放在 RN `Modal` 里，而 `FeedbackVideoPlayer` 内没有角标截图宿主，截图走到弹窗后面的根宿主，5 秒超时后提示 Export failed（与返修第 2 轮在 `SetVideoPlayer` 上证实的是同一类问题）。把截图宿主放到这个播放器里（复用 `BadgeCaptureHost` 的做法），并排查其它在 Modal 或独立窗口里出现下载按钮的入口，一并修齐。带测试：在「只有前台弹窗收到布局」的条件下导出成功。

2. **烧录超时的计时起点太早**。现在 max(60 秒, 4×片长) 从预留相册条目时开始算（`gallery-save.ts` 约 92–97 行、原生 `armDeadline`），等组记录同步、上传压缩、排队的时间都被算进去：弱网或离线时 10 秒的片子 60 秒后直接发布原片，带角标版永远不生成。改为从烧录任务真正开始时起算。等待阶段仍要有保底：Activity 暂停、失败、取消照样发布原片；另给整个等待加一个宽松的总上限（建议 10 分钟，可注入），防止永远挂着。带测试：等待 90 秒后才开始的烧录仍能产出带角标版；等待阶段暂停时发布原片一次。

3. **「使用视频」被上一段视频的后台任务拖住**。裁剪进了与压缩、烧录共用的串行队列（`CameraRecorder.tsx` 里 `videoTranscodes.enqueue`）：刚存完 A 马上裁剪 B 并点 Use，Use 要等 A 的压缩和烧录结束。SPEC 第三节已写明：「使用视频」及其裁剪永远不排在别的视频的后台处理之后；需要抢占时后台烧录让路、稍后重做。实现要求：
   - 用户在等的任务（录制后的裁剪、相册选片的裁剪）立即执行，不排队等后台任务。
   - 后台烧录可被抢占：有用户任务进来时取消正在跑的烧录，等用户任务结束后从头重做；被抢占不算失败，不发布原片（相册保底仍由预留机制负责：暂停、总上限到期才发布原片）。
   - 上传压缩与用户裁剪是否互斥按现有（卡 B 之前的）行为处理，不要引入新的等待；如果压缩当前会被取消后重跑，保持原样。
   - 任何一个被取消的任务不返回时，队列不得卡死：给排队环节加竞争取消或超时。
   带测试：A 的烧录进行中发起 B 的裁剪 → B 立即开始、A 的烧录被取消并在 B 结束后重做、相册里 A 最终恰好一条；被取消的任务永不 settle 时后续任务仍能执行。

4. **圆盘放大（David 2026-11-28）**。角标卡第一行的橙色圆盘占位从 23u 改为 27u（图标自带留白，这样橙色部分与字标等高），与字标间距从 7u 改为 6u；行高仍是 23u，圆盘上下各溢出 2u，卡片高度和其它行位置不变。收起态的大圆盘不变。同步更新断言了 23/7 的测试。

## 约束

- 交付红线不变：`onUse` 与上传始终拿到原片且不等待；开关开着时相册恰好一条（带角标版或原片），不为零、不为二；未送达视频的本机文件保留语义不动。
- 不加新依赖；Media3 保持 1.9.0。
- 只改上面四项，不顺手重构。原生单测必须能在真正的 Gradle 单测任务下编译（只用 Android 单测类路径上有的 API）。
- 沙箱里 adb 与 Gradle 不可用；设备验收与 Gradle 复跑由 Claude 做。

## 测试 seam

沿用卡 B 的 seam：`camera-review.test.tsx`、`replay-gallery.test.tsx`、`set-video-player.test.tsx`、`video-badge-overlay.test.tsx`、原生 `GalleryPublicationTest.kt` 及同层单测。每项先红后绿。

## 验收

`npx tsc --noEmit`、`npm run lint`、全量 jest 全绿并贴结果；原生单测用你能用的方式跑并写明「需 Claude 用 Gradle 复跑」。没做到的逐条写进 JOURNAL。
