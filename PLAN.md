# MeetPR 安卓端(RN)1:1 复刻方案 v1(2026-07-19,David 已拍 C)

> 决议:C——RN 先只做安卓,iOS 不动,保留日后双端收口期权。侦察报告见同目录 `meetpr-android-rn-vs-native-2026-07-19.md`。本文是施工蓝图;开工后本文迁入新 repo 作为 `PLAN.md`,scratch 副本即弃。

## 0. 复刻基线(对齐点)

- 当前复刻基线 = **`beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea`**(David 2026-09-21 授权)。历史 pin 为 `3799f67` → `202e95db`；本轮按已交付 specs 080–083 追齐，范围与证据见 `specs/build22-parity/SPEC.md` 和 `docs/verification-build22-2026-09-21.md`。Global 轨保持不变，main 上降级待分诊内容不自动纳入。
- 照抄的裁决:评估期硬封存(BindGate 直进 tabs;学员与教练均为 4 个常驻 tab、接收弹窗恒跳过)→ 安卓端同样封存,不做评估 UI;iOS xlsx 导入已封存 → 不复刻(导入正典在 plan-web)。
- 「1:1」的定义:**信息架构、屏清单、交互流程、视觉 token 一比一**;但遵守安卓系统惯例(系统返回键/手势、Material 状态栏、无 iOS 左滑返回),不做 iOS 拟物。此条为 UI 闸门口径。

## 1. 技术底座(工程细节,已定)

| 层 | 选型 | 对应 iOS 现状 |
|---|---|---|
| 框架 | Expo(最新稳定 SDK)+ TypeScript + Expo Router,New Architecture | SwiftUI + AppShell 路由 |
| 状态 | TanStack Query(服务端状态)+ Zustand(本地轻状态) | @Observable MVVM |
| 网络 | 自写 fetch 封装,按域拆文件 1:1 移植 12 个域(Plans/Sets/Feedback/Uploads/StudentVideos…),DTO 从 Swift 机械转译成 zod schema | APIClient + DTO/Mapping |
| OSS 上传 | JS 实现分片直传(对齐 OSSPartUploader 协议) | OSSPartUploader.swift |
| 凭证 | expo-secure-store | Keychain TokenStore |
| 本地持久化 | AsyncStorage + zod(草稿、偏好、持久 e1RM 点及上传状态) | SwiftData 3 @Model |
| 视频选片 | expo-image-picker 相册选片 + expo-camera 自建录制(现有 spec 068 实装) | PhotosPicker + 自定义录制 |
| 视频压缩 | react-native-compressor(系统编解码器;对齐 iOS「720p 能 passthrough 则免重编码」口径;**禁用 FFmpegKit 路线,已死**) | AVFoundationVideoExporter(64 行) |
| 视频播放 | react-native-video(0.5/1.0/1.5/2.0x 变速) | CoachVideoPlayerView(165 行) |
| 图表 | react-native-svg 手绘:e1RM 曲线、容量/强度 | Swift Charts 2 处 |
| 设计系统 | DesignSystem tokens(色/字/距)先行移植成 RN 主题包 | Modules/DesignSystem(2.7k 行) |

## 2. 仓库与流水线

- 新 repo `~/Projects/apps/meetpr-rn/`(GitHub private;包名 `com.meetpr.app`;对外发包后不可换)。
- CI:GitHub Actions **ubuntu runner**(lint + tsc + jest + android debug assemble)——不占 macOS runner,不加剧 iOS CI 账单。
- 协作:老流水线不变——Codex 主代理拆卡/实装 → review-loop 独立双轴审查 → build/verify + PR;被委派的实现子任务不 commit/push;T2 等 David 合并。安卓验证 = Android 模拟器亲眼看 + 截图为证(证据纪律同 iOS 模拟器)。
- **PARITY.md 复刻台账**(1:1 的账本):从 iOS 屏清单(约 40-50 屏,学员 11 功能区 + 教练 10 功能区)生成逐屏三态表:未开工 / 已实装 / 已走查对齐。每张卡收货必须更新台账。走查对齐以走查 hub 两份报告(学员 36 + 教练 20)为镜像检查单——iOS 修过的坑安卓不许重犯。
- W0 脚手架卡内置国内镜像:npm→npmmirror、Gradle→阿里云 Maven。

## 3. 分波(W0–W4)

**W0 地基(约 5-7 卡)**:脚手架/CI/设计 tokens/fetch 客户端+auth 全链(登录→token 刷新→登出,对 staging 冒烟)/导航骨架 + BindGate(评估封存照抄)。
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

## 7. 海外优先改向(⚖️2026-09-04 David 拍板:①优先开发海外版本 ②先重 pin 基线再开工)

- **目标形态**:安卓 v1 = iOS **Global 轨**的 1:1 复刻(英文 UI、`https://api.meetpr.app`、邮箱密码 + Google 登录、注册角色固定 coached_student、设备时区契约)。CN 轨(手机号登录、121.40.160.241、中文)**v1 不做**,只保留 build variant 切轨口,不删已写的手机号登录代码。§6 的三级国内分发路径整体后移到 CN 轨启动时再议,备案/软著/国内商店零动作。
- **基线纪律**:每波开工前按 iOS RELEASES/NEXT-RELEASE 现场核实实际发版线与候选 SHA;基线只在波边界重 pin,波内不追。w1g/w1h/w1i 已进入本地 W3 集成基线,继续按 PARITY 复核;不要重复派旧悬空卡。
- **登录**:SiwA 安卓不做(Apple 的 Android 方案是 web JS 流,内测形态不值当,⚖️待拍确认);当前 RN 实装为 Google OAuth PKCE;原 Credential Manager 方案尚未落地,需按当前实现核验 client/audience,**backend `GOOGLE_CLIENT_ID` 需放行多 audience**(小卡,零迁移)。Google Cloud 里建 Android/Web OAuth client 与 SHA-1 指纹登记 = David 亲手项。
- **i18n**:英文为主语言,per-feature strings enum 镜像 iOS xcstrings 形制;译文先查 iOS `docs/i18n-glossary.md`,动作名直出 `name_en`。zh 作为第二语言保留键位但不在 v1 验收。
- **推送**:Global iOS 用 APNs;安卓需 FCM 通道,backend 现状待核(可能是第二张 backend 小卡)。推送不阻塞 W1/W2。
- **分发(⚖️待拍)**:推荐 **A. Google Play closed testing**(海外受众零「未知来源」摩擦、Play App Signing 托管 keystore、自更新由 Play 接管,W4 的「app 内自更新检查」可删);B. 沿用 §6 一级 APK 下载页(最快,但海外用户对 sideload 接受度差)。A 的人工前置:Google Play 开发者账号(25 USD,身份验证以周计),越早启动越好。
- **iOS 侧零影响**:Global iOS 发版/送审流程照旧;本仓不碰 iOS 仓。
