# 学员视频链参照包 v2(iOS specs 063/064/065/068/069/070/078 @ release/1.0 202e95db)

> ⚖️2026-09-05 重 pin 后补写,取代 `peripheral-screens.md` §4。iOS 在 8 月把视频链整条重做:控码率导出(065)→ 自建录制相机 + 直通快路(068)→ 后台无感上传 + 失败冒头(069)→ 组内回看 + 本地留存(070)→ 打点/标注帧(063/064)→ 角标浮层 + 烧录导出(078)。本文给每一块的**行为契约**与**安卓等价实现口径**;`w1h` 悬空 worktree 的首版(选片 + 压缩 + 分片)是这条链的子集,复核时按本文重对。

## 0. 分卡建议
- **W1-h(核心链,一卡)**:§1 录制 + §2 导出/直通 + §3 上传管线(含重试调度器、失败冒头、UI 降噪)+ §4 本地留存与组内回看 + consent。可独立验收:录 → 秒级就绪 → 静默上传 → 教练端可播;杀 app 后续传。
- **W3-video(播放与传播,一卡)**:§5 共享播放器(打点列表/seek/标注帧覆盖)+ §6 角标浮层;**烧录导出**(§6 后半)安卓需视频合成能力,FFmpegKit 已禁 → ⚖️待拍板(A. 用 MediaCodec/`react-native-video-processing` 类库自研合成;B. 安卓 v1 不做烧录,只做浮层;推荐 B,W4 前复核)。

## 1. 录制(spec 068 → 安卓 `expo-camera`)
- 入口两处:SetEntrySheet「拍摄」chip 与训练页相机直达;无相机设备(模拟器)隐藏「拍摄」,相册路径不受影响。
- 全屏自建相机:预览 + 大圆录制/停止 + 计时(已录 mm:ss / 上限倒数)+ 关闭;`maxDurationSeconds = 120` 到点自动停(参数驱动,不硬编码);后摄默认;竖屏。
- 停止后**回放确认态**:循环回放 + 「重拍 / 使用」+ 「保存到相册」toggle(默认开,偏好持久化,下次预填);「使用」→ 回调文件 URL,并按 toggle 存相册(add-only 权限,首次开 toggle 时才请求;存相册失败不阻塞上传,toast 提示)。
- 参数:720p(1280×720),优先 60fps 否则 30;H.264 均码率 ≈2.75 Mbps、硬顶 3.5 Mbps;AAC 96 kbps;fast-start mp4。**安卓**:`expo-camera` `recordAsync({ maxDuration, quality: '720p' })`;码率不可直接控 → 录完交 §2 判定,不达标走转码。
- 中断(来电/切后台/权限吊销)落干净态:删残片、停 session、可重进。权限被拒 → 引导去设置态。

## 2. 导出:直通快路 + 控码率转码(specs 065/068 → `react-native-compressor`)
- **passthrough 判定纯函数**(输入轨道参数,输出 passthrough/transcode):视频 H.264 且长边 ≤1280 且码率 ≤3.5 Mbps,音频(若有)AAC ≤128 kbps → 只重封装 fast-start mp4,不重编码;否则转码。
- 转码目标:H.264,长边 ≤1280(等比只降不升),≈2.5–3 Mbps,帧率跟源,AAC 96 kbps,fast-start;**必须保留竖屏方向**;取消 → 残片删除;失败 `exportFailed(reason)`。
- 安卓:`react-native-compressor` `Video.compress(uri, { compressionMethod: 'manual', maxSize: 1280, bitrate: 2_750_000 })` + `getVideoMetaData` 做判定;达标源跳过压缩(compressor 无纯 remux,直接原文件上传即等价)。
- 「处理中」态因直通近乎瞬时,**不再渲染 spinner**(逻辑态保留)。

## 3. 上传管线(spec 069)
- 顺序与幂等不变:attach(先冲刷已输数字 → `ensureLoggedSetID` 懒建 set log)→ export → initiate(`kind=set_video`,`filename setlog-<setLog>-<id>.mp4`,`set_log_id`)→ 5 MB 分片 PUT 并发 3 → complete;删除附件可取消在途并清远端;一组一视频。
- **成功路径零 UI**:附件行不显示进度/百分比/勾/转圈——附件在就是在,可删除/更换。失败终态才显示「上传失败 + 重试/删除」。
- **重试调度器 `UploadRetryScheduler`**(纯逻辑,可测):输入 = 失败类型/次数/首次失败时间/网络状态 → 输出 立即重试 | 定时退避(1/2/5/10/15 分钟五轮)| 终态失败。网络类(超时/断网/5xx/签名过期)走退避,**网络恢复立即插队**;确定性 4xx(时长超限/损坏/鉴权失效)**第一次即终态并冒头**;无法归类按网络类处理;自首次失败 **30 分钟**未成功 → 终态 + 本地通知「有 N 条训练视频没传成功,打开看看」(聚合,provisional/安静通知;授权失败不影响上传)。首次失败时间与计数持久化,重启后按剩余窗口继续。
- **分片进度持久化**:每片 etag 落本地,重启/唤醒后断点续传不从第 1 片重来;OSS/R2 签名过期(长退避后 PUT 403)→ 删远端旧 attachment → 整条重新 initiate(不加重签端点)。
- 临时分片文件随 上传成功 / 附件删除 / 终态失败清理 三路径回收,不留孤儿。
- **杀 app/锁屏/切后台不断传**(iOS background URLSession):安卓等价 = 前台服务上传(通知栏「正在上传训练视频」)或 WorkManager;**v1 口径**:进程内上传 + 每片 etag 持久化 + 冷启/回前台自动续传;真后台续传另开小卡(需前台服务原生模块,⚖️待拍板是否引入 `expo-foreground-service` 类依赖)。PARITY 标为已知偏差。
- Global 后端存储 = R2(initiate/part/complete 协议与 OSS 相同,客户端无感)。埋点 media_upload started/succeeded/failed 沿用。

## 4. 本地留存 + 组内回看(spec 070)
- complete 后**不再立即删**导出文件,保留 `localFileName` 供组间回看。
- 清理:①冷启动清扫「已上传且非当天(设备本地日)」的本地文件并置空 `localFileName`;②附件删除/更换即时清理;③终态失败/取消残片三路径不变;④总量 >500 MB 按最旧优先清到限内。清扫决策抽纯函数。
- 组录入页 attached 态加**播放入口**(「视频」label 区可点,play 图标 + 状态行保留);本地文件在 → 播本地;已清 → `GET /uploads/:attachmentId/url` 现取短链播云端(不缓存 URL);弱网错误态一行 + 重试;**扫视态零改动**(组列表/训练列表/今日页不加播放)。播放器 = 共享播放器纯回放形态(无打点列表)。安卓播放:`react-native-video`。

## 5. 共享播放器 + 打点(specs 063/064,学员端只读)
- 学员端反馈详情/收件箱两处入口用**同一共享播放器**;`GET /videos/:videoId/markers` → `{ id, video_id, coach_id, time_ms, level(info|warn|bad), note(≤500,默认 ''), created_at, attachment_id?, annotation_url?(900 s 签名), annotation_expires_in? }` 按 `time_ms` 升序;404/网络错 → **静默隐藏打点块**。
- 进度条琥珀刻度 + 打点列表(只读);点击 → seek 到 `time_ms`(容差)+ 时间显示同步;带 `annotation_url` 的行加 ✏️ 徽章,点击 → seek + **暂停** + 覆盖显示标注帧(黑底 contain);点覆盖层关闭,不自动续播;加载失败(签名过期)→ 关闭覆盖并触发一次 markers 重拉。三字段可缺省,老后端不失败。

## 6. 角标(spec 078)
- 浮层版 `VideoBadgeInfo { exerciseName?, weightKg?, reps?, rpe?, setOrdinal?(1-based,调用点给), coachName? }`,nil 字段隐藏对应块;全屏播放默认展开,点卡收起为 logo 圆标(不持久化);不得遮挡打点条与播放控制。式样正典 `docs/design/video-badge/badge-01.html`(iOS 仓):卡宽 468/960 画布、底边距 76、圆角 14、底 rgba(10,10,12,.62) + 1px 白 10% 描边、字标 PNG、数字 30/20、「× N」#B6B6BC、RPE 胶囊 22 高 金 15% 底 42% 描边、卡下 44% 高渐变压暗。
- 烧录导出(加「教练:<名>」署名行、存相册、教练端导出弹学员同意)→ 安卓 ⚖️待拍板(见 §0)。

## 7. 对 w1h 悬空实装的复核清单
- 已有:consent 首弹、懒建 set log、选片/拍摄(`expo-image-picker` 系统相机)、compressor 转码、5 MB×3 分片、重试 2 次、中断标 failed、组行状态指示、进度 UI。
- 要改:①拍摄换 `expo-camera` 自建相机 + 回放确认 + 存相册 toggle(§1);②加 passthrough 判定,达标不转码(§2);③**删进度/百分比/勾/转圈 UI**,加失败终态 + 重试(§3);④加重试调度器 + 30 分钟时间盒 + 本地通知冒头(`expo-notifications`)+ etag 持久化续传(§3);⑤complete 后保留本地文件 + 清扫策略 + 组内播放入口(`react-native-video`)(§4);⑥文案走 `t(key)`(`setEntrySheet.*` / `videoAttachmentSection.*` 现场核 key),视觉走 v3 tokens。
- 依赖:`expo-camera`、`expo-media-library`、`react-native-compressor`、`react-native-video`、`expo-notifications`、`expo-file-system`(已有);`expo-image-picker` 保留相册选片。全部 T2 新依赖,需原生重建。
- 测试 seam:`upload-retry-scheduler.test.ts`(决策表:退避序列/网络恢复插队/4xx 直终态/30 分钟时间盒/重启剩余窗口)、`passthrough-eligibility.test.ts`(码率/编解码/尺寸/音频边界)、`local-retention.test.ts`(当天保留/隔天清/超额清/删换即清/播放源选择)、`multipart.test.ts`(etag 持久化 round-trip、三路径回收、签名过期重 initiate)、`consent.test.ts`(沿用)。
