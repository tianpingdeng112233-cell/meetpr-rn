# Global 轨登录参照包(iOS spec 074 @ release/1.0 202e95db + backend `src/routes/auth/global.ts`、`email-recovery.ts` @ staging)

> ⚖️2026-09-04:安卓 v1 = Global 轨。登录 = **邮箱密码 + Google** 两通道(SiwA 安卓不做,David 拍板);注册角色固定 `coached_student`,无手机号 UI。CN 手机号登录代码保留但不进 Global 产物入口。
> 后端生产 `https://api.meetpr.app`(DO NYC);错误信封统一 `{ "error": "CODE", ...extra }`,校验失败 `{ "error": "VALIDATION_ERROR", "issues": [...] }`(400)。

## 1. 端点与线格式(请求 camelCase,响应 camelCase;与 CN `/auth/login` 同构)

| 端点 | body | 成功 | 错误 |
|---|---|---|---|
| `POST /auth/challenge` | 无 | 200 `{ nonce, expiresAt }`(10 min TTL,一次性) | — |
| `POST /auth/google` | `{ idToken, nonce?, role: 'coached_student', timezone? }` strict | 200 `{ user, accessToken, refreshToken }` | 400 INVALID_TIMEZONE / VALIDATION_ERROR;401 AUTH_INVALID_IDENTITY_TOKEN;403 AUTH_REGISTRATION_DISABLED / AUTH_REGISTRATION_NOT_ALLOWED;503 AUTH_PROVIDER_NOT_CONFIGURED / AUTH_PROVIDER_UNAVAILABLE(带 `provider:'google'`) |
| `POST /auth/email/register` | `{ email, password, role: 'coached_student', timezone? }` strict | **201** `{ user, accessToken, refreshToken }` | 400 同上;403 REGISTRATION_*;409 AUTH_EMAIL_TAKEN |
| `POST /auth/email/login` | `{ email, password }` strict | 200 `{ user, accessToken, refreshToken }` | 400 VALIDATION_ERROR;401 AUTH_INVALID_CREDENTIALS;429 RATE_LIMITED |
| `POST /auth/email/forgot` | `{ email }` strict | **204**(存在与否都 204,防探测) | 400;429(IP+email 双限流) |
| `POST /auth/email/reset` | `{ email, code: /^\d{6}$/, newPassword }` strict | **204** | 400;401 AUTH_INVALID_RESET_CODE(码错/过期/超 5 次) |
| `PATCH /me/timezone` | `{ timezone }`(IANA) 带 Bearer | 200/204 | 400 INVALID_TIMEZONE |
| `POST /auth/refresh` / `POST /auth/logout` | 同 CN(已实装) | | |

- `user` 形状:`{ id, phone: null, email, role, createdAt }`——**Global 用户 `phone` 为 null**,现 RN `UserSchema.phone: z.string()` 必须改 `nullable()`,并加 `email: z.string().nullable()`。
- 密码规则 `PasswordSchema`:≥8 字符且 UTF-8 ≤72 字节(bcrypt 上限);邮箱 trim 后 `.email()` ≤320。
- `timezone` = 设备 IANA 标识(如 `America/New_York`),注册/登录都带;后端 400 INVALID_TIMEZONE 时 iOS 文案 "Your device timezone isn't supported"。
- Google:后端用 `GOOGLE_CLIENT_ID` 单 audience 校验 id_token。**安卓 id_token 的 aud 是安卓 OAuth client id,与 iOS 不同 → 需要 backend 小卡把 `GOOGLE_CLIENT_ID` 改为逗号分隔多 audience**;在此之前安卓 Google 登录必 401。nonce 可选:安卓走 PKCE 网页流时可不带 nonce(后端 `nonce` optional)。

## 2. Google 流程(镜像 iOS,零 SDK)

iOS = `ASWebAuthenticationSession` 打 `https://accounts.google.com/o/oauth2/v2/auth`,PKCE S256,`scope=openid email profile`,redirect = 倒置 client id scheme `com.googleusercontent.apps.<id>:/oauth2redirect`,换 token 端点 `https://oauth2.googleapis.com/token`(installed-app 类型无 secret),取 `id_token` 交后端。
安卓等价:`expo-auth-session` + `expo-web-browser`(`useAuthRequest` 走 PKCE,`AuthSession.exchangeCodeAsync` 换 token),`responseType: code`,redirect 同样用 **Android 类型 OAuth client** 的倒置 scheme(需在 `app.json` `android.intentFilters`/`scheme` 注册;CN 产物不含)。
**David 亲手前置**:Google Cloud 同项目新建 Android OAuth client(包名 `com.meetpr.app` + debug/release keystore SHA-1),client id 放 `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`(公开值,非密钥);backend 多 audience 上线。前置未落地时,Google 按钮可先接线,失败走 "We couldn't verify this sign-in. Please try again",不阻塞邮箱通道验收。

## 3. UI 结构与英文字面量(全部照抄,不进 i18n 表——iOS 也是字面量)

### GlobalLoginView
- hero:MeetPR mark + 标题 "Better than\nyesterday" + 金色短横杠(与 CN LoginView 同构)。
- 顺序:[SiwA 按钮 — **安卓省略**] → "Continue with Google"(secondary 样式卡片按钮,带 Google 字标) → 分隔 "or" → 卡片:`EMAIL` 输入(placeholder `you@example.com`,keyboard email,错误 "Enter a valid email address")+ `PASSWORD` 输入(helper "Use 8–72 characters")→ 金色 CTA "Sign in"(GoldCTA primary;email/password 无效时禁用)→ 底行 "Create account" / "Forgot password?" 两个 link → 隐私行 "By continuing, you agree to our" + link "Privacy Policy" → `https://meetpr.app/privacy/en`。
- toast:错误码映射见 §4;从找回密码成功返回时 toast "Password updated, sign in with your new password"。
- 失败停留在登录页(spec 074 follow-up #324),不跳转。

### GlobalRegisterView
- 标题 "Create your\naccount",副 "Join your coach and start building better training days."
- `EMAIL` / `PASSWORD`(helper "8–72 characters",不足 8 时 "At least 8 characters")→ CTA "Create account"。角色固定 coached_student,**不出角色选择**。
- 成功 → 直接 authenticated 进 BindGate。409 → "An account already exists for this email"。

### GlobalForgotPasswordView(两步)
- 步 1:标题 "Reset your\npassword",说明 "Enter the email address linked to your account.",`EMAIL` → CTA "Send code";成功(204)恒显示 "If an account exists, we've sent a code." 并进步 2。
- 步 2:`6-digit code` 输入(仅数字,6 位才可提交)+ `NEW PASSWORD`(同密码规则)→ CTA "Reset password";成功回登录页并 toast;401 → "That code is invalid or has expired"。
- 页面顶部标题 "Forgot password",返回 = 系统返回。

## 4. 错误码 → 文案(GlobalAuthErrorMessage)
| 码 | 文案 |
|---|---|
| AUTH_INVALID_CREDENTIALS | Incorrect email or password |
| AUTH_INVALID_IDENTITY_TOKEN | We couldn't verify this sign-in. Please try again |
| AUTH_EMAIL_TAKEN | An account already exists for this email |
| AUTH_INVALID_RESET_CODE | That code is invalid or has expired |
| AUTH_REGISTRATION_DISABLED / AUTH_REGISTRATION_NOT_ALLOWED | Account creation is currently unavailable |
| INVALID_TIMEZONE | Your device timezone isn't supported |
| RATE_LIMITED | Too many attempts. Please try again later |
| VALIDATION_ERROR | Check your details and try again |
| 其它(网络/5xx/503 provider/解码/refresh 类) | Sign-in is temporarily unavailable |
| 用户取消 Google 弹窗 | 无 toast |

## 5. 时区契约(spec 042,Session+GlobalAuth)
- 注册/Google 登录请求体带 `timezone`;注册成功即记「已上报时区」= 该值(按 userId 存)。
- 邮箱登录不带 timezone;登录成功后若设备时区 ≠ 上次上报值 → `PATCH /me/timezone` 一次(静默失败不打扰)。
- 应用回前台(Global 轨 `reportsTimezoneOnBootstrap = true`)且已认证:同样对比后按需 PATCH。
- 存储:每用户一条 `lastReportedTimezone`(AsyncStorage 即可)。

## 6. 构建轨(BuildConfig.buildTrack)
- iOS 以 Info.plist `MeetPRBuildTrack = "Global"` 分流:`AuthFlowView` Global → GlobalLoginView,否则 CN LoginView;`Session.reportsTimezoneOnBootstrap = (track == .global)`。
- 安卓:`EXPO_PUBLIC_BUILD_TRACK = 'global' | 'china'`(默认 **global**),`API_BASE_URL` 默认随 track(global → `https://api.meetpr.app`,china → `http://121.40.160.241:3000`),`usesCleartextTraffic` 只在 china 轨打开(expo-build-properties 按 env 切)。埋点 `platform: 'android'` 照旧。
