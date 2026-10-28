# 给苹果端会话的交接：spec 093（CN 轨邮箱登录 + 邀请学员两处小改）

写于 2026-10-16，来源 `SPEC.md`（同目录）。本文是交接，不是 iOS 的 spec；iOS 仓的卡、节奏与发版由苹果端会话自己定。只做 CN 轨，Global 轨一行不动。

## 为什么现在要做

David 2026-10-16 拍板：CN 轨三端统一邮箱登录（SPEC §11），并上线「教练申请 → 设密码 → 邀请学员」链路（SPEC §2）。新开的教练号与新注册的学员号都只有邮箱身份，而 iOS 最新内测包 `beta/1.0-24` 的 CN 轨仍是手机号登录（`AuthFlowView` 对 `.china` 走 `LoginView`），所以 iOS 是整条链路的前置。

## 卡 I1：CN 轨登录、注册、找回密码改邮箱

照安卓 `specs/091-cn-android-first/SPEC.md` §2 与文末「文案」表做，那份已在安卓上线并经 David 定稿。要点：

1. `AuthFlowView` 的 `.china` 分支改用 `Auth/Global/` 下现成的登录、注册、找回密码三屏；CN 轨不显示 Sign in with Apple 与 Google 按钮（连同只为它们存在的分隔元素）。
2. 登录页大标题 CN 轨用英文「Meet Your Personal Record Here.」（三行），Global 维持现状。
3. CN 轨注册一页完成，自上而下四个框：邮箱 → 验证码（框内小按钮「获取验证码」，60 秒倒计时，发码后显示「已发送到 {email}，10 分钟内有效」）→ 密码（8–72 位）→ 确认密码（不一致时描红提示，只在本机比对）。发码后改邮箱：清空验证码、隐藏已发送提示、按钮立即可点。保留 iOS 惯例：验证码框 `textContentType(.oneTimeCode)`。
4. 新接口：`POST /auth/email/register/code` `{ email }` → 恒 204；`POST /auth/email/register` 多带 `code`（6 位数字），错码／过期 → `401 AUTH_INVALID_SIGNUP_CODE`。契约见 backend `specs/048-email-signup-verification/SPEC.md`（已在国内部署）。
5. 界面中文（跟系统语言），英文文案与安卓 `src/i18n/catalog/RnExtras.json` 里 `auth.*` 键一致。
6. 注册角色仍固定 `coached_student`。

**升级照护（发包红线）**：已登录的老用户升级后 token 仍有效，应直接进主界面；退出后只能用邮箱登回来，所以**后端先给两个老账号补邮箱身份（backend 048 §5，SPEC §11 卡 B0）之后，才能发这个 TestFlight 包**。旧包继续可用手机号登录，不强制升级。

## 卡 I2：邀请学员两处小改（与安卓卡 R 对齐，仅 CN 轨）

安卓实现在本仓 `claude/blissful-curie-wk8cxa` 分支，可直接对照：

1. **认出码**（`BindGate` 输入邀请码页）：输入或粘贴的内容里有 `/i/<10 位码>` 就取它；没有链接时找文中 10 位码（可带空格或短横分组）；都没有沿用原规则。安卓：`src/features/onboarding/model.ts` 的 `extractInviteCode` 及其测试用例。两轨都生效（纯修错）。
2. **「粘贴邀请码」按钮**（同一页，仅 CN 轨）：码框下的文字按钮，点了才读剪贴板（不在进页时自动读，避免 iOS 的「允许粘贴」弹窗），用上一条取码；没找到提示「复制的内容里没有找到邀请码」。可考虑用系统 `PasteButton`，它不弹授权框。
3. **教练端复制整段邀请消息**（仅 CN 轨，「我的」邀请码卡与邀请码页）：「复制」复制整段消息，邀请码页永久码旁加「分享」（`ShareLink`）。消息文案（中英）见安卓 `RnExtras.json` 的 `coach.invites.message`，链接 = 后端地址 + `/i/<码>`，签名用教练显示名，没有名字时用「教练」。

**发包顺序**：带第 3 条的包要等 plan-web 的 `/i/<码>` 落地页上线后才能发。

## 验收（iOS 侧）

- CN 包全程无手机号输入、无 Apple／Google 按钮；中文系统下三屏除英文口号与字标外无英文。
- 真邮箱注册（收中文验证码）→ 进入绑定教练；错码、过期码、两次密码不一致都有提示且不建号。
- 老账号用邮箱 + 原密码登录，看到原有数据；从 `beta/1.0-24` 升级的已登录老用户直接进主界面。
- 粘贴整段邀请消息或链接能填对码；教练复制出的消息里链接与码正确。
