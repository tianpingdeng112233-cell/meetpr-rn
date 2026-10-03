# 任务卡：走查行为缺陷三项（D-20 记组无反馈与上传兜底、D-28 训练提醒、D-12 RPE 起手）

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、本卡、`docs/diagnose-walkthrough-2026-10-02.md`（Phase 1–3 的证据与假设），以及 Expo SDK 57 的 Notifications 文档。

- 级别：T2（新增安卓权限与原生配置）。来源：2026-10-02 真机走查 D-20、D-28、D-12；David 已拍板 D-28 的两项口径。
- 基线：RN `fix/camera-review-survives-background`（PR #66 顶）。这是 Opus 派的卡：在当前分支 `fix/walkthrough-behavior` 的工作区改，**不 commit、不 push**；只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。
- 三项互不依赖，合一张卡是因为同一次真机复验要一起验；按 A → B → C 顺序做，每项先红后绿。

## A. D-20：点 Complete set 没反应；上传没有兜底

已复现（模拟器 + 本地合成 API，把 `POST /sets/log` 延迟 25 秒）：点 Complete set 后 15 秒内界面没有任何变化——没有加载态、按钮不置灰；请求返回后才继续。真机上发生在 Wi-Fi 切蜂窝的几秒里，David 等了几秒后重启了 App。重复点击没有产生第二次请求（现有去重有效，保持）。

要求：
1. 点 Complete set / Not completed 后**立即**出现可见的进行中状态（按钮进入忙碌态并禁用重复提交），直到保存成功、失败或超时。
2. 保存请求有上限时长；超时或失败时给出明确提示，保留已输入的重量、次数、RPE 与视频附件，可直接重试；重试不产生重复日志（沿用现有 `client_id` / 去重机制）。
3. 记组不依赖视频上传状态：附件处于 Sending 时照常能完成该组（现状在组件边界已是如此，补一条贯穿 `TodayWorkoutView` 提交路径的测试守住）。
4. 上传兜底：`docs/diagnose-walkthrough-2026-10-02.md` 里的条件红测试（原生上传调用与取消调用都不返回 → 永远停在 uploading）要转绿——单次尝试超过上限后按失败处理并进入现有的退避重试；网络从无到有或类型切换时，对停滞的上传触发一次重试。不改分片协议、不改已完成分片的持久化。

测试 seam：`TodayWorkoutView` 的提交路径（保存慢 / 失败 / 超时三态）；`video-upload/manager` + `upload-runner`（悬置的原生调用、网络切换事件）。

## B. D-28：训练提醒（David 已拍：前台也提醒；要准点并弹横幅）

已复现（模拟器，`dumpsys alarm` / `dumpsys notification`）：
- App 在前台时到点没有任何通知——`src/features/settings/training-reminder.ts` 的通知处理器对前台一律返回不显示。
- 定时是非精确的：提前很久排的窗口为 1 小时，实测临近排的一条晚 78 秒。
- 渠道重要级别是 DEFAULT，只进通知栏不弹横幅。
- 另：`training-reminder.ts` 与 `video-upload/failure-notifier.ts` 各自调用全局的 `setNotificationHandler`，后调用者覆盖前者。

要求：
1. 训练提醒在前台也展示（横幅 + 进列表 + 声音）；上传失败通知维持它现有的前台策略。全仓只保留**一处**通知处理器，按通知类别分流，消除互相覆盖。
2. 训练提醒渠道提升为 HIGH。已安装用户的渠道级别系统不允许应用事后调高：用新的渠道 ID 并删除旧渠道，文案沿用现有翻译键。
3. 准点：按 Expo SDK 57 文档启用精确定时所需的权限与配置（`app.json`）。优先 `SCHEDULE_EXACT_ALARM`（Android 14+ 需用户在系统设置授权）；**不要**用 `USE_EXACT_ALARM`（应用商店政策只允许闹钟/日历类应用）。打开提醒开关时若系统未授权精确定时：用一句说明 + 跳转系统授权页的入口引导；用户不授权则退回现有的非精确定时，功能照常可用，并在页面上如实提示"可能延迟"。授权状态变化后重新排期。
4. 排期逻辑（每个选中星期一条、到点后续排下一周、登出取消、重新登录恢复）不变。

测试 seam：`training-reminder.ts` 的排期与处理器（已有 `training-reminder.test.ts`、`settings-screens.test.tsx`）；权限三态（已授权 / 未授权 / 用户拒绝）走同一 seam。

## C. D-12：RPE 刻度条起手带纵向分量就拖不动

已复现（模拟器回放触摸，见诊断文档表格）：纯水平与"拖起来之后再纵向抖动"都正常；起手先纵向 15 px 再水平 1/3 成功，起手先纵向 40 px 或 45° 斜向起手 0/6。David 真机上的原话是"拖着拖着停了"，这一形态在模拟器上**没有**复现，本卡只修已复现的起手问题，并在 JOURNAL 里列出读代码时发现的、可能导致拖动中途被终止的路径（只列不改，等真机录屏）。

要求：手指落在 RPE 刻度条上、随后的移动以水平为主时，无论起手头十几像素是否带纵向分量，都由刻度条接管；明显的纵向滑动（整体以纵向为主）仍然滚动页面。不改 RPE 的取值、步进与无障碍标签。

测试 seam：组录入页 RPE 控件的手势归属判定（现有 `set-entry-rpe.test.ts` 的几何 / 方向锁定测试所在边界）。

## 约束

- 不加第三方依赖；原生配置只动 `app.json`（`android/` 是 gitignore 的预构建产物，不提交）。
- 颜色、字号、间距只用 `src/design` 现有 token；新增文案中英文目录同步并过现有 i18n 守卫。
- 调试日志带 `[DEBUG-wb]` 前缀，结束前清干净。
- 守仓内 eslint 与 TypeScript 配置。

## 验收清单（Opus 收货时在模拟器上重跑下列反馈环；实装方不得自定范围）

- [ ] A：保存延迟 25 秒 → 点击后 1 秒内出现忙碌态且不能重复提交；保存返回后正常进入下一步；只有一条日志。保存失败 / 超时 → 有提示、输入保留、重试成功、无重复日志。
- [ ] A：条件红测试 `network-handover` 转绿并改为正式回归测试；现有 `multipart` / `retry-scheduler` / `manager-attach` 测试不改断言并通过。
- [ ] B：App 在前台到点 → 出现训练提醒通知；App 在后台到点 → 横幅级别通知；`dumpsys alarm` 里训练提醒为精确定时（已授权时），未授权时为非精确且页面有提示。
- [ ] B：上传失败通知的行为与修改前一致；全仓只有一处 `setNotificationHandler`。
- [ ] C：诊断文档表格里的各行全部到位；整体纵向的滑动仍滚动页面。
- [ ] `grep -rn "DEBUG-wb" src` 为空；`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。
- [ ] 真机复验由 David 做（小米系设备）：切网时记组、提醒前后台与准点、RPE 拖动。

## Out of Scope

休息计时常驻通知（D-16，另卡）、FCM 推送、训练提醒默认日口径（D-26，随两端 spec）、提醒开关颜色（D-27，随小修卡）、视频剪辑、拍摄页布局、iOS 仓。

## 范围答复（2026-10-02，Opus）：B 项允许新增最小本地 Expo 模块

Expo SDK 57 的 Notifications 不暴露"能否排精确闹钟"的查询。批准在 `modules/` 下新增一个最小的本地 Expo 模块（与现有 `modules/training-video` 同一做法），只做两件事：

1. 查询 `AlarmManager.canScheduleExactAlarms()`（Android 12 以下恒为 true）。
2. 打开系统的"闹钟和提醒"授权页（`ACTION_REQUEST_SCHEDULE_EXACT_ALARM`，带本应用包名）。

约束：不引第三方依赖；模块自己的 `AndroidManifest.xml` 声明 `SCHEDULE_EXACT_ALARM`（与 `app.json` 保持一致），不声明 `USE_EXACT_ALARM`；JS 侧在非安卓平台与模块不可用时安全降级为"视为未授权、走非精确定时"；页面回到前台时重新查询并在授权状态变化后重排提醒。卡面"原生配置只动 app.json"一句对这个模块放开，其余约束不变。验收清单 B 项照旧。
