# W3 教练与学员主干验收补充

> 本文为当日历史记录；当前状态、后续修复和剩余门禁以 [9/23 W3矩阵](verification-w3-2026-09-23.md) 为准。

2026-09-21。基线 RN `2565c6e`，iOS `beta/1.0-22@0748931`。本轮补充聊天、视频反馈与教练主干证据，修复 P-30/P-32。W3 仍未整体完成。

## 已验证

Android API 35，1080×2400，ADB；本地合成教练/学员、8 秒生成视频。每份截图附同名 UI XML，均在 [证据目录](evidence/w3-20260921/)。

| 任务 | 观察 | 证据 |
|---|---|---|
| 学员分享训练组→教练会话 | 选组、附带计划卡发送、教练收到卡片、读后未读清零 | [学员发送](evidence/w3-20260921/student-chat-sent.png)、[教练会话](evidence/w3-20260921/coach-chat.png) |
| 教练视频反馈 | 播放至结尾、2× 倍速、拖动定位、新增 0:03 打点、发送反馈并减少待办 | [工作台](evidence/w3-20260921/coach-video-workbench.png)、[拖动后](evidence/w3-20260921/coach-video-seek.png)、[新增打点](evidence/w3-20260921/coach-marker-saved.png) |
| 学员接收反馈→关联回放 | Today 回读、详情、关联视频、点击打点暂停并定位、角标收起 | [详情](evidence/w3-20260921/student-feedback-detail.png)、[跳转打点](evidence/w3-20260921/student-video-marker.png)、[角标收起](evidence/w3-20260921/student-video-badge-collapsed.png) |
| 教练资料/成长 | 角色切换、名单、详情、成长图、反馈、邀请码页面可达 | [成长](evidence/w3-20260921/coach-student-growth.png)、[资料](evidence/w3-20260921/coach-profile.png) |

以上不证明 Global 真实账号、实时服务投递、R2 上传、跨服务重启持久化、相机或真机通过。原有训练/成长证据见 [build 22 记录](verification-build22-2026-09-21.md)。

## 本轮修复

- **P-30**：教练 Today 的视频待办标题被英文标签挤成 `1 video awaiting fe...`。解除标题单行限制，保持结构与导航。[修复前](evidence/w3-20260921/coach-today.png) → [最终 QA 包](evidence/w3-20260921/coach-today-final.png)。
- **P-32**：Global 退出弹窗错误要求“手机号登录”。新增 `coach.rn.profile.globalLogoutMessage`，文案来源为本轮 Global Email/Google 入口事实，旧 iOS catalog/CN 文案保留。[修复前](evidence/w3-20260921/coach-signout-confirm.png) → [最终 QA 包](evidence/w3-20260921/coach-signout-final.png)。
- 最终验证：6 suites / 30 tests；tsc、lint、QA `assembleRelease` 通过。已重装最终包并亲看两项修复。包为 localhost API + debug 签名，禁止作为分发产物。
- Standards：最初指出 P-31 方案会误改同名用户文本；撤回该方案后 CLEAN。Spec：收敛为 P-30/P-32 后 CLEAN。P-31 未计入完成。

## 开放项：P-31 收件箱预览语义

后端 `last_message.preview` 对训练分享返回 `[训练计划]` / `[训练分享]`，图片返回 `[图片]`；普通文本也能完全相同。训练分享的 `kind` 仍可为 `text`，仅比较 preview 无法判别来源。首轮 fixture 错把完整 canonical body 当 preview，已纠正协议理解；该截图不能作为真实响应形状证据。

后端小卡建议：提供向后兼容的明确 `preview_kind`（text/image/training_plan/training_share），从存储的 `set_ref` / kind 决定；客户端仅本地化有明确语义的系统预览，老服务缺字段原样保留。测试 seam 为 HTTP 会话列表响应 + RN 收件箱模型，覆盖同名普通文本、训练分享、图片、旧响应。Out of Scope：修改 canonical message body、翻译用户文本、推送语言、数据库迁移。此卡尚未实施或部署，不在本轮 PR 完成范围。

## Global 实际账号门禁

David 已明确授权现有 Global 正式环境方案 A：仅新增 1 个专用教练 + 1 个学员，教练后台预置，重名立即停止，绝不修改既有账号；仅这两个账号内进行绑定、计划、日志、聊天、视频验收。

2026-09-21 David 明确改为本地保存这对测试账号，无需 Bitwarden。已在仓库外 `/Users/david/.local/share/meetpr/global-qa-20260921/accounts.json` 保存邮箱/密码（目录 0700、文件 0600），不含 token；未提交凭证。

教练预置来自 backend 独立操作分支的 create-only 脚本 `f8db2a1`，大小写无关重名保护经测试和双轴审查；[Global 工作流 35588654243](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/35588654243) 成功返回 COACH_CREATED。独立临时密码 secret 已删除，原 shared secret 不变，无部署/迁移/合并。后端基线与最终门禁分别为 1163 / 1166 tests，最终 typecheck/lint/format/build 通过。

教练登录 200，学员注册 201 / 登录 200；专用 single_use 邀请码 201，绑定申请 201 / 接受 200，跳过评估期。首次教练名单与邀请码均为空。Android Global QA 包实际登录两种角色，教练名单仅见 RN22 QA Student，学员进入无计划 Today。详见 [HTTP 证据](evidence/global-20260921/account-evidence.json)、[教练名单](evidence/global-20260921/global-coach-roster.png)、[学员 Today](evidence/global-20260921/global-student-login.png)。

本轮未部署后端；历史最后成功 Global deploy run 32652429117 指向 7ce7245，当前 health 返回 ok，此信息不等同于直接确认运行镜像 SHA。API 契约以本次真实响应验证。

## W3 后续

继续完成剩余角色/状态矩阵、iOS 并排、大字体/小屏、真实 Global 端到端与 P-31 契约卡。历史“学员 36 项/教练 20 项”来自早期走查发现清单，不等于 56 个屏幕；教练历史已续到 P-29，本次续到 P-32。当前资料不得用于宣布完整 W3 验收通过。

## Global 空账号导航回归卡 W3-G01

在真实 Global 新学员无计划时，Today 的 Message coach 错接到反馈列表；截图 global-student-chat-empty。根因为 DashboardPlanWaitingState 的 onMessage 传入 openFeedback。目标为复用已有 useOpenCoachChat：点击后建立/打开当前绑定教练会话，与 Today 页头保持一致。iOS build 22 的 onMessageCoach 同样打开包含教练会话的通知入口。

测试 seam：现有 DashboardScreen 渲染交互及 API/路由边界，空计划列表、已接受的师生绑定；点击 Message coach 必须到当前教练聊天，不能到反馈列表。Out of Scope：导航结构、消息协议、反馈列表行为、未绑定状态产品改版。走查观察已完成，本卡进入独立返修。

### W3-G02：无教练姓名的会话标题

真实预置教练尚无 coach_profiles 姓名，服务返回空 display_name，聊天页标题为空且显示 Say hello to。目标为名称优先级：传入非空姓名 → 服务查询非空姓名 → 既有本地化 Coach。测试 seam 为 StudentConversationScreen 渲染的标题/空态；覆盖空串及空白，保留具名教练。Out of Scope：教练资料编辑、新文案、在线状态语义、后端数据修改。


## Global 复验结果

- W3-G01 / W3-G02 已修复。等待计划卡进入当前教练会话，姓名为空时显示本地化 Coach；原反馈入口不变。两张卡的 Standards / Spec 均独立 CLEAN。
- 导航 red 明确收到错误的 feedback 路径；姓名空串/空白两项 red 后 green。定向 2 suites / 38 tests，全量 128 suites / 886 tests、tsc、lint、Android assembleRelease 均通过。
- 学员通过 Android 发送 `RN22 Global QA student message 20260921`，教练 API 读取到该消息并回复，学员 App 接收后重启仍能回读。只发生于专用账号对。[HTTP 证据](evidence/global-20260921/chat-evidence.json)、[最终聊天与重启回读](evidence/global-20260921/global-chat-final-reloaded.png)。此观察证明服务端写入与 App 重启回读，不证明后端服务重启，也未单独区分 WebSocket 与轮询。
- 最终 APK 在本地 scratch/global/meetpr-global-qa-final.apk；SHA256 `ddbbfbcd71b9402e6c9ba53fde5166c581f81ea7e1dd90f381829ce64fb5e262`。实际 JS bundle 含 Global API 且无 localhost:39022，仍为 debug 签名的 QA 产物。切换 env 时 Gradle 曾跳过 bundle，必须强制重打 createBundleReleaseJsAndAssets 并检查产物，不能仅看 assembleRelease 成功。
- PR #56 原 dd78e47 的 check + android-build 已全绿（35586984062）；后续 474381a 的 check + android-build 同样全绿（35591513393）；9/22 新增修复仍须核对新 HEAD 的 CI。
- 已解除真实测试账号入口阻塞。9/22 已补真实计划/日志/视频上传、反馈与 App 重启持久化，修复 G03/G04，详见 [Global 记录](verification-global-2026-09-22.md)。剩余全量视觉、弱网/多分片、P-31、W4 门禁未完成；不声明 W3 收尾。
