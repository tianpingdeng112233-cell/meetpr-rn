# 相册单次导出上传规格 · 实装记录

- 日期：2026-11-14。任务源：[任务卡](../cards/2026-11-14-album-single-pass-export.md)。
- 分支：`fix/album-single-pass-export`；HEAD 保持 `7a707ad`。Claude 委派实现，不 commit、不 push、不开 PR。
- 已读 CONTEXT、CLAUDE→AGENTS、PLAN、相关历史诊断 JOURNAL、排查报告及 Expo SDK 57 文档；仓内无 FOLLOWUPS.md 或更近的 AGENTS.override.md。
- **状态：代码实装与 JS 自检完成；正式 Gradle 单测因沙箱权限受阻，原生/设备验收未完成，不能记为收货通过。**

## 逐目标实现

1. **一次导出上传规格**：新增 `VideoTrimExportSpec.kt`，按显示方向计算长边 ≤1280 的偶数尺寸，只降不升；H.264，视频目标码率 `min(2750000, 源码率)`，未知/非正值用 2750000。AAC 请求 96000bps，为编码器实际平均码率留余量，成品仍按 ≤128000bps 验收。无音轨只建 video sequence；HDR（PQ/HLG 或 Dolby Vision MIME）显式请求 OpenGL tone mapping 到 SDR。开启编码器 fallback，移除“降级即失败”回调。
2. **成品直通自检**：导出后重新 inspect 视频/音频，按 `passthrough.ts` 的实际 MediaExtractor MIME、尺寸及码率门槛检查。`VideoTrimMedia.trackBitrate` 同时供 `TrainingVideoModule.readTracks` 使用，保留 Double 精度和未知值语义，避免原生自检与 JS 读取使用不同口径。manager / prepareTrainingVideo / passthrough.ts 的生产逻辑无需修改；新测试验证符合规格的横屏、竖屏、有声、无声导出件不调用压缩器。
3. **整段达标拷贝**：选区为完整源时长、单视频轨、SDR 且已达直通规格，worker 直接复制到独立 `training-trim-<UUID>.mp4`，不创建 Transformer。副本同样经过成品自检。复制逐块检查中断，取消后的晚到错误清理副本；不会删除已成功交付文件。
4. **原有正确性**：裁剪仍使用 ClippingConfiguration，强制 videoNeedsEncoding，保留只编码选区帧的路径。检查非空、恰好一条视频轨、时长与选区相差 ≤100ms、有声源不丢音轨、无声源不添音轨、成品 SDR、不放大；显示尺寸一致改为宽高比/方向一致，允许偶数边和编码器对齐带来的短边 2px 误差。TrimSession 与工作副本、缩略图、导出件的归属协议未改。
5. **预览失败不终结**：独立相册页由有效源信息决定可编辑/可保存，播放器加载只决定播放按钮。播放器错误或缩略图失败停用视频预览/播放按钮，保留拖选与保存；保存中的预览失败不取消导出。保留 `trim_preview` / `trim_thumbnails` 诊断，重复播放器错误只上报一次；无时长/非单视频轨仍失败。CameraRecorder 的 review 模式原有 fallback 未改。
6. **紧凑失败 Alert**：cameraOnly 分支删除组行错误 Text；showActionError 改用系统 Alert，正文及关闭按钮分别沿用既有错误文案和 `student.cameraRecorderView.copy005`。非紧凑模式保持原文案渲染。
7. **诊断同步**：新增 `OUTPUT_NOT_PASSTHROUGH`、`ASPECT_RATIO_CHANGED`、`OUTPUT_UPSCALED`、`HDR_NOT_SDR`、`UNEXPECTED_AUDIO` 原因；移除不再产生的 BITRATE_UNKNOWN / DIMENSIONS_CHANGED / FORMAT_FALLBACK。组件 seam 覆盖新增导出错误码进入既有事件队列，manager seam 验证诊断无路径、原始 message/stack 且失败仍保留本机文件。

## 修改文件

- `modules/training-video/android/src/main/java/com/meetpr/video/`：新增 `VideoTrimExportSpec.kt`；修改 `VideoTrimExporter.kt`、`VideoTrimMedia.kt`、`VideoTrimErrorCode.kt`、`TrainingVideoModule.kt`。
- 同模块 `src/test/java/com/meetpr/video/`：新增 `VideoTrimExportSpecTest.kt`，更新 `VideoTrimErrorCodeTest.kt`。
- `src/features/training/video-upload/`：`VideoTrimView.tsx`、`useTrimSource.ts`、`VideoAttachmentControls.tsx`。
- 同目录 `__tests__/attachment-trim.test.tsx`、`__tests__/manager-attach.test.ts`。
- 台账仅 `PARITY.md` 与本 JOURNAL；任务卡原已存在且未修改。未改依赖、版本、文案/i18n、上传重试或后端。

## 红 → 绿证据

只在卡内指定 seam 增改测试。原生 Gradle 无法启动，因此原生新增测试使用本机缓存 Kotlin compiler / JUnit / Android SDK / Media3 1.9.0 直接编译运行；这不是 Gradle task 的替代通过记录。辅助执行器位于 `/tmp/album-native-tests.py`，输出 `/tmp/album-native-check/`，未加入项目依赖。

| 切片 | 红：命令与结果 | 绿：命令与结果 |
| --- | --- | --- |
| 预览/缩略图故障 | `npm test -- --runInBand src/features/training/video-upload/__tests__/attachment-trim.test.tsx`：3 failed / 55 passed；预览导致会话关闭、保存中导出被取消、缩略图失败仍保留预览。`/tmp/album-ui-red.log` | 同命令：58 passed。`/tmp/album-ui-green.log` |
| 紧凑 Alert | 同组件命令：2 failed / 58 passed；Alert 未调用。`/tmp/album-alert-red.log` | 同命令：60 passed。`/tmp/album-alert-green.log` |
| 原生规格 | `python3 /tmp/album-native-tests.py`：新增规格函数尚不存在，测试编译报 unresolved reference。`/tmp/album-native-pure-red1.log` | 同命令：JUnit 1 passed，覆盖横/竖/旋转、4K、小片、奇数边、低/未知码率。`/tmp/album-native-pure-green1.log` |
| HDR/免转码 | 同原生命令：HDR/音频规格字段与免转码函数尚不存在，测试编译报错。`/tmp/album-native-pure-red2.log` | 同命令：JUnit 3 passed。`/tmp/album-native-pure-green2.log`；最终 `/tmp/album-native-pure-green-final.log` |
| 固定错误码 | `python3 /tmp/album-native-tests.py --all --errors`：1 failed，OUTPUT_NOT_PASSTHROUGH 仍得到 UNKNOWN。`/tmp/album-native-errors-red.log` | 同命令：新增原因映射通过；最终运行固定校验与隐私两项，2 passed。`/tmp/album-native-errors-green-final.log` |

manager 的直通与隐私保护是既有正确行为，新增相应断言首次即通过，**不是本卡修复前的行为失败**。另一次初跑的失败来自测试误将既有重试状态 `waiting` 写成 `failed`，已按既有行为修正测试，未修改上传重试实现。为验证回归测试确实能捕获破坏，额外做可恢复的敏感性检查：

- 红：`python3 /tmp/album-manager-sensitivity.py` 临时禁用 `prepareTrainingVideo` 直通分支，3 项导出件测试失败；临时让诊断携带原始 message，1 项隐私测试失败。分别见 `/tmp/album-manager-red-passthrough.log` 与 `/tmp/album-manager-red-privacy.log`。脚本在 finally 恢复原文件，两处生产文件均无最终 diff。
- 绿：`npm test -- --runInBand src/features/training/video-upload/__tests__/manager-attach.test.ts`：30 passed，`/tmp/album-manager-green.log`。
- 最终两个 JS seam 合跑：95 passed（组件 65 + manager 30），`/tmp/album-seams-green.log`。

## 最终自检

| 验收项 | 实际结果 |
| --- | --- |
| `npm test -- --runInBand` | **219 suites / 2359 tests 通过**，60.041s，`/tmp/album-full-test.log`。未重装依赖。 |
| `npx tsc --noEmit` | exit 0，无错误，`/tmp/album-tsc.log`。 |
| `npm run lint` | exit 0，无新增错误，`/tmp/album-lint.log`。 |
| `git diff --check` | 通过。 |
| `npx expo prebuild --platform android --no-install` | 通过，只生成被忽略的本 worktree `android/`；package.json 无变化。`/tmp/album-prebuild.log`。 |
| `./gradlew :training-video:testDebugUnitTest --offline --no-daemon` | **未能运行测试**：默认缓存的 wrapper lock 被 sandbox 拒绝写入（`/tmp/album-native-baseline.log`）；用本 worktree 内 APFS 克隆缓存作为 GRADLE_USER_HOME 后，Gradle 在 FileLockContentionHandler 创建 socket 时 `Operation not permitted`，未进入编译/测试阶段（`/tmp/album-native-red1.log`）。这两次均为环境阻塞，不计为测试红；随后只移除了本轮在本 worktree 创建的 `.gradle-user-home` 克隆缓存。 |
| `python3 /tmp/album-native-tests.py --all --exporter --compile-only` | 锁定 Media3 1.9.0 缓存 AAR、Android 36、Expo/RN 缓存类路径下，**全部原生生产文件与两份测试文件编译通过**，`/tmp/album-native-compile-all.log`。不是 AGP/Gradle 构建通过。 |
| 原生直接 JUnit | 3 项规格测试 + 2 项错误码/隐私测试通过；既有 `transformerFailureKeepsItsNumericCode` 需要 Android SystemClock 的 Gradle mockable runtime，本次直接 runner 未执行。正式 Gradle 总共 6 项仍须补跑。 |
| `assembleDebug` | 未运行：开工可用约 4.3GiB，结束检查仅约 1.8GiB，且 Gradle 本身受 socket 权限阻塞；不冒险触发全量原生构建。未清理任何 worktree 外目录。 |
| 设备/视觉 | 按用户和任务卡要求未使用 adb、未启动/驱动模拟器，未声称有截图或真实转码证据。 |

## 独立只读审查

使用 review-loop 的本地双轴，固定范围为 HEAD `7a707ad` 上本卡未提交 diff 及新增文件。缺 `docs/agents/issue-tracker.md` 已告知；未声称运行完整 Matt tracker 流程，未自行创建配置。

- **Standards：0 项需返修问题。** 核对仓规、seam、文件归属/取消、隐私及非紧凑回归边界。
- **Spec：0 项缺做/多做/实现错误。** 对照目标 1–7；独立核实 Media3 1.9.0 `audioNeedsEncoding()`：非默认 AudioEncoderSettings 会强制音频编码，同为 AAC 也应用目标码率。
- 两轴是静态实现审查，不将 Gradle/设备验收缺口改写为通过。

## 收货时仍须完成

- 在有权限的环境运行卡内 `./gradlew :training-video:testDebugUnitTest`；有足够磁盘时再做 `assembleDebug`。
- 由 Opus 按卡在 `meetpr16`（5570）用固定素材核验真实 Transformer 编解码：选区帧/时长、横竖与旋转、音轨、fallback、SDR 颜色、产物直通且无第二次压缩、整段达标素材只复制，以及失败/取消后的文件清理。
- 真机 HDR / Dolby Vision、E-AC-3、4K60 尚未验证；静态 API 和纯函数测试不能证明设备 decoder/tone mapper 支持。保留这部分验收缺口，不扩大为全机型兼容承诺。
- 紧凑 Alert 不挤组行、无预览仍可拖选保存、相机直拍/回看/重试的目标设备实屏回归待收货；相应宿主回归已全绿。

## API 核实依据

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)。
- Media3 固定 **1.9.0** 的 [DefaultEncoderFactory](https://github.com/androidx/media/blob/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/DefaultEncoderFactory.java)、[AudioEncoderSettings](https://github.com/androidx/media/blob/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/AudioEncoderSettings.java)、[Presentation](https://github.com/androidx/media/blob/1.9.0/libraries/effect/src/main/java/androidx/media3/effect/Presentation.java)、[Composition](https://github.com/androidx/media/blob/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/Composition.java)、[EditedMediaItemSequence](https://github.com/androidx/media/blob/1.9.0/libraries/transformer/src/main/java/androidx/media3/transformer/EditedMediaItemSequence.java)，并用本机同版本缓存 classpath 验证编译。


## 返修第 1 轮（2026-11-14）

本节按任务卡末尾已改拍的两项要求记录，替代上文目标 2 的「成品直通硬校验」、目标 5 的「缩略图失败停用预览」及目标 7 的 `OUTPUT_NOT_PASSTHROUGH` 口径；上轮过程证据保留为历史。卡中目标 2 已由派单方修订，本轮未再改卡。

- 仍在 `fix/album-single-pass-export`，HEAD `7a707ad`；只做本轮增量，未重写其余已通过实现。无 commit / push / PR，无依赖安装、Gradle task、expo prebuild 或其他大体积构建；未清理任何目录。
- 开工磁盘约 1.3GiB，收尾约 1.2GiB。原生仅复用 `/tmp/album-native-tests.py --all --exporter --compile-only` 与既有缓存直接编译，未执行原生单测；原生单测交 Opus 复跑。

### 本轮修改

1. `VideoTrimExporter.kt`：仅删除 `complete` 中 `require(trimOutputIsPassthrough(output))`；非空/单视频轨、时长、音轨有无、SDR、不放大、宽高比/方向校验原样保留。成品不因未命中直通而失败或上报，直接交付 JS，由既有 `prepareTrainingVideo` 判断是否压缩。`canCopyTrimSource` 与整段拷贝快路未改。
2. `VideoTrimErrorCode.kt`、`VideoTrimErrorCodeTest.kt`、`attachment-trim.test.tsx`：删除已不产生的 `OUTPUT_NOT_PASSTHROUGH` 映射与对应断言/故障注入项；其余错误码不变。
3. `useTrimSource.ts`：仅删除缩略图 catch 中的 `setPreviewAvailable(false)`。仍上报 `trim_thumbnails`，时间轴收到空缩略图，播放器独立可用；播放器自身 `onError` 的停用、诊断与可保存行为未改。CameraRecorder review 分支未改。
4. `attachment-trim.test.tsx`：调整已有故障用例，缩略图失败后断言无缩略图、Video 仍在、onLoad 后可点击播放且实际解除 paused、可拖选并保存；播放器失败仍断言无 Video、播放禁用、可拖选并保存。
5. `manager-attach.test.ts`：增加 4 Mbps H.264 裁剪成品用例，验证调用压缩器一次、使用压缩产物上传成功、无 `client_error` 诊断。该行为原已存在，未修改 manager / prepare / passthrough 的生产逻辑。
6. `PARITY.md`：同步本轮口径与验收边界。总计本轮 3 个生产文件、3 个测试文件及 PARITY / 本 JOURNAL；其余上轮改动不动。

### 红 → 绿与自检证据

| 验证 | 命令与结果 |
| --- | --- |
| 组件红 | `npm test -- --runInBand src/features/training/video-upload/__tests__/attachment-trim.test.tsx`：**1 failed / 64 passed**，缩略图失败后期望保留 1 个 Video，实际 0；`/tmp/album-r1-ui-red.log`。修改测试并跑出行为失败后才删除联动。 |
| 组件绿 | 同命令：**65 passed**；`/tmp/album-r1-ui-green.log`。随后移除废弃错误码注入项，最终全量中该 suite 为 64 项。 |
| manager 既有兜底 | `npm test -- --runInBand src/features/training/video-upload/__tests__/manager-attach.test.ts`：**31 passed**；`/tmp/album-r1-manager-baseline.log`。新增用例首次即绿，证明既有下游压缩兜底；不将其写成修前红测试，也不声称 JS mock 执行过原生 complete。 |
| 全量 Jest | `npm test -- --runInBand`：**219 suites / 2359 tests passed**，35.922s；`/tmp/album-r1-full-test.log`。新增 1 项 manager、移除 1 项废弃错误码注入，总数与上轮相同。 |
| TypeScript | `npx tsc --noEmit`：exit 0；`/tmp/album-r1-tsc.log`。 |
| lint | `npm run lint`：exit 0，无错误；`/tmp/album-r1-lint.log`。未改仓内配置。 |
| Kotlin 直接编译 | `python3 /tmp/album-native-tests.py --all --exporter --compile-only`：exit 0，生产文件与原生测试文件均编译通过；`/tmp/album-r1-native-compile.log`。不代表 Gradle 构建或原生单测通过。 |
| 差异检查 | `git diff --check`：通过；代码/测试范围检索确认废弃错误码及对应错误文字已无引用。 |

### 独立只读审查与遗留

固定增量起点为开工时保存的 `/tmp/album-r1-before.json`，代码增量 `/tmp/album-r1.diff`，避免把上轮未提交实现重新纳入返修。按 code-review 两轴分别只读审查：**Standards 0 项；Spec 0 项**。两位 reviewer 未修改文件或执行构建。仓内仍缺 `docs/agents/issue-tracker.md`，已告知完整 tracker 流程需 `/setup-matt-pocock-skills` 配置；本轮按已给任务卡和固定增量完成审查，未自行补建配置。

返修实现与本轮获准自检完成，**不等于设备收货完成**。原生单测由 Opus 复跑，真实编码器短片超目标码率时的交付/压缩、缩略图失败仍可预览播放、HDR / Dolby Vision 等素材和原先设备验收仍待 Opus；未运行 adb、模拟器或生成验收包。

## 收货记录（Opus，2026-11-14）

- 亲读全量 diff（Standards / Spec 两轴）。首轮两条返修，第 1 轮收敛：成品未命中直通不再判失败（任务卡目标 2 写得过死，已改卡）；缩略图失败不再连带关掉预览。
- 本机独立复跑：`npm test -- --runInBand` 219 suites / 2359 tests；`npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过；返修后 `./gradlew :training-video:testDebugUnitTest --offline` 6 项通过（`VideoTrimErrorCodeTest` 3、`VideoTrimExportSpecTest` 3）。
- 设备验收：AVD `meetpr16`（5570，Android 16 模拟器）上并排安装演示包 `com.meetpr.global.albumfix`（arm64 release、Demo 模式，未覆盖正式包，5570 上正式包仍为 CN 0.1.0(14)）。七个合成素材从训练页组行 → 录像页 → 系统相册 → 剪辑页 → 保存：

| 素材 | 剪辑页就绪 | 保存耗时 | 结果 |
| --- | --- | --- | --- |
| 720p H.264 2 Mbps AAC（已达上传规格） | 3 s | 6 s | 未启动 Transformer、未启动压缩器，直接送达（拷贝快路） |
| 1080p H.264 8 Mbps | 3 s | 20 s | Transformer 一次导出，压缩器未启动，送达 |
| 1080p 竖拍（旋转 90°） | 3 s | 17 s | 同上，送达；原生方向/宽高比校验通过 |
| 1080p HEVC（hev1） | 3 s | 17 s | 同上，送达。修复前同机 8 秒 1080p HEVC 第一遍裁剪需 4 分 21 秒 |
| 音轨比视频长 2 秒 | 3 s | 15 s | 同上，送达 |
| E-AC-3 5.1 音轨 | 3 s | 6 s | 失败 `video.trim_export.ERR_VIDEO_TRIM_MEDIA3_3003`（`ERROR_CODE_DECODING_FORMAT_UNSUPPORTED`，模拟器无 E-AC-3 解码器）；系统弹窗提示，原组已送达的视频保留 |
| 10-bit HLG HEVC | 3 s | 6 s | 预览与缩略图失败（`trim_preview.24003`、`trim_thumbnails`），剪辑页仍可拖选和保存（返修目标生效）；导出失败 `ERR_VIDEO_TRIM_MEDIA3_5001`（视频帧处理失败），原组视频保留 |

- 两个失败都是模拟器硬件能力（无 E-AC-3 解码器、解不了 10-bit HEVC），修复前同样失败，不是回归；真机能否通过未验证。
- 替换失败时原组已送达的视频保留；组行失败提示为系统弹窗，组行内无错误文字。
- 未覆盖：真机 HDR / 杜比视界 / 4K60；真实服务器送达（Demo 模式）。`useTrimSource` 的 `previewAvailable` 返修后恒为 true，属无害残留，未清。
- 素材在 5570 的 `/sdcard/Movies/audit2/`，截图在 `~/Projects/scratch/album-upload-audit-20261114/evidence/android-fixed-*.png`。
