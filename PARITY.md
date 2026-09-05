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
| 视频链全面重做:标记 063/064、码率 065、自定义录制 068、后台静默上传 069、组内回放 070、剪辑 072、角标 078 | #299–#335 | W1-h 核心链已按 video-chain-v2 §1–4/7 实装并通过静态验证;原生重建/模拟器走查待补;打点、剪辑、角标/烧录归 W3-video |
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
| Global 登录 / 注册 / 找回密码 | 🔨 | G0-c:邮箱 + Google PKCE、Global/China 构建切轨、按用户时区上报已实装;W3-v 三屏视觉对齐 iOS GlobalAuth*;SiwA 省略。32 suites / 234 tests、lint、tsc 通过;本卡沙箱无 ADB,视觉走查/截图待补;Google client 配置与 backend 多 audience 仍需外部前置验收 |
| i18n 字符串层 + 全仓英文化 | 🔨 | W3-i18n:剩余 15 missing/0 drift 清零；取消 login/onboarding 屏幕豁免并替换 login 10 处中文；新增全 src 标记守卫与 9 个带来源 RN key；补 CoachKit 3 个复数索引；lint/tsc/58 suites·379 Jest 通过。正典不改；已知 Sun 误译、历史 CoachKit runtime 差异和 Apple 格式限制见 JOURNAL。ADB socket 被 sandbox 拒绝，待模拟器截图验收 |
| API client + auth 全链 | ✅ | W0-B;staging 真登录/登出冒烟通过;⚠️后端响应 camelCase 已勘误进参照包 |
| 导航骨架 + BindGate(评估封存照抄) | ✅ | W0-C;教练 5 tab/学员 4 tab/登出模拟器实测 |
| CI(ubuntu) | ✅ | lint+tsc+jest+assembleDebug,APK artifact 7 天 |

## 学员端(W1)

| 功能区 | 状态 | 备注 |
|---|---|---|
| 学员域 API 层 | 🔨 | W1-a;全域 snake_case zod/repository/Query hooks + 显式 null fixtures;互审 10 BLOCKER 已修收敛 |
| e1RM 领域引擎(W1-b,无 UI) | 🔨 | RTS/Epley/建议重量/PR/Series/主项 resolver/本地存储接口;30 项 Jest 黄金测试(含精确边界) |
| Analytics 客户端 + 隐私告知 | 🔨 | W1-c;队列/采样同构/session 轮换/413 两振隔离/隐私门根接线;互审 14 BLOCKER 已修收敛 |
| Onboarding | ☐ | 悬空 worktree `feat/w1i-onboarding-bind`(旧基线,未 commit);Global 轨注册无手机号、角色固定 coached_student,需重对 |
| Bind | ☐ | 同上 worktree;对照 #294 v3 浅色 |
| Dashboard(含 e1RM 图) | ✅ | W1-f v2(#20):推进制游标日 W#D# 大字 + 周进度条/周历格(序数身份)+ 已完成/撤销/下一节/周期完成 action + 吸底 Start training 交棒 dayID;模拟器已走查完成→撤销闭环;旧注:定向返修收敛:e1RM 自 1970 且沿用 plan 默认 scope/catalog×profile 仅降级主项解析,不连坐周计划与资料区独立重试;GrowthCurve 入口暂为占位,待 W3 图表走查；W3-v(Dashboard/训练)：展示层按 202e95db 修正，视觉对照 pass 待 AVD 截图验收（ADB listener 被 sandbox 拒绝）；lint/tsc/65 suites·400 tests 通过 |
| TodayWorkout | ✅ | W1-d v2(#20):选中态 dayID、completed/current/upcoming 三态与序列提示、hero list/recording 两态、六形态强度 + % 三锚、长按结算 HoldToComplete、DayCompletionBanner、页头 = MeetPR 标 + W#D#;模拟器已走查记组→结算→撤销;旧注:周/月日历、计划×日志草稿、组卡/录入、RPE 建议/RIR、休息计时、回顾/PR、视频 stub;定向返修已收 raw/competition metadata seam、未解析跳过 e1RM、per-day 回顾隔离、e1RM 活更新、04:00 切点重校验及 tab 埋点;待模拟器走查对齐；W3-v(Dashboard/训练)：展示层按 202e95db 修正，视觉对照 pass 待 AVD 截图验收（ADB listener 被 sandbox 拒绝）；lint/tsc/65 suites·400 tests 通过；W3-v:顶部当前周周历条已对齐 iOS 顺序；W3-v:庆祝页/回顾页/休息条对齐 iOS;动效按 082 静态（待 AVD 截图验收） |
| SetEntrySheet | 🔨 | W3-v 视觉对齐:杠铃 PlateVisual 无阴影;返回用 Android 箭头。单套 numberStepper/页内 NumberPad、RPE 意图锁/气泡、视频四态描边动作与固定 footer；持久化/视频管线/建议引擎零改动；lint/tsc/68 suites·411 tests 通过，无 ADB，待模拟器截图验收 |
| WeekOverview → TrainingCalendarView | ✅ | W1-d v2(#20):周/月日历下线,改「计划汇总」周编排列表(Completed n / m sessions,本周默认展开,序数格子 + 教练推荐日期) |
| TrainingHistory | ☐ | 悬空 worktree `feat/w1g-history`(旧基线实装,未 commit);收货前对照 #331 空态 |
| Readiness | 🔨 | W1-d;训练 tab opt-in 两步 sheet、per-day skip、心形完成态(页头按钮组第二位);W3-v 对齐 iOS 无卡五圆形制;修正肌群线值 quads→quad 等;网格最小宽 92/gap 4,393pt 三列;已实装,待 Android AVD 截图验收 |
| Dashboard(含 e1RM 图) | 🔨 | W1-f;定向返修收敛:e1RM 自 1970 且沿用 plan 默认 scope/catalog×profile 仅降级主项解析,不连坐周计划与资料区独立重试;GrowthCurve 入口暂为占位,待 W3 图表走查 |
| TodayWorkout | 🔨 | W1-d;周/月日历、计划×日志草稿、组卡/录入、RPE 建议/RIR、休息计时、回顾/PR、视频 stub;定向返修已收 raw/competition metadata seam、未解析跳过 e1RM、per-day 回顾隔离、e1RM 活更新、04:00 切点重校验及 tab 埋点;待模拟器走查对齐 |
| WeekOverview | 🔨 | W1-f;整 cycle 拉取+UTC 周窗过滤,消费 planRevision |
| TrainingHistory | 🔨 | W1-g 复核(2026-09-05):v2 六块顺序、e1RM 卡四态、historyStats/chartBuckets、反馈归档入口、锁态;模拟器走查零训练态通过(v3 浅色/英文);W3-c 已接成长三图几何；W3-v 源码视觉对照 pass：mark/chat/header、卡头、进度行、section、stats/历史入口，lint/tsc/240 tests 通过；源码与任务描述差异见 JOURNAL，Android 截图验收仍待 ADB 环境恢复 |
| FeedbackInbox | 🔨 | W1-f;共享 VM/未读计数+Today 内联卡/通知中心已接;成长列表消费接口已留 |
| VideoUpload | ☐ | 悬空 worktree `feat/w1h-video`(旧基线「选片+压缩+分片」口径,未 commit);**与新基线视频链差距最大,收货前重对 063–078** |
| MyProfile | 🔨 | W1-p：v2/v3 七块资料卡、三态防困死兜底、复用向导行编辑且结构性锁 1RM、外观/分 RPE 休息/本地周提醒、改密码/全量 CSV/注销；lint/tsc/Jest 与离线 Android bundle 验证见 CODEX-JOURNAL。ADB 5037 被 sandbox 拒绝，端点已核本地 backend origin/staging 源码，Global 在线与模拟器截图待验收 |
| VideoUpload | 🔨 | W1-h v2:W1-d 入口接回、自建相机/回放确认/相册偏好、720p 码率直通/转码、静默上传/持久化分片与退避、当天留存/组内播放、失败聚合本地通知;lint/tsc/42 suites·279 Jest 通过、Android JS bundle 导出通过。ADB/Gradle socket 被 sandbox 拒绝,尚未完成 APK 编译与 AVD 截图验收。已知 v1 偏差:无原生前台服务,进程内上传+冷启/回前台续传;无烧录导出(W3-video 待决策) |
| FeedbackInbox / FeedbackDetail | 🔨 | W3-a:归档列表/详情路由、相对时间/未读态/关联视频三态、行内短链失败;markRead → URL → 开播放器 → markers,回填有 id + 会话守卫;Dashboard/训练页消息按钮直达反馈。复用现有反馈与视频读口,不改 DTO;lint/tsc/64 suites·396 tests/Android JS bundle 通过;ADB socket 被 sandbox 拒绝,待 AVD 截图验收 |
| StudentChat(学员端教练聊天) | 🔨 | W3-s：全屏黑金会话、文本/训练分享/未看计划/反馈视频混排、分页定位/55%可见已读/pending重试/30s轮询；Dashboard/Training 页头及未读合计已接。Growth/Profile 按追加裁决待合流另卡；CHAT_BIND_REQUIRED 已按追加授权仅补 client.ts 错误码及 HTTP 测试。组分享入口/图片发送/WebSocket/推送深链另卡；74 suites·466 tests、lint/tsc 通过，AVD 截图待验收，详见 JOURNAL W3-s |
| VideoUpload | ✅ | W1-h v2(#22,R1–R4):W1-d 入口接回、自建相机(录制/回放确认/相册偏好)、720p 直通/转码、静默多分片上传(legacy uploadTask,无 Content-Type)+ 持久化分片/退避、当天留存/组内回放、失败聚合通知；R4 冷启动服务端回填（按日已有 set log 归组、本地优先、远端删除清空，装载/切日/刷新触发，静默失败；自动测试通过，R4 AVD 走查因 ADB 权限受阻待补）。模拟器已走查:选片→懒建日志→initiate→PUT→complete,服务端 `GET /students/:id/videos` 出现附件;**录像本身模拟器不可验(QEMU 相机开录挂死),待真机**。已知偏差:无前台服务真后台续传、无烧录导出、帧率随设备 |
| MyProfile | ☐ | |
| MyProfile | ✅ | W1-p(#21,integration/w1 模拟器已走查:七块、偏好三行、组间休息/训练提醒页、改密码/导出 CSV/注销确认页):v2/v3 七块资料卡、三态防困死兜底、复用向导行编辑且结构性锁 1RM、外观/分 RPE 休息/本地周提醒、改密码/全量 CSV/注销；lint/tsc/Jest 与离线 Android bundle 验证见 CODEX-JOURNAL。ADB 5037 被 sandbox 拒绝，端点已核本地 backend origin/staging 源码，Global 在线与模拟器截图待验收；W3-v：视觉对照 pass（逐项 iOS 源码核对：header/1RM kg 与 SBD/chip/组标题/外观与行字号）；39 suites / 294 tests、lint、tsc 绿。当前 worktree 的 Android 截图待验收（ADB sandbox 拒绝）；聊天未读源尚未接入，详见 JOURNAL |
| 控件视觉纠偏 | 🔨 | W1-v;按 iOS 测试版实况收敛按钮变体、训练/仪表盘/绑定/隐私控件红色使用;静态检查与测试通过后待模拟器走查 |
| Evaluation | — | 硬封存,不复刻 UI,仅 BindGate 跳过逻辑 |

## 教练端(W2)

| 功能区 | 状态 | 备注 |
|---|---|---|
| Coach shell | ✅ | W2-a：today/messages/students/profile 四个常驻 tab，Stack 全屏目的地隐藏底栏；messages 数据由 W2-c 接线 (integration/w2 教练号模拟器已走查) |
| Dashboard | ✅ | W2-a：六块布局、三态待办、接收横幅与自然周概况已接共享模型；待 Android 视觉验收 (integration/w2 教练号模拟器已走查) |
| StudentRoster | ✅ | W2-a：搜索、申请段、四态名单、异常信号/进度和刷新已实装；待模拟器走查 (integration/w2 教练号模拟器已走查) |
| BindQueue | ✅ | W2-a：Accept 恒跳过评估、静默拒绝、4xx 刷新与全屏申请资料页（空态保留操作）；待端到端走查 (integration/w2 教练号模拟器已走查) |
| Dashboard | ☐ | |
| StudentRoster | ☐ | |
| StudentDetail | ✅ | W2-b:全屏 Header 四态 + 五段/训练日/视频角标纯回放;exercise-stats 服务端成长,只读反馈/资料;47 suites / 309 tests。AVD 安装受 ADB listener 权限阻断,截图/Global 实机验收待补;见 JOURNAL W2-b (integration/w2 教练号模拟器已走查) |
| BindQueue | ☐ | |
| Receiving | ✅ | W2-c:合并收件箱/同源 badge selector、学员日分组队列、反馈工作台/markers/组信息/身份跳转;W2-a 壳接 badge 待合并。播放器为同依赖独立封装(不改 training,组件复用例外见 JOURNAL);ADB socket 被拒,AVD 截图待补 (integration/w2 教练号模拟器已走查) |
| Chat | ✅ | W2-c:现场核 snake_case DTO、文字发送/稳定 client_id 重试、seq 分页/read/30s 轮询、未知状态不画副标题;lint/tsc/47 suites·312 tests/Android bundle 通过;无 realtime,待 AVD 走查 (integration/w2 教练号模拟器已走查) |
| InviteCodes | ☐ | |
| Planning / PlanningWorkspace | — | W2-a 按 coach-v2 §7 删除教练 planning tab/路由；v1 无 app 排计划入口 |
| MyProfile | ☐ | |
| InviteCodes | ✅ | W2-d:永久码显式生成/重生成、单次/时限 7·30·自定义 1–365、五态/复制/左滑撤销、写后重拉;lint/tsc/46 suites·322 Jest 通过。expo-clipboard 待 Claude 安装并接 adapter;ADB socket 被拒,AVD 截图待补 (integration/w2 教练号模拟器已走查) |
| Planning / PlanningWorkspace | ☐ | 范围=iOS 实际保留功能,开工前现场核实,不扩权 |
| MyProfile | ✅ | W2-d:姓名/邀请码卡三态、裸码复制+2 s toast、Help 四 FAQ/禁用联系、Privacy 三行日期、版本/登出确认与 session 接线;JS bundle 导出通过。剪贴板原生依赖与 AVD 验收待补 (integration/w2 教练号模拟器已走查) |
| Evaluation | — | 同上封存 |

## 视频/图表/打磨(W3)

| 项 | 状态 | 备注 |
|---|---|---|
| VideoPlayback / FeedbackVideoPlayer 全屏回放 | 🔨 | W3-a:自绘播放/暂停、四档会话倍速、250 ms 轮询、80 ms 拖拽 seek + generation、失败重试、打点三态面板/标注帧;组内薄封装 markers=null、本地优先/远端现取。单层 Modal 或 OverlayHost;平底材质;无刻度/级别色;W3-b 屏上浮层已做;⚖️烧录导出不做(播放器无导出钮);静态验证通过,ADB 拒绝导致视觉验收待补;Android seek tolerance 限制见 JOURNAL |
| VideoBadge 学员端角标 / scrim | 🔨 | W3-b 屏上浮层已做;⚖️烧录导出不做(播放器无导出钮)。固定品牌色/468 基准卡片/底部 44% 渐变;默认展开、点按收起/展开、会话重置;反馈与组内当前草稿接 badge，setOrdinal 仅调用点 +1。StudentVideoSchema 仅 additive rpe 字串字段(⚖️David 2026-09-05);教练未接，allowsExpansion=false 预留;Android 阴影与实际叠层/触摸待 AVD 截图验收 |
| CoachVideoPlayer 变速回放 | 🔨 | W3-d 工作台形态;⚖️无导出。共享播放器内嵌 270 舞台/56 圆钮/四段倍速/白色进度条/可选 Add marker/教练恒收起角标;有标注行 pause+seek+舞台覆盖层,刷新按 id 换实例。静态验证通过,沙箱无 ADB,待 AVD 截图验收 |
| e1RM + 容量/强度图表 | ☐ | victory-native |
| 成长 tab：e1RM / forming / 容量强度图表 | 🔨 | W3-c：react-native-svg 按 iOS 几何重画；W3-v 卡头与进度行源码视觉对照 pass，未改图表几何；lint/tsc/Jest 全绿；ADB 监听受沙箱限制，待 Android 截图与 iOS 并排验收；Dashboard 不在本卡范围 |
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
