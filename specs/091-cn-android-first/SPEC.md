# Spec 091 · 安卓 CN 轨首版：邮箱登录注册（带验证码）、包名分轨、内测 APK

- 来源：David 2026-10-10 「以最新的 rn 安卓端为标准，出 CN 的双端版本」→ /grill 两轮。第一轮五题（分发／包名／注册入口／推送／连接方式）；第二轮因「真实内测只有一个教练一个学员」把登录方式改为只留邮箱；最后一题（注册要不要验证邮箱）答「B」＝要验证。
- 级别／节奏：T3 / P1（新分发轨 + 包名变更）。合并等 David「放行」。
- 范围：只做安卓（`meetpr-rn`）。iOS 原生端的 CN 邮箱登录由苹果端会话跟，交接见同目录 `IOS-HANDOFF.md`。本线不碰 iOS 仓。
- 后端：依赖 backend `specs/048-email-signup-verification/SPEC.md`（注册验证码 + 国内部署接通发信）。本仓不绕后端。
- 屏幕稿：**待出、待 David「定稿」**。UI 卡在定稿之后才派；后端卡不依赖界面，可先行。

## 现状（2026-10-10 现场核实，`origin/main`）

- 分轨开关 `EXPO_PUBLIC_BUILD_TRACK`（`src/config/build-track.ts`）：`china` 轨默认连 `http://121.40.160.241:3000`，并已打开明文流量；`global` 轨连 `https://api.meetpr.app`。
- 两轨现在共用包名 `com.meetpr.app`（`app.json`）。
- `china` 轨登录页是手机号 + 密码（`src/app/login.tsx` 里的 `LoginScreen`），注册与找回密码两条路由被 `BUILD_TRACK === 'global'` 挡住（`src/app/_layout.tsx`）。
- `global` 轨的登录／注册／找回密码三屏（`src/features/auth/Global*.tsx`）文案是写死的英文，没走 i18n；登录页带 Google 按钮。
- 国内 staging 已有全部邮箱接口（`/auth/email/register|login|forgot|reset`），但注册不发验证码、国内部署没接通发信。
- 仓内没有 release 签名配置与出包脚本；10/10 的中文走查包用的是 `~/Projects/scratch/rn-cn-20261010/cn-pack.sh`（仓外，调试签名）。

## 已拍板口径

| # | 题 | 结论 |
|---|---|---|
| 1 | 首版怎么发 | 内测包，APK 直发给内测员；David 先建正式签名（release keystore） |
| 2 | 包名 | CN 轨用 `com.meetpr.app`；Global 轨改 `com.meetpr.global` |
| 3 | 登录与注册 | App 端只用邮箱：登录、注册、找回密码全走邮箱。后端手机号接口保留不删 |
| 3b | 注册验证邮箱 | 要。填邮箱和密码 → 收 6 位验证码 → 验过才建号 |
| 4 | 推送 | 首版不带。推送单独立 spec |
| 5 | 连接方式 | 首版先连明文 IP；HTTPS 通了两端一起切 |
| — | 两个老账号 | 各补一条邮箱登录身份，数据不搬、密码不变、手机号保留（后端 048 §5） |
| — | 教练账号 | 仍由 David 后台开，改用邮箱开 |

## §1 包名分轨

- `china` 轨 `android.package` = `com.meetpr.app`；`global` 轨 = `com.meetpr.global`。在 `app.config.ts` 按 `EXPO_PUBLIC_BUILD_TRACK` 决定，`app.json` 不再是包名的唯一出处。
- 两个包可在同一台手机上并存，互不覆盖。桌面名称：CN 轨「MeetPR」；Global 轨维持「MeetPR」（并存时靠图标位置区分，首版不加角标）。
- **Global 侧的连带影响（必须在卡里处理或登记）**：
  - Google 登录的安卓 OAuth client 绑定「包名 + 签名指纹」。Global 改包名后原 client 失效，需要 David 在 Google Cloud 新建一个 `com.meetpr.global` 的安卓 client，后端 `GOOGLE_CLIENT_ID` 列表追加它（后端已支持逗号分隔多个）。在此之前 Global 包的 Google 登录不可用，邮箱登录不受影响。
  - 已装在走查机上的 Global 包（旧包名）不会被新包覆盖升级，需卸载重装并重新登录。服务端数据不受影响；本机未上传的内容（若有）会随卸载丢失——发新 Global 包前先确认走查机上没有未同步的训练记录。
- `AGENTS.md` 红线「包名 `com.meetpr.app` 与 release keystore 一经对外发包终身锁死」改写为两轨各自的包名；`AGENTS.md` / `PLAN.md` / `PARITY.md` 里「本仓只做 Global 轨、CN staging 仅作对照」的表述同步改写——这三份是正典文档，由 Opus 在收货时改，不进卡。

## §2 CN 轨登录、注册、找回密码

CN 轨不再出现手机号。三屏复用 Global 轨现成的那一套，不另起新屏。

- **共用屏幕**：`GlobalLoginScreen` / `GlobalRegisterScreen` / `GlobalForgotPasswordScreen` 及其子组件两轨共用；`src/app/login.tsx` 里的手机号 `LoginScreen` 从 App 里移除。`_layout.tsx` 中注册与找回密码两条路由对 `china` 轨放开，`china` 轨的路由守卫与 `global` 轨取齐。
- **文案走 i18n**：这三屏所有写死的英文搬进 `src/i18n/catalog/`，出 `en` 与 `zh` 两套。英文一字不改（Global 轨截图对比应无差异）。中文文案见文末「文案」。
- **CN 轨不显示 Google 按钮**，连同只为它存在的分隔元素（若有）一并不显示。
- **登录**：邮箱 + 密码，调 `/auth/email/login`。错误提示沿用现有映射。
- **找回密码**：流程与 Global 轨一致（填邮箱 → 收码 → 填码与新密码）。
- **注册（新增验证码一步，仅 CN 轨）**：
  1. 第一屏：邮箱 + 密码（规则不变，8–72 位）。主按钮「获取验证码」→ 调 `POST /auth/email/register/code`。
  2. 第二屏：提示「验证码已发送到 {email}」，一个 6 位数字输入框（数字键盘，支持从短信／邮件自动填充的系统建议），主按钮「完成注册」→ 调 `/auth/email/register`（带 `code`）。成功即登录，进入现有的绑定教练流程。
  3. 「重新发送」：进入第二屏后 60 秒内置灰并显示倒计时，之后可点；点了重新走第 1 步的接口并重置倒计时。
  4. 「换个邮箱」：回第一屏，已填邮箱与密码保留。
  5. 错误：`AUTH_INVALID_SIGNUP_CODE` →「验证码不对或已过期，请重新获取」；`AUTH_EMAIL_TAKEN` →「这个邮箱已经注册过了，请直接登录」并给「去登录」入口；限速与网络错误沿用现有提示。
  6. 邮箱已注册的情况：服务端出于安全不会告诉 App，而是给该邮箱发一封「你已有账号」的信。第二屏底部常驻一行小字：「没收到？看看垃圾箱；如果你已经注册过，请直接登录。」
- **Global 轨注册流程不变**（不出现验证码屏）。分轨由 `BUILD_TRACK` 决定，不向服务端探测。
- 注册角色仍固定 `coached_student`，教练不能自助注册。

## §3 分发与签名

- 产物：`china` 轨 release 签名 APK，直发内测员（微信／网盘均可）。不上应用商店，不挂境内下载页（境内网站分发要 App ICP 备案，另立）。
- 签名：David 新建 release keystore，口令只存 Bitwarden。仓内只留「从环境变量读签名配置」的 Gradle 接线与一份出包脚本（`scripts/pack-android.sh <china|global>`），不留任何口令或 keystore 文件；`.gitignore` 挡住 `*.keystore` / `*.jks`。
- 版本：`versionName` 沿用 `app.json` 的 `version`；`versionCode` 首版为 1，之后每次对外发包 +1（记在 `RELEASES.md`，本卡懒创建）。
- 首版 CN 包与今后的 CN 包必须同一把 keystore，否则内测员无法覆盖升级。

## §4 不做的两件事在包里的样子

- **推送**：不接任何推送 SDK，不申请通知以外的新权限。训练提醒与休息倒计时维持现有本地通知行为。
- **连接**：`china` 轨继续连 `http://121.40.160.241:3000`，明文流量只对 `china` 轨开（现状即如此，不改）。

## 老用户照护（交付红线）

- 安卓 CN 是全新安装，没有本机旧数据需要迁移。
- 两个老账号（教练、学员）是「带历史的老用户」：补完邮箱身份后，用邮箱 + 原密码登录安卓 CN 包，第一屏必须是他们原有的数据（学员＝今天的训练与既有计划；教练＝学员列表里有那位学员）。
- 旧 iOS 内测包不受影响：仍可用手机号登录，数据同一份。

## 验收清单

模拟器（AVD `meetpr`）亲眼看 + 截图；带 ★ 的另需 David 的真机。

1. `china` 包与 `global` 包装在同一台机器上并存，包名分别是 `com.meetpr.app` 与 `com.meetpr.global`。
2. `china` 包全程不出现手机号输入、不出现 Google 按钮、不出现英文界面文案。
3. 注册：填邮箱密码 → 邮箱收到中文验证码信 → 填码 → 进入绑定教练流程。★（真邮箱，QQ 与 163 各一次）
4. 注册第二屏：错码、过期码有对应提示且不建号；「重新发送」60 秒倒计时生效；「换个邮箱」回第一屏且内容保留。
5. 用已注册邮箱走注册 → 不会建出第二个账号；该邮箱收到「你已有账号」的信。
6. 登录：邮箱 + 密码成功；密码错有提示。
7. 找回密码：收中文验证码信 → 改密成功 → 用新密码登录。★
8. 老学员账号用邮箱 + 原密码登录 `china` 包，Today 显示其原有计划与历史；老教练账号登录后能看到该学员。★
9. `global` 包三屏与改动前逐屏截图对比无差异（英文文案、Google 按钮、无验证码屏），邮箱注册登录仍可用。
10. release APK 用 David 的 keystore 签名；仓内与提交历史里没有 keystore 或口令。
11. 现有测试全绿；`no-literal-zh` 与 `no-i18n-todo` 两条检查通过。

## 测试 seam

- `src/features/auth/__tests__/global-auth-screens.test.tsx`（屏幕级渲染测试，已有）：按轨断言——`china` 无 Google 按钮、注册出现验证码步；`global` 与今天一致。验收 2、4、5、9 的逻辑部分在这里先红后绿。
- `src/api/auth.ts` 的请求函数（已有 mock `apiRequest` 的测法）：新增 `requestSignupCode`、`emailRegister` 带 `code`。
- `src/features/auth/__tests__/error-copy.test.ts`（已有）：新错误码到文案的映射。
- `app.config.ts`：按 `EXPO_PUBLIC_BUILD_TRACK` 产出包名的纯函数测试。验收 1 的配置部分。
- 不为倒计时另造 seam：用假时钟在屏幕级测试里推进。

## Out of Scope

- iOS 任何改动（见 `IOS-HANDOFF.md`）。
- 推送（厂商通道）、境内下载页、应用商店上架、App ICP 备案。
- HTTPS／域名切换。
- 手机号登录、短信验证码、微信登录、Google／Apple 登录在 CN 轨的任何形态。
- Global 轨加注册验证码。
- 改邮箱、注销账号流程的任何变化。
- CN 轨的时区上报、埋点等与登录无关的分轨差异（现状保留）。
- 顺手改三屏的布局或视觉——只换语言、去 Google、加验证码一步。

## 拆卡

单仓两张，理由：签名出包与登录改造的验收物不同、可并行。

- **卡 A（后端，先行）**：backend spec 048 全量。不依赖屏幕稿。
- **卡 B（本仓，等「定稿」）**：§1 包名分轨 + §2 登录注册找回 + i18n。
- **卡 C（本仓，可与 B 并行）**：§3 签名接线与出包脚本。keystore 本身是 David 人工件。

陪跑（Opus）：048 §5 两个老账号补身份、048 §6 发信探针、出包与发包。

## David 人工前置

1. 新建 release keystore，口令存 Bitwarden。
2. 国内 SAE 环境变量加 `RESEND_API_KEY`（backend 048）。
3. 提供两个老账号各自的邮箱（backend 048 §5）。
4. Google Cloud 新建 `com.meetpr.global` 的安卓 OAuth client（只影响 Global 包的 Google 登录，可晚于 CN 首版）。

## 文案（zh，待屏幕稿定稿时一并确认）

| 位置 | 文案 |
|---|---|
| 登录标题 | 比昨天更好（对应英文 Better than yesterday） |
| 邮箱／密码字段 | 邮箱／密码 |
| 登录按钮 | 登录 |
| 登录页两个入口 | 注册账号／忘记密码？ |
| 注册标题／副标题 | 创建账号／加入你的教练，把每个训练日练得更好 |
| 密码提示／错误 | 8–72 位／请输入 8–72 位密码 |
| 注册第一屏按钮 | 获取验证码 |
| 注册第二屏标题／说明 | 输入验证码／验证码已发送到 {email}，10 分钟内有效 |
| 注册第二屏按钮 | 完成注册 |
| 重发 | 重新发送／{n} 秒后可重新发送 |
| 换邮箱 | 换个邮箱 |
| 第二屏底部小字 | 没收到？看看垃圾箱；如果你已经注册过，请直接登录。 |
| 错码 | 验证码不对或已过期，请重新获取 |
| 邮箱已注册 | 这个邮箱已经注册过了，请直接登录 |
| 找回密码标题／说明 | 找回密码／填写注册邮箱，我们会发一个验证码给你 |
| 找回密码按钮 | 发送验证码／重置密码 |
| 新密码字段 | 新密码 |

## 屏幕稿

待出。范围：CN 登录页、注册第一屏、注册第二屏（验证码）、找回密码两步。定稿后把结构与文案转写到这里再派卡 B。
