# 卡：相册视频裁剪一步导出上传规格，去掉按原片规格的硬转码（安卓 RN）

先读仓根 CONTEXT.md 与 CLAUDE.md（指向 AGENTS.md）。工作目录 = 本 worktree `/Users/david/Projects/apps/meetpr-rn-wt-album-export`（分支 `fix/album-single-pass-export`，基于 `origin/main@7a707ad`，即 CN 0.1.0(14) 的代码）。级别 T2，优先级 P1（目标下一个 CN 包）。

## 背景与证据

学员从相册选训练视频经常失败或卡很久。#188 只补了失败日志。排查结论（全文 `/Users/david/Projects/scratch/album-upload-audit-20261114/REPORT.md`，证据在同目录 `evidence/`）：

- 相册视频必经剪辑页，点保存一律走 `modules/training-video/android/src/main/java/com/meetpr/video/VideoTrimExporter.kt`，即使没裁剪：按**原片的视频格式、原码率、原分辨率**重编一遍，`setEnableFallback(false)`，任何降级都判失败；随后 `prepareTrainingVideo` 再用 react-native-compressor 转成 720p H.264。两次转码串联。模拟器实测 8 秒 1080p HEVC：裁剪 4 分 21 秒后压缩器才启动。4K60、10-bit HDR、杜比视界（`video/dolby-vision` 不是合法输出格式）在这一步最容易失败。
- 原片音轨格式被原样传给 `setAudioMimeType`：E-AC-3 音轨的素材保存后 6 秒即「Could not process video」，Transformer 尚未启动。与机型无关，已复现。
- 剪辑页预览播放器 `onError` 或缩略图失败会直接把整个选片判失败（4K60 HDR 素材在模拟器上复现），还没到导出。
- 紧凑模式（训练页组行里的录像按钮）失败文案渲染在组行内，把重量、次数挤掉（截图 `evidence/android-hdr-fail-row-layout.png`）。

## 目标

1. **裁剪直接产出上传规格，一次转码**。`VideoTrimExporter` 的输出改为：视频 H.264（`video/avc`）；显示长边 ≤1280，只降不升，保持宽高比与朝向；视频码率 = min(2 750 000, 源码率)，源码率未知时用 2 750 000；音频 AAC ≤128 kbps，源无音轨则输出无音轨；HDR 源压成 SDR。允许 Media3 的编码器降级（降级不再判失败），但成品必须满足下一条。
2. **成品命中直通**（2026-11-14 返修第 1 轮改拍：是目标，不是硬门槛）：导出件应让 `src/features/training/video-upload/passthrough.ts` 的 `passthroughEligibility` 返回 `passthrough`，从而 `prepareTrainingVideo` 不再调用压缩器；未命中时不判失败，由下游压缩器兜底。
3. **未裁剪且源已达标时不转码**：选区覆盖整段、且源本身已满足直通口径时，直接交付一份拷贝（保持现有的文件归属与清理语义），不启动 Transformer。
4. **保留现有正确性**：只编码选区内的帧；成品恰好一条视频轨、非空；成品时长不得超过所选时长 100ms 以上（下游有 120 秒硬门槛）；源有音轨则成品必须有音轨。原来的「显示尺寸必须与源一致」改为「宽高比与朝向一致」。
5. **预览失败不判死**：剪辑页预览播放器报错或缩略图生成失败时，页面保持可用（可拖选区、可保存），仅预览与播放按钮不可用；不新增文案。只有读不到时长 / 没有视频轨这类确实无法导出的情况才判失败。失败仍按现有诊断上报（`trim_preview` / `trim_thumbnails`），但不再终结会话。
6. **紧凑模式的失败提示移出组行**：`VideoAttachmentControls` 的 `cameraOnly` 分支不再在组行内渲染错误文字，改用系统 Alert 展示同一句现有文案（与 iOS #463 在录像页用系统弹窗的做法一致），按钮用现有的关闭文案 key。非紧凑模式不变。
7. **诊断码跟上**：新增或变化的失败路径沿用 #188 的 `video.<stage>.<code>` 码制与隐私约束（只发符号码 / 数值，不发 URI、文件名、原始 message、堆栈）；`VideoTrimErrorCode.kt` 的固定原因表与本卡新增的校验同步。

## 不做（Out of Scope）

选片期间 Activity 被系统回收后的结果找回（`getPendingResultAsync`）；选片后到剪辑页出现之间的等待提示；相机直拍路径；上传、分片、重试、通知；任何新增或改动的文案与 i18n key；后端；版本号、签名、发包；`PARITY.md` 以外的台账。

## 约束

- 交付红线：不得让已上线的相机直拍、已附视频的回看、上传与重试失效；`TrimSession` 对工作副本、缩略图、导出件的归属与清理语义不动；未送达视频的本机文件永不清理（见 CONTEXT.md「视频送达」）。
- 不加新依赖；Media3 版本不动（1.9.0）；不引入 FFmpegKit。
- 守仓内 lint 与 TypeScript 配置（以仓内配置为准）。
- 本机 gotcha 见 AGENTS.md（PATH、JAVA_HOME、ANDROID_HOME）。沙箱里 adb 不可用，不必尝试驱动模拟器；真机 / 模拟器验收由 Opus 收货时在 AVD `meetpr16`（5570）上做，`meetpr`（5556）不要碰。
- 本机磁盘只剩约 6G：不要清理本 worktree 之外的任何目录；空间不足就停下并在 JOURNAL 写明卡在哪。

## 测试 seam（先红后绿，只在这些边界加测试）

1. 原生纯函数（`modules/training-video/android/src/test/java/com/meetpr/video/`，与现有 `VideoTrimErrorCodeTest` 同层）：由源信息（宽、高、旋转、码率、是否 HDR、音轨格式）算出导出规格的函数——横拍 / 竖拍 / 带旋转标记、4K、小于 1280 不放大、奇数边取偶、源码率低于目标、码率未知；以及「是否可免转码」的判定；错误码表新增项。
2. `src/features/training/video-upload/__tests__/attachment-trim.test.tsx`（现有相册入口组件 seam，故障注入在原生适配器边界）：预览 `onError` / 缩略图失败后页面仍可保存且 `onOutcome` 不为 failed；紧凑模式失败走 Alert、组行内无错误文字。
3. `src/features/training/video-upload/__tests__/manager-attach.test.ts`（现有上传 manager seam）：裁剪成品满足直通口径时压缩器不被调用；诊断事件载荷不含路径与原始文案。

原生 Transformer 的真实编解码行为不在宿主测试里断言，由 Opus 收货时在模拟器上用固定素材实测。

## 验收

- 上述新测试先红后绿（JOURNAL 里各留一行红、一行绿的命令与结果）。
- `npm test` 全绿；`npx tsc --noEmit` 与 `npm run lint` 无新增错误；`./gradlew :training-video:testDebugUnitTest` 通过（磁盘允许时再跑 `assembleDebug`，跑不了写明）。
- `PARITY.md` 相应条目更新；JOURNAL 写 `docs/journal/2026-11-14-album-single-pass-export.md`：改了哪些文件、每个目标怎么实现的、测试命令与结果、已知遗留（尤其是没能在真机 HDR / 杜比视界素材上验证的部分要写明）。
- 不 commit、不 push、不开 PR（Opus 收货后做）。

## 返修第 1 轮（2026-11-14，Opus 收货）

收货进度：全量 Jest 2359 项、`tsc`、原生 Gradle 单测 6 项（`VideoTrimErrorCodeTest` 3 + `VideoTrimExportSpecTest` 3）本机复跑通过。模拟器实测尚未做（本机磁盘不足，出不了验收包）。以下两处需要改，其余不动。

1. **改卡 + Spec · 成品未命中直通不应判失败**。目标 2 原文「不满足才算失败」写得过死，现改为：**命中直通是目标，不是硬门槛**。`VideoTrimExporter.complete` 里 `require(trimOutputIsPassthrough(output))` 会让码率实测超过 3.5 Mbps 的成品直接失败；几秒的短视频以关键帧为主，实测平均码率很容易超出请求值，这会把原本能传的视频变成「无法处理」。要求：
   - Transformer 导出的成品只要通过其余正确性校验（单视频轨、非空、时长、音轨有无、SDR、未放大、宽高比与朝向）就正常交付；未命中直通时不报错、不上报，交给下游 `prepareTrainingVideo` 走现有压缩器兜底。
   - 整段拷贝快路不受影响（源已达标才会走）。
   - `OUTPUT_NOT_PASSTHROUGH` 这个原因随之不再产生，从 `VideoTrimErrorCode.kt` 与对应测试里移除。
   - 测试 seam：`manager-attach.test.ts` 补一条「裁剪成品未达直通口径（例如码率超限）→ 压缩器被调用且最终成功」；原生纯函数层如有以该原因为前提的用例一并调整。
2. **Spec（多做）· 缩略图失败不应关掉预览**。`useTrimSource` 在缩略图生成失败时 `setPreviewAvailable(false)`，把预览播放器也一起停了。缩略图失败只应让时间轴没有缩略图；只有播放器自身 `onError` 才停用预览与播放按钮。要求去掉这条联动，并在 `attachment-trim.test.tsx` 把对应用例改成：缩略图失败后预览与播放仍可用、可保存；播放器报错后预览停用、仍可保存。

验收：新增/调整的测试先红后绿；`npm test`、`npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过。**本轮不要运行任何 Gradle 任务**（本机磁盘只剩约 1G，原生单测由 Opus 复跑）。结果追加写在同一份 JOURNAL 末尾，`PARITY.md` 如有措辞变化同步。仍然不 commit、不 push、不开 PR。
