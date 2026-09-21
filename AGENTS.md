# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# meetpr-rn 身份卡

MeetPR 安卓端(React Native/Expo)。⚖️2026-07-19 拍板 C:RN 只做安卓,iOS(`apps/MeetPR`,SwiftUI)保持不动;本仓目标 = **1:1 复刻 iOS `beta/1.0-22` @ `0748931563fefea14e7f50a7c9ee7330b5501bea` 的 Global 轨**(David 2026-09-21 授权追齐 build 22;历史参照包保留原 SHA),遵守安卓系统惯例,v1 严禁夹带新功能。英文为主语言,CN 轨 v1 不做。

## 三份根文档
- `PLAN.md` — 施工蓝图(W0-W4 分波、技术底座、三级分发路径)。改动方向先读它。
- `PARITY.md` — 逐屏复刻台账,**每张卡收货必须更新**。
- `docs/w0-reference/` — 从 iOS 仓提取的复刻参照包(tokens/auth/导航/埋点)+ backend 假设排查。

## 技术底座(已定,别重新发明)
- Expo SDK 57 + TypeScript + expo-router(src/app 布局);TanStack Query + Zustand;zod 做 DTO 运行时校验。
- 视频压缩:react-native-compressor。**禁用 FFmpegKit 路线(2025-04 已死)**。播放:react-native-video。图表:react-native-svg(现有手绘实现)。
- 凭证:expo-secure-store;密码/密钥永不入 repo/对话。

## 红线
- 包名 `com.meetpr.app` 与 release keystore 一经对外发包终身锁死。
- CI 只跑 ubuntu runner,不碰 macOS runner。
- 评估期硬封存照抄(BindGate 直进 tabs),xlsx 导入不复刻(正典在 plan-web)。
- 后端 = Global 生产 `https://api.meetpr.app`(DO NYC + R2);CN staging `121.40.160.241:3000` 仅作对照。原则零后端改动;发现 iOS 假设开 backend 小卡,不在本仓绕(已知一张:Google 多 audience)。
- 凭证/密钥(Google OAuth client、keystore、测试账号密码)只在 Bitwarden,永不入卡与对话。

## 协作
- Codex 主代理负责拆卡、实装、验证、独立双轴审查、PR 与台账;被委派的实现子任务不 commit/push。一个 worktree 一个写者。T2 PR 等 David 合并。
- 接手 build 22 或准备分发时读 `specs/build22-parity/SPEC.md` 与 `docs/verification-build22-2026-09-21.md`;本地 fixture 验证不代表 Global 联调或全屏视觉验收完成。
- 验证:Android 模拟器(AVD `meetpr`)亲眼看 + 截图为证;`npx expo run:android`。
- 本机 gotcha:Bash 非登录 shell 需 `export PATH="/opt/homebrew/bin:$PATH"`;`JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`;`ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`。
