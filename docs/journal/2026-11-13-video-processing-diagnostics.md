# 本地视频处理诊断补齐

## 来源与范围

- David 直接要求：先补上本地视频处理失败的具体日志，让后续按学员账号和报错时间定位。
- 基线 `origin/main@a30e7169e2897ce37a383de39b39bc852d37370c`，分支 `fix/video-processing-diagnostics`。本次是可观测性修复，不是原始设备故障的根因修复。
- 使用现有 `client_error` 契约（domain/code/screen），`code = video.<stage>.<native_code>`。后端按认证会话关联账号；时间、App 版本、build、平台沿用已有事件信封。
- 不扩展后端、不改数据库、不新增产品界面、不改媒体编码策略。设备型号/系统版本/视频参数不在现有后端契约里，本轮不采集。未更改版本号、签名或发布态。
- 修复同一管线现有 `media_upload` 的字段错误：后端要求 `stage/context`，旧 Android 使用 `status/kind/attachment_id`。核对了当前 SAE 镜像对应源码 `0a8f1dc` 的 `src/routes/events/schemas.ts`，后者会被严格 props 校验拒绝。故历史零事件不能证明客户端没有尝试上传。

## 工程验证边界

- 沿用 R3 已批准的公开 seam：相册入口组件、native 媒体适配器、上传 manager；故障注入在相册/File/Compressor/TrainingVideo/播放器原生边界，诊断断言观察真实 AnalyticsQueue 发出的 HTTP 请求。
- 先红后绿：picker 无事件、trim copy/info/validation/preview/export 无事件、retain/metadata/tracks/compress 无事件、manager 发送旧字段均已跑出红测试后修正。
- 原生纯错误分类 seam：Media3 ExportException 数值错误码、固定校验失败原因、IO/权限异常，JUnit。Android SystemClock 在 JVM 测试里返回默认值；此测试不验证实际编码器行为。
- 上报先持久入现有队列再尝试立即发送；不阻塞界面，不绕过隐私确认、采样、服务端开关或现有重试机制。离线进程重启后补发已测试。
- code 只接受有限长度的符号码/数值；不上传 URI、文件名、原始异常 message/stack、视频内容。未知异常归 UNKNOWN。取消/已终结 trim 的晚到失败不作为新故障上报；缩略图失败仍可回退（`trim_thumbnails` 不必然是致命失败）。

## 查询约定

在原有事件查询里按账号、客户端/服务端时间限制，再匹配：

```sql
(name = 'client_error' AND props->>'code' LIKE 'video.%')
OR (name = 'media_upload' AND props->>'context' = 'set_log')
```

读取 `ts_client / ts_server / app_version / build / platform / props` 即可。
`video.trim_export.ERR_VIDEO_TRIM_MEDIA3_4001` 保留 Media3 原生数值码；
`video.trim_export.ERR_VIDEO_TRIM_BITRATE_UNKNOWN` 区分无法确定源码率；
`video.trim_copy.*` 是缓存读取/复制；`video.metadata.*` 与 `video.tracks.*` 区分两套元数据读取；`video.compress.*` 是压缩。

## 本机验证

- Jest：219 suites / 2333 tests 通过；最后 Nitro 桥接形状修正后定向 84 tests 通过（新增 1 条）。
- `npm run lint`、`npx tsc --noEmit` 通过。
- 原生 JUnit：3 tests 通过；`./gradlew :training-video:testDebugUnitTest assembleDebug --offline` 通过（7m16s）。CI 同步加入原生单测。
- 还未在问题设备上复现，不能声称已经修复原始视频兼容故障。
- 新诊断需要合并、打包、学员升级后才生效，不能补录旧版本的失败。实际后台入库仍需新包上线后核验。


## 独立审查与定向返修

- 使用 review-loop 本地双轴；仓内缺少 `docs/agents/issue-tracker.md`，已向 David 说明需 `$setup-matt-pocock-skills` 才能启用完整 Matt tracker 流程，本轮不伪建配置。
- Standards 首轮 1 个 P2：导出保存副本的晚到失败在取消后仍会上报。先红测试，再将复制逻辑隔离为内部 `copyVideoSource`，由外层 signal guard 决定报告；复审未决 0。
- Spec 首轮 2 个 P2：manager 缺文件入口绕过新日志；Compressor 2.0.3 Nitro 只传消息型异常。先红后绿覆盖真实 manager HTTP 和库异常形状。
- 第二轮定向返修：核对 Nitro/fbjni 桥接实际把 `java.lang.Throwable: ...` 及栈放到 Error.message；仅提取首行、剥固定前缀并匹配精确常量，剩余内容不出机。对应隐私回归先红后绿。Spec 最终未决 0。
- 后端 schema 只读校验：3 个生命周期载荷 + 6 个诊断载荷通过；旧 `status/kind` 载荷被拒绝（未向线上注入测试数据）。

## 2026-11-13 下一包纳入记录

- David 明确「进下一包」，授权合入 Android 发版线并纳入下一次 CN 包。
- PR #188 已于 2026-11-13 03:36 UTC squash 合入 `main`，提交 `b163075bdeeab25427a1dd0693ab77214d95e698`；合并树与通过审查的 `ae99de4524c9b7e053977cd6e4494e0e8983810f` 一致。
- PR CI [43357390523](https://github.com/tianpingdeng112233-cell/meetpr-rn/actions/runs/43357390523) 的 `check`、`android-build` 均成功：219 suites / 2334 JS tests，3 项原生 JUnit，Android debug 构建通过。
- 本轮实读 `https://dl.meetpr.cn/android/latest.json`：`com.meetpr.app`、`0.1.0(13)`、下载地址 `/android/releases/13/meetpr-cn.apk`。线上 CN13 不含本卡改动；本次只完成合入与下一包登记，尚未签名、上传或发布新 APK。
- 下一次 Android CN 切包必须包含 `b163075`；版本号切包时结合已发布与占号状态核定，不在本卡预占。保持原包名、签名及覆盖升级的数据保留要求。
- 新包验收：在授权测试账号用受控失败样本触发本地视频失败，确认后端 `client_error` 的 `video.<stage>.<code>`、账号、时间、版本可查询；正常上传确认 `media_upload.stage/context` 入库；取消操作不产生失败事件，原始视频/路径/消息/栈不进入事件。实际入库未核验前不得记为通过。
- 学员需升级新包后重试才能收集本次新增诊断。旧故障不能追补；原始鸿蒙视频兼容根因仍待真实错误码或样本验证。
