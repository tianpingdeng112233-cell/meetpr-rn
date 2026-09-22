# Global 真实训练与视频验收

基线 RN `474381a`，iOS `beta/1.0-22@0748931`；Android API 35，1080×2400，Global QA 包，debug 签名。仅使用 David 授权的专用师生账号对，凭证保存在仓库外；无后端部署、迁移或既有用户修改。

## 真实链路

- 创建并发布 `RN22 QA acceptance 20260922`：D2 两组深蹲、D4 一组卧推，均为合成验收数据。API 建计划，不代表 plan-web UI 验收。
- Android 学员记录 80 kg × 5 @7、82.5 kg × 5 @8，并长按完成 D2；重启后仍显示完成 1/2。
- Android Photos 选择 8 秒合成视频，上传成功；教练端播放到 0:08、定位 0:03、新增打点、发送测试反馈。学员接收反馈、打开关联回放、点击打点暂停并定位 0:03。
- 师生 API 回读日志、视频、反馈和 3068 ms 打点均为 200。日志 actual date 为 9/22，D2 建议日期为 9/23。
- 最初探针把 `to` 当作包含边界；接口为 `[from,to)`，9/22→9/23 查询正常。该探针错误不算后端缺陷。
- 本轮证明真实 Global 持久化与 App 重启回读，不证明后端重启、真实相机、真机或分发通过。

## 走查发现与返修卡

### W3-G03：反馈英文动作名丢失

想做：在 Today、反馈列表/详情、聊天反馈卡和关联视频中识别动作。阻力：Global 返回 `video.exercise_name_en=Competition Squat`，RN 丢弃 embedded video，改读不含英文名的旧 videos 端点，显示中文。对照 iOS FeedbackDTO、FeedbackVideoPresentation、DashboardFeedbackText，均使用反馈内嵌视频与本地化动作名。

目标：保留服务内嵌反馈视频，按现有 locale 选择名称；各反馈入口显示一致；后续回查聊天入口发现同源遗漏，一并接入。旧响应缺 video 字段保持当前 fallback；明确 null 的关联保持不可用，不伪造元数据。

测试 seam：FeedbackResponseSchema → 关联/名称/徽章显示公开接口，以及真实屏幕渲染交互。覆盖英文/中文、旧响应、无视频、动作/组次/负载不丢失。Out of Scope：翻译用户文本、后端更改、导航、视频上传协议、P-31 预览契约。

### W3-G04：Today e1RM 漏查当日

想做：完成训练后查看今日 e1RM。阻力：`dashboardE1RMRange(today)` 直接将 today 作为排他上界，导致当日日志缺失。iOS BackendStudentTrainingLogRepository 使用 exclusiveEndDateOnlyString 将闭区间末日推进一天。

目标：Today 查询包含当日，保留 all-time 起点和原 plan scope。测试 seam：现有 Dashboard 查询范围/回放接口，HTTP 边界响应和 Dashboard 渲染；覆盖同日记录及月/年末、凌晨 04:00 前的日历当日补记。Out of Scope：e1RM 算法、资格规则、新增后端接口。

## 其他观察与门禁

- 复盘显示建议日期 9/23、已记录 RPE 但缺计划 RPE 时显示 No RPE：与固定 iOS 实现相同，作为既有产品行为保留。
- 教练周概览提前训练仍显示 0/2：已核对固定 iOS `CoachWeekOverview.TrainingDay.isCompleted`，同样按日志日与计划日同日匹配。属于既有产品口径，保留并列为产品后续项，不算 RN 新缺陷。
- `474381a` CI run 35591513393 的 check / android-build 全绿。
- W3 未整体收尾：剩余视觉矩阵、P-31 契约和 W4 分发门禁仍需推进。

## 最终验证与证据

- 全量 128 suites / 897 tests、TypeScript、lint、Android Global QA Release 构建通过。G03/G04 均有 red → green 回归；独立 Standards / Spec 审查收敛为 CLEAN。审查发现的凌晨日期边界和聊天明确无视频仍可播放问题均已修复并复审。
- 最终 APK SHA256：`511406ea3ba729670c9f26e621ae0bb1a63ab507a31234240a98d9198d3bca48`。产物位于本机 scratch/rn-global-acceptance-20260922/meetpr-global-qa-final.apk，debug 签名，不作分发包；强制 bundle 后检查 Global 地址且无旧 localhost API，已重装实屏复验。
- Today 显示当日 108.1 kg；反馈卡/详情/回放与聊天反馈视频显示 Competition Squat；用户反馈正文原样保留。明确 null 或 ID 不匹配的内嵌视频不启用播放，旧响应缺字段继续兼容。

| 范围 | 证据 |
|---|---|
| 日志、视频、反馈、打点真实回读 | [脱敏 HTTP 断言数据](evidence/global-20260922/acceptance-evidence.json) |
| 学员上传与重启 | [上传完成](evidence/global-20260922/video-upload-ready.png)、[重启后 1/2](evidence/global-20260922/student-relaunch-persisted.png) |
| 教练播放/标记 | [播放到片尾](evidence/global-20260922/coach-playback-ended.png)、[保存打点](evidence/global-20260922/coach-marker-saved.png) |
| 当日 e1RM、英文关联信息 | [Today](evidence/global-20260922/final-today-loaded.png)、[反馈卡](evidence/global-20260922/final-feedback-expanded.png)、[详情](evidence/global-20260922/final-feedback-detail.png)、[回放徽章](evidence/global-20260922/final-player-marker.png)、[聊天](evidence/global-20260922/final-chat.png) |
| 1.3 倍字体 | [Today](evidence/global-20260922/large-today.png)、[聊天](evidence/global-20260922/large-chat.png) |
| 小屏 360×640 dp、1.3 倍字体 | [浅色顶部](evidence/global-20260922/small-large-today.png)、[滚动至 e1RM](evidence/global-20260922/small-large-today-bottom.png)、[深色 e1RM](evidence/global-20260922/small-dark-today.png)、[深色聊天](evidence/global-20260922/small-dark-chat.png)、[深色回放定位 0:03](evidence/global-20260922/small-dark-marker.png) |

这些是定向布局与交互检查，尚非同条件 iOS 并排全量验收。小屏 Profile 的 Appearance 在词中折行，聊天视频标签贴近右边缘，截图已留存；随后由独立 T0 卡 W3-V01 修复容器收缩/换行，保留现有导航、字号缩放与选择行为。Profile 证据见 [深色小屏](evidence/global-20260922/small-dark-profile.png)。检查后恢复模拟器 1080×2400、420 dpi、font_scale=1.0 与 Light。

## 接续顺序

1. 继续完整角色/状态矩阵及同条件 iOS 并排，覆盖权限、失败态、Reduce Motion；本页两处小屏排版已修复。
2. 专用账号内补教练改期、quick-log 真实持久化、大文件多分片、弱网/重启续传与聊天断线恢复；本轮 2.76 MB 视频不能代表多分片验收。
3. P-31 另开兼容 backend `preview_kind` 契约卡，部署按既有生产门禁；Google/FCM、真机、签名、启动屏与分发属于 W4。PR #55/#56 未合并，仍等 David。

### W3-V01：小屏放大字体的局部排版

读取已有 CONTEXT（若存在）及固定 iOS 参照。范围仅 Profile 外观行与聊天反馈视频标签：容器不足时外观选项换到下一行，动作标签在卡片内自然换行。验收为 360×640 dp、1.3 倍字体下文字完整、三种外观仍可切换、视频入口仍可用，默认屏幕保持原层级。公开验证 seam 为两张实际 Android 屏幕和既有交互测试；不以样式属性断言替代截图。Out of Scope：文案、配色、导航、字体缩放上限、视频/主题业务逻辑。此卡是已完成 G03/G04 之后独立的 T0 视觉补丁。


W3-V01 已完成：小屏外观行转为两行，文字完整，Light/Dark/System 均已实际切换；聊天视频标签完整换行，播放入口可用；默认尺寸仍为原单行外观布局。证据：[小屏 Light](evidence/global-20260922/layout-small-profile-light.png)、[Dark](evidence/global-20260922/layout-small-profile-dark.png)、[System](evidence/global-20260922/layout-small-profile-system.png)、[聊天](evidence/global-20260922/layout-small-chat.png)、[播放](evidence/global-20260922/layout-small-player.png)、[默认外观行](evidence/global-20260922/layout-default-profile.png)、[默认聊天](evidence/global-20260922/layout-default-chat.png)。定向 3 suites / 47 tests 和全量 128 suites / 897 tests、tsc/lint/Android 构建通过；Standards / Spec 增量 CLEAN。最终补丁 APK `meetpr-global-qa-layout.apk` SHA256 `6f4a44e4200cc17d2ff5c024f3f20c0a4b78f59c6bbf05b401714a874d04718f`，Global/debug 签名并重装复验。

远端门禁：`f10fa3a` CI 35697575908 首轮 check 中旧教练聊天首例超过 5 秒，896/897 通过；本机并发全量 897/897 通过。已发起一次远端失败任务重跑，最终交付仍须核对最新补丁 HEAD 的 CI，不沿用旧结果。
