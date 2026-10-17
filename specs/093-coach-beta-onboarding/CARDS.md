# Spec 093 · 给 Codex 的卡（2026-10-16，Claude 拆）

规则照各仓 AGENTS.md：一卡一个 worktree、一个写者；做完写收货记录（改了什么、怎么验的、哪些没验到），PR 等 David 合并。Claude 负责验收。口径以同目录 `SPEC.md` 为准，本文只写分工与完成标准。

顺序：**B0 → B → W → 发 App 包**；W0、I1 可与 B 并行；I2 跟 I1 一起发。

## 一次性执行（David 2026-10-17：一口气做完、一次验收）

1. **写代码**：B、W、W0、I1、I2 全部实装（iOS 在本机 Xcode 编译、模拟器截图），R-verify 上机；B0 只准备脚本与备份，不执行。各仓各开分支、各开 PR，不合并。
2. **唯一一次停下等 David**：一次性提交「B0 脚本 + 备份」和「后端迁移 + 部署国内 staging + plan-web 换装」的执行清单，David 一句同意后连续执行。
3. **部署后端到端走一遍**：申请 → 审批 → 收欢迎信 → 设密码 → 安卓与 iOS 模拟器邮箱登录 → 复制邀请消息 → 落地页 → 学员注册 → 粘贴邀请码 → 教练接受；老账号邮箱登录看到原数据。
   邮箱收尾三项**由 David 手动验，Codex 不做**：① 安卓与 iOS 各走一次「忘记密码 → 收码 → 改密 → 新密码登录」；② 注册验证码信、欢迎信、找回密码信在 QQ 与 163 邮箱各收一次，看是否进垃圾箱（spec 091 验收第 3、7 条）；③ iOS 从 `beta/1.0-24` 升级的已登录老用户直接进主界面。验收文档里为这三项留空行，由 David 填结果。
4. **交验收包**：写 `docs/verification-spec093-<日期>.md`，逐张卡列 PR 链接、测试命令与结果、截图路径、没验到的项与原因。然后交 Claude 一次验收。
5. 不做：发 TestFlight、发 APK（等验收通过后 David 决定）。

## B0 · 两个老账号补邮箱身份（运维，David + Codex）

- 仓：MeetPR-backend。照 backend `specs/048-email-signup-verification/SPEC.md` §5 执行。
- 前置：两个老账号（内测仅有的一个教练、一个学员，都是手机号账号）的目标邮箱 David 已于 2026-10-16 在会话中给出。**本仓是公开仓，邮箱不写进任何文件或提交**，由 David 直接交给执行者。
- 执行门禁（048 §5）：先导出两行 `users` 与其 `user_identities` 作备份、核对目标邮箱未被占用，脚本与备份给 David 过目、拿到明确同意后才对国内库执行。
- 完成标准：两个账号用「邮箱 + 原密码」能在国内 staging 登录，用户 id 不变，手机号登录仍可用；执行记录写进 backend 部署文档。
- 这是 I1 发 TestFlight 的硬前置。

## B · 后端：教练申请、审批、设密码、公开查码（MeetPR-backend，staging 分支）

SPEC §4 B1–B5：

1. 新表 `coach_applications`（迁移按仓内账本规矩）+ `POST /coach-applications`（公开，按 IP 与邮箱限速；同邮箱 pending 不重复建）。
2. 管理端接口：列申请、通过、拒绝（admin 角色）。「通过」在一个事务里：建教练账号（邮箱身份、无密码，参照 `scripts/provision-coach-global.ts` 的建号逻辑）→ 生成 `personal_permanent` 邀请码 → 发中文欢迎信（带设密码链接）。邮箱已是学员账号 → 返回明确错误码，不自动转。
3. 设密码：复用 `/auth/email/forgot|reset` 的令牌机制，有效期 7 天，单独邮件模板；提供「重新发送」。
4. `GET /public/invites/:code`（公开，限速）→ `{ valid, coach_display_name }`，失效码 `valid:false`，不返回其它字段。
5. 埋点 `POST /events` 接受 `platform=web`。
- 完成标准：单测覆盖以上每条的正常与错误路径；真实 PostgreSQL 上迁移干净执行与重入；部署国内 staging 后用 curl 走通「申请 → 通过 → 收信 → 设密码 → 邮箱登录 → 查码」并留证据。Global 部署不动。

## W · plan-web：申请页、设密码页、入驻完成页、学员落地页、审批（meetpr-plan-web）

SPEC §3 全部 + §4 B2 的界面：

1. 公开页（不用登录）：`/coach` 申请、设密码页、`/i/<码>` 学员落地页（按 iPhone／安卓／电脑／微信分流，SPEC §3.5）。
2. 教练登录后：入驻完成页（装 App、去排计划、邀请链接 + 二维码 + 「复制邀请消息」，消息文案与安卓 `src/i18n/catalog/RnExtras.json` 的 `coach.invites.message` 一致）。
3. 管理台（`src/features/admin/AdminWorkspace.tsx`）加「教练申请」分区：列表 + 通过／拒绝（二次确认）。
4. TestFlight 公开链接与 APK 网盘链接做成配置项，不写死。
5. 部署照 README「后端同源 serve」流程，链接形如 `http://121.40.160.241:3000/i/<码>`。
- 完成标准：`npm test`、`npm run lint`、`npm run build` 通过；在手机浏览器、电脑、微信内置浏览器各打开一次落地页截图；失效码页面截图；SPA 回退下 `/coach`、`/i/<码>` 刷新不 404。

## W0 · plan-web 邮箱登录收口（meetpr-plan-web，可与 B 并行）

SPEC §11：登录框文案改「邮箱」（背后仍接受手机号）；管理台用户列表加邮箱列、能按邮箱搜（若后端 admin 接口没返回邮箱，开 backend 小卡补字段）；**登录页加「忘记密码？」**（David 2026-10-17 加）：填邮箱 → `POST /auth/email/forgot` → 填 6 位验证码与新密码（8–72 位，确认密码）→ `POST /auth/email/reset` → 回登录页用新密码登录。流程与文案照安卓找回密码（`src/features/auth/GlobalForgotPasswordScreen.tsx` 与 `RnExtras.json` 的 `auth.*`）；只支持邮箱账号，填手机号时提示「请填写注册时用的邮箱」。完成标准：测试、类型检查通过；四个状态截图（填邮箱、已发码、错码、改密成功）。

## I1 / I2 · iOS（meetpr 仓，苹果端会话）

见同目录 `IOS-HANDOFF.md`。I1 = CN 轨邮箱登录注册找回；I2 = 认码、粘贴按钮、复制整段邀请消息。需在 Mac 上 Xcode 编译、模拟器截图。I1 的 TestFlight 等 B0 完成；I2 的第 3 条等 W 上线。

## R-verify · 安卓卡 R 上机（meetpr-rn，分支 `claude/blissful-curie-wk8cxa`）

代码已实装（SPEC「实装记录」），云端没有模拟器，补上机：

1. `EXPO_PUBLIC_BUILD_TRACK=china npx expo run:android`，AVD `meetpr`（中文系统）。
2. 学员：绑定页有「粘贴邀请码」；复制整段邀请消息后点它能填对码；剪贴板是无关文字时出提示；把整段消息长按粘进码框也能填对。
3. 教练：「我的」点复制、邀请码页点复制与分享，粘到备忘录里看消息内容（链接、分组码、教练名）。
4. Global 包：绑定页无粘贴按钮，教练复制仍只复制码。
- 完成标准：截图放 `docs/evidence/spec093-<日期>/`，收货记录补进 SPEC「实装记录」；全量 `npx jest`、`npx tsc --noEmit`、`npx expo lint` 通过。
