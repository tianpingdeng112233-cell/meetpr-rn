# 卡 B：spec 116 带角标存相册（安卓 RN + 原生）

先读仓根 CONTEXT.md 与 CLAUDE.md（指向 AGENTS.md），再读 `specs/116-video-badge/SPEC.md`、同目录 `approved-prototype.html`，以及卡 A（`docs/cards/2026-11-28-116-video-badge-android-a.md`）和它的 JOURNAL。SPEC 是验收范围的唯一依据；冲突以 SPEC 为准并在 JOURNAL 里指出。

工作目录 = 本 worktree `/Users/david/Projects/apps/meetpr-rn-wt-116-video-badge`（分支 `feat/116-video-badge`，卡 A 的改动已在工作树里）。级别 T2，P2（目标再下一个 CN 包）。不 commit、不 push、不开 PR。JOURNAL 写到 `docs/journal/2026-11-28-116-video-badge-android-b.md`。

## 本卡范围

SPEC 第二节的「外传视频」「录完预览页」与第三节全部（录完存相册、回放页存相册）。安卓此前完全没有带角标的视频，这是新能力。

## 现状落点（origin/main，开工先核实）

- 原生模块 `modules/training-video/android/src/main/java/com/meetpr/video/`：`TrainingVideoModule.kt`、`VideoTrimExporter.kt`（Media3 Transformer 1.9.0，已有 `Effects` 列表、HDR 重试阶梯与音轨降级），JS 封装 `src/features/training/video-upload/trim-native.ts`。Gradle 只声明了 media3-common 与 media3-transformer。
- 录制 `src/features/training/video-upload/CameraRecorder.tsx`：拿不到这一组的数据；调用方 `VideoAttachmentControls.tsx` 有 `badge`（约第 36 行）但没往下传。保存顺序：选区变了才 `trim` → `own` → 开关开着就 `MediaLibrary.Asset.create(output)` → `onUse(output, savedToPhotos)`。开关键 `training.video.saveToPhotos.v1`。
- 回放：`SetVideoPlayer.tsx`、`FeedbackVideoPlayer.tsx`（全屏）、`VideoPlayback.tsx`、`CompletedVideoReplay.tsx`。现在没有任何存相册按钮；`workbench-player.test.tsx` 断言工作台没有 `feedback.video.export`。

## 要做的事

1. **原生烧录**：在 `TrainingVideo` 模块新增一个导出方法（与 `trim` 并列，名字自定），输入视频 URI 与一张已渲染好的角标位图及其在画面上的位置，输出带角标的新文件。用 Media3 的叠加效果（`OverlayEffect` + 位图叠加）在一次转码里完成；保持分辨率、方向、时长与音轨；沿用现有 HDR 重试与音轨降级思路；支持取消。需要 `media3-effect` 就显式声明同版本依赖。
2. **角标位图只有一个排版来源**：位图必须由卡 A 的 `VideoBadgeCard` 外传形态渲染得到，按卡 A 的几何纯函数换算尺寸与位置。**禁止在 Kotlin 里另写一套排版。** 把 RN 视图转成位图的做法自选（已有依赖能做就用；确需新增依赖，只允许一个，并在 JOURNAL 写明理由、体积与许可证）。
3. **录完存相册**：把 `badge` 从 `VideoAttachmentControls` 传进 `CameraRecorder`。预览页显示卡片（不可收起）。点「使用视频」：`onUse` 与返回训练页不等待烧录；开关开着且角标有内容时后台烧录并把带角标版存进相册，失败、取消、中断都改存原片；开关关着不存；角标无内容时按现状存原片。交给 `onUse` 的始终是原片；烧录期间源文件不得被清理，烧录产生的临时文件用完即删。`savedToPhotos` 的现有语义与提示不要被破坏（需要调整就在 JOURNAL 说明新语义）。
4. **回放页存相册**：学员全屏回放带角标的视频时，顶栏加「存到相册」按钮（下载箭头，testID `feedback.video.export`）。点击后生成带角标版（此时带 RPE）并存相册，进行中显示转圈且不可重复点，成功提示复用现有「已存到相册」类文案 key。远程视频先落到本地缓存再烧录。教练工作台与教练端页面不出现这个按钮。
5. **冻结后台的机型**：部分国产机型会冻结后台进程。保证的是结果不变量：开关开着时，相册里最终要么是带角标版、要么是原片，不能两者都没有；不需要为此引导用户改系统设置。

## 约束

- 交付红线：不丢用户数据、不让已上线功能失效。相机录制、裁剪、相册选片、上传与重试、未送达视频的本机文件保留语义（见 CONTEXT.md）都不变。
- Media3 版本不动（1.9.0）；不引入 FFmpegKit。
- 仓库公开：不得提交真实训练视频或带真人的截图；测试只用合成或已有的测试素材。
- 本机 gotcha 见 AGENTS.md。沙箱里 adb 不可用；模拟器验收由 Claude 收货时在 AVD `meetpr16`（5570）上做，`meetpr`（5556）不要碰。

## 测试 seam（先红后绿，只在这些边界加测试）

1. 原生纯函数（`modules/training-video/android/src/test/java/com/meetpr/video/`，与现有测试同层）：由视频显示尺寸、旋转与角标位图尺寸算出叠加位置与缩放的函数——竖拍、横拍、带旋转标记、3:4。
2. `src/features/training/video-upload/__tests__/camera-review.test.tsx`（现有 seam，在原生适配器边界注入）：开关开→存进相册的是烧录产物、`onUse` 拿到的是原片且不等待烧录；烧录失败→存原片；开关关→不存；角标无内容→存原片。
3. 回放页：全屏学员回放有 `feedback.video.export`，点击后调用烧录与保存并出现成功提示；`workbench-player.test.tsx` 的「没有该按钮」断言保持通过。

## 验收（Codex 自测只算开发的一部分）

`npx tsc --noEmit`、lint、相关 jest 用例、原生单元测试（`./gradlew :training-video:testDebugUnitTest` 或仓内等价命令）全绿，并贴出命令与结果摘要。能编出调试包就编一次确认原生代码可编译。没做到的逐条写进 JOURNAL，不要写成已验证。
