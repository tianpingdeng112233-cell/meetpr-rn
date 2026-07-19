# MeetPR iOS → RN Android W0 复刻参照包

> 采集自 `apps/MeetPR-release`(release/1.0 @ 3799f67),2026-07-19 只读侦察。全部数值照抄源码。行号是快照,存疑时回 iOS 源码核实。

## 0. 关键全局事实(先读)

- **App 是暗色唯一**:`MeetPRApp.swift:225` 根级 `.preferredColorScheme(.dark)`。tokens 有双值但 V0.1 只渲染 dark 分支。RN 端锁暗色,双值都留档以备后用。
- **主色调 tint = brandRed**,施加在两端 TabView。
- **只有一个后端 URL**:`http://121.40.160.241:3000`(明文 HTTP,API + 埋点共用)。iOS Debug/Release 同指此 URL,无 staging/prod 双环境;运行期可用环境变量覆盖(iOS:`MEETPR_API_BASE_URL`)。iOS 开了 ATS 全局明文例外 → **RN 安卓需对应开 `usesCleartextTraffic`**。

## 1. 设计 tokens(源:Modules/DesignSystem/Tokens/)

### 1.1 颜色(`Color.MeetPR.*`;RN 锁 dark,light 值留档)

| 语义名 | Light | Dark(V0.1 生效) |
|---|---|---|
| brandRed | #E5221E | 同左 |
| brandRedPress | #B81A17 | 同左 |
| brandRedSoft | rgba(229,34,30,0.08) | rgba(229,34,30,0.12) |
| green | #1FB358 | 同左 |
| greenSoft | rgba(31,179,88,0.14) | 同左 |
| amber | #E0A810 | 同左 |
| amberSoft | rgba(224,168,16,0.14) | 同左 |
| bg | #FAFAFA | #000000 |
| surface1 | #FFFFFF | #0E0E0E |
| surface2 | #F4F4F5 | #161616 |
| surface3 | #E9E9EB | #1F1F1F |
| border | #E5E5E5 | #262626 |
| borderStrong | #C9C9C9 | #3A3A3A |
| fgPrimary | #0A0A0A | #FFFFFF |
| fgSecondary | #525252 | #B5B5B5 |
| fgTertiary | #A3A3A3 | #737373 |
| fgDisabled | rgba(10,10,10,0.35) | rgba(255,255,255,0.35) |

### 1.2 字体(系统字体;iOS SF → 安卓用系统默认,字号字重照抄)

| 层级 | pt | 字重 | 其他 |
|---|---|---|---|
| displayHero | 44 | bold | tight leading |
| title1 | 34 | bold | tight leading |
| title2 | 28 | bold | |
| headline | 20 | semibold | |
| body | 17 | regular | |
| bodyEmphasis | 17 | semibold | |
| footnote | 13 | regular | |
| caption | 11 | medium | |
| monoLabel | 12 | medium | monospace,tracking 0.96 |
| displayNumeral | 60 | heavy | monospacedDigit |
| displayUnit | 24 | heavy | tracking 0.96 |

### 1.3 间距:xs=4 · sm=8 · md=12 · base=16 · lg=24 · xl=32 · xxl=48 · xxxl=64
### 1.4 圆角:sm=4 · md=8 · lg=12 · xl=16 · pill=999
### 1.5 动效:曲线 cubic-bezier(0.32,0.72,0,1);fast=200ms · base=240ms · slow=280ms
### 1.6 阴影:**无——纯平面设计**,层级靠 surface1/2/3 + border 表达。RN 端不要加 elevation/shadow。

## 2. Auth 全链

### 2.1 Endpoints

| 逻辑名 | 路径 | 方法 | 说明 |
|---|---|---|---|
| register | /auth/register | POST | 不带 Authorization |
| login | /auth/login | POST | 不带 Authorization |
| refresh | /auth/refresh | POST | 不带 Authorization |
| logout | (无) | — | 纯客户端:清 TokenStore + 回登录页,不打后端 |

### 2.2 DTO(线格式 snake_case,日期 ISO8601)

- **register 请求**:`{phone, password, role}`;role 线值 = `"coach" | "coached_student" | "self_train_student"`
- **login 请求**:`{phone, password}`
- **refresh 请求**:`{refresh_token}`(pin snake_case;后端也容忍 refreshToken,但照 iOS 发 snake)
- **login/register 响应**:`{user, access_token, refresh_token}`
- **refresh 响应**:`{access_token, refresh_token}` —— **rotating,每次都换新 refresh_token,必须覆盖存储**
- **user**:`{id: UUID, phone, role, created_at}`
- **手机号 wire 规整**:UI 输入不以 `+` 开头则前缀 `+86` 再发线(iOS `wirePhone` 同款,RN 必做)

### 2.3 Token 生命周期(RN 需等价复刻)

1. **主动预刷新**:每次取 accessToken 时解 JWT payload 的 exp,距过期 ≤60s 即先刷新。
2. **401 被动恢复**:请求 401 → 若存储 token 已 ≠ 被拒 token(并发已轮换)直接复用,否则刷新 → 原请求**重试一次**;仍 401 → 全局登出。
3. **并发去重**:in-flight refresh 单飞,共享同一 promise。
4. **冷启动 bootstrap**:仅未登录态跑;有 refresh_token + cachedUser → 换新 access → 进已登录。失败分类:网络/5xx/429 → **保留缓存会话**(临时故障不登出);400/401 → 清凭证回登录页(fail-closed)。
5. **会话代际**:login/logout 递增 generation 并取消旧刷新,过期异步回调不得写新会话状态。

### 2.4 TokenStore(RN → expo-secure-store)

三个 key:`accessToken` / `refreshToken` / `cachedUser`(user JSON)。iOS keychain service `app.meetpr.tokens` 仅参考。

### 2.5 公共 header

- `authorization: Bearer <accessToken>`(小写 header 名)
- `content-type: application/json`(带 body)· `accept: application/json`
- 无自定义 User-Agent

### 2.6 ErrorEnvelope

- 通用信封:`{"error": "<MACHINE_CODE>", "missing_fields": [...]?}`;auth 信封另可带 `issues: [{path:[String], message}]`
- 已知 auth 错误码:`AUTH_INVALID_CREDENTIALS` `AUTH_INVALID_REFRESH` `AUTH_PHONE_TAKEN` `RATE_LIMITED` `AUTH_REFRESH_EXPIRED` `VALIDATION_ERROR`
- 映射:能解信封且 code 已知 → backend 错;解不出且 ≥500 → server 错;否则 network 错。backend(400/401) 在 bootstrap 场景清会话。

## 3. App 壳与导航

### 3.1 根路由状态机

`anonymous → 登录页` | `authenticating → 转圈「正在验证会话…」` | `authenticated(user) → 按 role 分流`:
- `coach` → 教练 5 tab
- `coached_student` → BindGate 绑定门 → 通过后学员 4 tab
- `self_train_student` → 直接学员 4 tab(不过绑定门)
- (iOS 学员链还有 E1RMCompetitionLiftGate 迁移门,W0 骨架跳过,W1 再对齐)

### 3.2 BindGate 状态机(学员 coached 专用)

态:`loading / needsCode(prefill,notice) / needsOnboarding / pendingAcceptance / bound / failed`(evaluationActive 封存不可达)。入口拉「我的绑定请求」:accepted→bound;pending→pendingAcceptance;none/rejected/expired/cancelled→未绑定分支(有 stash 且 onboarding 完成则自动重提交)。拒绝态永远用中性文案,不显示「拒绝」。
**evaluationSealed = true(2026-07-13 硬封存)**:accepted 一律直接进 tabs,评估期分支整个跳过。RN 同款:留一个恒真常量,defer ≠ delete。

### 3.3 学员端 tab(实际 4 个;「5 tab」是历史口径)

| tag | 名称 | 图标语义 | 功能区 |
|---|---|---|---|
| today | 今日 | house | Dashboard 学员主页 |
| training | 训练 | dumbbell | TodayWorkout 当日训练记录 |
| growth | 成长 | chart-line-up | TrainingHistory e1RM 增长+训练史+反馈史 |
| profile | 我的 | person | MyProfile(badge=未确认 PR 数+评估摘要红点) |

### 3.4 教练端 tab(5 个)

| tag | 名称 | 图标语义 | 功能区 |
|---|---|---|---|
| today | 今日 | house | CoachDashboard |
| students | 学员 | person-2 | StudentRoster(badge=待关注学员数) |
| planning | 编排 | calendar-plus | CoachPlanningHome |
| receiving | 接收 | tray | CoachReceiving(badge=pending 学员+待反馈视频) |
| profile | 我的 | person | CoachMyProfile(含邀请码) |

### 3.5 角色

`role` 由后端账户固定,无 app 内切换;换角色=登出换号。分流点唯一在根路由。

## 4. 环境与配置

- base URL 解析(RN 等价):env 覆盖(`EXPO_PUBLIC_API_BASE_URL`)→ 默认 `http://121.40.160.241:3000`。
- **明文 HTTP**:安卓需 `usesCleartextTraffic: true`(expo-build-properties)。
- 仅竖屏;版本口径独立于 iOS(RN 端自己的 versionName/versionCode)。
- 线格式统一:snake_case + ISO8601(容忍带/不带小数秒,及 `YYYY-MM-DD`);**Decimal 走字符串**(重量等精度字段,勿用 float 直传)。

## 5. /events 埋点最小契约(W0 不实装,W1 接入;此处留档)

- `GET /events/config` → `{enabled, sample_rate}`;`POST /events`(批量,成功=204);`POST /events/feedback`
- 批信封:`{anon_id, app_version, build, platform, events[]}` —— **RN 发 `platform:"android"`,且必须显式传**(后端枚举当前只有 ios,见 backend-assumptions.md,P1 卡放开后才接)
- 单事件:`{event_id, session_id, seq, name, props, schema_version:1, ts_client}`;事件名枚举 21 个见 iOS `AnalyticsTypes.swift`
- 批 50/批,30s 周期 flush + 网络恢复触发;429/5xx 退避 [1,2,4,8]s;413 二分拆批;>1MiB 单事件丢弃并记 client_error;采样 FNV-1a(anon_id);隐私门未开不 flush;fail-open。

---
**iOS 源文件索引**:tokens=`Modules/DesignSystem/Tokens/{Colors,Typography,Spacing,Radius,Motion}.swift`;auth=`Modules/Networking/{APIClient,BuildConfig,Endpoints,ErrorEnvelope}.swift` + `Auth/{APIClient+Auth,AuthDTOs}.swift` + `Modules/AppShell/{Session,RootView}.swift` + `Auth/{TokenStore,AuthRepository}.swift`;codec=`Modules/CoreModels/Codec.swift`;tabs/gate=`StudentKit/StudentRootView.swift`、`CoachKit/CoachRootView.swift`、`StudentKit/Features/Bind/BindGateViewModel.swift`;埋点=`Modules/Analytics/`。
