# Spec 116 · 安卓卡 C（终审修复 + 圆盘放大）

2026-11-28。David 明确要求这张卡不派 Codex、由 Claude 直接实装（已派出的 Codex 任务在动文件前取消）。同日 David 改拍：本功能进下一班（下一个 CN 包）。

## 改了什么

1. **学员看教练反馈视频时存相册失败**：`FeedbackVideoPlayer` 自带一个 `BadgeCaptureHost`（`handoffOnDismiss`）。各页面把它放在 RN `Modal`（独立窗口）里，根宿主在弹窗后面收不到布局。测试：`video-badge-overlay.test.tsx` 新增「播放器自带截图宿主」，先红后绿。
2. **烧录超时从烧录开始计时**：`gallery-save.ts` 的 `burn()` 增加 `onStart` / `onYield` 钩子。录完保存：预留与等待阶段用外层上限 `badgeTiming.waitCapMs`（10 分钟）+ 烧录预算，烧录真正开始时才把计时器重置为 max(60 秒, 4×片长)。回放保存同样处理。测试：`camera-review.test.tsx` 把原「60 秒看门狗」用例改为「等待不消耗烧录预算、到外层上限才发布原片」，并新增「等待 90 秒后才开始的烧录仍拿到完整预算并存下带角标版」。预留调用的超时参数由 60000 变为 660000，两处断言同步。
3. **「使用视频」不再排队，后台烧录可被抢占**：`SerialTaskQueue` 新增 `runUserTask`（立即执行、不进队列）与 `enqueuePreemptible`（用户任务进来时收到 `yielded` 中止信号，用户任务结束后从头重做；中止后 5 秒仍不返回则放弃这次调用，队列继续）。录制后的裁剪和相册选片的裁剪走 `runUserTask`；烧录走 `enqueuePreemptible`，被抢占时调用原生 `cancelBadge`、把计时器退回等待上限，不视为失败、不发布原片。上传压缩仍在串行队列里，与用户裁剪互不等待（与卡 B 之前一致）。`enqueue` 的既有语义未改（其它功能也在用这个类）。测试：`serial-task-queue-preemption.test.ts`（6 条）与 `burn-preemption.test.ts`（A 的烧录进行中发起用户裁剪 → 取消一次、不发布、裁剪结束后重烧、最终只发布一次带角标版），均先红后绿。
4. **圆盘放大**：`VideoBadgeCard` 第一行圆盘占位 23u → 27u、与字标间距 7u → 6u，行高与卡片高度不变。测试：`video-badge-overlay.test.tsx` 断言 scale 2 时圆盘为 54。

另：卡 B 收货时由 Claude 给 `GalleryExportButton` 加了深色圆底（已在卡 B 提交里）。

## 验证

- `npx tsc --noEmit`、`npm run lint` 通过；全量 jest 237 套 2589 项通过。
- `./gradlew :training-video:testDebugUnitTest`、`./gradlew assembleRelease` 通过。
- 模拟器 meetpr16（API 36）：冷启动；连续给第 1、2 组各录一段并点 Use——第二段的录制页在第一段点 Use 后 2 秒内就能打开，两次 Use 都立即回到训练页，相册几秒内新增两条带角标视频；成片与录完预览页上的圆盘已与字标等高。
- 更正卡 B 记录里的「一次全量 jest 报 35 套失败、原因未查明」：原因是那几次在同一个 shell 里先导出了出包用的 `EXPO_PUBLIC_DEMO_MODE=1`、`EXPO_PUBLIC_BUILD_TRACK=china` 再跑 jest，测试读到了演示模式和 CN 轨。去掉这两个变量后稳定全绿，不是偶发失败。

## 未验

- 学员反馈视频的存相册（修复点 1）在设备上没法走：演示数据里没有教练反馈视频，只有组件测试覆盖。
- 抢占后重烧在设备上的实际表现（模拟器上两段都很短，第一段的烧录在第二段裁剪前已结束；本次第二段也没有改动选区，不触发裁剪）。
- 弱网或离线下等待上传准备的真实时长；弱机型、厂商后台冻结；横拍与 3:4；中文与繁体排版；带历史老账号升级后第一屏。
- 终审的次要项未处理：模块销毁时的预留竞态、切后台立即发布原片（比规格的约 10 秒宽限更严）、回放导出文件名与录完保存不一致。
