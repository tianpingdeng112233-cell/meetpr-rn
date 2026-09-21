# W3 教练与学员主干验收补充

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

本机尚未就绪的 Bitwarden 凭证通道阻止安全建号和交付；接入方式待 David 回复。未生成真实账号密码、未创建生产账号、未修改生产数据。后续需核对生产部署版本与精确 API schema，教练 provision 禁止调用脚本的“重名换密码”分支。

## W3 后续

继续完成剩余角色/状态矩阵、iOS 并排、大字体/小屏、真实 Global 端到端与 P-31 契约卡。历史“学员 36 项/教练 20 项”来自早期走查发现清单，不等于 56 个屏幕；教练历史已续到 P-29，本次续到 P-32。当前资料不得用于宣布完整 W3 验收通过。
