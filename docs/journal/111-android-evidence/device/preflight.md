# spec 111 Android 真机前置取证（2026-11-17）

本文件只证明设备、旧包和准备状态；没有取得 spec 111 真机截图/录屏。

- `gh pr view 208`：OPEN，`feat/111-rest-timer-ring@02a8da36` → main；验收包基于该分支，不合并实现 PR。
- `adb devices -l`：`10AECF1CX90020R device`，V2405A / PD2405；Android 16。
- `dumpsys package com.meetpr.app`：versionName 0.1.0 / versionCode 15；`firstInstallTime=2026-10-17 16:16:57`，`lastUpdateTime=2026-11-16 15:31:29`（设备原样输出，未换算时区）。
- 只读取并拉取已安装 base.apk，使用 apksigner 核验公开证书指纹：`bef954dce0a6c56c6586b2d375f1067f1c29eca7e8a6b58e5e8102966508b746`。没有读取私钥/keystore、口令或账号数据。
- 前台窗口为 `com.meetpr.app.accept112/com.meetpr.app.MainActivity`，可能是另一会话的验收。已请求 David 确认本机独占；未获回复前没有点击、切换、安装、锁屏或终止任何包。
- 新验收工作树依赖：`npm ci --offline --no-audit --no-fund` 成功，既有 `react-native-video@6.19.2` patch 应用成功；没有源码修改。
- 依据 `/android-cn-release` 的人工作业边界，准备了一次性本人签名向导，并以 `bash -n` 验证。仅本机验收，保留 versionCode 15；没有改发版号、生成 latest.json 或上传。签名结果尚未收到。
- 未使用任何 Android 模拟器，没有重启 ADB server；未调整电池策略、高耗电设置或用强制杀进程冒充 vivo 自然冻结。
