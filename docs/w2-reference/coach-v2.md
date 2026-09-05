# 教练端参照包 v2(iOS `release/1.0` @ 202e95db,`Modules/CoachKit`)

> 2026-09-05 只读侦察写成,供 RN Android W2 教练端实装 1:1 复刻。所有事实取自该 commit 的 iOS 源码,**不是 PLAN.md 的假设**;不确定处标「现场核」并给出文件路径。
> 文案一律按 **key** 引用 `docs/w0-reference/i18n/CoachKit.json`(`{key: {zh, en}}`),RN 渲染英文走 `t(key)`;本文引号里的英文只是让 reviewer 认屏,**禁止当字面量抄进代码**。带 `%lld` / `%@` 的 key 在 catalog 里是复数字典(one/other),RN 用 i18next plural 形态。
> 路径均相对 `/Users/david/Projects/apps/MeetPR-release`。DesignSystem token 名同 `Modules/DesignSystem/Sources/DesignSystem/Tokens/{Spacing,Radius,Colors,Typography}.swift`。

## 0. 教练 tab 外壳(`Modules/CoachKit/Sources/CoachKit/CoachRootView.swift`、`CoachTabAccessibilityHost.swift`)

**先纠正 PLAN.md 的结构假设:教练端只有 4 个 tab,`BindQueue` / `InviteCodes` / `Planning` 都不是 tab。**

| 序 | `CoachTab` | 标题 key(en) | icon(`MeetPRTabIcon`) | 屏 | badge |
|---|---|---|---|---|---|
| 1 | `.today` | `coach.shell.today`(Today) | `.house` | `CoachDashboardView` | 无 |
| 2 | `.messages` | `coach.chat.messages`(Messages) | `.message` | `CoachReceivingView` | `videoQueue.pendingCount + chat.inbox.totalUnread` |
| 3 | `.students` | `coach.shell.students`(Students) | `.students` | `StudentRosterView` | `queueViewModel.pendingCount`(待接收申请数) |
| 4 | `.profile` | `coach.shell.profile`(Profile) | `.profile` | `CoachMyProfileView` | 无 |

- 壳不是 `TabView`:四屏同时挂在一个 `ZStack` 里,由 `CoachTabShellPresentation.layer(for:)` 给每层 `opacity 1/0`、`allowsHitTesting`、`accessibilityElementsHidden`、`disabled`、`zIndex 1/0`。**RN 等价 = 四个常驻 screen + 显隐切换,不是卸载重建**——切 tab 不丢滚动位与草稿。
- 底栏 `MeetPRTabBar`(`safeAreaInset(.bottom)`):`selectedColor = Color.MeetPR.gold500`,`unselectedColor = Color.MeetPR.textDisabled`,`badgeColor = Color.MeetPR.danger`;底 `surfaceCard`,顶 1px `borderSubtle`,内容高 `MeetPRSpacing.minimumHitTarget`(44)+ top padding 5;标题 `system 11`;badge 圆点偏移 (x +10, y −6)。a11y label = tab 标题,选中加 `.isSelected`。
- **全屏目的地会隐藏整条 tab bar**:`fullScreenDestinationIDs` 非空时不渲染 `MeetPRTabBar`。注册方式 = 目标视图挂 `.coachFullScreenDestination()`,当前挂了的有 `StudentDetailView`、`StudentOnboardingProfileView`、`StudentPendingVideosView`、`CoachConversationDestination`。
- **角色门**(`Modules/AppShell/Sources/AppShell/RootView.swift:176-247`):`UserRole.coach`(wire `"coach"`)→ `CoachRootView`;`coached_student` / `self_train_student` → 学员栈。教练根**必须先拿到 chat context**:`chatSession.context != nil && context.currentUserID == user.id && chatSession.activeStudentCoachID == nil`,否则先渲染 `ProgressView()` 并 `activateCoach(...)`。学员会话的 coach 绑定绝不允许被教练根继承。
- **唯一时钟 `now`**:`@State private var now = Date()`,经 `environment(\.coachNow)` 下发,所有子屏禁止自取 `Date()`(review-loop 2026-07-30 的教训:同屏各行落在不同时刻,且过夜不推进)。推进时机三个:`scenePhase == .active`、`UIApplication.significantTimeChangeNotification`、`.NSCalendarDayChanged`。**跨日切时额外 `rosterViewModel.refresh()`**——本周日志窗口换周了,只推 `now` 会让格子空着。
- 首次 `onAppear` 的 `loadDashboardData()`:并发跑 `roster.loadIfNeeded()` / `bindQueue.loadIfNeeded()` / `videoQueue.loadIfNeeded()`,全部落地后 `chat.inbox.refresh()` + `chat.inbox.startPolling()`;`onDisappear` 取消该 task 并 `stopPolling()`。
- **push 路由**(`PushRouteIntent`):`.chatMessage(id)` / `.videoPending` → 切 `.messages`(chatMessage 还把 conversationID 透传给 Receiving 打开会话);`.missedTraining` / `.prCongrats` / `.bindRequest` / `.planShift` → 切 `.students`;`.planUpdated` / `.planPublished` → 教练端直接吞掉置 nil。
- 埋点:切 tab 打 `Analytics.screen(.dashboard / .coachReceiving / .coachRoster / .account)`(`coach_receiving` / `coach_roster` / `coach_student_detail` 是 wire 值)。

---

## 1. Dashboard(今日,`Features/Dashboard/CoachDashboardView.swift` + `CoachTodayTodoList.swift` + `CoachWeekOverview.swift` + `CoachTodayStrings.swift`)

外壳:`NavigationStack > ScrollView`,块间距 `MeetPRSpacing.point15`(15),横 padding `pageHorizontal`(20),top 6 / bottom 28,底色 `bgBase`,隐藏导航栏。自上而下:

1. **Header** `CoachTodayHeader`:左列日期 mono 12 tracking 0.72 `textTertiary`(`CoachTodayFormatting.dateText` = `"{月 wide} · {星期 wide}"`,用设备日历与时区)+ 第二行 `coach.shell.today` display **38** `textPrimary`;右列 `coach.today.todo`(Todo)body 11 `textTertiary` + 待办总数 display 28。
2. `coach.today.orderedByHandling`(Ordered By Handling)mono 12 `textTertiary`。
3. **待办区三态**(判定顺序固定):
   - `rows.isEmpty` → `CoachTodayNoStudentsState`:person.badge.plus 图标 24 semibold `gold500` 装在 52×52 圆形 `surfaceCard` 里 → `coach.roster.noStudents`(No students yet)body 15 semibold → `coach.roster.noStudentsSubtitle`(Copy your invite code from Me and send it to a student)body 12 `textDisabled` 居中;垂直 padding 40。
   - `todoItems.isEmpty` → `CoachTodayEmptyState`:checkmark `success` + `coach.today.allDone`(All Done)+ `coach.today.allDoneSubtitle`。
   - 否则 `CoachTodoCard`(整卡 `meetPRCardSurface(.card)`),每行 = 圆点(7pt,gold 或 danger)+ 标题 body 15 bold(单行)+ 副标题 body 12 `textTertiary`(单行)+ 右侧 tag(body 11 semibold,同点色)+ chevron.right;行间 1px `borderDefault` 顶边;`PressScaleButtonStyle(scale: 0.97)`;整行 `accessibilityElement(children: .combine)`。
4. **接收成功横幅**(仅 `acceptedStudentName != nil` 时,来自学员 tab 接收后回传):✓ `success` + `coach.today.acceptedStudent`(New student {name} accepted · Added to your roster)body 14 `success`,卡 + `success@0.3` 描边。
5. `coach.today.weekOverview`(Week Overview)mono 12 + top padding 2。
6. **`CoachWeekOverviewCard`**(见 §3.2 算法):
   - `summary.planned > 0` 时:头行 `{完成率}%` display 26 + `coach.today.trainingDaysCompleted %lld %lld`(%1$lld / … completed)body 12 + 右上 `W{isoWeek}` mono 10 tracking 1;→ 图例条(每组一根 capsule,宽按 `containerRelativeFrame` 的 span=count 分配,高 8,间隙 3)→ 图例标签(圆点 7 + 组名 body 11.5 + `coach.today.peopleCount %lld` body 11.5 bold)→ 1px `borderHairline` → 星期头(左留 52 占位、右留 30 占位,中间七格 mono 9.5,今天列 bold + `textPrimary`,其余 `textDisabled`;文案 `coach.today.weekday.mon…sun`,en 是单字母 M/T/W/T/F/S/S)→ 每学员一行。
   - `planned == 0` 时整块换成 `coach.today.noTrainingDaysThisWeek`(No training scheduled this week)body 13 semibold 居中。
   - 底部恒有 `coach.today.viewAllStudents`(View All Students)body 12.5 + chevron,点击切学员 tab。
   - 行 `CoachWeekOverviewRow`:左 52pt 宽(组色圆点 5 + 姓名 body 12.5 semibold 单行)+ 中间七格(高 14,间距 4)+ 右 30pt 宽 `{completed}/{planned}` mono 11.5 semibold;比值色:完成 ≥ 计划 → `success`,组=attention → `danger`,否则 `textTertiary`。点行 → `StudentDetailView`。
   - 格子 `Cell` 四态:`.rest` = `bgStack` 高 8 + top padding 6;`.completed` = `success` 实心高 14;`.missed(isAttention)` = 高 14,attention 时 `danger@0.16` 底 + `danger` 边,否则 `bgBase` 底 + `borderStrong` 边;`.upcoming` = `surfaceCard` 底 + `borderStrong` **虚线**(dash [2,2])。圆角 `MeetPRRadius.micro`。
- 图例颜色/文案:`.active` = `success` + `coach.today.activeAsPlanned`(Training as planned);`.idle` = `textDisabled` + `coach.today.notStarted`(Not Started);`.attention` = `danger` + `coach.today.needsAttention`(Needs Attention)。计数为 0 的组不出现。
- 导航:行 → StudentDetail(`navigationDestination(item:)`);待办 `.studentChat(id)` → 先 `openConversation(withOtherParty:)` 再进会话,失败弹 alert `coach.chat.unableToOpenConversation` + `coach.chat.ok`。
- **Dashboard 自己不发请求**:rows/videos/applications/conversations 全由 `CoachRootView` 注入;下拉刷新在这一屏**没有**。

## 2. StudentRoster(学员,`Features/StudentRoster/StudentRosterView.swift` / `StudentRosterRow.swift` / `CoachApplicationCard.swift` / `StudentRosterViewModel.swift`)

块间距 14,横 20,top 6 / bottom 28;支持 `.refreshable`(并发 roster + bindQueue)。自上而下:

1. `coach.shell.students` display **34**。
2. 搜索框 `CoachRosterSearchField`:magnifyingglass 17 `textDisabled` + `TextField(coach.roster.searchStudents)` body 14 + 有字时 xmark.circle.fill 清除(a11y `coach.roster.clearSearch`);`surfaceCard` 底、圆角 `MeetPRRadius.control`、`borderDefault` 1px。过滤 = `displayName.localizedCaseInsensitiveContains(query)`(trim 后)。
3. **新学员申请段**(`applications` 非空时,按 `submittedAt` **降序**):标题 `coach.roster.sectionCount %@ %lld`(`%@ · %lld`)包住 `coach.roster.newStudentRequests`,mono 12 `gold500`;每条一张 `CoachApplicationCard`:
   - 卡 = `meetPRCardSurface(.card)` + `gold500@0.35` 描边,内 padding 16。
   - 首行:姓名 display 18 + 右 `CoachOnboardingDisplay.waitingText`(`coach.bind.waiting.minutes/hours/hoursMinutes/days`,en "Waiting %lld hr %lld min" 等)body 11 `textTertiary`。
   - 摘要行(top 5,body 13 `textSecondary`):性别 · `coach.roster.age %lld` · `{体重} kg` · `coach.bind.training.lessThanOne/years/tenPlus`,缺项跳过、` · ` 连接。
   - 1RM 行(top 7):`S:{x}　B:{y}　D:{z}` mono 14 bold tracking 0.28(全角空格分隔,缺值 `—`)+ `(kg)` mono 12。
   - 动作行(top 13):`coach.roster.accept`(Accept,黑底 `textPrimary` + `inkOnCTAFill` 字,capsule,body 14 bold)/ `coach.roster.viewProfile`(View Profile,`borderStrong` 描边 capsule)/ xmark 图标按钮(宽 46,`borderDefault` 描边,a11y = `coach.roster.reject`)。
4. **名单区四态**(`StudentRosterContentState.resolve`,注意 **failed 也归 `.rows`**,失败靠外层 overlay):
   - `.loading`(`idle`/`loading`)→ `ProgressView(coach.roster.loadingStudents)` tint gold,垂直 32,a11y id `coach.roster.loading`。
   - `.emptyRoster`(loaded + 无学员 + 无搜索词)→ `CoachRosterEmptyState(coach.roster.noStudents, coach.roster.noStudentsSubtitle, "person.badge.plus")`。
   - `.noMatches`(loaded + 无学员 + 有搜索词)→ `CoachRosterEmptyState(coach.roster.noMatchingStudents, nil, "magnifyingglass")`。
   - `.rows` → 先 `coach.roster.active`(Active)计数标题 mono 12 `textTertiary` + 正常行;`abnormalRows` 非空时再 `coach.roster.abnormal`(Needs Attention)mono 12 **`danger`** + 异常行。分组判据 `isAbnormal` = `triageSignals` 非空 **或** `student.status == .abnormal`。
   - 加载失败:整屏 overlay `ContentUnavailableView(coach.roster.loadFailed, "exclamationmark.triangle", description: message)`,message = `coach.roster.error.load`。
5. **`StudentRosterRow`**(卡,横 16 / 竖 14):首行 = 状态点 9(异常 `danger` / 正常 `success`)+ 姓名 body 16 bold + 右侧二选一——异常时 `abnormalReason` body 11 semibold `danger`(优先 `coach.roster.notTrainedReason %lld`,其次 `coach.roster.waitingForReplyReason`,再退回 `statusText`);正常时 `lastActiveText`(`CoachStudentFormatting.relativeText`,无记录 → `coach.roster.noTrainingRecords` "No training this week")mono 11,且本周 `plannedDays == 0` 时补一枚 `coach.roster.noPlan`(No Plan)胶囊(gold 字 + `gold500@0.4` 边)。
   第二行 = **分段进度**(一段 = 一个本周计划训练日,宽 16 高 5 capsule,已完成段填 `textPrimary` 其余 `borderDefault`;本周 0 计划日则整组不画)+ `coach.roster.weekProgress %lld %lld`(This week %lld/%lld)mono 11 + 右侧 `coach.roster.completionRate`(Completion)body 11 + `{pct}%` mono 14 bold,色阶 **≥85% success / ≥65% gold500 / 其余 danger**。
   整行 `accessibilityElement(children: .combine)`,a11y label 只给姓名。
6. **接收/拒绝交互**:
   - 点 Accept → `AcceptBindRequestSheet`(`presentationDetents [.medium, .large]`,`NavigationStack` 标题 `coach.bind.accept.title`,取消 `coach.common.cancel`):正文 `coach.bind.accept.confirmQuestion`(Accept {student} as your student?)headline + `coach.bind.accept.explanation` footnote + `PrimaryButton(coach.bind.accept.confirm)`。**评估期已封存**,该 sheet 永远发 `skipEvaluation: true, skipReason: nil`(源码注释:两选一与理由输入已从文件删除,留在 git history)。成功 → sheet 关、清 `profileTarget`、回传姓名给 Dashboard 横幅、`roster.refresh()`;失败也关 sheet,错误走队列 banner。
   - 点 ✕ / Ignore → `confirmationDialog(coach.roster.rejectConfirmation)`(The student will see a neutral message without a reason. Reject this request?),destructive `coach.roster.reject` + cancel `coach.roster.cancel`。**拒绝无理由字段**(spec 033 D10 静默拒绝)。
   - 队列 4xx → `alert(bannerMessage)` + `coach.chat.ok`;文案见 §2 数据契约的错误映射;**任何 4xx 都先 `refresh()` 再报,不做原地重试**。
7. 点 View Profile → `StudentOnboardingProfileView`(全屏,注册了 `coachFullScreenDestination`):自定义 header(圆形返回键 + `coach.applicationProfile.title` "{name} · Application Profile" body 16 bold + 等待时长 body 11)+ 一张分行卡:`basicInfo` / `selfReportedOneRM`(mono bold)/ `trainingHistory` / `trainingEnvironment` / `targetMeet` / `focus` / `injuryHistory` / `studentSaid`(按性别取 `heSaid`/`sheSaid`/`theySaid`,值加中文书名号 `「…」`);缺值一律 `coach.applicationProfile.notProvided`(—)。底部 action row = Accept / Ignore。取不到 profile → `coach.applicationProfile.unavailable` + `coach.applicationProfile.unavailableSubtitle` + 同样的 action row(**空态也必须留操作口**)。

## 3. StudentDetail(`Features/StudentDetail/StudentDetailView.swift`、`StudentDetailViewModel.swift`)

全屏(隐藏导航栏 + `coachFullScreenDestination()` → 进入即隐藏 tab bar)。块间距 14。

### 3.1 Header
- **返回行**:左 `chevron.left` 20 semibold + `coach.detail.backToStudents`(Students)body 14 `textSecondary`(a11y id `coach.detail.back`);右侧仅当 `context.chat != nil` 时一枚 38×38 圆形 message 按钮(a11y `coach.chat.sendMessage`,id `coach.detail.chat`,`isOpening` 时禁用)。
- **姓名行**:`displayName` display 32(单行,`minimumScaleFactor 0.7`)+ 状态胶囊:`.active` → `coach.detail.active` `success`;`.abnormal` → `coach.detail.needsAttention` `danger`;`.inEvaluation(d,h)` → d>0 时 `coach.detail.evaluationDays %lld` 否则 `coach.detail.evaluationHours %lld`,`gold500`。胶囊 = body 11 semibold + 同色 @0.35 描边。
- **计划卡** `StudentPlanCardState.resolve(loadState, hasPlan)` 四态:
  - `.loading` → `StudentPlanStatusView(.loading)`:spinner + `coach.detail.loading`。
  - `.failed` → 三角警告 `danger` + `coach.detail.planLoadFailed`(Could not load the plan)。
  - `.empty` → calendar.badge.plus `gold500` + `coach.detail.noPlan`(No plan yet)+ 副 `coach.detail.noPlanSubtitle`(**"Create a plan for this student from planning"** —— 文案仍指向 app 内排计划,但 §7 说明入口已不存在,属已知过期文案)。
  - `.plan` → `loadedPlanCard`:`coach.detail.weekRunningTitle %lld`(W%lld in progress,**参数是设备日历的自然周号 `weekOfYear`,不是计划周**)body 14 bold + `· coach.detail.weekProgress %lld %lld` body 12 → 线性 `ProgressView` tint `success`、底 `borderDefault`、高 6、圆角 micro → 两枚描边胶囊按钮:`coach.detail.remindTraining`(Remind to train,点击带草稿 `coach.detail.trainingReminderDraft` 开会话;`chat == nil` 时禁用)与 `coach.detail.weekSummary`(Week Summary,**恒禁用**,a11y hint `coach.detail.weekSummaryUnavailable`)。

### 3.2 评估横幅(整块**当前不渲染**)
`CoachEvaluationSeal.isSealed = true` ⇒ `shouldLoadEvaluation == false` ⇒ 既不拉评估也不画 `EvaluationStatusBanner`;`EvaluationLoadFailureStrip` / `EvaluationSummaryEditorView` / 「适应周排计划」`AdaptationPlanningPresenter` 全部因此不可达。RN **不复刻**,但要知道:解封要同时翻 `CoachEvaluationSeal` 与学员端 `BindGateViewModel.evaluationSealed` 两处。

### 3.3 分段 tab(`StudentDetailSection`,横向可滚 chip 条,间距 6)
五段固定顺序 `overview / videos / growth / feedback / profile`,文案 `coach.detail.section.*`(Overview / Videos / Progress / Feedback / Profile)。选中 = `textPrimary` 底 + `inkOnCTAFill` 字,未选 = `surfaceCard` 底 + `textTertiary` 字;圆角 `MeetPRRadius.chip`,body 13 semibold,a11y id `coach.detail.tab.{rawValue}`。
内容区整体 `.refreshable`:growth 段刷新 `growthViewModel.load`,其余刷新 `viewModel.refresh(now:)`。
主体三态:loading → 居中 spinner + `coach.detail.loading` mono 12;failed → `failureCard`(`coach.detail.loadFailed` body 15 bold `danger` + message(`coach.studentDetail.error.load`)+ `coach.detail.pullToRetry` body 12);loaded → 分段内容。

### 3.4 Overview 段(`Overview/StudentOverviewSection.swift`)
块间距 10,三张卡:
1. **本周训练卡**:头行 `coach.detail.weekTraining` body 11 semibold `gold500` + 右 `coach.detail.tapDayForDetails` body 11 `textTertiary`;无训练日 → `coach.detail.noTrainingThisWeek` body 14;否则每个**有动作的**训练日一行:`W{planWeekIndex}D{序号} · {首个动作名}`(无动作名退 `coach.detail.training`)body 14 bold + `{M}/{D} · {周几}`(`coach.detail.weekday.*`)body 12 → 可选顺延胶囊:该日 `shiftedToDate != nil` → `coach.detail.adjusted`(Adjusted);否则第一行且有 `coach.studentDetail.shiftedDays %lld` → 显示总顺延天数;胶囊 gold 字 + `gold500@0.12` 底 → 状态字:有完成组 → `coach.detail.completed` `success`;是今天 → `coach.detail.today`;否则 `coach.detail.notStarted`(后两者 `textTertiary`)→ chevron。点行 → `CoachDayDetailView`。
   > ⚠️ 顺延(shift)在学员端已下线(见 `core-training-loop-v2.md`),教练端**仍读并显示** `shiftedToDate` / `totalShiftDays`。RN 端按现状照搬渲染即可(数据仍下发),不要反向重建顺延写口。
2. **今日状态卡**(spec 030):标题 `coach.detail.todayStatus`(Today's Readiness)body 11 semibold;`.loaded` → `coach.shared.readiness.scales %lld %lld %lld`(Sleep %lld · Mood %lld · Stress %lld,**三个刻度同向,5 最好,不做逐项反转**)body 15 bold + `coach.shared.readiness.fatigue`(Fatigue: {items})/ 无疲劳时 `coach.shared.readiness.noMuscleFatigue` body 12;`.notFiled` → `coach.detail.todayNotFiled` + 右侧描边胶囊 `coach.detail.remindToFile`(带草稿 `coach.detail.readinessReminderDraft` 开会话);`.unavailable` → `coach.detail.statusUnavailable`。**「未填」与「取数失败」必须分开,不许把失败说成未填。**
3. **最近反馈卡**(整卡可点):`coach.detail.recentFeedback` body 11 semibold;有反馈 → 正文单行 body 15 bold + `coach.detail.feedbackMeta`({relativeTime} · View all →);无 → `coach.detail.noFeedback` + `coach.detail.writeFirstFeedback`(Write the first feedback from Videos →)。点击:有反馈跳 feedback 段,无反馈跳 **videos** 段。

**`CoachDayDetailView`**(`Execution/CoachDayDetailView.swift`,navigationTitle = `fullDateText`):按 `planDay.exercises` 每动作一张 `Card`——动作名 headline + `coach.execution.loggedSetsFraction %lld %lld`(%1$lld/… logged)footnote;无记录 → `coach.execution.noLoggedSets`;有记录 → 每组一行 `SetReadOnlyCell(setIndex, weightKg, reps, rpe, isCompleted)`(DesignSystem 组件)。无计划有记录 → `coach.execution.freeLog` 卡;都无 → `ContentUnavailableView(coach.execution.restDay, "moon")`。

### 3.5 Videos 段(`Videos/StudentVideoGridView.swift` + `StudentVideoGridViewModel.swift`)
- `unavailable` → 居中 video 图标 26 `success` + `coach.video.loadFailed`(Play Failed)+ `coach.video.pullToRetry`;`videos.isEmpty` → `coach.video.emptyTitle`(No student videos yet)+ `coach.video.emptySubtitle`。
- 有数据:按**本地日历日**分组(`video.displayDate` = `loggedAt ?? createdAt`),日倒序、日内倒序;段标题 `coach.video.today` / `coach.video.yesterday` / `MM/dd`(源码此处硬编码 `Locale("zh_Hans_CN")` 格式化,英文版应改用设备 locale 的 `MM/dd`,**现场核** `StudentVideoGridView.sectionTitle`)。
- 行:72×56 黑底缩略块(`textPrimary` 填充 + `play.fill` 20 `inkOnCTAFill`;加载中换 spinner)+ 标题(计划动作名 → filename → `coach.video.trainingVideo`)body 14 bold + 状态字 `coach.video.feedbackSent`(success)/ `coach.video.awaitingFeedback`(gold500)body 11 semibold + 相对时间 body 11;a11y id `coach.detail.video.{uuid}`。
- 点行 → 换短链后全屏 `CoachVideoPlayerView`(= ChatUI `FeedbackVideoPlayerView`,`requiresCoachExportConfirmation: true`,带 `VideoBadgeInfo` 角标:动作名/重量/次数/RPE/组序/教练名);失败 → 顶部 banner(文案 `coach.video.error.playback`,按钮 `coach.video.confirmation` "Got it")。播放中过期可用 `refreshURL` 再换一次短链。

### 3.6 Growth 段(`Growth/StudentGrowthView.swift` + `StudentGrowthViewModel.swift` + `CoachExerciseStatsRepository.swift`)
- 三态:loading spinner;failed → 文案(`coach.growth.error.load`)+ `coach.detail.retry` borderedProminent;loaded 且三个 family 都无点 → `coach.growth.empty`(No progress data yet)。
- **总卡**(黑底 `textPrimary`,圆角 card):`coach.growth.totalE1RM`(SBD total e1RM)mono 12 → 数值 display 34 `inkOnCTAFill` + `kg`(无值 `—`)→ 线性进度(tint `inkOnCTAFill`,底同色 @0.14,高 5)→ 底行 `coach.growth.totalProgress %@`(%@ of 1RM total)与 `coach.growth.oneRMTotal %@`(1RM total %@ kg)。
- **每主项一卡**(顺序 `LiftFamily.allCases` = squat / bench / deadlift):标题 `coach.growth.family.squat|bench|deadlift` mono 12 semibold → 数值 display 30 + `kg`(无 → `coach.growth.noFamilyData`)+ 右侧趋势符号 `↑ success` / `→ textTertiary` / `↓ danger`(a11y `coach.growth.trend.up|flat|down`;`new` 与 `unknown` **不画符号**)→ 有点时 `E1RMChart` 高 90。
- **数值全部来自后端聚合,客户端零计算**(源码注释明确禁止本地回落)。格式化:0–1 位小数;进度 = `latestTotal / oneRMTotal` clamp 0…1,`oneRMTotal == 0` 时为 0。
- VM 里的 `selectedFamily` / `selectedWindow`(`coach.growth.window.fourWeeks|threeMonths|all`,28d / 90d / 全部)/ `visiblePoints` / `plateau` **当前无 UI 消费**——RN v1 不做时间范围切换与平台期提示,除非 David 另拍。

### 3.7 Feedback 段(`Feedback/CoachFeedbackHistoryView.swift`)
只读归档。头行 `coach.feedback.recordCount %lld`(Feedback · %lld)mono 12 + 右 `coach.feedback.writeFromVideo`(Write feedback from a video)body 11 `textDisabled`。空 → `coach.feedback.empty`。每条卡:相对时间 mono 11 + 可选主题胶囊(`borderDefault` 描边:计划动作名 → `coach.feedback.videoFeedback` → `dayDate` 的 `MM/dd`)+ 正文 body 14,行距 7。
> **教练端此屏没有写入口**。`Feedback/FeedbackComposerView.swift` + `FeedbackComposerViewModel.swift`(文案 `coach.feedback.title/placeholder/send/link/…`)在本 commit **无任何调用点 = 死代码**;文字反馈只能从 §4 的视频工作台发。RN 不复刻 composer。

### 3.8 Profile 段(`Profile/StudentProfileSection.swift`)
- `.loading` spinner;`.unavailable` → `coach.detail.profileUnavailable`(Registration profile unavailable)。
- `.loaded`:**1RM 卡**——头行 `coach.profile.currentOneRM`(Current 1RM · Only you can edit)body 11 semibold `gold500` + 右侧 `coach.profile.edit` 描边胶囊(**只是静态文本 + `.isButton` trait,无动作**,a11y hint `coach.profile.editUnavailable`)→ `S:{x}　B:{y}　D:{z} (kg)` mono 17 bold → 说明 `coach.profile.oneRMExplanation`。
- 段标题 `coach.profile.registrationAnswers` mono 12 → **问卷卡**十行,顺序固定:`basicInfo` / `weightClass` / `trainingHistory` / `trainingEnvironment` / `targetMeet` / `focus` / `injuryHistory` / `diet`(**恒为空 → 显 `—`,占位未接**)/ `studentSaid`(body 14,值加 `「…」`)/ `joinedAt`(mono,`createdAt` 的 yyyy/MM/dd,源码同样硬编码 zh locale,**现场核**)。每行 = 标签 body 11 `textTertiary` + 值 body 15 semibold,顶 1px `borderHairline`;缺值 `coach.profile.notProvided`(—)。

## 4. Receiving = 消息 tab(`Features/Receiving/CoachReceivingView.swift` + `CoachInboxPresentation.swift`)

**这是「消息 + 待反馈视频」的合并收件箱,不是独立的「视频收件」屏。**

1. Header:`coach.inbox.eyebrow %lld`(Messages & Videos · %lld)mono 11 semibold tracking `11*0.06` `gold500` + `coach.inbox.title`(Messages)display 34。
2. 四态(`CoachReceivingContentState.resolve`):`.loading`(视频队列 idle/loading)→ `ProgressView(coach.inbox.loading)`,a11y id `coach.inbox.loading`;`.failed`(视频 failed 且行为空,或 chat 有错且行为空)→ `ContentUnavailableView(coach.inbox.loadFailed, "exclamationmark.triangle")`;`.empty` → 圆形 `surfaceCard` + bubble 图标 20 `success` + `coach.inbox.emptyTitle`(All caught up)+ `coach.inbox.emptySubtitle`;`.content` → 会话卡 + 提示语 `coach.inbox.hint`(Tap a name to chat · Tap the black count to review videos)body 12 `textDisabled`。
3. 行(一人一行,行间 1px `borderHairline`):左半 = 姓名 body 15 bold + 预览 body 12 单行截断(有待反馈视频 → `coach.inbox.pendingVideoPreview %lld %@`;否则 `conversation.lastMessagePreview`,再否则 `coach.inbox.noMessages`)→ 有未读时一枚 8pt `danger` 圆点(a11y `coach.inbox.unreadAccessibility %lld`)→ 有待反馈视频时一枚**黑底 capsule**(`play.fill` 12 + 数字 mono 11 bold,`textPrimary` 底 + `inkOnCTAFill` 字;a11y `coach.inbox.pendingVideosAccessibility %@ %lld`,id `coach.inbox.video.{uuid}`)→ chevron(a11y hidden)。左半 a11y id `coach.inbox.chat.{uuid}`。
4. 点姓名 → 会话(已有 conversation 直接进,否则 `openConversation(withOtherParty:)`);点黑胶囊 → `StudentPendingVideosView`。下拉刷新 = 视频队列 + chat inbox 并发。
5. `task(id: pushedConversationID)`:push 带来的会话 id 先 `inbox.refresh()`,命中才打开,然后把 binding 置 nil。

### 4.1 某学员的待反馈视频列表(`StudentPendingVideosView.swift`)
`navigationTitle = studentName`(inline)、`coachFullScreenDestination()`。四态同上,空态 = `ContentUnavailableView(coach.videoFeedback.noPendingVideos, "checkmark.circle", coach.videoFeedback.noPendingVideosSubtitle)`。内容按**训练日**分组(`dayDate ?? uploadedAt` 的本地日零点,日倒序、日内按 `uploadedAt` 倒序),段标题 = `fullDateText` mono label;行 = 52×52 `bgStack` 圆角块 + `play.rectangle.fill` 20 `gold500` + 动作名 16 semibold + meta `{HH:mm} · {size} MB`(`coach.videoFeedback.sizeMegabytes`,≥10MB 取整、否则一位小数)+ chevron;a11y `coach.videoFeedback.rowAccessibility`({exercise}, tap to write feedback),id `coach.video.row.{uuid}`。
**返回时机**:该学员队列变空且工作台已关 → 自动 `dismiss()` 回收件箱(`shouldDismissStudentList(isEmpty:isDetailPresented:)`);工作台开着时不弹回。

### 4.2 视频反馈工作台(`VideoFeedbackDetailView.swift` + `VideoFeedbackDetailModel.swift`,全屏 cover)
自上而下:
1. `VideoFeedbackHeader`:圆形返回键(a11y `coach.videoFeedback.back`,id `coach.video.back`)+ `coach.videoFeedback.title`({student} · {exercise})body 16 bold + meta `coach.videoFeedback.headerMeta`({set} · Uploaded {relativeTime};set 部分 = `coach.videoFeedback.setNumber %lld` 或退回 `coach.videoFeedback.trainingVideo`)+ 右侧队列位置 `coach.videoFeedback.queuePosition %lld %lld`(%lld / %lld,mono 12 等宽数字)。底 1px `borderDefault`。
2. `VideoFeedbackPlayerCard`:有短链 → ChatUI `FeedbackVideoPlayerView`(workbench 配置:markers 层、`currentSeconds` 绑定、`onAddMarker`、`onMarkersRefresh`、`requiresCoachExportConfirmation: true`);无短链 → 高 270 的 `videoStageFill` 舞台,loading 转圈(a11y `coach.videoFeedback.loading`)或 `coach.videoFeedback.playFailed` + `coach.videoFeedback.retry`(id `coach.video.retry`)。
3. **标记列表**(仅 `markers != nil` 且非空):标题 `coach.videoFeedback.markerCount %lld`;每行 = 时间 mono 12 bold `gold500` + 备注(空 → `coach.videoFeedback.marker`)+ 有批注图时 pencil 角标 + 右侧 destructive 垃圾桶(a11y `coach.videoFeedback.deleteMarker`);有 `annotationURL` 的行可点开批注(id `coach.video.marker.annotation`)。排序 = `timeMilliseconds` 升序,同值按 `createdAt`。
4. 失败行(body 12 `danger`):`coach.videoFeedback.markersLoadFailed` / `markerSaveFailed` / `markerDeleteFailed`。
5. `VideoSetInfoStatusView`:`.loading` 什么都不画;`.unlinked` → `coach.videoFeedback.setInfoUnavailable` `textDisabled`;`.failed` → `coach.videoFeedback.setInfoLoadFailed` `danger`;`.loaded` → `VideoSetInfoCard` 四格(`coach.videoFeedback.weight`+值 display 22+`coach.videoFeedback.kilograms` / `reps`+`repsValue %lld` / `rpe`(缺 → `missingValue` —) / `setOrder`+`setNumber %lld`),格间 1px `borderDefault` 竖线;a11y id `coach.video.setInfo`。
6. **发送条** `VideoFeedbackComposer`:`TextField(coach.videoFeedback.feedbackPlaceholder)`(Feedback for {name})+ 黑底 `coach.videoFeedback.send` 按钮(id `coach.video.send`;输入框 id `coach.video.feedbackInput`)。
7. 队列 banner(`viewModel.bannerMessage`,body 12 `danger`)+ **跳过**按钮 `coach.videoFeedback.skip`(Skip · Next clip →,描边 capsule,id `coach.video.skip`,发送中禁用)。
- **添加标记**:仅当 markers 已加载才给按钮;点开 `Form` sheet——`LabeledContent(coach.videoFeedback.markerTime)` 显示当前播放时间、`TextField(coach.videoFeedback.markerNote)`(Note (optional, 500 characters max),`lineLimit 3...6`,**硬截断 500 字**)、取消 `coach.videoFeedback.cancel` / 保存 `coach.videoFeedback.save`,标题 `coach.videoFeedback.addMarker`。**level 恒为 `.info`**(⚖️2026-07-31 David:UI 单档,wire 字段保留)。
- **发送**:trim 后为空 → banner `coach.videoFeedback.emptyFeedback`;成功 → 队列删该条、tab badge −1、toast `coach.videoFeedback.sentFeedback`、埋点 `coach_feedback{kind: video}`;失败 → banner `coach.videoFeedback.sendFailed`。
- **发送后落点用身份不用下标**(`VideoFeedbackQueueNavigator.itemAfterSend`):发送前记下"后继项的 id",发完在新队列里按 id 找;找不到就落到 `items.first`。`skip` 则是环形 `nextItem`(`(index+1) % count`),到尾回头;队列为空 → dismiss。**这条必须逐字移植,否则并发刷新会让教练把评语发给下一个人的隔壁片段。**
- 切片时(`task(id: currentItem.id)`)重置 `currentSeconds = 0`、清批注选中、并发拉 短链 / 组数据 / 标记;三条链路各带 requestID + itemID 双重校验,过期结果一律丢弃。

## 5. Chat(`Features/Chat/*`,复用 `Modules/ChatUI`)
- 教练端没有独立聊天 tab;入口三处:收件箱行、StudentDetail 右上按钮、Dashboard 待办 `.studentChat`。`ConversationListView` 只被 `CoachPlanningHomeView` 用(见 §7,不可达)。
- `CoachConversationDestination` 参数:标题 = 传入姓名 → inbox 里的 `otherPartyName` → `coach.chat.messages`;副标题 `CoachChatStatusSubtitle.presentation`:`.abnormal` → `coach.chat.attentionStudentSubtitle`(● Student · Needs Attention)`danger`;`.active`/`.inEvaluation` → `coach.chat.activeStudentSubtitle` `success`;**状态未知 → 副标题整行不渲染(传 nil),严禁默认成「活跃」**(review-loop 逮到过:待关注待办点进去显示活跃 = 界面说谎)。
- 气泡样式:发出 `textPrimary`,收到 `borderHairline`,`bubbleLayout: .directional`,`composerLayout: .compactPill`。
- 打开会话失败 → alert `coach.chat.unableToOpenConversation` + `coach.chat.ok`。
- inbox 轮询 30 s(`ChatInboxViewModel.poll`);**realtime 连上即 `suspendPolling()`,断开恢复**;`chatMessage` / `chatRead`(他人)事件触发去抖 refresh。会话排序:`lastMessageAt` 倒序,nil 垫底,再按 `id.uuidString`。

## 6. MyProfile(我的,`Features/MyProfile/*` + `Features/InviteCodes/*`)
1. 标题 `coach.profile.title`(Profile)display 34;下拉刷新 = 重载邀请码。
2. **姓名卡**:`viewModel.displayName`(来自 `user.name`,trim 后为空则 `coach.profile.fallbackName` "Coach")body 17 bold,a11y id `coach.profile.displayName`。
3. **邀请码卡**(整卡点进邀请码页,id `coach.profile.inviteCard`):标题 `coach.profile.permanentInvite`(Permanent invite code)body 12 semibold `gold500`;有活跃个人码 → 码 mono 26 bold tracking `26*0.14` + `coach.profile.inviteUsage %lld` body 12,右上角悬浮 `coach.profile.copy` 描边按钮(id `coach.profile.copyInvite`);无码 → 副标题按 VM 状态取 `coach.profile.inviteLoading` / `inviteFailed` / `inviteEmpty`(No permanent code · Tap to generate)。
   复制 → 写剪贴板(**裸 10 位,不带分组空格**)+ toast `coach.profile.copied`(2 s,`textPrimary` 底 + `surfaceCard` 字,圆角 control,id `coach.profile.toast`)。
4. **通用段** `coach.profile.general`(General)mono 12 + 卡内三行:`coach.profile.help`(Help & Feedback)→ 全屏 `CoachHelpFeedbackSheet`;`coach.profile.privacyAndTerms` → `CoachPrivacyTermsSheet`;`coach.profile.appVersion` + `coach.profile.appVersionValue`({version} · {channel},channel = `coach.profile.internalBeta` "Beta")mono 13,该行**不可点**。
   - Help sheet:标题/副标题 = `help` / `helpSubtitle`,四条 FAQ(`coach.profile.faq.join|feedback|video|unbind.question/answer`)一卡到底 + **禁用态**「联系我们」按钮(`coach.profile.contactUs`,`opacity 0.35`,`.isStaticText`,a11y id `coach.profile.contactUnavailable`)+ `coach.profile.contactHours`。
   - Privacy sheet:`coach.profile.userAgreement`(**无链接,置灰**,id `coach.profile.userAgreement.unavailable`)/ `coach.profile.privacyPolicy`(有 URL 才可点)/ `coach.profile.studentDataUsage`,每行右侧 `coach.profile.documentDate`(2026-05-01)mono 11;卡下 `coach.profile.studentDataDescription`。
5. **登出**:`coach.profile.logout` body 14 semibold `danger` + `danger@0.35` 描边 capsule(id `coach.profile.logout`)→ 全屏半透明确认层(`textPrimary@0.6` 遮罩,点遮罩取消):`coach.profile.logoutTitle`(Log out?)display 21 + `coach.profile.logoutMessage` body 14 + 取消(`coach.profile.cancel`,id `coach.profile.logout.cancel`)/ 确认(`coach.profile.confirmLogout`,登出中显 `coach.profile.loggingOut`,`danger@0.1` 底,id `coach.profile.logout.confirm`)。
6. **邀请码页 `InviteCodesView`**(`List`,navigationTitle `coach.invites.navigationTitle` "My Invite Codes",tint gold,下拉刷新):
   - 个人永久段 `coach.invites.personalSection`:有码 → `InviteCodeFormat.grouped(code)` 28pt mono bold + `coach.invites.usedCount %lld` + `coach.invites.copy`/`copied` 与 `coach.invites.regenerate` 两个 `SecondaryButton`;无码 → `coach.invites.noPermanentCode` + `PrimaryButton(coach.invites.generatePermanentCode)`(**绝不在加载时自动生成**,spec 031 D6)。错误行 `coach.invites.operationFailed`。
   - 重生成确认 `confirmationDialog`:标题 `coach.invites.regenerateTitle`(Regenerate permanent code?)+ message `coach.invites.regenerateMessage`(The old code will stop working immediately, including copies already shared.)+ destructive `coach.invites.regenerate` / `coach.invites.cancel`。
   - 次级段 `coach.invites.secondarySection`:两枚创建按钮 `singleUseCode` / `timeLimitedCode` → sheet(`presentationDetents [.medium]`):标题 `createSingleUse`/`createTimeLimited`、备注输入 `optionalLabel` + placeholder `labelPlaceholder`(For Alex);时限码另有 segmented `validity`(`sevenDays` 7 / `thirtyDays` 30 / `custom` + Stepper 1…365 天 `coach.invites.days %lld`)+ `coach.invites.generate`。
   - 列表行:分组码 mono + 类型(`singleUse`/`timeLimited`)+ `· {label}`;右侧显复制态或 `InviteCodeStatus.label`;可点复制(defunct 不可点);左滑 destructive `coach.invites.revoke` → `confirmationDialog(coach.invites.revokeTitle / revokeMessage)`。
   - 失效段 `coach.invites.defunctSection`(Inactive),整段 `opacity 0.5`。
   - **每次写操作后必重拉列表**(后端是唯一真源,不本地打补丁)。

## 7. Planning 交接:**教练 app 里已经没有排计划入口**
- `Features/PlanningWorkspace/`(`CoachPlanningHomeView` 等)与 `Planning/`(向导 Step0–Step7、`PlanningCoordinatorView`、xlsx import、progression rules、`ExerciseRestEditorSection` per-set rest)**代码仍在**,但:
  - `CoachPlanningHomeView` 在整个仓里只被 `Modules/CoachKit/Tests/.../CoachChatWiringTests.swift:31` 引用,**没有任何生产调用点**;它不是 tab、也不是任何屏的目的地。
  - `PlanningCoordinatorView` 的两个生产调用点都在评估期路径上(`StudentDetailView.swift:582` 的适应周 cover、`EvaluationSummaryEditorView.swift:85/94`),而 §3.2 的封印让它们不可达。
  - `Planning/Import/PlanImportCapability.isEnabled = false`(2026-07-02 冻结),`ImportEntryButton` 置灰且惰性;且它只挂在已不可达的 `CoachPlanningHomeView` 上。
- 也**没有**「在网页打开」的交接按钮:仓里没有 plan-web deeplink;`coach.detail.noPlanSubtitle` 那句 "Create a plan for this student from planning" 是残留过期文案。
- 本 commit 的 `specs/` 里**没有 045 目录**(最近的是 043),spec 045 的交接改动不在这条基线上。
- **RN v1 结论**:教练端不做任何排计划 UI,不复刻向导/import/per-set rest;「无计划」只是一个状态展示。是否补一个 plan-web 外链是产品决定,**上桌等 David 拍板**,不要自行发明。

---

## 8. 数据契约(repository → HTTP)

统一走 `Modules/Networking` 的 `APIClient`,Bearer token 由 `SessionStateReader.accessToken()` 提供;JSON 走 `MeetPRCodec` 的 snake_case ↔ camelCase 转换,**Decimal 列一律是字符串**("180.00")。

| 屏 / 用途 | repository 方法 | HTTP | 关键字段 |
|---|---|---|---|
| 花名册、待反馈视频聚合 | `PlanRepository.fetchStudents()` | `GET /coach/students` | `{ students: [{ id, display_name, profile:{user_id,display_name,created_at}, status, evaluation:{id,expected_end_at,overdue} }] }`;老 flat `{user_id, created_at}` 也能解 |
| 每学员本周计划 | `StudentPlanRepository.fetchCurrentPlan(studentID:)` | `GET /students/:id/plans` + `GET /plans/:id` | 见 `core-training-loop-v2.md` §1;教练端消费 `days[].date`、`days[].exercises[]`、`shifted_to_date`、`total_shift_days`、`start_date` |
| 训练日志 | `StudentTrainingLogRepository.fetchLogs(studentID:in:)` | `GET /students/:id/sets?from=&to=&scope=plan`(date-only,to 为**开区间**) | `logs[].{id, plan_exercise_id, set_index, weight_kg, reps, rpe, completed, logged_at}` |
| 某动作全部组(工作台) | `fetchLogsForExercise(studentID:planExerciseID:)` | 同上,**客户端拉近 5 年再本地过滤**(`BackendStudentTrainingLogRepository.swift:81`) | 按 `set_index` 升序 |
| 反馈归档 / 待反馈判定 | `StudentFeedbackRepository.fetchInbox(studentID:)` | `GET /students/:id/feedback` | `items[].{id, coach_id, student_id, day_date, plan_exercise_id, video_id, video{...}, text, posted_at, read_at}` |
| 发反馈 | `postFeedback(studentID:dayDate:planExerciseID:videoID:text:)` | `POST /coach/feedback` | body `{student_id, day_date(YYYY-MM-DD|null), plan_exercise_id, video_id, text}` |
| 视频墙 | `CoachStudentVideoRepository.fetchVideos(studentID:)` | `GET /students/:id/videos` | `videos[].{id, set_log_id, plan_exercise_id, content_type, size_bytes, filename, created_at, logged_at}` |
| 播放短链 | `playbackURL(videoID:)` | `GET /uploads/:id/url` | `{url}`,15 min 有效;**不缓存**,过期在播放器内重换 |
| 视频标记 | `VideoMarkerRepository` | `GET/POST /videos/:videoId/markers`、`DELETE /videos/:videoId/markers/:id` | marker `{id, video_id, coach_id, time_ms, level, note, created_at, attachment_id, annotation_url, annotation_expires_in}`;创建 body `{time_ms, level, note}` |
| 今日 readiness | `ReadinessRepository.fetchCheckin(studentId:checkinDate:)` | `GET /students/:id/readiness?date=YYYY-MM-DD`(**设备本地日**) | `{sleep_quality, mood, stress, muscle_fatigue[{muscle_group, severity}]}` |
| 学员注册资料 | `OnboardingProfileReading.fetchProfile(studentId:)` | `GET /students/:id/onboarding` | 404 `ONBOARDING_NOT_FOUND` → 视作 `unavailable`;1RM 键是 `squat_1rm_kg` → 解码后 `squat1RmKg`(注意大小写坑) |
| 成长曲线 | `CoachExerciseStatsProviding.fetchExerciseStats(studentID:)` | `GET /coach/students/:id/exercise-stats` | `{e1rm:{squat|bench|deadlift:{value}}, e1rm_series:{...:{points:[{date,value}], trend}}, one_rm:{squat,bench,deadlift}}`,全字符串 |
| 接收队列 | `CoachBindQueueRepository.fetchQueue()` | `GET /coach/bind-requests`(仅 pending,服务端 `submitted_at` ASC) | `bind_requests[].{id, student_id, display_name, submitted_at, expired_at, onboarding{...14 字段}}` |
| 接收 | `accept(requestID:skipEvaluation:skipReason:)` | `POST /coach/bind-requests/:id/accept` | body zod `.strict()`:`{skip_evaluation: true}`,`skip_reason` 仅在 skip 且非空白时带;响应 `{bind_request, evaluation_period|null}` |
| 拒绝 | `reject(requestID:)` | `POST /coach/bind-requests/:id/reject` | body 必须是**严格空对象** `{}`(多任何 key 都 400) |
| 邀请码 | `InviteCodeRepository` | `GET /coach/invite-codes`、`POST /coach/invite-codes`、`DELETE /coach/invite-codes/:id`(204,幂等) | 创建 body `{type, label, expires_in_days}` |
| 聊天 | `ChatRepository` | `GET/POST /conversations`、`/conversations/:id/messages`、`POST /conversations/:id/read` | 见 ChatUI |

**错误码 → 文案**(`CoachBindQueueError`,accept/reject 共用):`BIND_REQUEST_NOT_FOUND` / `BIND_REQUEST_NOT_PENDING` → `coach.bind.error.processed`;`BIND_REQUEST_EXPIRED` → `coach.bind.error.expired`;`BIND_ALREADY_BOUND` → `coach.bind.error.alreadyBound`;其它/传输失败 → `coach.bind.error.network`。**4xx 一律 banner + 立即 refresh**。

**缓存 / 刷新 / 乐观更新**:
- bind queue、invite codes、video wall、exercise-stats、readiness:**全部无缓存**(源码注释明写:队列是服务端惰性过期,邀请码要读回后端真值,短链本就短命)。计划与日志走 StudentKit 的 stale-while-revalidate 缓存。
- 花名册每学员 3 个请求(plan / logs / feedback),**滑动窗口并发上限 4**,结果按 summaries 原序回填;单个学员失败只让该行退化成空信号,不炸整屏。日志拉取窗口 = `min(plan.startDate, today−7d)` 至今日 23:59:59。
- 乐观更新只有两处:接收/拒绝成功后本地 `items.removeAll{ id }`;发视频反馈成功后从队列摘除。评估完成回调 `markStudentActive(id)` 就地把该行状态改 `.active`(避免整表闪 loading)。
- `CoachVideoQueueViewModel.refresh()` 用 `refreshGeneration` + `mutationGeneration` 双代次:发送期间落地的旧快照会被丢弃;传输失败保留上一份快照,只有从未加载成功过才置 `.failed`。
- `BindQueueViewModel` / `CoachVideoQueueViewModel` 的 `loadIfNeeded` 只在 `.idle` 触发;`StudentRosterViewModel.loadIfNeeded` 在 `.idle` 或 `.failed` 时触发(两处 onAppear 不许叠加两次全量刷新)。

## 9. 值得写成纯函数的领域规则

1. **`StudentTriageSignalCalculator.signals(studentID:plan:logs:feedback:now:)`**(`Features/StudentRoster/TriageSignal.swift`)
   - 常量:`notTrainedLookbackDays = 7`、`missedTrainingDayThreshold = 2`、`recentLogWindowDays = 3`。
   - `missedTrainingDays` = 计划日中满足「有动作 ∧ 日零点 ∈ [today−7d, today) ∧ 当天没有任何 `completed` 日志」的天数;≥2 → `.notTrained(daysMissed)`。
   - `.awaitingReply` = 最近一条 completed 日志落在 `[now−3d, now]` **且**(最新反馈时间 < 该日志时间 或 完全没有反馈)。
   - 汇总文案 `summaryText`:两者都有 → `coach.roster.triage.missedAwaitingReply %lld`;仅漏练 → `coach.roster.triage.missed %lld`;仅待回复 → `coach.roster.triage.newRecord`;都没有 → 空串。
2. **周概况 `CoachWeekOverview`**(`Features/Dashboard/CoachWeekOverview.swift`)
   - 周窗:**周一起算**(`daysFromMonday = (weekday + 5) % 7`),7 天;`isoWeek` 用 `firstWeekday = 2, minimumDaysInFirstWeek = 4` 的 ISO 日历取 `weekOfYear`。
   - **完成态不在取数时固化成 Bool**:`TrainingDay` 只带 `completedLogDates`(与该计划日相差 ≤ **±36 h** 的 completed 日志时间戳),聚合时用同一个 `calendar` 现场判 `isSameDay`。理由:列映射与完成态必须出自同一份日历,否则改时区后列变了、完成态还是旧结论。
   - 行分组:`triageSignals` 非空 → `.attention`;否则本周 completed>0 → `.active`;否则 `.idle`。
   - 格子:该列无计划日 → `.rest`;完成 → `.completed`;日期 < 今天 → `.missed(isAttention)`;否则 `.upcoming`。
   - 汇总完成率 = `round(completed / planned × 100)`,`planned == 0` 时为 0。
3. **待办排序 `CoachTodayTodoList.makeItems`**:固定四段拼接,**不是按时间排的**——① 待反馈视频(全量合成 1 条,副标题取 `uploadedAt` 最早那条的相对时间,tag `coach.today.awaitingFeedback`,gold);② 未读消息(1 条,数值是**未读消息总数**而非会话数——源码标注为「有意的原型偏差」;副标题是未读会话姓名用 ` · ` 连接,tag `coach.today.unread`,danger);③ 每个有 `.notTrained` 信号的学员各 1 条(取 `daysMissed` 最大值,tag `coach.today.needsAttention`,danger,点进该学员会话);④ 新申请(1 条,单条时标题 `singleApplicationTitle` 副标题直接是等待时长,多条时 `multipleApplicationsTitle %lld` + `earliestApplicationSubtitle`,tag `coach.today.newApplication`,gold)。
4. **收件箱排序 `CoachInboxPresentation.rows`**:先把同一学员的多个会话折叠成「`lastMessageAt` 最新」的那个(并列时 `id.uuidString` 大者胜);排序键依次为 `priority`(有待反馈视频 +2、有未读 +1)降序 → `latestActivityAt` 降序(nil 视作 distantPast)→ 姓名 `localizedStandardCompare` 升序 → `studentID.uuidString`。头部计数 `count` = 待反馈视频数 + 折叠后各会话未读数之和(**与 tab badge 同源同值**)。
5. **待反馈视频判定 `AggregatingCoachVideoQueueRepository`**(无专用后端端点,客户端聚合):对每个学员拉视频墙 + 反馈归档,`answeredVideoIDs = feedback.videoID` 集合,`legacyAnsweredExerciseIDs = videoID == nil 的 feedback.planExerciseID` 集合;**只收 `planExerciseID != nil` 的视频**(未挂计划槽位的散片永远无法被反馈摘除,故整条排除),再排除已答 video、已答 legacy exercise。动作名来自该学员当前计划的 `planExerciseID → exercise.name` 映射(拉不到计划则行上只剩时间 + 体积)。最后按 `uploadedAt` 倒序。
6. **相对时间 `CoachStudentFormatting.relativeText(date, now:)`**:`<1h` → `minutesAgo(max(1, s/60))`;`<24h` → `hoursAgo(s/3600)`;否则 `daysAgo(s/86400)`。负数钳到 0。**等待时长 `CoachOnboardingDisplay.waitingText`** 另一套:`<1h` 分钟;`<24h` 且有余分 → `waiting.hoursMinutes` 否则 `waiting.hours`;≥24h → 天。`isExpiringSoon(expiredAt:now:)` = 剩余 ∈ (0, 24h)。
7. **日期/时区**:教练端 `CoachFeatureCalendar` = 公历 + `TimeZone.autoupdatingCurrent`,`startOfDay/endOfDay/isSameDay/dateRange` 全走它。readiness 的 `checkin_date` 用 `CoachStudentFormatting.localDayString`(ISO8601 日历 + `en_US_POSIX` + `yyyy-MM-dd`,**设备本地日,不是 UTC**)。**教练端没有学员端那条 04:00 gym-day 切点**,一律自然日。
8. **详情页周窗 `StudentDetailViewModel.weekStart(for:now:)`**:有计划时 `weekOffset = min(max(0, elapsedDays/7), spanDays/7)`,即"包含今天的那一计划周",周期开始前落第 1 周、最后一天之后停在末周;无计划时 = 今天往前数 6 天。执行日永远铺满 7 天(缺计划日的位置 `planDay = nil`)。日志按 `(planExerciseID 相同 → setIndex,否则 loggedAt)` 排序。
9. **详情页概览统计 `makeOverview`**:`plannedTrainingDays` = 本周有动作的天数;`completedTrainingDays` = 其中 `completedSetCount > 0` 的天数(**注意:一组算完成,不看是否记满**);`latestActivityAt` = 全部日志 `loggedAt` 最大值。
10. **教练端 e1RM 显示规则**:数值与趋势 **100% 用后端 `exercise-stats` 聚合**,客户端不算不回落;显示 0–1 位小数;三项合计 = 三个 family 现值之和(任一缺失就少加,不补 0);`totalProgress = clamp(latestTotal / Σ登记1RM, 0, 1)`;`trend` 的 `new` / `unknown` 一律不画箭头。与学员端 `growth-tab-v2.md` 的本地 e1RM 引擎是**两套口径,禁止互相借用**。
11. **邀请码状态 `InviteCodeStatus.status(of:now:)`**(客户端派生,wire 无 status 列):`revoked_at != nil` → revoked;`single_use` 且 `used_count >= max_uses` → used;有 `expires_at` 且已过 → expired,未过 → `expiringIn(days: max(1, ceil(剩余秒/86400)))`;否则 active。`isDefunct = used | expired | revoked` → 沉到失效段且不可复制。**时钟必须注入,禁止裸 `Date()`。**

## 10. 空 / 错 / 加载态总表(收货时逐条对)

| 位置 | loading | empty | failed | 备注 |
|---|---|---|---|---|
| Dashboard 待办 | 无独立 loading(数据由壳注入,未到就是 0 条) | 无学员 `coach.roster.noStudents` + `noStudentsSubtitle`;有学员无待办 `coach.today.allDone` + `allDoneSubtitle` | 无失败态(壳层静默) | 两种空态图标不同(person.badge.plus gold vs checkmark success) |
| Dashboard 周概况 | 无 | `planned == 0` → `coach.today.noTrainingDaysThisWeek` | 无 | 「看全部学员」恒在 |
| 花名册 | `coach.roster.loadingStudents` spinner | 无学员 `coach.roster.noStudents`;有搜索无匹配 `coach.roster.noMatchingStudents` | 整屏 overlay `coach.roster.loadFailed` + `coach.roster.error.load` | failed 时内容区仍走 `.rows` 分支,overlay 盖在上面 |
| 申请卡资料页 | spinner | — | `coach.applicationProfile.unavailable` + `unavailableSubtitle`,**仍保留 Accept/Ignore** | 空态必须留操作口 |
| StudentDetail 计划卡 | `coach.detail.loading` | `coach.detail.noPlan` + `noPlanSubtitle` | `coach.detail.planLoadFailed` | 四态由 `StudentPlanCardState.resolve` 统一裁决 |
| StudentDetail 主体 | spinner + `coach.detail.loading` | — | `coach.detail.loadFailed` + `coach.studentDetail.error.load` + `coach.detail.pullToRetry` | 下拉重试 |
| Overview readiness | — | `coach.detail.todayNotFiled` + 提醒按钮 | `coach.detail.statusUnavailable` | **未填 ≠ 失败,不许混** |
| Videos 段 | 行内 spinner(仅换短链) | `coach.video.emptyTitle` + `emptySubtitle` | `coach.video.loadFailed` + `coach.video.pullToRetry`;播放失败 banner `coach.video.error.playback` | 视频墙失败**不阻断**详情页其余段 |
| Growth 段 | spinner | `coach.growth.empty`;单卡无数据 `coach.growth.noFamilyData` | `coach.growth.error.load` + `coach.detail.retry` | — |
| Feedback 段 | 随主体 | `coach.feedback.empty` | 随主体 | — |
| 学员资料段 | spinner | — | `coach.detail.profileUnavailable` | 404 与网络错都归 unavailable |
| 收件箱 | `coach.inbox.loading` | `coach.inbox.emptyTitle` + `emptySubtitle` | `coach.inbox.loadFailed` | 只有「行为空」才判 failed,有旧快照就继续显示 |
| 待反馈视频列表 | `coach.inbox.loading` | `coach.videoFeedback.noPendingVideos` + `noPendingVideosSubtitle` | `coach.inbox.loadFailed` | 有内容时 failed 降级为 `.content` |
| 视频工作台 | 播放器内 spinner | — | `coach.videoFeedback.playFailed` + `retry`;`markersLoadFailed` / `markerSaveFailed` / `markerDeleteFailed` / `setInfoLoadFailed` / `setInfoUnavailable` / `sendFailed` / `emptyFeedback` | markers 端点 404(`.unavailable`)→ **整块静默消失**;其它错误 → 保留失败行,不许静默 |
| 邀请码卡 / 页 | `coach.profile.inviteLoading` | `coach.profile.inviteEmpty` / `coach.invites.noPermanentCode` | `coach.profile.inviteFailed` / `coach.invites.operationFailed` | 列表已加载过时,刷新失败保留旧列表 |

## 11. Out of scope / 已知偏差(Android v1)

1. **不复刻**:排计划向导 / xlsx import / per-set rest 编辑(§7,全部不可达);评估期横幅、评估总结编辑器、适应周(§3.2,封印);`FeedbackComposerView`(死代码);`StudentExecutionView`(无调用点,且仍用已废弃的 `Color.MeetPR.bg / fgPrimary` 老 token);`ConversationListView`(仅被不可达的 planning home 用)。
2. **iOS-only 依赖**:`UIHostingController` 版 tab 宿主(RN 用常驻 screen + 显隐即可);`UIPasteboard`(→ `@react-native-clipboard/clipboard`);`fullScreenCover` / `presentationDetents`(→ RN modal + bottom sheet);`ContentUnavailableView`(自绘);`UIApplication.significantTimeChangeNotification`(Android 用 `ACTION_TIMEZONE_CHANGED` / `ACTION_TIME_CHANGED` 或退化成 AppState active 时重算)。
3. **spec 037 的「今日分诊条」在本 commit 并未以独立卡片形态存在**:分诊信号被拆到 ① Dashboard 待办里的 needs-attention 条目 ② 花名册的「异常」分组 + 行内红字原因。学员 tab badge 也只算 `queueViewModel.pendingCount`(申请数),**不含** spec 037 写的 `pendingAttentionCount`。照现状实装,别按 spec 037 的图重做。
4. **两处硬编码 zh locale 的日期格式**(视频墙段标题、资料页 `joinedAt`、反馈主题日期)在 Global 轨是 bug;RN 用设备 locale 的 `MM/dd` / `yyyy/MM/dd`,并把这条记进 gotcha。
5. `StudentDetailViewModel` 构造时传的是 `now: { Date.distantPast }`,所有调用点都显式传 `now`;RN 侧**不要**复制这个空实现,直接把 now 作必填参数。
6. 顺延(shift)相关 UI 在学员端已下线,教练端仍展示 `Adjusted` / `Shifted by N days`;RN 照读照显,**不实现任何写入口**。
7. 「周小结」按钮、资料页「Edit 1RM」按钮、Help 页「联系我们」按钮均为**禁用占位**,必须原样保留禁用态(带 a11y hint),不许接功能也不许删。
8. 教练端**没有** account/注销/改密码/导出入口(学员端才有);MyProfile 只有姓名、邀请码、Help、Privacy、版本、登出六件事。

## 12. DesignSystem 用件清单(教练端实际引用的 token 与组件)

RN 侧应先确认 `src/design/tokens` 里这些名字都在,缺的先补 token 再写屏,别在屏里写死色值。

- **组件**:`MeetPRTabBar` / `MeetPRTabBarItem`(仅底栏)、`PressScaleButtonStyle(scale:)`(0.94 / 0.95 / 0.96 / 0.97 / 0.98 各处不同,照抄)、`meetPRCardSurface(.card|.inset|.modal)`(card = `surfaceCard` 底 + 无描边 + light 下漫射阴影,圆角 `MeetPRRadius.card`;inset = `bgInset` 底 + `surfaceKey` 1px 描边 + 圆角 chip;modal = `surfaceElevated` 底 + `borderDefault` 描边 + 圆角 modal)、`E1RMChart`(高 90)、`SetReadOnlyCell`、`Card`、`PrimaryButton` / `SecondaryButton` / `MeetPRTextField`(**只在接收 sheet 与邀请码页出现**,主线四屏全是手搓 capsule)、ChatUI 的 `FeedbackVideoPlayerView` / `ConversationView` / `VideoBadgeInfo`。
  > 教练端可达路径上**没有** `GoldCTA`、`HeaderChatButton`、`MeetPRMark` 头图、`HoldToCompleteButton`;`StatusBadge` 只出现在死代码(`StudentExecutionView`、`BindRequestCard` —— 后者同样无调用点)与 Planning 里;`ChatEntryButton` / `ConversationListSection` 只被不可达的 planning home 用。
- **颜色**:`bgBase` `bgStack` `bgInset` `surfaceCard` `surfaceElevated` `surfaceKey` `textPrimary` `textSecondary` `textTertiary` `textDisabled` `inkOnCTAFill` `gold500` `success` `danger` `borderHairline` `borderSubtle` `borderDefault` `borderStrong` `videoStageFill` `videoStageBorder`。
- **间距**:`zero/point1/point2/point3/space1(4)/point5/point6/point7/space2(8)/point9/point10/point11/space3(12)/point13/point14/point15/space4(16)/point18/space5(20)/point22/space6(24)/point26/point28/point30/point32/point40/size46/point52/point56`,`pageHorizontal = space5 = 20`,`minimumHitTarget = 44`。
- **圆角**:`micro 4 / inset 10 / control 12 / chip(=control) / card 16 / modal 20 / pill 999`。
- **字体角色**:`.MeetPR.display(size:)`(大标题与数值:38 / 34 / 32 / 30 / 28 / 26 / 22 / 21 / 18)、`.MeetPR.body(size:weight:)`(10–17)、`.MeetPR.mono(size:weight:)`(9.5 / 10 / 11 / 11.5 / 12 / 13 / 14 / 17 / 26)、`.MeetPR.system(size:weight:)`(SF Symbols 图标)。tracking 出现三处:日期条 0.72、1RM 行 0.28、邀请码 `size × 0.14`、收件箱 eyebrow `size × 0.06`。
- **动效**:只有 `PressScaleButtonStyle` 的按压缩放与 `MeetPRMotion.press`(toast 淡入淡出)。装饰动效全线已删(见 memory `motion-purge-spec082`),RN 不要自己加。

## 13. RN 影响面与测试 seam(供拆卡)

- 新增域层(纯函数,先红后绿):
  - `src/domain/coach/triage.ts` — `triageSignals({plan, logs, feedback, now})` + `triageSummaryText`;seam 测:漏练边界(1 天不报 / 2 天报)、7 天窗口首尾、待回复三分支(无日志 / 日志超 3 天 / 有更新反馈)。
  - `src/domain/coach/week-overview.ts` — `makeSummary(rows, now)`;seam 测:周一起算、跨年 ISO 周号、±36h 配对窗、四种格子、完成率取整、图例省略空组。
  - `src/domain/coach/todo-list.ts` — `makeTodoItems({videos, conversations, rows, applications, now})`;seam 测:四段顺序、未读取消息总数而非会话数、单/多申请两种文案分支。
  - `src/domain/coach/inbox.ts` — `inboxRows({conversations, videoGroups, now})` + `inboxCount`;seam 测:同学员多会话折叠、四级排序键、预览优先级、count 与 tab badge 同值。
  - `src/domain/coach/pending-videos.ts` — 待反馈判定(排除无 `planExerciseID`、已答 video、legacy exercise)+ `daySections` 分组;`queue-navigator.ts` — `nextItem` 环形与 `itemAfterSend` 按身份落点(**这条必须有测试**)。
  - `src/domain/coach/invite-code-status.ts` — 注入时钟的五态派生 + `isDefunct`。
  - `src/domain/coach/formatting.ts` — `relativeText` / `waitingText` / `decimalText`(去尾零)/ `oneRMTrio`。
- 新增 API 域:`src/api/domains/coach.ts`(students / bind-requests / invite-codes / exercise-stats)、`students-videos.ts`、`video-markers.ts`、`readiness.ts` 的教练读口。
- 屏:`features/coach/{dashboard,roster,student-detail,receiving,video-feedback,profile,invite-codes}`,外加共享的 `CoachTabShell`(常驻四屏 + 全屏时隐藏底栏)与 `CoachNowProvider`(统一时钟 + 日切重拉花名册)。
- 复用:ChatUI 侧已有的会话组件与视频播放器(W1 视频链已实装的部分),教练工作台只是多挂 markers 层与 set-info 卡。

---

## 附录 A:各屏用到的 i18n key 前缀

| 屏 | 前缀 |
|---|---|
| Tab 外壳 | `coach.shell.*`、`coach.chat.messages` |
| Dashboard | `coach.today.*`(含 `weekday.*`)、`coach.roster.noStudents`/`noStudentsSubtitle`、`coach.shared.relative.*`、`coach.bind.waiting.*` |
| StudentRoster | `coach.roster.*`、`coach.bind.training.*` / `waiting.*` / `gender.*` / `gym.*` / `injury.*` / `weekday.*` / `equipment.*` / `scale.*`、`coach.bind.accept.*`、`coach.bind.error.*`、`coach.bind.accepted*`、`coach.chat.ok`、`coach.common.cancel` |
| 申请资料页 | `coach.applicationProfile.*` |
| StudentDetail 外壳 | `coach.detail.*`(含 `section.*`、`weekday.*`)、`coach.studentDetail.*`、`coach.shared.status.*` / `abnormal.*` |
| Overview 段 | `coach.detail.*`、`coach.shared.readiness.*`、`coach.shared.muscle.*`、`coach.shared.severity.*`、`coach.execution.*` |
| Videos 段 | `coach.video.*` |
| Growth 段 | `coach.growth.*`(`window.*` 当前未用) |
| Feedback 段 | `coach.feedback.recordCount` / `empty` / `videoFeedback` / `writeFromVideo`(其余 `coach.feedback.*` 属死代码 composer) |
| Profile 段(学员资料) | `coach.profile.currentOneRM` / `edit` / `editUnavailable` / `oneRMExplanation` / `registrationAnswers` / `basicInfo` / `weightClass` / `trainingHistory` / `trainingEnvironment` / `targetMeet` / `focus` / `injuryHistory` / `diet` / `studentSaid` / `joinedAt` / `notProvided` / `age` / `weeklyFrequency` |
| Receiving 收件箱 | `coach.inbox.*` |
| 待反馈视频列表 + 工作台 | `coach.videoFeedback.*`、`coach.video.*`(a11y id) |
| Chat | `coach.chat.*` |
| MyProfile | `coach.profile.*`(title/fallbackName/permanentInvite/copy/copied/invite*/general/help*/privacy*/appVersion*/internalBeta/logout*/contact*/userAgreement/privacyPolicy/documentDate/studentData*/faq.*) |
| 邀请码页 | `coach.invites.*` |
| 已封存 / 不可达 | `coach.evaluation.*`、`coach.planning.*`、`coach.workspace.*`、`coach.import.*` |

## 附录 B:wire 枚举(字面值照抄)

| 枚举 | 值 | 出处 |
|---|---|---|
| `UserRole` | `coach` / `coached_student` / `self_train_student` | `CoreModels/Enums/UserRole.swift` |
| `CoachStudentSummaryDTO.status` | `active` / `in_evaluation`(字符串,缺省读作 `active`) | `Networking/DTO/CoachStudentDTOs.swift` |
| `BindRequestStatus` | `pending` / `accepted` / `rejected` / `expired` / `cancelled` | `Enums/BindRequestStatus.swift` |
| bind 队列错误 machine code | `BIND_REQUEST_NOT_FOUND` / `BIND_REQUEST_EXPIRED` / `BIND_REQUEST_NOT_PENDING` / `BIND_ALREADY_BOUND` | `RepositoryContracts/CoachBindQueueRepository.swift` |
| `InviteCodeType` | `personal_permanent` / `single_use` / `time_limited` | `Enums/InviteCodeType.swift` |
| `VideoMarkerLevel` | `info` / `warn` / `bad`(**UI 恒发 `info`**) | `Entities/VideoMarker.swift` |
| e1RM `trend`(wire) | `up` / `flat` / `down` / `new`(其余归 `unknown(raw)`) | `Networking/DTO/ExerciseStatsDTOs.swift` |
| `LiftFamily` | `squat` / `bench` / `deadlift` | `Enums/LiftFamily.swift` |
| `PlanStatus` | `draft` / `published` / `completed` / `paused` | `Enums/PlanStatus.swift` |
| `PlanKind` | `regular` / `adaptation` | `Enums/PlanKind.swift` |
| `Gender` | `male` / `female` / `other` | `Enums/Gender.swift` |
| `GymTier` | `home_with_rack` / `commercial` / `professional` | `Enums/GymTier.swift` |
| `SquatStance` | `high_bar` / `low_bar` | `Enums/SquatStance.swift` |
| `DeadliftStance` | `conventional` / `sumo` / `both` | `Enums/DeadliftStance.swift` |
| `BenchGrip` | `narrow` / `standard` / `wide` | `Enums/BenchGrip.swift` |
| `InjuryArea` | `shoulder` / `elbow` / `wrist` / `lower_back` / `hip` / `knee` / `ankle` / `other` | `Enums/InjuryArea.swift` |
| `TrainingDay` | `mon`…`sun` | `Enums/TrainingDay.swift` |
| `MuscleGroup`(readiness 白名单 8 项) | `quad` / `hamstring` / `glute` / `back` / `chest` / `shoulder` / `triceps` / `core`(全集另有 `biceps`/`forearm`/`hip`/`hip_flexor`/`adductor`/`calf`/`tibialis`/`trap`/`mobility`/`cardio`/`grip`) | `Enums/MuscleGroup.swift`、`ReadinessCheckin.allowedMuscleGroups` |
| 器械 token(资料展示用) | `barbell_dumbbell` `squat_bench_rack` `pullup_bar` `db_max_20` `db_max_40` `db_max_40_plus` `smith_machine` `cable_crossover` `lat_pulldown` `leg_press_machine` `leg_curl_extension` `seated_row` `landmine` `seal_row` `hack_squat` `power_bar_stiff` `deadlift_bar` `safety_bar` `fractional_plates` `lifting_platform` `rack_pins_blocks` `chains_bands` `ghr` `belt_squat` + 退役 `reverse_hyper` `heavy_dumbbells` `blocks_chains_bands` `cable_lat_pulldown`;**未知 token 原样透出,不许静默丢弃** | `Features/BindQueue/CoachOnboardingDisplay.swift` |
| 埋点 screen | `dashboard` / `coach_roster` / `coach_student_detail` / `coach_receiving` / `account` | `Analytics/AnalyticsTypes.swift` |
| 埋点 `coach_feedback.kind` | `text` / `video` | 同上 |
| 埋点 `coach_intake_action`(`CoachIntakeStage`) | `request_seen` / `accepted_eval` / `accepted_skip` / `rejected`(封存期实际只会产出 `accepted_skip` 与 `rejected`) | 同上 |
| 埋点 funnel 名 | `coach_intake` / `coach_feedback` | 同上 |
