# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# meetpr-rn 身份卡

MeetPR 安卓端(React Native/Expo)。⚖️2026-07-19 拍板 C:RN 只做安卓,iOS(`apps/MeetPR`,SwiftUI)保持不动;本仓目标 = **1:1 复刻 iOS `release/1.0` @ `202e95db` 的 Global 轨**(⚖️2026-09-04 重 pin + 海外优先;旧基线 3799f67 已废),遵守安卓系统惯例,v1 严禁夹带新功能。英文为主语言,CN 轨 v1 不做。

## 三份根文档
- `PLAN.md` — 施工蓝图(W0-W4 分波、技术底座、三级分发路径)。改动方向先读它。
- `PARITY.md` — 逐屏复刻台账,**每张卡收货必须更新**。
- `docs/w0-reference/` — 从 iOS 仓提取的复刻参照包(tokens/auth/导航/埋点)+ backend 假设排查。

## 技术底座(已定,别重新发明)
- Expo SDK 57 + TypeScript + expo-router(src/app 布局);TanStack Query + Zustand;zod 做 DTO 运行时校验。
- 视频压缩:react-native-compressor。**禁用 FFmpegKit 路线(2025-04 已死)**。播放:react-native-video。图表:victory-native。
- 凭证:expo-secure-store;密码/密钥永不入 repo/对话。

## 红线
- 包名 `com.meetpr.app` 与 release keystore 一经对外发包终身锁死。
- CI 只跑 ubuntu runner,不碰 macOS runner。
- 评估期硬封存照抄(BindGate 直进 tabs),xlsx 导入不复刻(正典在 plan-web)。
- 后端 = Global 生产 `https://api.meetpr.app`(DO NYC + R2);CN staging `121.40.160.241:3000` 仅作对照。原则零后端改动;发现 iOS 假设开 backend 小卡,不在本仓绕(已知一张:Google 多 audience)。
- 凭证/密钥(Google OAuth client、keystore、测试账号密码)只在 Bitwarden,永不入卡与对话。

## 协作
- Claude 拆卡/审/PR,Codex 实装(一卡一原子 diff),review-loop 互审;Codex 作业不 commit/push。
- 验证:Android 模拟器(AVD `meetpr`)亲眼看 + 截图为证;`npx expo run:android`。
- 本机 gotcha:Bash 非登录 shell 需 `export PATH="/opt/homebrew/bin:$PATH"`;`JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`;`ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`。
