# PARITY — 1:1 复刻台账

> 复刻基线:iOS `release/1.0` @ `3799f6706767c803d09a998529bbcd784cb08bff`(2026-07-19,1.0(13) 台账收尾)。
> 状态:☐ 未开工 / 🔨 已实装 / ✅ 已走查对齐。每张卡收货必须更新本表。
> 屏级明细在 W1/W2 拆卡时按功能区展开;走查对齐以 scratch 的学员端 36 项 + 教练端 20 项报告为镜像检查单。

## 地基(W0)

| 项 | 状态 | 备注 |
|---|---|---|
| 设计 tokens 主题包 | 🔨 | W0-A:dark-only tokens + Screen/Card/AppButton/ListRow;lint+tsc 通过 |
| API client + auth 全链 | 🔨 | W0-B 已实装并以 mock 单测验收;staging 冒烟留待联网/模拟器出口验收 |
| 导航骨架 + BindGate(评估封存照抄) | 🔨 | W0-C:根 session/role 分流、学员 4 tab、教练 5 tab、BindGate stub 骨架;lint+tsc+33 tests+Android 离线 bundle 通过,AVD 待沙箱外走查 |
| CI(ubuntu) | ☐ | lint+tsc+jest+assembleDebug |

## 学员端(W1)

| 功能区 | 状态 | 备注 |
|---|---|---|
| Onboarding | ☐ | |
| Bind | ☐ | |
| Dashboard(含 e1RM 图) | ☐ | 口径按 spec 050 |
| TodayWorkout | ☐ | 组卡/RPE/RIR/教练备注 |
| WeekOverview | ☐ | |
| TrainingHistory | ☐ | |
| Readiness | ☐ | |
| FeedbackInbox | ☐ | |
| VideoUpload | ☐ | 选片+压缩+OSS 分片 |
| MyProfile | ☐ | |
| Evaluation | — | 硬封存,不复刻 UI,仅 BindGate 跳过逻辑 |

## 教练端(W2)

| 功能区 | 状态 | 备注 |
|---|---|---|
| Dashboard | ☐ | |
| StudentRoster | ☐ | |
| StudentDetail | ☐ | |
| BindQueue | ☐ | |
| Receiving | ☐ | |
| InviteCodes | ☐ | |
| Planning / PlanningWorkspace | ☐ | 范围=iOS 实际保留功能,开工前现场核实,不扩权 |
| MyProfile | ☐ | |
| Evaluation | — | 同上封存 |

## 视频/图表/打磨(W3)

| 项 | 状态 | 备注 |
|---|---|---|
| CoachVideoPlayer 变速回放 | ☐ | 0.5/1.0/1.5/2.0x |
| e1RM + 容量/强度图表 | ☐ | victory-native |
| 学员端走查对齐(36 项) | ☐ | |
| 教练端走查对齐(20 项) | ☐ | |
| 双端并排截图 pass | ☐ | |

## 真机与分发一级(W4)

| 项 | 状态 | 备注 |
|---|---|---|
| 真机矩阵(David 的安卓机 + 小米/华为抽查) | ☐ | |
| 品牌资产(App icon/adaptive icon/启动屏) | ☐ | 现为占位;需 David 出设计,分发一级前替换 |
| release keystore(密码入 Bitwarden) | ☐ | 定稿后终身不换 |
| app 内自更新检查 | ☐ | 无商店必做 |
| 海外下载页 + APK 分发一级 | ☐ | Cloudflare Pages/R2 |
| 隐私清单初版 | ☐ | |
