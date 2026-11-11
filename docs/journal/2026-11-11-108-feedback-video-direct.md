# 108 · Android 聊天反馈视频直接播放

## 2026-11-11 · David 直驱 T1 / P1

- 授权：iOS 完成后检查 Android；视频封面一次点开播放、保留教练标注；正文不再跳详情。两端 spec108 已同步增补。
- 基线：origin/main `ccc5f3b`（CN versionCode 11）；工作分支 `fix/108-feedback-video-direct`。未改版本号、签名、正式包或发布 tag。
- 根因：Android 封面早已有独立播放入口，但外层整卡 Pressable 仍导航反馈详情，正文点按会产生多余步骤。
- 修复：外层改为 View，删除 onOpen 和已无父按钮需要拦截的 stopPropagation；封面保留原 FeedbackPlaybackSession、FeedbackPlaybackModal 与播放器。布局、已读、标注、URL 续签、失败提示及失联视频兼容不变。

## 测试与审查

- 先红后绿：修改实际 StudentConversationScreen 渲染测试，验证纯文字 / 视频反馈正文无按钮祖先，封面一次点击得到正确 videoId、URL 和教练标注，关闭回聊天且没有路由跳转。旧实现 **2 failed / 39 passed**；修复后 **41 passed**。
- 全量 Jest：`npm test -- --runInBand --watchman=false` — **218 suites / 2285 tests passed**，137.549 秒，exit 0。
- `npm run lint` 与 `npx tsc --noEmit` 均 exit 0；`git diff --check` 通过。
- 独立只读一轮双轴审查：Standards CLEAN / Spec CLEAN。没有修复后语义变更。
- 原始 red/green/full-test/lint/tsc 日志位于本聊天 work/android-*.log；未使用线上账号或改写服务端数据。

## Android 实屏验证进度

- 指定 AVD `meetpr`（emulator-5556）；另一个 meetpr16 不动。使用 `expo run:android --device meetpr --app-id com.meetpr.app.feedbackqa --no-bundler` 构建独立 debug QA 包，不覆盖现有正式包。
- 模拟器窗口没有可供 cua_repl 绑定的应用 ID，按工具限制已请求 David 明确允许改用 ADB 点击 / 截图。此时不宣称设备验收完成。
- 临时 demo fixture 只用于本机视频与标注复现，不属于交付代码；完成后还原。它不能代替真实 OSS / Global 联调。

### 构建结果与交付

- 原生编译 **BUILD SUCCESSFUL in 4m 19s**，518 tasks（280 executed / 238 from cache）；已安装独立包 `com.meetpr.app.feedbackqa` 到 meetpr。Expo 随后使用自定义包名推导 `.MainActivity`，因真实 activity 仍属于原 namespace `com.meetpr.app` 导致启动步骤 exit 1；这是 QA 改包名造成的启动命令问题，非编译失败。设备点击授权后使用实际 activity 启动并验证。
- 两次 CLI 参数试运行分别因 --device 接受 AVD 名而非 serial、--port 与 --no-bundler 互斥退出，最终用上述命令成功编译。未切换 AVD。
- 源码 PR：#181（draft），实现 commit `50d4dc9`；在设备证据完成前不合并。本地临时 demo backend 已恢复，fixture 与原文件保存在聊天 work/android-fixture 以便续验，不进 PR。
