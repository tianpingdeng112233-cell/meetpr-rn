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
