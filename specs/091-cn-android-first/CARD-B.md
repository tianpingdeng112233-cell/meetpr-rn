# 卡 B · 091 CN 轨登录、注册、找回密码

先读仓根 `CONTEXT.md` 与 `AGENTS.md`，再读同目录 `SPEC.md`（以它为准；本卡只划范围）。屏幕稿是外链打不开，结构与文案已转写在 `SPEC.md` 的「文案」「屏幕稿」两节，照那两节做。

- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-091b`，分支 `feat/091b-cn-auth`。**只在这棵树里写**；开工先试写一个临时文件确认可写，不可写立刻带原始报错返回。`node_modules` 是指向主仓的软链，不要重装依赖、不要改 `package.json` / lock。
- 不 commit、不 push、不开 PR。交付＝工作区改动 + `docs/CODEX-JOURNAL.md` 追加一段。
- 卡里没有也不需要任何密钥或账号。测试一律 mock 网络。

## 目标

实现 `SPEC.md` §2 全部（CN 轨登录、注册、找回密码）与「屏幕稿」里的字体规则。**只动 `src/`**。

## 不在本卡

- §1 包名、§3 签名与出包（卡 C，另一棵树在做）：不要碰 `app.config.ts`、`app.json`、`plugins/`、`scripts/`、`.gitignore`。
- 后端任何改动。iOS。`AGENTS.md` / `PLAN.md` / `PARITY.md`（Opus 收货时改）。
- `SPEC.md`「Out of Scope」所列全部。尤其：不顺手改三屏的布局或视觉。

## 要做的事

1. **路由**：`src/app/_layout.tsx` 里 `register`、`forgot-password` 两条路由对 `china` 轨放开，`china` 轨的登录相关守卫与 `global` 轨取齐；`src/app/login.tsx` 不再按轨分支，手机号 `LoginScreen` 及只为它存在的代码与文案从 App 里移除（`src/api` 里的手机号登录请求函数若仍被别处引用就留着，无人引用则删）。两条路由的顶栏标题走 i18n。
2. **文案走 i18n**：`src/features/auth/` 下三屏与其子组件（`AuthForm`、`GlobalAuthField` 的标签、`error-copy.ts`）里写死的英文全部搬进 `src/i18n/catalog/`（新键放 `RnExtras.json` 或 `AppShell.json`，跟现有命名风格）。每个键出 `en` 与 `zh`：`en` 取现有英文原文一字不改；`zh` 取 `SPEC.md`「文案」表。语言仍由现有 `getLocale()` 决定（跟系统语言走），不新造按轨选语言的机制。
3. **按轨的差异（由 `BUILD_TRACK` 决定，不向服务端探测）**：
   - `china`：不渲染 Google 按钮与「or」分隔线；登录页大标题固定为英文 `Meet Your\nPersonal Record\nHere.`（中英文系统下都是这句，不翻译）；隐私政策链接 `https://meetpr.app/privacy`；注册页是下面第 4 条的一页式。
   - `global`：登录、注册、找回三屏在英文系统下与改动前逐像素一致（标题仍是 `Better than\nyesterday`，注册仍是邮箱 + 密码两框、无验证码、无确认密码）。
4. **CN 轨注册页（一页四框）**：按 `SPEC.md` §2「注册」1–7 条逐条实现。要点：
   - `src/api/auth.ts` 新增 `requestSignupCode({ email })` → `POST /auth/email/register/code`（204 无 body）；`emailRegister` 增加可选 `code`，有值才进请求体（`global` 轨请求体与今天逐字节一致）。`registerWithEmail`（`src/api/session.ts`）相应透传。
   - `ApiErrorCode` 增加 `AUTH_INVALID_SIGNUP_CODE` 并接入文案映射。
   - 小按钮三态：获取验证码 → `{n} 秒后重发`（60 秒，置灰）→ 重新获取。发码请求进行中置灰防连点；请求失败（网络／限速）给现有提示且不进入倒计时。
   - 发码后改动邮箱：清空验证码、隐藏「已发送到…」、小按钮立即恢复可点、倒计时清零。
   - 确认密码只在本地比对，不进请求体。不一致提示的时机：确认框失焦后，或两框都有内容且不一致时。
   - 「注册」可点条件：邮箱合法、验证码 6 位数字、密码合规、两次一致。
   - 验证码框：数字键盘，`maxLength` 6，`autoComplete="one-time-code"`（安卓 `textContentType` 等价项按 RN 当前版本写法）。
   - 倒计时用定时器，页面卸载时清掉；App 退到后台再回来倒计时按真实流逝时间校正（记截止时间戳，不靠累减）。
5. **字体**：按 `SPEC.md`「屏幕稿」里「字体」那一小节。规则只在界面语言为中文时生效；英文界面下三屏的字体与今天一致。实现方式：给 auth 这几个组件一个按 `getLocale()` 取样式的小函数，不改 `@/design` 里的全局字体定义。
6. **英文系统下 CN 轨新增元素的英文文案**（`en` 键值）：`Verification code`／占位 `6-digit code`／`Get code`／`Resend in {n}s`／`Resend`／`Sent to {email}. Valid for 10 minutes.`／`Confirm password`／占位 `Re-enter password`／`Passwords don't match`／主按钮 `Create account`／底部 `Didn't get it? Check your spam folder. If you already have an account, sign in.`／错码 `That code is invalid or has expired`。

## 约束

- 不新增依赖。
- `global` 轨行为零变化：现有 `auth-global.test.ts`、`global-auth-screens.test.tsx`、`error-copy.test.ts` 中针对 `global` 的断言不改、全绿。
- `no-literal-zh`、`no-i18n-todo` 两条检查通过（中文只进 catalog）。
- 可触控元素不小于 44dp；新增元素都有 `accessibilityLabel`，错误提示用 `accessibilityRole="alert"`。
- 代码风格、注释密度、命名跟周围代码一致。

## 验收标准

`SPEC.md`「验收清单」第 2、4、5（App 侧：不建第二个账号的界面表现）、6、7（App 侧流程）、9、11 条的可自动化部分。真机、真邮箱、模拟器截图由 Opus 收货时做。

## 测试 seam（先红后绿，只用这三处）

1. `src/features/auth/__tests__/global-auth-screens.test.tsx`（屏幕级渲染，已有）：按轨、按语言断言。`china`：无 Google 按钮；标题为英文口号；注册页四框 + 小按钮三态（假时钟推进 60 秒）；改邮箱后的复位；密码不一致时「注册」不可点并出提示；错码回包后的描红与「重新获取」。`global`：与今天一致。`BUILD_TRACK` 是模块常量，用 `jest.isolateModules` / `jest.doMock('@/config/build-track')` 切轨。
2. `src/api/__tests__/auth-global.test.ts`（已有，mock `apiRequest`）：`requestSignupCode` 的路径与请求体；`emailRegister` 带与不带 `code` 的请求体。
3. `src/features/auth/__tests__/error-copy.test.ts`（已有）：`AUTH_INVALID_SIGNUP_CODE` 的中英文文案。

## 交付前自检

`npx tsc --noEmit`、`npm run lint`、`npm test` 全量。结果如实写进 JOURNAL：跑了哪些、各自最后一行、哪些因环境没跑成及原因。返回时给出改动文件列表、自检结果、以及任何认为 SPEC 有歧义需回到 Opus 的点。
