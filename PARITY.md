# PARITY — 1:1 复刻台账

> **复刻基线(⚖️2026-09-04 重 pin)**:iOS `release/1.0` @ `202e95db`(2026-09-02,TestFlight 1.0(21) 已上传、1.0(22) 进行中),**目标构建轨 = Global**(`MeetPR-Global` scheme;英文 UI、api.meetpr.app、邮箱+Google 登录)。CN 轨(手机号登录、121.40.160.241)v1 不做,复刻时保留切轨口即可。
> 旧基线 `3799f67`(1.0(13),2026-07-19)→ 新基线共 236 commit,影响复刻范围的项见下方「基线漂移清单」;**下表所有 🔨 行均按旧基线实装,收货前逐项对照漂移清单复核**。
> 状态:☐ 未开工 / 🔨 已实装 / ✅ 已走查对齐。每张卡收货必须更新本表。
> 走查对齐以 scratch 的学员端 36 项 + 教练端 20 项报告为镜像检查单。

## 基线漂移清单(3799f67 → 202e95db,只列影响复刻的)

### Global 轨专属(本仓 v1 的目标形态)
| 项 | iOS 落点 | 对本仓的含义 |
|---|---|---|
| Global 构建轨 `MeetPRBuildTrack` | #322 | RN 用 build variant/env 区分 track;`EXPO_PUBLIC_API_BASE_URL` 默认改 `https://api.meetpr.app`,CN 地址退为可选 |
| 三通道登录(spec 074) | #323/#324 | 安卓 = **邮箱密码 + Google** 两通道(SiwA 安卓不做,⚖️待拍);注册角色固定 `coached_student`,无手机号 UI;找回密码 6 位码两步。⚠️ backend `GOOGLE_CLIENT_ID` 单 audience 校验,安卓 id_token 的 aud 是 Android/Web client id → 需开 backend 小卡放行多 audience |
| Global 域名 | #326 | 同上 base URL;`usesCleartextTraffic` Global 产物应关 |
| i18n 三连(specs 075/076/077) | #325/#327/#328 | RN **英文为主语言**;手写 strings enum per feature 镜像 iOS 形制;术语表正典 = iOS `docs/i18n-glossary.md`;动作名直出 catalog `name_en`,nil 回落中文名。现存 38 个含中文字面量文件需清零 |
| 时区契约(spec 042/R6) | #330/#325 | 注册/登录带 IANA 时区;bootstrap 后时区变化 `PATCH /me/timezone`;gym-day 归日=设备时区 + 墙钟 04:00,不再 Asia/Shanghai 硬编码;「今天」用设备本地 date-only 匹配 |
| 上传后端 R2 | backend #254 | initiate/part/complete 协议不变,客户端无感;真机多分片大文件 e2e 尚未跑过 |

### 学员端(影响 W1 已实装/悬空卡)
| 项 | iOS 落点 | 波及卡 |
|---|---|---|
| 推进制 sequence progression(spec 071) | #311/#314 | W1-d TodayWorkout / W1-f WeekOverview:训练日完成写 completion、顺延换制,补练语义作废 |
| 六形态强度 + % 三锚换算(spec 072 卡1 / 034 §9.4) | #317/#336 | W1-d SetEntry:`load_mode` 九字段解码、`pct_anchor` 三锚、2.5 kg floor、非 RPE 形式不喂建议引擎 |
| e1RM 建议三连修 / RPE 精度 / 辅助项 <20 kg | #301/#290/59c66ae1 | W1-b 引擎黄金测试需对照重跑 |
| 计划窗口上界 = max(末排期日, 今天)+1d(P0) | bdc9ab45 | W1-d 日志窗口 |
| 学员端空/错态兜底 9 条 | #331 | W1-d/W1-f/W1-g 各屏 |
| 视频链全面重做:标记 063/064、码率 065、自定义录制 068、后台静默上传 069、组内回放 070、剪辑 072、角标 078 | #299–#335 | **W1-h VideoUpload 悬空卡按旧口径(仅选片)实装,与新基线差距最大,收货前必须重对**;安卓录制/后台上传按系统惯例映射 |
| 训练日本地提醒(spec 079) | #334 | W1 MyProfile 新增项 |
| 休息计时 Live Activity(spec 073) | #319 | iOS 专属;安卓等价 = 前台服务通知,口径待走查时定 |
| 实时聊天客户端(spec 066)/APNs 注册(067) | #305/#306 | 新面:chat realtime + FCM 注册(Global 推送为 APNs,安卓需 FCM,后端待核) |
| 计划自动刷新 + 推送路由 | #339 | W1-d:回前台/切 tab 25s 节流重拉 |
| 登录/绑定 v3 浅色 | #294 | W0-C/W1-i 视觉 |

### 教练端(W2 开工前再核一遍)
| 项 | iOS 落点 |
|---|---|
| 教练端 v3 浅色迁移(卡1–4) | #298 |
| 成长 e1RM 改读 backend 序列(R4) | #332 |
| 教练端空/错态兜底 8 条 | #333 |
| 动作别名表 44→49 | #337 |
| CoachKit 英文化 | #328 |

## 地基(W0)

| 项 | 状态 | 备注 |
|---|---|---|
| 设计 tokens 主题包 | 🔨 | G0-a:按 design-tokens-v3 / iOS 202e95db 重移植浅色默认、品牌金、三族十字面、主题/基础组件/自绘 tab;lint+tsc+177 Jest 通过,Android bundle 导出通过;ADB sandbox 权限阻断,待模拟器截图走查(旧 W0-A 走查不代表 v3 已对齐);2026-09-04 模拟器亲验 v3 登录页/BindGate 占位页(浅色底、白卡、金杠、Archivo 字标);逐屏视觉对齐随各功能卡走查 |
| i18n 字符串层 + 全仓英文化 | 🔨 | G0-b:八模块正典 JSON 原样入 catalog、typed t/设备语言/占位/复数、Intl 日期、动作 name_en 回退;CN login/onboarding 按卡排除;R1 标点归一化消除 17 行,33 drift/47 missing 残留逐行登记并分流 CODEX-JOURNAL;lint/tsc/29 suites·189 Jest 通过;ADB socket 被 sandbox 拒绝,待模拟器截图验收 |
| API client + auth 全链 | ✅ | W0-B;staging 真登录/登出冒烟通过;⚠️后端响应 camelCase 已勘误进参照包 |
| 导航骨架 + BindGate(评估封存照抄) | ✅ | W0-C;教练 5 tab/学员 4 tab/登出模拟器实测 |
| CI(ubuntu) | ✅ | lint+tsc+jest+assembleDebug,APK artifact 7 天 |

## 学员端(W1)

| 功能区 | 状态 | 备注 |
|---|---|---|
| 学员域 API 层 | 🔨 | W1-a;全域 snake_case zod/repository/Query hooks + 显式 null fixtures;互审 10 BLOCKER 已修收敛 |
| e1RM 领域引擎(W1-b,无 UI) | 🔨 | RTS/Epley/建议重量/PR/Series/主项 resolver/本地存储接口;30 项 Jest 黄金测试(含精确边界) |
| Analytics 客户端 + 隐私告知 | 🔨 | W1-c;队列/采样同构/session 轮换/413 两振隔离/隐私门根接线;互审 14 BLOCKER 已修收敛 |
| Onboarding | 🔨 | W1-i;7 步向导/草稿合并/分步 patch/422 回跳/完成 handoff;R1 对齐线值枚举(附 B)+ RTS 估算器 + 自动弹向导 + 姓名预填 + 安卓返回=保存退出;R2 legacy token 读写宽容/日期轮居中与到天边界/磅制原文输入/同场馆不重置;模拟器流程走查通过(2026-09-04,staging 学员号全程 7 步→complete→handoff);视觉待 G0-a v3 tokens 落地后对齐 |
| Bind | 🔨 | W1-i;BindGate 真接线/输码/stash 自动重提交/等待屏/取消/前台恢复刷新;模拟器走查:输码→向导→pending→教练 accept→回前台进 tabs 通过;视觉待 G0-a |
| Dashboard(含 e1RM 图) | 🔨 | W1-f;定向返修收敛:e1RM 自 1970 且沿用 plan 默认 scope/catalog×profile 仅降级主项解析,不连坐周计划与资料区独立重试;GrowthCurve 入口暂为占位,待 W3 图表走查 |
| TodayWorkout | 🔨 | W1-d;周/月日历、计划×日志草稿、组卡/录入、RPE 建议/RIR、休息计时、回顾/PR、视频 stub;定向返修已收 raw/competition metadata seam、未解析跳过 e1RM、per-day 回顾隔离、e1RM 活更新、04:00 切点重校验及 tab 埋点;待模拟器走查对齐 |
| WeekOverview | 🔨 | W1-f;整 cycle 拉取+UTC 周窗过滤,消费 planRevision |
| TrainingHistory | 🔨 | W1-g 复核(2026-09-05):v2 六块顺序、e1RM 卡四态、historyStats/chartBuckets、反馈归档入口、锁态;模拟器走查零训练态通过(v3 浅色/英文);图表像素对齐留 W3 |
| Readiness | 🔨 | W1-d;训练 tab opt-in 两步 sheet、per-day skip、心形完成态;待模拟器走查对齐 |
| FeedbackInbox | 🔨 | W1-f;共享 VM/未读计数+Today 内联卡/通知中心已接;成长列表消费接口已留 |
| VideoUpload | ☐ | 悬空 worktree `feat/w1h-video`(旧基线「选片+压缩+分片」口径,未 commit);**与新基线视频链差距最大,收货前重对 063–078** |
| MyProfile | 🔨 | W1-p：v2/v3 七块资料卡、三态防困死兜底、复用向导行编辑且结构性锁 1RM、外观/分 RPE 休息/本地周提醒、改密码/全量 CSV/注销；lint/tsc/Jest 与离线 Android bundle 验证见 CODEX-JOURNAL。ADB 5037 被 sandbox 拒绝，端点已核本地 backend origin/staging 源码，Global 在线与模拟器截图待验收 |
| 控件视觉纠偏 | 🔨 | W1-v;按 iOS 测试版实况收敛按钮变体、训练/仪表盘/绑定/隐私控件红色使用;静态检查与测试通过后待模拟器走查 |
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
| 品牌资产(App icon/adaptive icon/启动屏) | ◐ | App icon + adaptive(前景/背景/monochrome)已换成 David 2026-07-30 定稿「片里的折线」,与 iOS 同构;源与重出命令在 `docs/brand/`,AVD 抽屉亲验。**启动屏仍是占位**(`splash-icon.png` 是 1×1,splash 底色还是 `#000000`),分发一级前补 |
| release keystore(密码入 Bitwarden) | ☐ | 定稿后终身不换 |
| app 内自更新检查 | ☐ | 无商店必做 |
| 分发通道 | ☐ | ⚖️待拍:Google Play(内测轨 closed testing)vs 海外 APK 下载页;PLAN §7 有推荐 |
| 隐私清单初版 | ☐ | |
