# PARITY — 1:1 复刻台账

> 复刻基线:iOS `release/1.0` @ `3799f6706767c803d09a998529bbcd784cb08bff`(2026-07-19,1.0(13) 台账收尾)。
> 状态:☐ 未开工 / 🔨 已实装 / ✅ 已走查对齐。每张卡收货必须更新本表。
> 屏级明细在 W1/W2 拆卡时按功能区展开;走查对齐以 scratch 的学员端 36 项 + 教练端 20 项报告为镜像检查单。

## 地基(W0)

| 项 | 状态 | 备注 |
|---|---|---|
| 设计 tokens 主题包 | ✅ | W0-A;模拟器冒烟走查通过(2026-07-19) |
| API client + auth 全链 | ✅ | W0-B;staging 真登录/登出冒烟通过;⚠️后端响应 camelCase 已勘误进参照包 |
| 导航骨架 + BindGate(评估封存照抄) | ✅ | W0-C;教练 5 tab/学员 4 tab/登出模拟器实测 |
| CI(ubuntu) | ✅ | lint+tsc+jest+assembleDebug,APK artifact 7 天 |

## 学员端(W1)

| 功能区 | 状态 | 备注 |
|---|---|---|
| 学员域 API 层 | 🔨 | W1-a;全域 snake_case zod/repository/Query hooks + 显式 null fixtures;互审 10 BLOCKER 已修收敛 |
| e1RM 领域引擎(W1-b,无 UI) | 🔨 | RTS/Epley/建议重量/PR/Series/主项 resolver/本地存储接口;30 项 Jest 黄金测试(含精确边界) |
| Analytics 客户端 + 隐私告知 | 🔨 | W1-c;队列/采样同构/session 轮换/413 两振隔离/隐私门根接线;互审 14 BLOCKER 已修收敛 |
| Onboarding | ☐ | |
| Bind | ☐ | |
| Dashboard(含 e1RM 图) | 🔨 | W1-f;定向返修收敛:e1RM 自 1970 且沿用 plan 默认 scope/catalog×profile 仅降级主项解析,不连坐周计划与资料区独立重试;GrowthCurve 入口暂为占位,待 W3 图表走查 |
| TodayWorkout | ☐ | 组卡/RPE/RIR/教练备注 |
| WeekOverview | 🔨 | W1-f;整 cycle 拉取+UTC 周窗过滤,消费 planRevision |
| TrainingHistory | ☐ | |
| Readiness | ☐ | |
| FeedbackInbox | 🔨 | W1-f;共享 VM/未读计数+Today 内联卡/通知中心已接;成长列表消费接口已留 |
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
