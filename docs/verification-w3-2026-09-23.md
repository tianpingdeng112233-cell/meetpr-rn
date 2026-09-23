# W3 验收接续 · 2026-09-23

起点 RN `7c0597c`，最终代码 `47a293f`，固定 iOS `beta/1.0-22@0748931`。本地合成数据与已授权 Global 专用师生对分开取证；没有生产部署、迁移或其他用户修改。可独立完成的 W3 验收已收口；P-31 新服务和教练改期仍被 Global 上线门禁阻塞，W3 尚不能整体签收。

## 已完成的独立项

- **P-31**：后端 [PR #280](https://github.com/tianpingdeng112233-cell/MeetPR-backend/pull/280) 从可见的最后消息推导 `preview_kind`。RN 仅本地化明确的 image/training_plan/training_share；同名用户文字、缺失/null/未知字段保持原样。服务正文、可见性、推送不变。后端尚未部署，Global 旧预览继续兼容。
- **跨日补录**：9/23 将 QA D6 两组补记为 9/22，原完成日志未改；师生分别回读 5 条唯一日志、进度 3/3。随后只在该计划新增 D7 用于视频验收，进度变为 3/4。[HTTP 断言](evidence/w3-20260923/crossdate-evidence.json)。
- **真实多分片与重启恢复**：95 秒、23,908,878 字节合成视频，5 个分片。第 3 片落盘后断网，保存的会话/已完成分片经 force-stop 保留；重新启动并恢复网络后同一附件完成，师生读取到一个最终附件及同一条日志。[中断状态](evidence/w3-20260923/multipart-offline-persisted.json)、[完成回读](evidence/w3-20260923/multipart-api-evidence.json)、[实屏](evidence/w3-20260923/multipart-uploaded-final.png)。初次未限速上传不算中断证据；没有抓包证明逐字节省流，也不代表真后台/真机相机通过。
- **聊天断线恢复**：离线发送显示 Retry；恢复后教练在离线期间发来的消息出现，点击 Retry 成功，师生回读同一条消息且无重复。[失败态](evidence/w3-20260923/chat-offline-final.png)、[恢复](evidence/w3-20260923/chat-retry-settled.png)、[HTTP 断言](evidence/w3-20260923/chat-reconnect-evidence.json)。未区分 WebSocket 与轮询，也不声称未发送草稿跨进程持久化。

## 走查修复

**W3-G05**：首次 Record 在原生 Modal 展示前请求隐私确认，确认框被覆盖、按钮持续禁用。改为 onShow 后自动打开；red → green 测试覆盖展示前不弹、展示后只弹一次。最终 Android 包亲验可见确认、拒绝后可再次操作、重新进入及系统权限拒绝恢复。[确认框](evidence/w3-20260923/final-first-camera-consent.png)。测试仅重置模拟器的 consent key，没有清账号或训练数据；不执行 QEMU 录制。

**W3-V02**：根据固定 iOS 实屏/源码恢复休息和提醒设置的标题、分组及展开编辑，保留 Android Modal/Back。手动模式使用既有 Set manually，始终展示自动规则参考；偏好存储、时长规则、通知权限与调度不变。手动 2:15 已实际保存、返回并重新打开回读，之后恢复 Automatic。提醒时间改为 21:01 后返回并重进回读成功；关闭提醒。360×640 dp、1.3 倍字体深色两页和长规则滚动已复验。[Android](evidence/w3-20260923/rest-grouped-final.png)、[iOS](evidence/w3-20260923/ios-rest-settings.jpg)。iOS Demo 与 Global 数据种子不同；这些对照只证明相应布局结构，不冒充同数据的全量视觉验收。

## 验证与剩余门禁

RN 131 suites / 908 tests、tsc、lint、强制 Global bundle 与 Android Release 构建通过。后端 153 suites / 1164 tests、typecheck/lint/format/build 通过；一次旧 onboarding 400 在单测及串行全量重跑通过。P-31、G05、V02–V06 独立 Standards / Spec 收敛为 CLEAN。旧562ee4e的首次云端Android任务因CMake下载包非ZIP失败，代码检查通过；最终47a293f的云端门禁以文末记录为准。

确定性 quick-log 部分失败设备复验已通过：三组中 index 1 返回 503，第一次保留 index 0，重试只写 index 1/2；completion 一次，3 条唯一新日志、36 条原日志保留。[请求断言](evidence/w3-20260923/partial-retry-evidence.json)、[失败弹窗](evidence/w3-20260923/fixture-quicklog-partial.png)、[重试推进](evidence/w3-20260923/fixture-quicklog-retried.png)。这项采用本地合成 API，不作为真实 Global 故障注入证据。

**W3-V03**：360×640 dp、1.3× 字体下，教练 Today 状态挤压标题、Accept sheet 标题与 Cancel 重叠、深色 Accept 白底白字。窄屏改为上下布局，按钮复用现有主题前景。默认浅色与小屏深色的 Today/申请卡/确认 sheet 均实屏复验，Cancel 可关闭，Confirm 可见；交互及导航不变。[小屏 Today](evidence/w3-20260923/fixture-v03-today.png)、[申请卡](evidence/w3-20260923/fixture-v03-roster.png)、[确认页](evidence/w3-20260923/fixture-v03-accept.png)、[默认浅色](evidence/w3-20260923/fixture-v03-light-accept.png)。增量 Standards / Spec CLEAN，审查方独立跑 17 suites / 83 tests；最终全量 131 / 907、tsc、lint、Android Release 通过。

**W3-V04**：固定 iOS 与既定 video-player-charts-v2 §1.5 对照发现教练打点列表缺少分组卡。已恢复 mono12 次级标题、Card、横16/竖13与 body14 备注、仅行间分隔，保留 annotation-only 选择、删除/busy 和 Android44dp 命中目标。Standards/Spec 增量 CLEAN，审查方独立2 suites / 6 tests、主流程全量131 / 907通过；最终深浅色证据见 `fixture-v04-light` / `fixture-v04-dark`。

**W3-V05**：V04 深色复验发现播放器外壳误用 textPrimary，在 Dark 变白，固定白色进度与倍速控件不可读。新增 videoWorkbenchFill 保持原 Light 的 #111827，两主题固定深底，仅替换外壳/选中倍速底色，播放和 seek 不变。双轴增量 CLEAN，全量131 / 907及构建通过；Global 视频实屏见 `final-v05-light` / `final-v05-dark`。

**W3-V06**：V05复验出现画面已到43秒、进度仍0:00。原生react-native-video在view尚未就绪时可能不完成getCurrentPosition Promise，最早一次轮询因此占住reading。正时长onLoad后才开始轮询；保持seek generation、暂停/倍速和URL重试。真实PlayerSession搭配“加载前不完成的native ref”测试red→green，双轴增量CLEAN、全量131/908与构建通过。最终Global包深色1.5×播放后暂停在[0:12](evidence/w3-20260923/v06-dark-paused-progress.png)，浅色1×暂停在[0:08](evidence/w3-20260923/v06-light-paused-progress.png)，拖动后画面与[0:47](evidence/w3-20260923/v06-light-seek-settled.png)一致，退出重进再次播放[0:08](evidence/w3-20260923/v06-reenter-paused-progress.png)。学员既有反馈关联的8秒全屏视频仍自动播放，实时进度曾显示0:01，结束后[0:08/0:08与末帧一致](evidence/w3-20260923/v06-student-video-ended.png)。早期四次自动探针因UIAutomator失败后沿用旧XML且含未播放帧，整体剔除；取证脚本已改为拒绝旧XML，播放时按已知控件暂停后再取新快照。

## 角色与状态矩阵

矩阵按六条用户流程定义；旧报告中的 36/20 是发现项数量，不是需要制造的屏幕数量。PASS 仅覆盖本行明列状态。fixture 使用 localhost 合成服务，只证明客户端状态、交互及回读，不替代生产权限、验证码投递或密码校验。证据目录内 Android PNG 均有同名 XML。

| 流程 | 已验证状态与结果 | 主要证据（同目录） |
|---|---|---|
| 登录 → 注册/找回 → 绑定/资料 | PASS：非法邮箱/短密码/短验证码禁用；503 保留输入并可重试；重置成功回登录；邀请码格式非法禁用；七步资料、保存退出后第 3 步续填、完成失败再试；pending → accepted 后四 tab | `fixture-login-*`、`fixture-register-*`、`fixture-reset-*`、`fixture-bind-*`、`fixture-onboarding-*`、[资料断言](evidence/w3-20260923/onboarding-evidence.json) |
| Today → 训练 → 完成/历史 | PASS：无计划/计划失败与 Retry；readiness 两步/跳过/肌群；NumberPad 返回优先关闭；短按取消/长按完成/回顾返回；跨日补录、部分失败续写、历史回读 | `fixture-no-plan`、`fixture-training-no-plan`、`fixture-plan-*`、`fixture-readiness-*`、`fixture-numberpad*`、上方 Global/partial 断言 |
| 成长 → 来源 | PASS：独立新用户零数据/单次 forming/四次成熟曲线；容量锁定/解锁；缺原始日志时只显示已存估值及不可复算说明 | `fixture-growth-zero*`、`fixture-growth-forming*`、`fixture-growth-mature`、`fixture-volume-*`、[来源缺失](evidence/w3-20260923/fixture-source-unavailable.png) |
| Profile → 偏好/账号 | PASS：结构性 1RM 锁定；肌群编辑失败保留再保存；小屏深色；休息/提醒持久化；改密短输入禁用、失败再成功；CSV 失败重试、36 行正确列头、系统分享面板后返回；注销确认取消，没有 DELETE | `fixture-profile-edit-*`、`fixture-password-*`、`fixture-export-*`、`fixture-delete-confirm`、[CSV 断言](evidence/w3-20260923/csv-evidence.json) |
| 学员聊天/视频 ↔ 教练工作台 | PASS：真实双向聊天、断线接收/Retry；Global 上传回读/五分片恢复/反馈与打点；fixture 播放链接失败重试、markers 404 可用性降级、反馈失败保留输入且重试只新增一次；四种 preview 语义 | 上方 Global 证据、`fixture-video-*`、`fixture-markers-unavailable`、`fixture-feedback-*`、[反馈断言](evidence/w3-20260923/feedback-retry-evidence.json)、`preview-fixture-contract.json` |
| 教练 Today → 名单/申请/资料/邀请码 | PASS：空 Today/收件箱/名单、请求失败 Retry、搜索无结果；正常/无计划详情、成长为空/失败恢复、资料独立失败不拖垮概要；申请资料不可用仍可 Accept/Ignore；长姓名、小屏 Dark；邀请码复制/创建失败保留旧列表、Help/Privacy 返回 | `fixture-coach-*`、`fixture-application-*`、`fixture-roster-search-empty`、`fixture-invite-*`、V03 实屏 |

减少动画：Android animator/window/transition scales=0，普通记组后长按完成出现静态奖励，再进回顾并系统返回。[连续录屏](evidence/w3-20260923/reduced-motion-reward.mp4)、[奖励](evidence/w3-20260923/fixture-reduced-reward-final.png)、[回顾](evidence/w3-20260923/fixture-reduced-report-final.png)。录屏只证明长按到奖励；回顾由后续截图/操作验证。已恢复 scales=1；不以模拟器证明触感。

fixture 的第一次 readiness 提交使用了错误响应形状，修正合成服务后重试通过，未因此改 App。早期误命名的 growth-empty（已有本地点）、application-unavailable（仍有缓存）、profile-error（仍有缓存）和只录到长按的旧视频都不作为本矩阵证据。注册/重置只验证客户端流程，不声称真实邮件、旧密码校验已完成；绑定只注入格式非法，没有冒充服务端过期码测试。

## 固定 iOS 对照

两端均英文，参考 iOS Demo 固定 `0748931`；下表按结构、层级、状态语义并排检查。数据种子/逻辑尺寸不同，Android 箭头、系统分享、Modal/Back、字体渲染保留平台实现，不声称同数据像素差为零。小屏/1.3×/深色额外以 Android 可读与操作可达验收。

| 页面/状态 | Android | iOS | 结论 |
|---|---|---|---|
| Today/训练/补录 | `student-live-today2`、`fixture-training`、`fixture-quicklog-before` | `ios-today.jpg`、`ios-training.jpg`、`ios-quicklog.jpg` | 主层级、周/日身份、录入次序通过；日期和组数由各自种子决定 |
| Readiness/历史 | `fixture-readiness`、`fixture-readiness-muscles`、`fixture-history-light` | `ios-readiness.jpg`、`ios-history.jpg` | 问题、量表、肌群/历史分组结构通过 |
| 成长零数据/forming/成熟 | `fixture-growth-zero`、`fixture-growth-forming`、`fixture-growth-mature` | `ios-growth-zero.jpg`、`ios-growth-forming.jpg`、`ios-growth-light.jpg` | 三主项卡、进度锁定和成熟图表层级通过；来源缺失另以明确客户端降级取证 |
| Profile/肌群/改密 | `fixture-profile-edit-success-small-dark`、`fixture-profile-edit-error-small-dark`、`fixture-password-invalid` | `ios-profile-light.jpg`、`ios-profile-muscles.jpg`、`ios-account-password.jpg` | 分组/字段和编辑路径通过；该行 Dark 与 Light 只比较结构 |
| 休息/提醒 | `rest-grouped-final`、`reminder-persisted`、`small-dark-*-final2` | `ios-rest-settings.jpg`、`ios-reminders.jpg` | V02 修复后通过；真实偏好保存另有回读 |
| 教练四 tab | `fixture-v03-light-today`、`fixture-coach-empty-inbox`、`fixture-coach-empty-roster`、`fixture-coach-profile` | `ios-coach-today.jpg`、`ios-coach-messages.jpg`、`ios-coach-students.jpg`、`ios-coach-profile.jpg` | shell/空态/概要/资料层级通过；非相同数据不比较计数与卡片数 |
| 教练详情/成长/邀请码 | `fixture-coach-detail-no-plan`、`fixture-coach-growth-empty`、`fixture-invite-old-list-retained` | `ios-coach-detail-no-plan.jpg`、`ios-coach-growth-empty.jpg`、`ios-coach-invites.jpg` | 无计划/无数据/邀请码层级通过；V03 修复 Android 窄屏特有阻碍 |
| 学员全屏视频/角标/打点 | [Android既有实屏](evidence/w3-20260921/student-video-marker.png) | [固定iOS](evidence/w3-20260923/ios-student-video.jpg) | 全屏、角标与打点分区通过；Android无Export是既定范围差异，控制条遵循平台实现 |
| 教练视频工作台 | `fixture-v04-light` / `fixture-v04-dark` | `ios-coach-workbench.jpg` | V04补齐打点卡、V05补齐深色控件对比度；舞台、四档倍速、组信息、反馈输入/发送及Skip层级通过 |

参考限制：iOS Demo 点击6秒打点后本身出现Playback failed；[语义快照](evidence/w3-20260923/ios-student-video-after-seek.json)保留现场，不把该步骤记作两端播放行为对等通过。参考的中文备注是合成内容；RN不翻译用户正文。

## 最终包与存量回读

最终代码 `47a293f` 的 Global QA APK 已强制重打 bundle，确认正式 API 字符串存在、fixture origin 不存在。debug 签名，仅供验收；本地路径 `/Users/david/Projects/scratch/rn-w3-20260923/meetpr-global-w3-final.apk`，SHA256 `e05562182e12d6006093aff841ecf1b40f06d0de0bf454e29f8dc5f93e423847`。覆盖安装、重新登录后 [首屏 W1D7/3/4](evidence/w3-20260923/final-global-upgrade-today.png) 正常；[师生只读回查](evidence/w3-20260923/final-global-readback.json) 均为6条唯一日志、D2/D4/D6完成，D7未完成，未重复提交历史组。只移除本次注入的合成来源点，其他本地历史保留。

## 剩余上线门禁

2026-09-23 [只读预检成功](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/35857998786)，deploy skipped。Global 实际 api 为 `7ce7245`，PG17.11、迁移账本到0068，0070表/seq缺失、教练 gate 未配置。新 P31/改期尚未上线，403 不能算客户端成功。固定候选 `1b9c6f5` 仅待0070；完整差异、备份恢复、迁移/部署/关门回退步骤见 [backend PR281](https://github.com/tianpingdeng112233-cell/MeetPR-backend/pull/281)。这两个生产联调项为 BLOCKED，须 David 批准具体生产方案后执行。W4 的 Google/FCM、真机录制/后台/触感、签名、启动屏与分发保持独立。

## 交付检查

- RN业务代码：47a293f；[PR57](https://github.com/tianpingdeng112233-cell/meetpr-rn/pull/57)，[最终云端CI](https://github.com/tianpingdeng112233-cell/meetpr-rn/actions/runs/35875288015)的check与Android构建均通过。验收文档/证据单独交付于[PR58](https://github.com/tianpingdeng112233-cell/meetpr-rn/pull/58)，叠在PR57；以该次业务SHA结果为准，不沿用旧SHA的绿灯。
- 后端P31：1b9c6f5；[PR280 CI通过](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/35851532297)。预检/方案：84a4c3a；[PR281 CI通过](https://github.com/tianpingdeng112233-cell/MeetPR-backend/actions/runs/35874557186)。T2均未合并。
- Standards / Spec逐修复增量收敛为CLEAN，V06两方独立5项测试通过；文档纠正“fixture部分失败”被误列Global的行。证据中未检出专用账号密码、JWT或签名URL；生成的native build目录不入提交。
