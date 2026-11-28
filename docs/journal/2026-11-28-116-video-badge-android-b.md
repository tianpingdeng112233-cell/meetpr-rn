# 116 Android 卡 B · 带角标存相册

分支 `feat/116-video-badge`，基线为卡 A 的 `d72a63b`，T2 / P2。开工在指定 worktree 创建并删除临时文件，收尾复验写入内容后删除。卡 B 五项均已实装。Jest、TypeScript、lint 和独立 JVM 单测通过；调试 APK 及设备成片仍待验。交付为本地未提交改动。

## 改动文件

下表的目录为相对仓根路径。每个文件只列一次。

| 目录 | 文件 |
| --- | --- |
| `modules/training-video/android/` | `build.gradle` |
| 该模块的 `src/main/java/com/meetpr/video/` | `TrainingVideoModule.kt`、`VideoTrimExporter.kt`、`VideoTrimMedia.kt`；新增 `BadgePlacement.kt`、`BurnInBadge.kt`、`GalleryReservation.kt` |
| 该模块的 `src/test/java/com/meetpr/video/` | 新增 `BadgePlacementTest.kt` |
| `src/app/`、`src/features/feedback/`、`src/features/training/` | `_layout.tsx`、`FeedbackPlaybackModal.tsx`、`AllDayBody.tsx` |
| `src/features/training/video-upload/` | `CameraRecorder.tsx`、`CompletedVideoReplay.tsx`、`SetVideoPlayer.tsx`、`VideoAttachmentControls.tsx`、`VideoPlayback.tsx`、`manager.ts`、`model.ts`、`native.ts`、`trim-native.ts`；新增 `gallery-save.ts` |
| 同目录的 `__tests__/` | `camera-review.test.tsx`、`set-video-player.test.tsx` |
| `src/features/video-player/` | `FeedbackVideoPlayer.tsx`；新增 `BadgeCaptureHost.tsx`、`GalleryExportButton.tsx` |
| 台账 | `PARITY.md`、本 JOURNAL |

## 实现与取舍

- 相机预览按 contain 后的画面边界放置不可收起的外传卡片。单组录制和全天一览都传入组数据；相机弹层在点「使用视频」时重新读取该行数值，先于可选的选区裁剪。
- RN 根节点按任务快照挂载卡 A 的 `VideoBadgeCard form="export"`，因此相机弹层关闭后仍能渲染。卡 A 的 `videoBadgeLayout(displayWidth, displayHeight, 'export')` 给出左距、底距和导出比例。渲染 dp 除以屏幕密度，得到输出像素尺度的视图。Android 用 `View.draw(Canvas)` 捕获这个透明子树，Expo SharedRef 持有位图，烧录结束后释放。Kotlin 只做纹理坐标换算与合成。
- Media3 在一次成功的 Transformer 转码中叠加静态位图，跳过裁剪链路的整段直拷与 1280 边长限制。以显示尺寸、音轨数和已有的 100ms 时长容差验输出；HDR 沿用重试阶梯。音轨无法保留时，带角标导出失败并发布原片。避免给相册交付降分辨率或静音的成功件。
- 开关继续使用原键。开着时，选区改变只等待既有裁剪；相册授权、出图、烧录和写入均在原片交给上传之后独立完成或继续。源 URI 的读者全部释放后才执行已请求的删除，覆盖上传保留副本后立即清理源文件的竞争。产物、下载缓存与临时位图由保存任务回收。
- 为免后台冻结时依赖 JS 回调，烧录前先把原片暂存为一个尚未发布的相册条目。Android 10 起用 MediaStore pending，旧版本用 DCIM 隐藏文件。Activity 暂停时原生直接发布备份；若暂停发生在备份复制途中，复制完成即发布。正常成功发布带角标版，丢弃隐藏备份。发布与中断共用同一份状态，晚到的结果不能再发布第二条。多一次写盘并占用一份原片大小的临时空间；大文件复制放在 I/O 调度器。权限被拒或存储本身无法写入时沿用失败提示，上传照常。
- `onUse` 的第二个参数改为相册结果的 `Promise<boolean>`。持久化的 `savedToPhotos` 仍是布尔值，仅成功写入后置真。拍摄后迅速换片或删片，旧任务的结果不会标到另一段录像。复用原恢复提示和回放成功提示 `chat.videoExport.saved`。
- 导出按钮由学员的训练/已完成回看和反馈回放显式启用。有角标数据才显示，保存期间禁用并显示转圈。远程片先下载到独立缓存；失败时清理残片，复用播放器的 URL 续签入口重试一次。普通聊天和教练入口保留原行为。
- 未引入截图 npm 包。Gradle 显式声明 `androidx.media3:media3-effect:1.9.0`，使用其 `BitmapOverlay`、`OverlayEffect`；本机 1.9.0 Transformer POM 已有相同的传递依赖。AAR 为 322,393 字节，许可证 Apache-2.0。APK 增量未测量。Expo API 已核对 [SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/) 和已安装版本源码。

## 测试先红后绿

Jest 参数接在 `npx jest --runInBand --watchman=false --silent` 后。测试仅使用合成尺寸、模拟文件与原生适配器。

| 卡片测试边界 / 命令 | 红 | 最终结果 |
| --- | --- | --- |
| `bash .expo/card-b-check/junit.sh` | 编译测试时报告 `unresolved reference 'badgePlacement'`。 | 4/4。涵盖 1080×1920、1920×1080、带 90° 标记的横向编码帧、1080×1440。检查位图中心在 Media3 坐标系中的位置和缩放。 |
| `camera-review.test -t 'Use hands off\|burn leaves\|disabled Photos'` | 3 项失败，旧预览没有外传卡片，也未调用烧录。关开关的原行为已通过。加入冻结保护时，另有 3 项因未预留原片而失败。 | `camera-review.test` 全部 51 项通过。覆盖烧录未完成即交原片、失败/中断后选原片、无数据/开关关闭、慢相册写入返回真实结果，以及裁剪原片的延迟删除。 |
| `set-video-player.test -t 'student replay downloads'`（初始用例名） | 学员全屏顶栏查不到 `feedback.video.export`。补入过期 URL 用例时，续签次数为 0，期望 1。 | `set-video-player.test` 21/21。训练和反馈两种全屏播放器都覆盖远程下载、当前 RPE、双击防重、转圈、保存与成功提示；另验证过期地址重试。 |
| `workbench-player.test` | 工作台的无按钮断言沿用卡 A。 | 两套工作台测试共 6/6。 |

相关合跑 `npx jest --runInBand --watchman=false --silent 'camera-review.test|set-video-player.test|workbench-player.test'` 得到 4 套、78 项通过。

## 全量与构建

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit`、`npm run lint`、`git diff --check` | 全部退出 0，lint 无警告。 |
| `npx jest --runInBand --watchman=false --silent` | 234 套、2557 项通过，64.295 秒。 |
| `CI=1 EXPO_OFFLINE=1 npx expo prebuild --platform android --no-install` | 生成本 worktree 的 ignored Android 工程；package.json 无变化。 |
| `cd android && ./gradlew :training-video:testDebugUnitTest --offline`、`./gradlew assembleDebug --offline` | 两次均被默认 Gradle wrapper 锁文件写权限阻挡。改用已安装 Gradle 9.3.1 和本 worktree 内可写的 GRADLE_USER_HOME，再运行 `gradle --offline --no-daemon :training-video:testDebugUnitTest assembleDebug`，FileLockContentionHandler 创建本地 socket 时收到 `Operation not permitted`。两项 Gradle task 均未启动。 |
| `python3 .expo/card-b-check/native.py` | 本 worktree 中的一次性验证脚本。用 Gradle 缓存中的 Kotlin 编译器、SDK 36、Expo 和 Media3 1.9.0 的真实类编译全部模块源码及 5 个测试类。按模块配置使用 AGP 的 returnDefaultValues Android 测试 jar，JUnitCore 运行 19/19 通过。首次单独运行使用平台 android.jar，旧错误码测试因 SystemClock 缺原生实现失败；切换到 AGP 测试 jar 后通过。该路径验证 Kotlin 编译和 JVM 单测，APK 打包仍待完成。 |

## 独立审查

**Standards** 审查发现整片复制可能占用 Expo 共用队列，另指出回放下载需要复用签名续签。文件复制已切到 `Dispatchers.IO`，下载续签已补回归并通过只读复核。

**Spec** 审查发现用学员聊天冻结的组快照导出可能漏掉后来补录的 RPE，也指出过期签名问题。聊天共享视频恢复原入口，导出保留在有当前角标数据的学员播放器。两项均已复核关闭。

## 待验项

- SPEC 1–4、13：代码和纯函数已核对几何、组序与缺值；待用合成深浅片检查角标区域和底边像素、实际位置误差、横拍/3:4 占高、三语排版及长动作名截断。
- SPEC 5–8：Jest 覆盖交接、开关、源文件所有权、失败/取消与回放按钮。尚未在 Android 编解码器上导出实片，也未比较实际分辨率、方向、时长、音轨与上传给教练的文件；真实相册条数、权限弹窗、OEM 冻结期间的可见性和低版本 MediaStore 路径待验。
- SPEC 9–11 属卡 A 或既有行为，已跑全仓回归；本卡未重走设备上的打点、重试和普通聊天。SPEC 12 的老账号升级首屏、旧视频回放和既有相册条目待验。
- 当前沙箱禁用 adb，未驱动 AVD，未生成设备截图、合成导出成片或调试 APK。卡片指定的 AVD 收货与冻结机型实测仍待执行。系统杀进程后的补存沿用 SPEC 的 Out of Scope。

## 返修第 1 轮

Claude 的 CN release 验收包可以构建，但首次启动在 `TrainingVideoModule.definition()` 崩溃。上一轮 JVM 19/19 测了媒体处理和几何，漏测了 Expo 在注册模块时构造 definition 的入口。本轮先复现同一异常，再改构造声明。保留 Claude prebuild 的 `android/` 和原验收 APK。分支仍为 `feat/116-video-badge`，HEAD 为 `d72a63b`，所有返修均在工作树。

### 逐项处理

| 返修项 | 行为、约束与证据 |
| --- | --- |
| 1 启动 | `GalleryReservation` 的 Expo Class 显式声明 Constructor，实例由 `reserveGalleryOriginal` 在暂存原片时创建。JVM 用真实 SDK 的 DSL 执行整个 `TrainingVideoModule.definition()`，测试仅提供未启动 Android/JSI 的 AppContext 身份。 |
| 2 回放失败 | 回放只把成功的烧录输出交给 Photos。编码失败、取消、等待到期走已有的失败提示。权限拒绝沿用已有权限提示。录完存相册保留原片兜底。 |
| 3 转码并发 | 上传压缩、相机选段裁剪、相册裁剪和烧录进入同一个串行队列。相册立即暂存原片，再等待该文件的上传准备成功或失败。准备阶段在得到上传文件时即可放行，不等网络上传。压缩取消后调用者可立即返回，编解码器队列等原生 Promise 真正结束再放行。录制 URI、上传保留副本和压缩副本共用准备状态。 |
| 4 看门狗 | 录完从预留开始计时，预算取 60 秒与片长四倍中的较大值。原生独立定时器可在 JS 停顿时发布暂存原片，并按任务 ID 取消烧录。替代片复制期间仍可发布原片。原生烧录本身也有截止时间，覆盖手动回放。回放下载接入 Expo 的 AbortSignal，下载和转码分别计时。 |
| 5 孤儿清理 | 模块冷启动在后台清理。Android 9 及以下仅删除 DCIM 下带本安装标识、修改时间早于进程启动的隐藏 pending 文件。Android 10+ 同时限制 DCIM、pending 状态、名称、所有权和创建时间。新暂存名含毫秒创建时间，发布时换回普通文件名。Android 11+ 检查 owner 包名，Android 10 对旧版 UUID 行利用系统仅允许所有者打开 pending 文件的规则。旧行只有秒级时间，启动同秒的旧行保留到下次冷启动。上个实现的 Android 9 及以下隐藏文件没有安装标识，无法可靠区分同机其他包，保留这些历史文件。 [Android MediaStore 契约](https://developer.android.com/reference/android/provider/MediaStore.MediaColumns#IS_PENDING) |
| 6 重复保存 | 同文件、同角标复用正在进行的录完或手动回放保存，远端使用稳定的 attachment ID 识别续签前后的同一视频，一次烧录、一次发布。共用任务若落成原片，手动回放报失败。回放时若已补录 RPE，等待录完任务结束再按新数据导出一份用户主动请求的带角标版。 |
| 7 分辨率 | 按旋转后的宽高逐边允许 ±2 px，沿用方向与宽高比校验。带角标输出的尺寸、方向、时长或音轨不符有各自的符号错误码。录制失败回退走现有视频处理诊断，诊断字段不含 URI。 |
| 8 录完预览 | 同时拿到容器尺寸和视频自然宽高比后才显示 RN 导出卡，再按 contain 后的画面边界定位。 |
| 9 反馈播放器 | 全屏画线层盖住视频，圆盘和展开卡隐藏，点评与进度条在画线上层可见可点。关闭或拖离批注时恢复此前展开状态。点评底缘至少高于进度控件 8u，卡片底缘至少高于点评 10u；以实际控件高度、可用安全区域和字体缩放计算。普通点评最多三行，选中长文可滚动。教练工作台保留原组件和入口。 |
| 10 相册状态机 | 使用假的发布器实测成功、编码失败、替代片复制失败、取消、超时、Activity 暂停、晚到回调。另覆盖备用发布失败而另一个替代片复制仍在途的竞争，退役的预留不能再发布。原片与替代片整段复制均在锁外。 |
| 11 编排测试 | 回放失败零写入；上传压缩成功和失败后才放行烧录；开关关闭后的手动回放仍等上传准备；超时中止在途烧录或排队；原 URI 与副本重放去重；RPE 变更使用新值。 |
| 12 原生导出契约 | JVM 直接调用生产校验，覆盖旋转元数据等价于物理旋转、奇数边对齐、时长容差、音轨数量和原因码。像素是否变暗、底边原亮度、真实音轨与编码方向仍需设备生成成片。mockable android.jar 不提供 MediaCodec、EGL 或实际 MediaStore，纯 JVM 无法提供解码帧证据。 |
| 13 反馈页数据 | 原实现优先用反馈响应内嵌的视频元数据，老响应回退学员视频列表。这能带出 RPE，但缓存不能保证是点击时的记录。现显示沿用本地化动作名；导出时按视频 ID 取关联的（缓存缺少该关联时刷新列表） `set_log_id`，重新读该学员训练日期的 `setsRepository.range`，只取同一记录的重量、次数、组序及学员 RPE。找不到对应记录时显示导出失败。测试用两个组和修改后的 RPE 验证精确关联。 |

### 红绿证据

以下 JVM 命令为本工作树已有的独立验证脚本，实际编译模块的全部 Kotlin 源及单测，使用本机缓存的 SDK 36、Expo、Media3 1.9.0、AGP mockable Android jar 和 JUnitCore。没有安装新 npm 包或 Maven 依赖。

| 命令 | 红 → 绿 |
| --- | --- |
| `python3 .expo/card-b-check/native.py` | 启动回归 20 项中 1 项失败，栈中是 `ClassComponentBuilder.kt:78` 的 `constructor cannot be null`。补 Constructor 后 20/20。此前补齐一次性运行器的 tracing/Pika classpath，缺类不计作业务红灯。 |
| 同一 JVM 命令 | 假发布器、公有行为检查、预留超时调度、输入输出元数据和孤儿筛选先红。另一个并发断言在已有实现上实红，28 项中 1 项失败：原片发布失败并放弃预留后，晚到的替代片仍被发布。给预留增加终态后通过。最终 31/31。 |
| `npx jest --runInBand --watchman=false camera-review set-video-player video-badge-overlay` | 初跑 3 个套件、9 项失败。可定位的红灯包括回放错误仍写入 Photos、未知画幅时已挂卡、两种展开态在画线时仍挂载、排队超时收到带角标 URI，以及未实现的上传准备/复用入口。不是 9 个独立缺陷。 |
| `npx jest --runInBand --watchman=false video-badge-layout` | 新增三组尺寸与多行点评间隔检查先红，原四例仍绿；补布局后七例通过。与上述三个套件合跑时 95/95 通过。 |
| `npx jest --runInBand --watchman=false --runTestsByPath src/features/feedback/__tests__/video-badge.test.ts` | 先红于缺少当前组导出读取入口，补后按视频对应的 set log 导出修改后的 RPE 9。 |
| `npx jest --runInBand --watchman=false camera-review -t 'manual replay also waits'` | 独立手动回放的上传准备入口先红。随后 `npx jest --runInBand --watchman=false camera-review manager-attach` 在相机及真实上传编排边界通过 90/90。 |

### 本轮文件

| 目录 | 文件 |
| --- | --- |
| `modules/training-video/android/src/main/java/com/meetpr/video/` | `TrainingVideoModule.kt`、`VideoTrimExporter.kt`、`BurnInBadge.kt`、`GalleryReservation.kt`、新增 `GalleryOrphans.kt` |
| 同模块 `src/test/java/com/meetpr/video/` | 新增 `TrainingVideoDefinitionTest.kt`、`GalleryPublicationTest.kt`、`GalleryOrphansTest.kt`、`BadgeOutputTest.kt` |
| `src/features/training/video-upload/` | `CameraRecorder.tsx`、`VideoTrimView.tsx`、`VideoPlayback.tsx`、`SetVideoPlayer.tsx`、`native.ts`、`trim-native.ts`、`manager.ts`、`diagnostics.ts`、`gallery-save.ts`、新增 `recording-gallery.ts`；单测 `camera-review.test.tsx`、`manager-attach.test.ts`、`set-video-player.test.tsx` |
| `src/features/video-player/` | `FeedbackVideoPlayer.tsx`、`FeedbackVideoMarkerCue.tsx`、`GalleryExportButton.tsx`、`video-badge-layout.ts`；单测 `video-badge-overlay.test.tsx`、`video-badge-layout.test.ts` |
| `src/features/feedback/` | `FeedbackPlaybackModal.tsx`、`video-presentation.ts`、`__tests__/video-badge.test.ts` |
| 文档 | 本 JOURNAL 追加。SPEC 的修订来自 Claude。 |

### 独立复核

Standards 复核定位到退役预留的晚到替代片、回放下载取消和复用时未消费的权限请求。终态检查、SDK 下载取消信号和按需获取权限已通过复核。Spec 复核还发现缓存缺少某一视频时应刷新，以及续签可能重复启动手动保存。已按具体关联刷新列表，手动回放使用稳定视频 ID。`npx jest --runInBand --watchman=false set-video-player -t 'reopened replay joins'` 先复现两次下载，修后只下载和发布一次。

### 最终验证与待验

| 命令 | 本轮结果 |
| --- | --- |
| `npx tsc --noEmit` | 退出 0 |
| `npm run lint` | 退出 0 |
| `npx jest --runInBand --watchman=false` | 234/234 套件，2,571/2,571 项通过 |
| `python3 .expo/card-b-check/native.py` | 编译全部模块 Kotlin 源文件；JUnitCore 31/31 通过，含真实 Expo definition、超时调度、两种暂存介质的筛选和输出元数据校验 |
| `android/gradlew -p android --offline :training-video:testDebugUnitTest` 和 `android/gradlew -p android --offline assembleDebug` | 两次均在 wrapper 锁处遇到 `Operation not permitted`。用已缓存 Gradle 9.3.1、工作树内的 GRADLE_USER_HOME 重试 `gradle --offline --no-daemon -p android :training-video:testDebugUnitTest assembleDebug`，仍被沙箱禁止创建 FileLockContentionHandler 本地 socket。Gradle 单测任务和 debug 打包均未启动。 |
| `git diff --check` | 通过 |

本轮没有驱动模拟器。Claude 已安装的 release APK 对应返修前的代码。仍待用返修包核对 release 冷启动、真实相册单条发布、杀进程后的清理、弱机并发与暂停时序、批注实际触摸和长文排版，以及合成或真实录制成片的方向、声音、角标区域与画面底边像素。JVM 和 Jest 的通过不能替代这些设备证据。本轮没有引入新依赖；卡 B 沿用卡 A 的 RN 导出卡和 Media3 1.9.0。

## 返修第 2 轮

Claude 在 API 36 验收包已确认启动、录制预览、Use 即时交接和录完相册单条烧录成功。该成片为 720×1280、5 秒、有音轨，角标为 Squat / 145 kg × 5。当前另一个复现为组行附件弹窗展开后手动导出，2/2 提示 Export failed，缺少 TransformerInternal: Init。单凭这条日志无法定位具体 JS 阶段。

### 修前假设（按优先级）

1. 回放的导出卡挂在 Activity 根而非当前附件 Dialog。若当前窗口能布局、根捕获视图不能及时布局或取 native tag，则真实下载按钮在 capture 阶段失败；让导出视图随当前播放器布局应能进入烧录。
2. 录制后的保留副本解析或读取失败。若成立，同一 file URI 将走下载/续签或 trimInfo 无法返回正尺寸；给出可读的 720×1280 本机副本应能排除 URI 分支。
3. 已完成的录制或上传准备仍占有别名。若成立，在成功保存并完成上传准备后，以副本和附件 ID 再点保存不会到达新烧录。
4. 未填 RPE 的未完成组触发 set_log 查询或被判为空角标。若成立，使用同一份动作、重量、次数且无 RPE 的当前行，保存会在权限、读片或捕获之前退出。
5. 写相册权限或 AppState 中断。若成立，拒绝或 background 应在烧录前产生可区分的诊断；授权且 active 时应通过。已成功保存过录制原片段使拒权的优先级较低。

### 假设的判别结果

以 Claude 已安装 release 的 source map 对照旧代码。组行入口依次经过 `VideoAttachmentControls compact`、附件 `Modal`、`VideoPlayback inline`、`SetVideoPlayer`、下载按钮。新增 Jest 用例从组行绿色图标点入这一条路径，保留真实的来源选择、去重、角标渲染和按钮；文件、权限、原生媒体与 Android 布局回调由用例控制。

| 优先级 | 对照操作与结果 |
| --- | --- |
| 1，捕获窗口 | 旧版导出卡在根 Activity。给全树派发布局，旧版烧录、入册各一次。只给前台附件 Dialog 派发布局，同一输入提示 Export failed，原生烧录调用为零。把宿主放进播放器后，两组均只发布一次带角标版。此实验确认旧代码依赖后方窗口的布局回调。Expo 的 findView 按 Fabric tag 查找；没有设备证据表明两次现场点击都丢失了布局回调。用例等待旧代码的 5 秒布局超时，现场描述约 2 秒。 |
| 2，本机副本 | 可读的已上传保留副本原样传给 trimInfo，返回 720×1280，没有网络下载。注入含文件路径的读片错误，日志只有 INSPECT，入册为零。设备上那份文件的元数据读取仍待复验。 |
| 3，已结束任务 | 先以相同角标完成录制保存和上传准备，登记副本 URI、附件 ID 两个别名，再点下载。手动导出会启动新烧录并新增一条，未复用已结束的任务。 |
| 4，空 RPE / 重读组 | 回放直接使用当前组的 Squat、145 kg、5 次和空 RPE，导出卡保留这些字段。这个按钮没有传 getBadge，监测到的 setsRepository.range 调用为零。 |
| 5，权限 / 前后台 | 授权、active 的对照通过。拒权显示原权限提示并记录 PERMISSION；background 显示导出失败并记录 BACKGROUND。两条都没有调用烧录或保存原片。 |

### 三项修订与测试

1. **原生启动回归**。移除单测对 `sun.misc.Unsafe` 的导入。通过 Objenesis 公共 API 得到仅供注册 DSL 使用的 Expo AppContext，挂到模块后执行真实的 `TrainingVideoModule.definition()`。新增测试依赖 `org.objenesis:objenesis:2.6`，Apache-2.0，本机同版本 JAR 为 55,684 字节。仅在 JVM 的 testImplementation 使用，APK 无新增依赖。上一轮自写 runner 把 JDK 内部类暴露给了编译器，漏掉了 Claude 的 Gradle 编译错误。
2. **回放手动导出**。SetVideoPlayer 的捕获宿主随播放器位于当前窗口，收起后仍能捕获；关闭弹窗时，已接受的捕获转交给根宿主。中断的任务不转交，迟到的位图会释放。继续只绘制 RN VideoBadgeCard 的 export 形态。固定日志格式为 `[video.replay_save] <阶段码>`，可分辨角标数据、相册权限、下载/续签、读片、等待上传、尺寸、捕获、排队、烧录、入册和中断。原生 `TrainingVideo` 日志区分 INSPECT_SOURCE、CAPTURE_VIEW、CAPTURE_DIMENSIONS、CAPTURE_BITMAP、BURN_ENTRY、BURN_BUSY 与 BURN_FAILED。日志不传 URI、文件名、训练数据、异常消息或堆栈。手动导出失败仍提示失败，不写原片。
3. **组视频展开态**。删除重复的动作名和组数据标题。按实测播放器宽高调用卡 A 的 videoBadgeLayout 和 playbackCueLayout，将同一个可点的 VideoBadgeOverlay 放到进度条上方。测试在 540×960 容器验左缘 44、组号、动作和数字，验证点按收成圆盘、再展开、关闭重开默认展开。覆盖暂停、播放中切换和原生播放器实例不重建，附件面板的倍速、收起、下载、Record、Delete 仍在。

| 红 → 绿命令 | 结果 |
| --- | --- |
| `python3 .expo/card-b-check/r2-android-cp.py` | 以 SDK 36 android.jar 和 Kotlin -no-jdk 编译模块与测试。旧版在 sun、Unsafe 处报错；修订后 JUnitCore 31/31 通过。另在工作树内的临时源码副本只去掉 reservation 的 Constructor，31 项中恰有这一项因 constructor cannot be null 失败。 |
| `npx jest --watchman=false --runInBand replay-gallery` | 捕获窗口对照在旧版一红一绿；加四个阶段码断言后，修前 5 红 1 绿。审查还发现按钮卸载会取消在途捕获，延迟读片后收起、等待布局时关闭两条用例先红；播放器接管宿主后本套 8/8 绿。 |
| `npx jest --watchman=false --runInBand 'replay-gallery\|set-video-player.test'` | 播放中、暂停时的两个角标用例原先均读到旧的 Set 1 · 50kg × 5 · RPE 8 标题而失败。最终两套 31/31 通过。 |

本轮改动文件为 Android 的 `build.gradle`、`TrainingVideoDefinitionTest.kt`、`TrainingVideoModule.kt`、`VideoTrimExporter.kt`，RN 的 `BadgeCaptureHost.tsx`、`GalleryExportButton.tsx`、`gallery-save.ts`、`SetVideoPlayer.tsx`，以及 `replay-gallery.test.tsx`、`set-video-player.test.tsx` 和本 JOURNAL。

### 本轮最终验证

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit`、`npm run lint` | 均退出 0 |
| `npx jest --runInBand --watchman=false` | 235/235 套件，2,579/2,579 项通过 |
| `python3 .expo/card-b-check/r2-android-cp.py` | Android SDK 编译类路径 + mockable android.jar 上运行 JUnit，31/31 通过 |
| `android/gradlew -p android --offline :training-video:testDebugUnitTest` | wrapper 无权创建分发缓存的 .zip.lck。改用已缓存的 Gradle 9.3.1、工作树内 GRADLE_USER_HOME 运行 `gradle --offline --no-daemon -p android :training-video:testDebugUnitTest assembleDebug`，FileLockContentionHandler 创建本地 socket 被沙箱拒绝。两个 Gradle 任务均未启动。 |
| `git diff --check` | 通过 |

**需 Claude 用 Gradle 复跑** `:training-video:testDebugUnitTest`。替代 runner 从本机 Gradle 分发读取同版 Objenesis；真实 Gradle 的依赖解析和新 APK 的设备行为均未在本沙箱验证。未驱动模拟器、未重建 release；Claude 已验证的录完保存结果属于上一版。本轮仍待在 meetpr16 核对组行弹窗的手动保存实际新增一条带角标视频、空 RPE 的呈现、全屏收展及控件可点。若仍报 Export failed，logcat 可按 ReactNativeJS 的 [video.replay_save] 和 TrainingVideo 两个标记定位。

## Claude 收货记录（2026-11-28）

设备：模拟器 AVD `meetpr16`（emulator-5570，API 36），CN 轨演示模式 release 包，并排包名 `com.meetpr.app.badge116`。

- 冷启动正常（返修第 1 轮前的启动崩溃不再出现）。
- 训练页组行录制 → 预览页显示角标（位置在画面内左 44u、底 214u，无组序）→ 点 Use 立即回到训练页 → `DCIM/MeetPR-*.mp4` 恰好新增一条，720×1280、时长与音轨保留，角标烧在定稿位置。5 秒片约数秒入册，46 秒片约 31 秒入册。
- 学员组视频展开态显示新角标卡（含 Set 1），点卡片收成圆盘。
- 回放页「存到相册」：按钮转圈 → 提示 Saved to Photos → 相册新增一条带角标视频（无组序）。46 秒片约 57 秒。
- `./gradlew :training-video:testDebugUnitTest` 通过；`./gradlew assembleRelease` 通过；`npx tsc --noEmit`、`npm run lint` 通过；全量 jest 235 套 2579 项通过（其间有一次全量运行报 35 套失败，紧接着两次重跑全过，原因未查明）。

Claude 直接改的一处（两轮返修已用完，明示降级）：`GalleryExportButton` 的图标原为白色无底，压在亮画面上看不见；改为与播放器其它按钮相同的深色圆底。

未在设备上验证：带打点的教练反馈视频（演示数据里没有打点）、画线批注时角标让开、横拍与 3:4 成片、弱机型上烧录与上传压缩排队、厂商后台冻结、繁体与中文界面排版、带历史老账号升级后的第一屏。回放页导出的文件名是 `training-trim-*.mp4`，与录完保存的 `MeetPR-*.mp4` 不一致，未处理。
