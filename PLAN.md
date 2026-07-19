# MeetPR 安卓端(RN)1:1 复刻方案 v1(2026-07-19,David 已拍 C)

> 决议:C——RN 先只做安卓,iOS 不动,保留日后双端收口期权。侦察报告见同目录 `meetpr-android-rn-vs-native-2026-07-19.md`。本文是施工蓝图;开工后本文迁入新 repo 作为 `PLAN.md`,scratch 副本即弃。

## 0. 复刻基线(对齐点)

- 基线 = **发版线 `release/1.0` 现头**(1.0(13) 所在 sha),开工时现场 `git -C apps/MeetPR log` 核实并 pin 死,记入新 repo PARITY.md 头部。main 上「降级待分诊」的内容**不进**复刻范围。
- 照抄的裁决:评估期硬封存(BindGate 直进 5 tab、接收弹窗恒跳过)→ 安卓端同样封存,不做评估 UI;iOS xlsx 导入已封存 → 不复刻(导入正典在 plan-web)。
- 「1:1」的定义:**信息架构、屏清单、交互流程、视觉 token 一比一**;但遵守安卓系统惯例(系统返回键/手势、Material 状态栏、无 iOS 左滑返回),不做 iOS 拟物。此条为 UI 闸门口径。

## 1. 技术底座(工程细节,已定)

| 层 | 选型 | 对应 iOS 现状 |
|---|---|---|
| 框架 | Expo(最新稳定 SDK)+ TypeScript + Expo Router,New Architecture | SwiftUI + AppShell 路由 |
| 状态 | TanStack Query(服务端状态)+ Zustand(本地轻状态) | @Observable MVVM |
| 网络 | 自写 fetch 封装,按域拆文件 1:1 移植 12 个域(Plans/Sets/Feedback/Uploads/StudentVideos…),DTO 从 Swift 机械转译成 zod schema | APIClient + DTO/Mapping |
| OSS 上传 | JS 实现分片直传(对齐 OSSPartUploader 协议) | OSSPartUploader.swift |
| 凭证 | expo-secure-store | Keychain TokenStore |
| 本地持久化 | MMKV/AsyncStorage + zod(仅计划草稿三模型) | SwiftData 3 @Model |
| 视频选片 | expo-image-picker(相册选片,app 不自录,与 iOS 同口径) | PhotosPicker |
| 视频压缩 | react-native-compressor(系统编解码器;对齐 iOS「1080p 能 passthrough 则免重编码」口径;**禁用 FFmpegKit 路线,已死**) | AVFoundationVideoExporter(64 行) |
| 视频播放 | react-native-video(0.5/1.0/1.5/2.0x 变速) | CoachVideoPlayerView(165 行) |
| 图表 | victory-native(Skia)两张:e1RM 曲线、容量/强度 | Swift Charts 2 处 |
| 设计系统 | DesignSystem tokens(色/字/距)先行移植成 RN 主题包 | Modules/DesignSystem(2.7k 行) |

## 2. 仓库与流水线

- 新 repo `~/Projects/apps/meetpr-rn/`(GitHub private;包名占位 `com.meetpr.app`,可改)。
- CI:GitHub Actions **ubuntu runner**(lint + tsc + jest + android debug assemble)——不占 macOS runner,不加剧 iOS CI 账单。
- 协作:老流水线不变——Claude 拆卡 → Codex 实装(一卡一原子 diff)→ review-loop 互审 → Claude build/verify + PR。安卓验证 = Android 模拟器亲眼看 + 截图为证(证据纪律同 iOS 模拟器)。
- **PARITY.md 复刻台账**(1:1 的账本):从 iOS 屏清单(约 40-50 屏,学员 11 功能区 + 教练 10 功能区)生成逐屏三态表:未开工 / 已实装 / 已走查对齐。每张卡收货必须更新台账。走查对齐以走查 hub 两份报告(学员 36 + 教练 20)为镜像检查单——iOS 修过的坑安卓不许重犯。
- W0 脚手架卡内置国内镜像:npm→npmmirror、Gradle→阿里云 Maven。

## 3. 分波(W0–W4)

**W0 地基(约 5-7 卡)**:脚手架/CI/设计 tokens/fetch 客户端+auth 全链(登录→token 刷新→登出,对 staging 冒烟)/5-tab 导航骨架 + BindGate(评估封存照抄)。
出口验收:安卓模拟器用 staging 测试账号登录,看到 Dashboard 骨架。⚠️ W0 同时做**后端兼容冒烟**:核实 auth/UA/平台字段无 iOS 假设;`POST /events` 埋点的 platform 维度是否接受 android 值。

**W1 学员端(约 10-12 卡,内测主流程优先)**:TodayWorkout(组卡/RPE 建议重量/RIR 白话/教练备注)→ TrainingHistory / WeekOverview / Readiness → Bind / Onboarding → FeedbackInbox / VideoUpload(选片+压缩+OSS 分片)→ MyProfile / Dashboard(含 e1RM 图,口径按 spec 050,别硬编码阈值)。
出口:学员端全屏走查(/walkthrough 安卓版)对齐 36 项报告。

**W2 教练端(约 8-10 卡)**:StudentRoster / StudentDetail / BindQueue / InviteCodes / Receiving / Dashboard / MyProfile / Planning。⚠️ PlanningWorkspace(iOS 最大单块,19.4k 行里的大头)开工前现场核实 iOS 端实际保留多少教练编排功能——计划编写正典已在 plan-web,若 iOS 端只是查看/微调,安卓照抄同等范围,**不扩权**。
出口:教练端走查对齐 20 项报告。

**W3 视频回放 + 图表 + 打磨(约 4-5 卡)**:CoachVideoPlayer 变速回放、两张图表、全局视觉 polish、双端并排截图对比 pass。

**W4 真机与分发一级(约 4-5 卡 + 人工环节)**:真机矩阵抽查(至少小米/华为各一台)、release keystore 签名、**分发一级上线**(海外静态下载页 + APK,见 §6)、app 内自更新检查(无商店则必做:启动时查版本号→提示跳下载页)、隐私清单初版。

粗估合计 30-38 卡;80% 是 CRUD 直译,Codex 波内可并行。日历量级 4-6 周(按现有投入节奏),W0 一周内可见登录+骨架。

## 4. 人工环节前置预警(David 侧,越早启动越好)

1. **安卓测试真机**:至少 1 台(建议小米或华为,贴国内用户盘),W3 前到位;W0-W2 模拟器够用。
2. **release keystore**:W4 初、第一个对外 APK 之前定稿(此后终身不可换),密码入 Bitwarden,永不入 repo/对话。
3. **商店资质长周期项**:按 §6 三级分发路径分摊——一级零要求;二级前启动 App ICP 备案(含包名);三级前备齐软著+各商店开发者账号。包名 `com.meetpr.app` 一旦进备案/商店即锁死,要改趁一级之前。
4. GitHub 新 repo 创建与 Actions 开通(Claude 可代办,标记确认)。

## 5. 风险与止损

- **视频压缩机型碎片**(唯一技术硬风险):react-native-compressor 若在部分机型压缩质量/时长异常 → 止损方案 = 该机型降级直传原片(OSS 存储成本换稳定),后端不用改。
- **后端隐藏 iOS 假设**:W0 冒烟专门排查;发现即开 backend 小卡(staging 分支)。
- **1:1 视觉漂移**:PARITY.md + 双端并排截图 pass 兜底;有争议回 iOS 实机截图为准。
- **范围蠕变**:安卓端 v1 严格 = 复刻,不带任何新功能;新想法进待拍板队列,不上这班车。

## 6. 发布口径(⚖️2026-07-19 David 拍板:三级分发路径)

分发按三级递进,每级只在需要时才触发下一级的合规成本:

- **一级:海外网页分发 APK**(W4 出口)。静态下载页 + APK 托管在境外(默认 Cloudflare Pages/R2;GitHub Releases 备选但国内下载慢),零备案要求,当天可上线。受众=内测员;安卓侧装 APK 需允许"未知来源",下载页写一行引导。
- **二级:国内网站分发 APK**。下载搬进境内(可复用后端同源 121.40.160.241 静态托管,类比 plan-web)。触发合规:**App ICP 备案**(2023 起境内分发即要求,含包名);若上独立域名则另需网站 ICP。人工环节,周期以周计,进入二级前启动。
- **三级:国内安卓商店上架**(华为/小米/OPPO/vivo)。在二级基础上追加:**软著**、各商店开发者账号、隐私政策+SDK 收集清单逐商店提审。另立里程碑,不占 W0-W4。
- **签名红线**:release keystore 在**第一个对外 APK 之前**(W4 初)就定稿并终身沿用——安卓覆盖安装认签名,一级到三级必须同一 keystore 同一包名,否则老用户无法升级只能卸载重装。密码入 Bitwarden。
- **自更新**:一、二级无商店通道,app 内版本检查(启动时对后端版本接口→提示跳下载页)是必做件,已并入 W4;JS 层热更(Pushy)作为后续可选项,不进 v1。
- 节奏:类比网页端——直发迭代,不受 iOS P0-P2 班车约束,跨端问题各按各的节奏。iOS 侧零影响:发版线、prep-beta、台账流程全部照旧。
