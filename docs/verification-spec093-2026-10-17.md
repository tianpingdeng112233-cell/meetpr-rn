# Spec 093 开发自测、待验清单与人工验收 · 2026-10-17（10-18 补人工验收）

依据 `claude/blissful-curie-wk8cxa@692228d` 的 CARDS「一次性执行」、SPEC 和 IOS-HANDOFF。SPEC 为完整口径。本文件记录实际开发自测，不替代 Opus 终审；本地 fixture 证据不等于 staging 持久化、真实收信或新用户计时验收。

## 执行边界

- 全部代码先实现并开 PR，PR 不自行合并。后端迁移、国内 staging 部署和 plan-web 换装另汇总一次批准；未获该次批准前不执行。
- B0 已在前序获得 David 明确同意并执行，随后 David 回复邮箱/手机号登录及原数据“通过”。本轮只核对记录，不重复补身份。
- 真实邮箱、密码、token、数据库备份均不入公开仓。B0 原始备份与脚本保留在仓外私有目录；它不是 0075 的全库恢复点。
- Global 部署不动；不发 TestFlight，不分发 APK。iOS CN 邮箱包未发出前，不宣布外部入驻正式开放。

## 卡片交付

| 卡 | PR | 实装与结果 | 未验到及原因 |
| --- | --- | --- | --- |
| B0 | [backend #298](https://github.com/tianpingdeng112233-cell/MeetPR-backend/pull/298) | 两个存量账号补邮箱身份；保留用户 ID、原密码与手机号登录。邮箱占用查询、两行 users/identities 备份、脚本审批和执行截图在私有材料中。David 登录及原数据验证通过。 | 记录的是 David 实测；Codex 未独立取得密码再次登录。0075 迁移前仍需新的全库备份。 |
| B | [backend #299](https://github.com/tianpingdeng112233-cell/MeetPR-backend/pull/299) | 申请、审批/拒绝/重发、7 天设密令牌、公开查码、web 事件、admin email。0075 加表/列，默认 gate 关闭；存量找回码兼容。 | 尚未执行国内 0075、配置/镜像部署、真实发信与 staging E2E；等待统一批准。 |
| W0 | [plan-web #109](https://github.com/tianpingdeng112233-cell/meetpr-plan-web/pull/109) | 邮箱登录提示保留手机号兼容；admin 邮箱列/搜索；网页忘记密码完整流程及四状态截图。 | 邮件和改密使用本地合成 API；真实 staging 邮箱改密与新密码登录未验。 |
| W | [plan-web #110](https://github.com/tianpingdeng112233-cell/meetpr-plan-web/pull/110)（叠在 #109） | 申请、设密、欢迎、邀请落地页与审批；五个 web 事件；本地 QR、HTTP 复制回退、设备分流。14 张截图；独立双轴审查已收敛。 | backend #299 已装入同源候选，未部署；真实安装链接尚缺，当前明确显示未开放。真实微信和物理浏览器未验。 |
| I1 / I2 | [iOS #366](https://github.com/tianpingdeng112233-cell/meetpr/pull/366)（base release/1.0） | CN 邮箱登录、验证码注册、找回；两轨认码，CN 粘贴/完整邀请/分享；修复注册表单字体。两轨 Xcode 编译、1891 tests、15 张实际模拟器图。 | 真实 staging 链路、物理设备未验；三项指定手测见下方；早期误发码事件见末节。 |
| R-verify | [RN #95](https://github.com/tianpingdeng112233-cell/meetpr-rn/pull/95) | 中文 AVD `meetpr` 两轨上机；修复原生长消息粘贴撑高与旧错误残留；17 张截图。 | 未验物理安卓机、真实 staging 绑定持久化、真实下载安装与外部分享发出；本机 fixture 地址不代表已上线页面。 |

## 测试命令与原始证据

| 仓 / 命令 | 结果 | 原始记录 |
| --- | --- | --- |
| backend `pnpm test` | 158 文件；1236 passed / 1 skipped。skip 是仅真实 PostgreSQL 环境运行的事务用例，另行跑通。 | backend `docs/evidence/spec093-2026-10-17/final-tests.txt` |
| backend 本地 PG18 API suite | 16/16；空库、0075 重入、并发审批与事务故障回滚通过。 | backend 同目录 `realpg.txt`；完整执行命令在 `docs/CODEX-JOURNAL.md` |
| backend `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build` | 全部通过。 | backend 同目录对应命令 `.txt` |
| backend 存量升级脚本 | 合成旧用户 JSON 不变；旧 reset code 仅新增默认 purpose，旧写法兼容；0075 连跑两次通过。 | 仓外部署审查目录 `verify-local-upgrade.sql` / `local-upgrade-result.txt`，不是国内库证据。 |
| plan-web W0 `npm test` | 原 W0：91 文件/888 tests；加找回后：92 文件/897 tests。随后追加 1 条纯测试，该 suite 10/10 通过。 | web `docs/evidence/spec093-2026-10-17/spec093-web-forgot-full.txt` / `spec093-web-forgot-final.txt` |
| plan-web W0 `npm run lint`、`npm run build` | 通过；保留既有大 chunk 警告。 | web 同目录 `w0-recovery-typecheck.txt` / `spec093-web-forgot-build.txt` |
| plan-web W `npm test` | 93 文件 / 915 tests 通过；随后新增两条旧会话恢复回归，相关 50 tests 通过。 | web 同目录 `spec093-w-combined-tests.log` / `spec093-w-green-session-recovery.log` |
| plan-web W `npm run lint`、`npm run build` | 通过；最后同源构建 API_BASE 为空，12 文件与 backend web/ 哈希一致。 | web 同目录 `spec093-w-review-final.log`；仓外 `web-final-bundle.json` |
| iOS `swift test --package-path Modules/<module>`（通过 XcodeBuildMCP 执行） | AppShell 116、Networking 139、CoreModels 159、CoachKit 456、StudentKit 1021，共 1891 通过。 | [iOS 原始证据及日志索引](https://github.com/tianpingdeng112233-cell/meetpr/blob/48aced34d4fd3e549bfc1fdabde86f8e6dd84c51/docs/evidence/spec093-2026-10-17/README.md) |
| iOS XcodeBuildMCP `build_run_sim`（CN Debug / Global） | 两轨模拟器编译通过；17.5s / 191.1s，无 warning/error。 | iOS 同目录 README 记录完整日志名、设备、DerivedData。 |
| iOS `swiftlint lint --quiet`、提交门禁 `swift-format lint` / SwiftLint、`git diff --check` | 通过。额外直接 swift-format 调用因 PATH 未配置未运行，随后仓内提交门禁成功执行。 | iOS JOURNAL / 本次提交门禁输出。 |
| RN `EXPO_NO_DOTENV=1 npx jest --runInBand` | 全量 180 suites / 1718 tests 通过。 | [jest-final.txt](evidence/spec093-2026-10-17/jest-final.txt) |
| RN `EXPO_NO_DOTENV=1 npx tsc --noEmit`、`EXPO_NO_DOTENV=1 npx expo lint` | 通过；prebuild 暴露的 ViewStyle 类型错误已收窄并复跑组件 11 tests。 | [checks-after-type-narrowing.txt](evidence/spec093-2026-10-17/checks-after-type-narrowing.txt) |
| RN `EXPO_PUBLIC_BUILD_TRACK=china npx expo run:android` 及 Global 原生构建 | 两轨 debug 构建/安装运行通过。启动过程及本机 API/Metro 配置见证据 README。 | [Android 截图与复现索引](evidence/spec093-2026-10-17/README.md) |

上述 backend / 原 W0 / R 及 W0 找回增量均经独立 Standards、Spec 审查，各 0 finding；W 的 Spec 首轮 P2（设密后登录失败可能复用旧会话）已修复，定向复审 0；Standards 0。I 的 Standards / Spec findings 均返修收敛，最后错误态提示经独立只读复核关闭，0 未决。B 最终同源候选 `3c08e613` 的 [CI](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/39004503545) 已绿；R 候选 `e2b70a3` 的 [CI](https://github.com/tianpingdeng112233-cell/meetpr-rn/actions/runs/39003781795) 中 check 与 android-build 均通过；本报告后续文档提交另看 PR 状态。iOS `48aced34` 的 PR CI 已触发，交付时以 PR 实时状态为准；不能将本地测试等同 CI。plan-web 仓没有配置 CI，不能把本地通过称为 CI 绿。

## 截图索引

- Android：本仓 [17 张截图与逐项说明](evidence/spec093-2026-10-17/README.md)，目录 `docs/evidence/spec093-2026-10-17/`。含 CN 粘贴按钮/无关剪贴板/原生长按/教练两入口复制/分享面板及 Global 无粘贴、纯码复制。
- W0：plan-web 同目录 `w0-login-synthetic.png`、`w0-admin-users-synthetic.png`、`w0-admin-email-search-synthetic.png`。
- W0 忘记密码四状态：`w0-forgot-email.jpg`、`w0-forgot-sent.jpg`、`w0-forgot-wrong-code.jpg`、`w0-forgot-success.jpg`；额外手机布局 `w0-forgot-mobile.jpg`。全部 localhost 合成响应，无真实邮件和账号变更。
- W：plan-web 同目录 14 张 `w-*.jpg`，含申请/回执、设密、欢迎与复制、审批列表/确认/结果、iPhone/Android/desktop/微信 UA 仿真、失效码、设密后登录失败恢复。主代理逐张亲看。
- iOS：[15 张截图索引](https://github.com/tianpingdeng112233-cell/meetpr/blob/48aced34d4fd3e549bfc1fdabde86f8e6dd84c51/docs/evidence/spec093-2026-10-17/README.md)。同目录 `cn-register.jpg` 为字体修复；CN 登录/注册发码/找回两步、教练两入口复制/分享、学员消息/裸链接/无关文本粘贴；Global 登录/无粘贴/无分享/复制纯码。主代理逐张亲看。

## 部署后主链路待验

| 步骤 | 结果 / 证据 |
| --- | --- |
| 新恢复点完成 → 0075 → 国内镜像与同源页面核验 | 已完成。0075 经 DMS 核对（11 列、3 个索引、`purpose` NOT NULL 默认 `password_reset`），见 backend `docs/CODEX-JOURNAL.md` 10-17 条；当前国内 staging 镜像 `e788574a5475da276cd65d687091660d99cd99c7`，[部署 run 39089552055](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/39089552055) success（2026-10-18，仅换网页产物，回滚候选 `973f224`）。 |
| 教练申请 → admin 审批 → 收欢迎信 → 设置密码 | 通过（David 2026-10-18 人工确认） |
| Android / iOS 邮箱登录 | 通过（David 2026-10-18 人工确认，iOS 为 1.0(25)） |
| 复制邀请消息 → 打开落地页 → 学员注册 → 粘贴码 → 教练接受 | 学员注册、提交邀请码、教练接受绑定通过（David 2026-10-18 人工确认）；「复制邀请消息 → 打开落地页」这一段 David 未单独报告结果 |
| 两个老账号邮箱登录仍看到原数据 | 通过：David 2026-10-18 确认老用户覆盖升级后原绑定关系、训练计划和历史记录正常 |
| 新教练 10 分钟 / 学员 5 分钟计时、陌生用户录屏 | 未验；需真实新用户参与，不能用开发者本地脚本代替 |
| 真微信、两种手机实扫 QR 和实际安装 | iPhone 经 App Store → TestFlight → MeetPR 的安装引导 David 已验证；真微信、电脑 QR 实扫、安卓 APK 下载安装未报告，仍记未验 |

## David 手动验收填写

按最新 CARDS，这三项由 David 手动验，Codex 不执行、不预填“通过”。以下由 Opus 按 David 2026-10-18 在会话中的人工确认转录，证据形态为 David 口头确认，无截图或邮件头入仓。

| 项目 | David 结果 | 日期 / 证据 |
| --- | --- | --- |
| Android 与 iOS 分别忘记密码 → 收码 → 改密 → 新密码登录 | 通过（双端） | 2026-10-18 David 人工确认 |
| 注册验证码信、欢迎信、找回密码信在 QQ 与 163 各收到；记录垃圾箱情况 | 163：进入收件箱。Gmail（额外）：进入收件箱。QQ：David 报「测试正常」，**未明确记录落在收件箱还是垃圾箱**。三类信件各在哪个邮箱收到未逐类报告，不推定。 | 2026-10-18 David 人工确认 |
| iOS 从 beta/1.0-24 升级，已登录老用户直接进主界面 | 通过。10-18 iOS 收货已在 iPhone 12 实测 1.0(24) → 新包不掉登录；David 10-18 再确认老用户覆盖升级后原绑定关系、训练计划、历史记录正常 | 2026-10-18 David 人工确认；iOS 仓 `docs/acceptance-spec093-ios-2026-10-18.md` |

## David 人工验收结论（2026-10-18）

**主链路通过，已随国内 staging 与 iOS 1.0(25) 上线。** David 确认：iOS 1.0(25) 已上传，iPhone 经 App Store → TestFlight → MeetPR 的安装引导可走通；教练申请、管理员审批、欢迎信设密、iOS / 安卓邮箱登录通过；新学员注册、提交邀请码、教练接受绑定通过；老用户覆盖升级后数据正常；双端找回密码通过；邮件落点见上表。

按实际证据记录、不推定的项：

- **TestFlight 分发组**：最近一次有记录的状态是 2026-10-18 David 截图里外部组 Ceshi 正在提交 1.0(25) 的 Beta App Review（填写 What to Test）。之后 Ceshi 是否审核通过、处于 Testing，以及 David 安装验证用的是哪个组或公开链接，均未记录，记为**未核实**。
- **QQ 邮箱落点**：见上表，未明确。
- **SPEC §9 未验项**：第 1 条（陌生新教练 10 分钟 + 录屏）、第 2 条（微信内打开、电脑 QR 被两种手机实扫）、第 3 条的 5 分钟计时、第 4 条中过期设密链接、重复申请、已是学员的邮箱三种（仅有单测与 fixture 截图；失效码页 10-18 已在线上核对），第 5 条中安卓 APK 链接的实际下载安装（链接写入线上产物已核对），第 6 条漏斗人数，均无人工证据。

## 执行偏差记录

iOS 初次 `build_run_sim` 未应用 session 中的 localhost 环境覆盖，确认本地之前操作过合成邮箱注册发码、找回发码和失败登录。主代理随后通过已登录 DMS **只读审计确认**：2026-10-17 04:30 UTC 之后，该合成学员邮箱新增注册验证码 **3 条**（首条 04:49:50 UTC、末条 04:55:30 UTC），新增重置码 **0 条**；两个合成邮箱新增 users **0 条**。未提交注册或重置密码，邮件实际投递状态未核实。

这发生在本轮统一部署批准前，是执行失误，不能算授权的 staging 验证，也不能称为没有远端副作用。已向 David 披露，未删除、覆盖或回滚远端记录。原始只读证据在仓外私有部署目录 `ios-environment-audit.txt`。随后显式 `launch_app_sim(env:...)` 并核对 localhost 请求日志才继续，发码截图已重拍；B0 真实账号没有用于这次模拟器操作。0075 和本轮镜像部署仍未执行。
