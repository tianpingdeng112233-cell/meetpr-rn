# 全天一览组行视频上传填充

David 已确认 11 月 15 日 HTML 动效。范围为 Android 全天一览的编辑日与完成日。验收包括未上传、上传 42%、传满待确认、已送达、老记录及恢复/重试。测试 seam 为训练组行、原生 multipart 的进度回调及送达事件。预览面板、上传协议、签名与公开分发不在此卡范围内。

Android 基线为 `main@ff2231f`，目标 CN15（P1）。沿用现有原生 `FileSystem.createUploadTask` 的 `totalBytesSent`。Multipart 对已恢复的 ETag 和每个活动 PUT 以实际字节加权，短尾分片只计实际长度。更换视频、重传与送达继续使用现有队列和状态事件。

## 验收

| 检查 | 结果 |
| --- | --- |
| 编辑日、完成日与点击入口 | 增加各自的红测试并转绿。完成后可回放，未上传可拍摄，已传满但未绑定的记录为黄色实心。 |
| 重试与 TalkBack | 复现旧错误标签和重试时红色半填的两项独立审查发现，修正后 22/22 组行测试通过。活动传输优先显示黄色并报告在传与进度；旧错误的详情/重试操作仍在原入口。 |
| 29% 初测 | 真实 Android 原生画面暴露 SVG ClipPath 裁剪未显示，改用锚在底部、按摄像头可见高度计算的原生 View 裁剪。 |
| 设备复测 | AVD `meetpr16`、`emulator-5570`、Android 16。既有独立 debug 壳 `com.meetpr.global.historyqa` 运行本卡 Metro 代码与正常编辑组行摄像头；同屏百分比和按钮为取证夹具。带有效 MP4 free box 的视频共 17,303,573 字节。3 个 5 MiB 分片加 1,574,933 字节短尾片真实 PUT 至限速本地服务，complete 回应单独放行。 |
| 画面 | 传输停在 [30%](evidence/camera-fill/partial.png) 时同一摄像头下方取样 #D97706，上方为白色；[传满待确认](evidence/camera-fill/full.png) 两处均 #D97706；[收到确认后](evidence/camera-fill/delivered.png) 两处均 #15803D。 |

摄像头和 multipart 使用本卡实际代码。限速 PUT 与 complete 确认在本机测试服务验证，未操作生产账号或公开上传。原生 QA 壳未重签；最终 Android 客户端仍由下一班车正常签名打包。

## 工程验证

编辑日原先只有轮廓、完成日切换后仍无填充的两条回归先红后绿；multipart 并行分片及断点字节用例继续通过。独立 Standards 的 TalkBack 语义、Spec 的旧失败记录重传颜色均增加回归并定向返修。Android 原生截图复检替换了原先不可见的部分填充。

`tsc --noEmit`、改动文件 ESLint、`git diff --check` 通过。全量 Jest 220 套 / 2,377 项通过（exit 0）；退出时有 worker 清理提示。初跑曾因本机临时空间不足中断一次，已以完整重跑结果验收。

通过真实 CN 生产入口导出 Android Hermes bundle，2,598 个模块、7.8 MB HBC。验收夹具与对本地服务的地址均未入生产源码或该 bundle。

全仓 `CI=1 npm run lint` 通过（exit 0）。独立 QA 应用的临时调试服务器设置、验收视频和生成的那一条本地夹具记录已清理。

### PR 验证

GitHub 两次运行的 2,377 项中，均只有相册剪辑套件的首条测试因 5 秒超时失败；此前纯文档 PR #195 的基线也出现同一路径。局部冷缓存测试用时 4,124 ms，暖缓存 201 ms。沿用相机套件的首次挂载预热做法，在 beforeAll 用原 fixture 打开剪辑页并完整卸载。各用例保留原超时及复制前后的断言。改后冷缓存用时 30 ms，剪辑套件 67/67 通过。
