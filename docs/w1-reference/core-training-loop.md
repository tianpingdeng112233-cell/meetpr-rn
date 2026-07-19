# 学员端核心训练环参照包 A(RN Android W1)

> 源:MeetPR-release @3799f67,2026-07-19 只读侦察。行号为快照。文案照抄,实装 1:1 用。

## 0. 结构总览与死代码警告

- 4 tab:今日=Dashboard;训练=TodayWorkout;成长=TrainingHistory;我的=MyProfile。**WeekOverview 无独立屏**(仅 ViewModel,被 Dashboard 消费);**Readiness 无独立 tab**(训练 tab 的 sheet)。
- 跨 tab 同步 token:todayReloadToken(切回今日)/trainingJumpToken(CTA 跳训练)/planRevision(顺延后)/importedHistoryRefreshToken。
- **死代码勿实装**:ExerciseExecutionView/SetRecordRow/WorkoutDayHeader/PlateMathSheet/ProgressDashboardView/E1RMMiniTrendCard/DayDetailView。活的录入=TodayWorkoutView 内联表格+SetEntrySheet;历史详情=HistoryEntriesView。

## 1. TodayWorkout(训练 tab)

### 结构
NavigationStack:顶部 **TrainingCalendarView**(周/月分段切换的日历卡:选中=红描边+红软底,今天=绿描边,状态圆点=notStarted 红/partial 琥珀/complete 绿/noPlan 灰)→ 主体按 state:loading 转圈 / rest=空态「今日休息|这天休息」+副「看本周计划」/ error=「加载失败」/ loaded|recording=workout 体:
- 非今日只读横幅:过去「历史记录 · 不可修改」,未来「未到训练日 · 仅预览」
- **活动组 Hero 卡**(首个未完成组):大字重量/次数/RPE + 教练备注 pill +「记录此组」
- **动作分组表卡**:表头 `# 重量 次数 RPE`;行状态标记 ✓绿/✗琥珀(失败)/○灰;参考行「上次 {w}kg×{r} · 最佳 {w}kg×{r}」;无活动组时教练备注 pill 移到表卡
- **完成控件**:全组完成且已回顾→DayCompletionBanner「今日训练完成 · N 组」+「查看回顾」;可编辑未回顾→SlideToCompleteButton「滑动完成今日训练」(拖过 85% 触发)→ SessionSummaryView
- 导航栏:标题 `W{n}D{n} · {主项}`(无解析「锻炼」);右上 心形(readiness,填过=实心绿)+ 刷新

### 状态机
State:idle/loading/loaded(plan,drafts)/recording(...,rowIndex)/rest/error。loaded 与 recording 同一渲染分支(防 sheet 被拆栈重置)。loadGeneration 防切日竞态;持久化任务链保序。无下拉刷新无分页。draft=计划 day×已有 log 合成。

### SetEntrySheet(组录入)
- 结构:navBar「{动作} · 第 N 组」+返回 → (非配件)PlateLoadout 杠铃图+明细+「上赛扣」→ 重量 stepper「± 2.5」→ 次数「± 1」→ RPE tick scale「5–10 · 0.5」→ 视频块 → footer「完成本组」(实底)/「未完成 / 失败」(ghost)。
- 字段绑 String,save 时 parse;seed 按稳定 setID 取活 draft(防 sheet 重建回退)。
- 保存链:收键盘→syncDraftEdits→commitSet(failed:)→埋点 set_logged→dismiss。
- 失败=独立状态(✗),无删除;重开行可改;toggleComplete 可反选。
- 保存错误 alert「保存失败」/「知道了」:401「登录已过期,请重新登录」;计划变更「训练计划已更新,请刷新训练页后重新记录。你的输入仍保留在本页。」;5xx「服务器暂时无法保存({code}),请稍后重试。…」;其它「记录没有保存,请重试。…」。

### RPE 建议重量(仅 prescribed 无重量且有 rpe+reps 时)
- 主项:优先同日同处方(同 reps+rpe)已完成前组重量(标「建议 · 同上组」);否则 `E1RM × rtsIntensity` 向下取整 2.5(+1e-6 再 floor)(标「建议 · 基于 e1RM {v}」)。
- 变式/配件:同日最近完成组;否则 84 天窗最近重量(标「建议 · 上次重量」)。**从不做 e1RM 数学**。
- 用户改重量即清建议。

### RIR 白话表(RPE→文案,照抄)
5.0 还能多做 5 次 / 5.5 还能多做 4-5 次 / 6.0 还能多做 4 次 / 6.5 还能多做 3-4 次 / 7.0 还能多做 3 次 / 7.5 还能多做 2-3 次 / 8.0 还能多做 2 次 / 8.5 还能多做 1-2 次 / 9.0 还能多做 1 次 / 9.5 或许还能多做 1 次 / 10.0 力竭,无保留。
- 控件:11 格 tick(5.0-10.0 步 0.5);拖动中显「松开确认」;bar 高 选中40/整数26/半格16;竖拖判滚动。

### Rest timer(spec 030/055)
- 触发:一组未完成→完成,且当日仍有未完成组。
- 时长优先:处方 rest_seconds → 学员固定偏好 → **RestDefaults 权威表:rpe nil→180 / <7→120 / <9→180 / ≥9→240**(注释里 ≤6.5 措辞不准,以实现为准)。
- overlay 底部驻留,挂钟驱动(后台准),「-30s / 跳过 / +30s」clamp 0-900;剩 0「休息结束 💪」+haptic+3s 自动关。
- 首次触发弹说明卡(medium,不可交互关):「休息时间会自动匹配」/「按你记录的 RPE 自动匹配:RPE 低于 7 为 2 分钟,7 至 9 以下为 3 分钟,9 及以上为 4 分钟。」/「教练指定过休息时长的组,会按教练设定。」/「可在「我的 → 组间休息」修改默认行为。」/「知道了」。

### collar(赛扣)与杠铃图
- 「上赛扣」胶囊;bar=20,collar=2.5/侧;perSide=(total-20)/2-(on?2.5:0);明细「空杠 20kg」/「仅 2.5kg 赛扣」/「{片} + 2.5kg 赛扣」。
- 持久化 per-student key `setEntry.collarOn.{uuid}`(⚠️曾全局 key 串号,已修——安卓照 per-student)。

### 视频块(接参照包 C §4)
- 组行内指示器:恒 video 图标只变色(未附灰/上传中按进度扫/成功绿/失败红);失败点击→对话框「视频上传失败」「重试上传/删除视频/取消」「视频仍保存在本机,可直接重试上传。」。

### 回顾(SessionSummaryView)
「训练回顾」/「完成」;「今日训练完成」;总览卡(完成组数/总次数/总容量/平均 RPE);「动作表现」「最重组」;「训练反思」+「仅自己可见的训练笔记,保存在本机」(🔒,存本机);三问:「本次目标」(这次训练你想达成什么?)/「做到了什么」(这次训练有哪些收获?)/「可以更好」(哪里还能做得更好?)。完成→markReviewCompleted(本地 SessionReviewStore)+workout_log_save 埋点。

### PR 横幅与 PR 银行
- PRBanner:「🎉 今天你的{动作} e1RM 突破!」+「{new} kg(此前 {prev} kg)」或「{new} kg,第一个纪录点」;3s 自动关。
- 未确认 PR:进训练 tab 1.5s 后重现横幅;计入「我的」tab badge。

### 公式与常量(集中常量文件,勿散落硬编码)
- **RTS 强度表**:reps1-12 × RPE6.0-10.0(0.5 步);reps1-4 斜率-4%/rep,5+ -2%/rep;RPE 轴线性插值,reps 不插值。
- **e1RM**:reps<1|weight≤0|rpe>10→nil;rpe≥6→weight/rtsIntensity(reps clamp12,intensity≤0.5→nil);rpe nil 或<6→Epley weight×(1+reps/30)(reps>20→nil)。
- **建议反解**:reps1-12、rpe5.0-10.0;5.0-5.5 用首列半步斜率外推。
- **E1RMPolicy**:minEligibleRPE 7.0/maxReps 10(deadlift 5)/rolling 28d/minPR 0.5kg/noiseBand 3%(取 max(0.5, prev×0.03))/softJump 10%/hardJump 18%。eligibility:completed&&!failed;rpe<7 剔;reps>10 剔(硬拉>5 剔);rpe nil 合格。
- gym-day 04:00 切日(isEditable=同 gym-day);lastWeight 回看 84 天;RPE snap round(v*2)/2 clamp[5,10];小数逗号归一为点。

## 2. Dashboard(今日 tab)

### 结构(ScrollView,隐藏导航栏,下拉刷新)
`W{n}D{n}` 大标题(36pt heavy)+通知铃(未读 bell.badge+红点)→ 评估完成卡(未读时)→ 周进度条(ProgressSegments,每训练日一段=完成占比)→ 今日反馈卡(有最新反馈时)→「本周」+周格(一~日 7 格,训练日显 S/B/D 首字母,完成日右上红三角)→ liftCard(选中日主项 e1RM 曲线,NavigationLink→GrowthCurveView)→ 开始 CTA → 资料指标(体重/距比赛 N 天)。
- 组合 5 个 VM,区块独立降级无全屏 error;切回今日 tab 全量 reload。

### ⚠️ e1RM 头条口径(实际实现,1:1 照抄代码而非 spec 文字)
- 渲染大数字 = **全时最佳「可信」记录(records.last)**;chart 线 = 90 天窗 PR 记录阶梯轨迹(chartWindowDays=90)。
- 28 天滚动窗口只决定周期标签:记录早于 28 天→「历史最佳」,否则「90 天」。
- rolling smoothed 序列只在 MyProfile 成长曲线用;Dashboard/成长全走记录投影。
- (与 spec 050 字面偏差已另行上报 David 分诊;安卓端先照代码。)
- delta=90 天窗记录轨迹 last−first;色:>0 绿/<0 红/=0 次要;格式「+{v} KG」「−{v} KG」。

### 开始 CTA
complete→「今日已完成 · 查看」;partial→「继续 W{n}D{n} · {lift}」;else→「开始 …」;noPlan→「今日休息」(非按钮)。点击设 trainingJumpToken 切训练 tab。

### 顺延(spec 054,UI 全在 Dashboard)
- 显示「今天有事」条件:计划可顺延 && 今日 notStarted && 今日==**UTC 今天** && 今日无 log。(⚠️UTC 日历判定,中国 0-8 点会出现「顺延的今天」≠「gym-day 今天」——照抄。)
- 确认 alert:「把整份计划往后顺延一天?」+ 消息「今天的{课名}课改到明天,之后的课依次顺延,本周期结束日变为{日期}」+「确认顺延/取消」。成功后 bump planRevision 重载。累计≥3 天提示「已累计顺延 N 天,建议联系教练调整计划」。
- 同日可撤:「撤销顺延」→「撤销顺延?」/「课程会回到{日期}。」/「撤销顺延」(destructive)/「保留顺延」。
- 错误文案(409 映射):PLAN_NOT_ACTIVE「当前计划未生效,暂时不能顺延」/SHIFT_ONLY_TODAY「只能顺延今天的训练」/ALREADY_STARTED「今天的训练已经开始,不能顺延或撤销」/NOT_PLAN_STUDENT「只有计划所属学员可以顺延」/NO_ACTIVE_SHIFT「当前没有可撤销的顺延」/UNDO_WINDOW_PASSED「只能在顺延当天撤销,请联系教练调整计划」/不支持「当前计划暂不支持顺延」/网络「顺延失败,请检查网络后重试」「撤销顺延失败,请检查网络后重试」;结果 alert「顺延成功/无法顺延/无法撤销/知道了」。

### 其它文案
- liftCard 空态:「成长曲线」「选中训练日查看对应成长曲线」/「练几次就有趋势了」;有数据「{lift} E1RM · {90 天|历史最佳}」+ footer「选中 {周几} · {names}日」。
- 反馈卡/通知中心文案见参照包 C §3。
- 资料指标:「体重/资料档案」「距比赛/{n} 天」(isCompeting&&日期&&≥0,本地日差)。
- 周格 mondayOffset=(weekday+5)%7。

## 3. WeekOverview(仅 ViewModel)
- state idle/loading/loaded(days,logs,weekIndex)/error;整 cycle 拉取后按 [start+(week-1)*7, +7) UTC 窗滤本周;顺延后经 planRevision 触发重载,无自有 UI。

## 4. TrainingHistory(成长 tab)

### 结构(隐藏导航栏,下拉刷新=导入回填+重载)
「成长」大标题 → PR 横幅(未确认 PR,trophy)「新 e1RM PR · {今天|日期}」「{family|三大项} e1RM 突破 {v} KG」→ 白话句「E1RM = 用你完成的组数估算的单次最大重量」→ 三主项曲线卡(E1RMChart 高 140;口径与 Dashboard 同源=记录轨迹;低置信度散点叠加)→「教练反馈记录」列表(行=「{周几} · {family}」+未读点+日期;点开详情即已读)→「全部历史」统计三格(训练次数=distinct completed&&!assumed 日/训练周/三大项合计=SBD e1RM 和,不齐显 —)→「全部训练历史」「按周 / 月查看 · 含每组数据」→ HistoryEntriesView →「容量 / 强度」图。
- state idle/loading/loaded(weeks,logs)/error(「加载失败」+「重试」);周桶按 startDate elapsed/7。

### HistoryEntriesView(详细历史)
「训练历史」;顶部「按动作筛选」Picker(「全部动作」/各动作);按「第 N 周」→日卡(日期+「{done}/{total} 组」绿/琥珀)→动作块(名+教练备注 pill+各组行「第 N 组」);「休息日」。

### 容量/强度图
completed&&!assumed;volume=Σw×r;avgRPE=有 rpe 组均值;周桶 yearForWeekOfYear;Bar(brandRed 0.32)+RPE 线点(绿,归一 rpe/10×scale,scale=max(maxVol×1.15,100));空态「还没有训练记录」/「完成训练后会显示每周容量和平均 RPE」;图例「训练容量 kg」「平均 RPE」。

## 5. Readiness(训练 tab sheet,2 步)

- 打开:训练页右上心形。标题「今日状态 {n}/2」;左上「跳过」;large detent 不可下拉关。
- Step1 三条 1-5 圆点量表(全填才「下一步」):「昨晚睡得怎么样?」很差↔很好/「今天状态如何?」很糟↔很棒/「今天压力大吗?」压力爆表↔很轻松(仅文案反转,5=最放松)。
- Step2:「今天哪些肌群还累?」「点一下:轻 → 中 → 重 → 取消。不累可以直接完成。」8 芯片(股四/腘绳/臀/背/胸/肩/肱三头/核心·下背)点击循环 轻→中→重→取消;「上一步」+「完成/提交中…」。
- Gate:unknown/needed/done/skippedToday。**全程 opt-in 绝不自动弹**(2026-07-11 拍板);skip 记 per-day key。提交成功关 sheet,心形变实心绿;失败留 sheet 显「提交失败,请重试」;「请先完成三项状态评分」。
- checkin_date=设备本地日 yyyy-MM-dd。

## 附:通用状态色与组件映射
notStarted=brandRed/partial=amber/complete=green/noPlan=灰。复用件:PlateLoadout/ProgressSegments/Sparkline/E1RMChart/CoachNotePill/FlowChips。

## 缺口/风险(事实)
1. e1RM 头条口径代码≠spec 050 字面(照代码,已上报分诊)。
2. RestTimerPolicy 注释与 RestDefaults 实现措辞不一致,以实现(<7→120)为准。
3. 死代码清单见 §0。
