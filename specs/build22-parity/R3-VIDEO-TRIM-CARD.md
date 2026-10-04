# 任务卡（安卓）：R3 视频剪辑——相册选片与录制后都能只留有效片段

开工先读仓内 CONTEXT.md（如存在）、AGENTS.md、`docs/ios-parity-audit-2026-09-25.md` 的 P1-7 与 R3 一节、以及本卡。

- 级别：**T2**（跨原生媒体链、可能新增依赖）。基线 `main@cab3b40`，分支 `feat/r3-video-trim`。PR 开好后等 David 放行。
- 目标：1:1 复刻 iOS 已有行为，不新增视频产品能力。iOS 参照（本机只读）：`/Users/david/Projects/apps/MeetPR-wt-ledger24/Modules/StudentKit/Sources/StudentKit/Features/VideoUpload/` 下的 `VideoTrimView.swift`、`VideoTrimSelection.swift`、`VideoTrimTimeline.swift`、`VideoTrimCompletion.swift`、`VideoTrimThumbnailGenerator.swift`、`PassthroughVideoTrimExporter.swift`、`Camera/CameraRecorderComponents.swift`（`RecorderReviewView`）、`Camera/CameraRecorderView.swift`。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节，并按 AGENTS 更新 `PARITY.md` 对应行。本仓已公开，不得写入账号、口令、真机截图。
- 红线：禁 FFmpegKit。不改用户相册里的原始素材。

## 用户看到的流程

### A. 相册选片
组录入页点 Photos 选中一段视频后，**先进入剪辑页**，不再直接挂到这一组上。
- 点 Save：导出所选区间，导出成功后才把结果交给现有的挂载 / 压缩 / 上传管线（`videoUploadManager.attach`）。
- 点关闭（×）：回到组录入页，这一组不挂任何视频，原有已挂的视频（如果是"Replace"进来的）保持不变。
- 读取或导出失败：回到组录入页，显示现有的"视频处理失败"提示，不挂半成品，不替换原有视频。

### B. 录制后
录制结束进入现有的回看页（`CameraRecorder.tsx` 的 review 状态）。在这一页：
- "Use" 按钮左侧新增 "Edit"（`student.cameraRecorderComponents.copy009`，中文"剪辑"）。两个按钮等宽并排，Edit 是描边样式，Use 保持现有主按钮样式。
- 点 Edit 进入同一个剪辑页；Save 后回到回看页，回看的就是剪好的片段，时长标签随之更新，可以再次 Edit 或 Use；关闭则回到回看页，片段不变。
- 回看页在按钮上方显示一行提示：左侧文案 `copy007`（"Trim the waiting time at the start and end for faster uploads and playback"），右侧文字按钮 `copy008`（"Do not remind me again"）。点了"不再提醒"或完成过一次剪辑后，这行提示不再出现；选择持久化（沿用仓内已有的偏好存储方式）。提示文字单行、放不下时缩小，与 iOS 一致。
- "Save to Photos" 开关保存的是最终使用的那一段（剪过就存剪后的）。D-19 修过的"回看页切后台再回来预览还在"必须继续成立。

### 剪辑页结构（自上而下，1:1 对照 iOS `VideoTrimView`）
1. **顶栏**（卡片底色）：左侧关闭图标按钮（×，导出中禁用）；居中标题 "Edit video"（`student.videoTrimView.copy002`）；右侧文字按钮 "Save"（`copy003`，品牌金色），导出中换成转圈；视频未就绪或区间无效时禁用。
2. **时间轴**（卡片底色，左右 16、上下 12 的内边距）：
   - 一条由 10 张等宽缩略图组成的胶片条；缩略图未生成时显示占位底色。
   - 左右各一个拖动把手，把手之间为选中区间，区间外的胶片盖一层暗色遮罩。把手可触区域不小于仓内 `minimumHitTarget`。
   - 胶片条下方一行文字 "Selected 0:12"（`student.videoTrimTimeline.copy001`，时间格式 分:秒）。
   - 无障碍：整体标签 `copy002`，左把手 `copy003`，右把手 `copy004`。
3. **视频画面**：占满剩余高度，黑底，等比缩放完整显示（不裁切）；未就绪时居中显示 "Loading video…"（`student.videoTrimView.copy001`）与转圈。
4. **底部播放条**（卡片底色，高 56）：居中一个带图标的文字按钮，播放时显示 "Pause"、暂停时显示 "Play"（`copy004` / `copy005`），品牌金色；未就绪时禁用。

页面全屏覆盖在组录入页 / 回看页之上，深浅色跟随 App 现有主题（回看页场景下跟随回看页的深色）。系统返回键等同关闭；导出中返回键无效。

### 行为（与 iOS `VideoTrimSelection` / `VideoTrimView` 一致）
- 初始区间 = 从 0 到 min(素材时长, 上限)。上限用仓内 `VIDEO_MAX_DURATION_SECONDS`（120 秒）。素材超过上限时，用户通过拖动把手选择其中不超过上限的一段——这取代现在"超过 120 秒直接报太长"的结果：**超长素材不再在进剪辑页之前被拒绝**；Save 之后的片段仍走现有的时长校验。
- 最短区间 0.1 秒。拖动一个把手越过另一端的限制时，**推着另一个把手走**而不是卡住；区间超过上限时同样推着另一端收窄。
- 拖动把手时暂停播放，画面跳到被拖动的那一端（拖左把手看起点画面，拖右把手看终点画面）。
- 点 Play：若当前位置不在区间内，先跳回区间起点；播到区间终点时暂停并回到起点。
- 只有一条视频轨的素材才能进入可保存状态；没有视频轨或时长读不出来视为失败。

## 技术方案（Opus 定）

- **导出**：在现有原生模块 `modules/training-video`（Kotlin，Expo Module `TrainingVideo`）里新增 `trim(uri, startMs, endMs)`，用 AndroidX Media3 Transformer 的片段裁剪（`ClippingConfiguration`）导出到 App 缓存目录下的新文件，返回文件地址与实际时长；支持取消。Media3 版本必须与工程里已解析到的版本一致（expo-camera 已把 media3 抬到 1.9.x，`patches/react-native-video+6.19.2.patch` 是为此打的补丁）——先 `./gradlew :app:dependencies` 核实，再加 `media3-transformer` 等必要构件，不得引起版本分叉。若核实后 Transformer 不可行，停下把原因和备选（MediaExtractor + MediaMuxer）写进 JOURNAL 交 Opus 定，不要自行换方案。
- **准确度**：导出片段的时长与所选区间相差不超过 0.1 秒；起点画面与所选起点一致（不得退回到前一个关键帧多带出一段）。保留音轨、旋转方向与原始分辨率 / 码率档位（压缩仍由后面的现有管线负责，这里不要再做一次降档）。
- **缩略图**：同一原生模块新增 `thumbnails(uri, count)`，用 `MediaMetadataRetriever` 取等间隔帧，缩小后写入缓存目录，返回文件地址数组。不新增 JS 依赖。
- **画面与播放**：用仓内已有的 `react-native-video`。**手势**：用已有的 `react-native-gesture-handler` 或 RN 自带响应系统，二选一，保持与仓内现有写法一致。
- **区间状态**：把 iOS `VideoTrimSelection` 的规则移植成纯函数模块（`src/features/training/video-upload/trim-selection.ts`），不依赖 React。
- **会话收尾**：移植 iOS `VideoTrimCompletion` 的"只结算一次"语义——保存 / 取消 / 失败三种结局只会触发一个；每种结局都要清理本次产生的临时文件（缩略图、被放弃的导出文件、从相册拷出的工作副本）；页面卸载时取消进行中的导出。与 `manager.ts` 里 `cleanOrphanVideos` 的冷启动清理不冲突。
- 文案键仓内已全部存在（`student.videoTrimView.*`、`student.videoTrimTimeline.*`、`student.cameraRecorderComponents.copy007–010`），不新增、不改值。

## 测试 seam（先红后绿，优先复用已有 seam）

1. `trim-selection.ts` 纯函数：初始区间、最短 0.1 秒、越界推动另一端、上限收窄、无效时长（0 / NaN / 无穷）——逐条对照 iOS `VideoTrimSelection` 的行为与其单测。
2. 会话收尾：保存后再触发取消无效；取消 / 失败都清理临时文件；卸载时取消导出且不触发保存回调。
3. `VideoAttachmentControls`：相册选片后先出剪辑页；Save 后才调用 `attach` 且传入的是导出文件；关闭 / 失败时不调用 `attach`、不调用 `remove`。
4. `CameraRecorder`：回看页有 Edit 与提示行；"不再提醒"后提示行消失并持久化；Edit → Save 后 Use 交出的是剪后文件。
5. 原生导出没有 jest seam：在 JOURNAL 里写明，并提供一段可在模拟器上执行的验证步骤（见验收 6）。

## 验收清单（Opus 收货，实装方不得自定范围）

1. 相册选一段 8 秒合成样片 → 剪辑页出现，10 张缩略图、"Selected 0:08"；不动把手直接 Save → 挂到这一组并开始上传，训练日志只有一条。
2. 拖左把手到约 2 秒、右把手到约 6 秒 → 标签显示 "Selected 0:04"；Play 只在区间内播放，播完回到起点；Save 后组录入页原地播放器里的时长约 4 秒。
3. 把右把手拖到左把手左边 → 左把手被推着走，区间保持不小于 0.1 秒。
4. 关闭（× 与系统返回键）→ 回到组录入页，未挂视频；从 "Replace" 进来时原视频保持不变。
5. 录制回看页：有 Edit、提示行；Edit → Save → 回看的是剪后片段、时长标签更新 → Use 挂载；"不再提醒"后重进不再显示提示。
6. 导出准确度：对样片取 [2.0s, 6.0s]，用 `ffprobe`（Opus 在本机执行）或原生模块回读，时长在 4.0±0.1 秒内，有音轨，方向正确。
7. 超过 120 秒的素材（Opus 准备）：能进剪辑页，初始区间 2:00，Save 后正常挂载。
8. 损坏 / 无视频轨文件：回到组录入页并显示处理失败提示，不挂载。
9. 360×640dp + 字体 1.3×：顶栏、时间轴、播放条完整可见可操作。
10. `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过；`cd android && ./gradlew assembleDebug` 通过（在有 `android/` 的树里由 Opus 执行；实装方保证原生代码与 gradle 配置可编译）。
11. 真机（David）：相册真实视频与真实录制各走一遍，音画同步、方向正确、失败可重试。

## Out of Scope

烧录角标导出、后台导出、视频特效、压缩参数、上传逻辑、iOS、生产部署。

---

## 返修一（2026-10-04，Opus 模拟器收货后）

fixture 包（含本树当前改动，原生已在验收树编译通过）在模拟器上：组录入页点 Photos 选中 8 秒合成样片后，**没有出现剪辑页**，直接回到组录入页并显示 "Could not process video. Try again"。应用日志里没有任何原生异常，失败发生在 JS 侧的准备阶段且被吞掉了。

- 最可能的原因（请先核实再改）：`trim-native.ts` 的 `copyTrimSource` 调用 `new File(uri).copy(copy)` 后**没有等待**就检查 `copy.exists`。本仓同类代码 `native.ts` 的 `retainVideoSource` 是 `await new File(source.uri).copy(file)`；`docs/STATUS-2026-09-05.md` 也记过"`File.copy` 未 await 导致副本消失"这个坑。到 `node_modules/expo-file-system` 的 Android 实现里确认 `copy` 是否异步，再把 `copyTrimSource` 及其调用方改成等待完成。
- 同时排查 `VideoTrimView` 准备阶段的其余步骤（`trimInfo`、播放器 `onLoad` / `onError`、缩略图）在这个修复之后是否还会把会话打成 failed；相册选片返回的地址形态（`file://` 缓存副本）要能被原生 `MediaExtractor` / `MediaMetadataRetriever` 读到。
- 准备阶段失败现在是静默的，排查成本高：在 `__DEV__` 之外也保留一条不含用户数据的 `console.warn`（只打印失败步骤名与错误 name / message，不打印文件路径），便于收货方从 logcat 看到是哪一步。
- 测试：给"工作副本拷贝完成后才继续"补一条会红的测试（现有 seam 里 mock 掉了拷贝，所以没红）——用一个延迟完成的拷贝桩，断言拷贝完成前不调用 `trimInfo`、完成后才调用。

其余已实装内容不动。结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过。不 commit、不 push；JOURNAL 追加"返修一"一节。

---

## 返修二（2026-10-04，Opus 模拟器收货后）

返修一后剪辑页能打开。以下已实屏通过，不要再动：页面结构与文案、10 张缩略图、"Selected" 标签、Save 后挂载并上传（训练日志一条）、导出精度（选 1.81–6.43 秒，上传文件时长 4.625 秒，首帧时间码 1.833 秒，逐帧准确）、原生编译（Media3 1.9.0）。

四项不通过，按顺序修：

### A. 从 Replace 进来取消后，原视频没了（验收 4）
- 复现：一组已挂视频且显示 "Delivered to coach" → 点 Replace → 选另一段 → 剪辑页点 ×（系统返回键同样）→ 回到组录入页，视频行变成 "Record / Photos"，原视频不见了。服务端没有收到 DELETE。
- 要求：取消或失败时，这一组原有的视频记录、播放器与状态原样保留。只有 Save 成功、新片段交给 `attach` 时才替换旧的。先查清旧记录是在哪一步被清掉的（是 UI 状态、`key` 变化导致的重挂载，还是真的调用了移除），把结论写进 JOURNAL。现有测试只断言"没有调用 remove"，没有断言"取消后该组仍显示原视频"——补这条会红的测试。

### B. 选满上限的片段被判"超过 120 秒"（验收 7）
- 复现：130 秒素材 → 剪辑页初始区间 2:00 → 不动把手直接 Save → 导出成功、组录入页播放器显示 2:00，但状态是 "Upload failed"，提示 "The video exceeds the 120-second limit. Trim it before uploading"。
- 落点：`native.ts` 的 `prepareTrainingVideo` 用 `metadata.duration > VIDEO_MAX_DURATION_SECONDS || (source.durationMs ?? 0) > …` 判断。可能是交给 `attach` 的对象还带着原素材的 `durationMs`（130 秒），也可能是导出片段因帧对齐成了 120.0x 秒。先确认是哪一个（或两个都是），再修：交给管线的时长必须是导出片段的时长；满上限的选择必须能通过校验（导出时把终点收在上限以内，或校验留出不超过一帧的余量，二选一并说明理由）。补会红的测试。

### C. 把手不跟手（验收 2、3）
- 实测（`adb shell input swipe` 沿时间轴水平拖动把手，轨道约 880 px 对应 8 秒）：
  - 220 px / 2000 ms → 把手移动 185 px；110 px / 2000 ms → 105 px；
  - 200 px / 500 ms → 123 px；200 px / 300 ms → 87 px。
  拖得越快丢得越多，像是手势被接管前的位移被丢掉了（按接管那一刻起算位移）。
- 要求：把手位置由触点的绝对位置决定（按下时记录触点与把手中心的偏移，之后把手中心 = 触点 − 偏移），整个拖动过程把手始终在手指下，与速度无关。上面四组拖动的结果误差都应在 10 px 以内。纯计算部分（触点 → 秒数）抽成可测函数并补测试；手势接管时机若无 jest seam，写明并由 Opus 用上述 adb 命令复测。

### D. 播放提前停止（验收 2）
- 复现：区间约 1.17–6.55 秒，点 Play。画面内烧录的时间码显示播到约 1.75–3.2 秒时（每次不同）就停了，按钮变回 Play，画面回到区间起点。应当播到区间终点才停并回到起点。
- 要求：先查清提前触发"到达终点"的原因（例如跳转前的旧进度回调、跳转未完成就开始比较、进度单位或时基不一致），把结论写进 JOURNAL 再改。补一条测试：跳转到起点后，来自跳转之前的进度回调不得结束播放。

结束前 `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过。不 commit、不 push；JOURNAL 追加"返修二"一节。这是本卡最后一轮定向返修。

---

## 收货记录（Opus，2026-10-04，安卓模拟器 + 本地合成服务）

验收清单逐项：

1. 通过。选 8 秒样片 → 剪辑页、10 张缩略图、"Selected 0:08"；直接 Save → 挂载并送达，训练日志一条。
2. 通过。把手跟手（三种速度下落点与目标相差 ≤ 1 px）；Play 播到区间终点后回到起点；Save 后原地播放器时长与所选一致。
3. 通过。把一端拖过另一端时会推着对方走，区间不小于 0.1 秒。
4. 通过。× 与系统返回键都回到组录入页；从 "Replace" 进来时原视频与 "Delivered to coach" 保持不变。
5. **未在模拟器验**：模拟器录不了像。回看页的 Edit / 提示行 / 不再提醒只有组件测试覆盖，留给真机。
6. 通过。选 [1.81 s, 6.43 s]，上传文件时长 4.625 秒，首帧烧录时间码 1.833 秒。
7. 通过。130 秒带音轨素材：初始区间 2:00，Save 后上传文件 120.000 秒，音轨保留，状态 Delivered。模拟器软件编码导出用了约 4 分钟。
8. 通过。不可读文件：不进剪辑页，回到组录入页显示处理失败，原视频保留。
9. 通过。360×640dp + 字体 1.3×：顶栏、时间轴、播放条完整可见。
10. 通过。148 suites / 1113 tests、lint、tsc；原生在验收树编译通过（Media3 1.9.0）。
11. 待 David 真机。

返修两轮（返修一：工作副本拷贝未等待；返修二：四项）。返修二之后由 Opus 补了两处小改：导出失败时也写一条脱敏日志；原生时长自检的报错带上请求与实际毫秒数。

**未解释项**：收货过程中有 5 次导出被原生自检以"时长偏差超过 0.1 秒"判为失败（当时日志还没有数值），之后 22 次受控复跑（含同一区间、播放后保存、整段、贴头贴尾）全部成功，没能复现。失败时界面提示处理失败、原视频保留，可重试。真机若出现，logcat 里 `[VideoTrim] export` 一行现在会带出请求与实际时长。

收货中用到的合成服务改动（在 scratch，不在本仓）：上传完成后把视频记入学员视频列表（否则 App 回前台对账会清掉本地记录，看起来像"取消后原视频消失"）；可选把收到的分片落盘以便 ffprobe。
