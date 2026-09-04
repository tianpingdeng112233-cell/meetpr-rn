# 学员端核心训练环参照包 v2(iOS `release/1.0` @ 202e95db,推进制 / 六形态强度 / 设备时区)

> ⚖️2026-09-04 重 pin 基线后重写。**取代 `core-training-loop.md` 中 §1「日历/顺延/今天匹配」、§2「Dashboard 顺延/休息日」两块**;其余(SetEntrySheet 录入、RPE 建议、RIR 白话、rest timer、赛扣、回顾、PR 横幅、e1RM 常量)仍以 v1 为准,本文只写变了的部分。文案 key 全部指 `docs/w0-reference/i18n/StudentKit.json`(`student.` 前缀省略),实装用 `t(key)`,不抄字面量。
> 源文件:StudentKit/Features/{Dashboard,TodayWorkout};CoreModels `StudentPlanView.swift`(`StudentPlanSequence`);specs 071/072/034 §9.4;backend `routes/plans/serialization.ts`。

## 0. 一句话
训练日不再绑日历。学员按 **W1D1 → W1D2 → …** 顺序推进:**游标日** = 当前计划内第一个 `completed_at == null` 的训练日;练完一天 → 长按结算 → 下一次打开就是下一天;教练排期只剩「推荐日期」纯展示。**顺延(shift)UI 整体下线,「休息日」「漏课/missed」概念删除**。

## 1. 数据契约(RN `src/api/domains/plans.ts` 需补的字段与端点)

`GET /plans/:id`(PlanWithChildrenResponse)新增/需消费:
| 层 | 字段 | 类型 | 用途 |
|---|---|---|---|
| plan | `published_at` | string \| null | 「当前计划」选择:published 计划中 `published_at` 最大者(tie:created_at、id) |
| plan | `anchor_weekday` | 1–7 \| null | 推荐日期推导:非 null → D1 = start_date 起(含)第一个 weekday==anchor 的日期;null → D1 = start_date |
| day | `completed_at` | ISO \| null | 游标判定唯一依据;客户端**不得**用 logs 反推完成态当调度依据 |
| day | `completion_source` | `manual` \| `auto` \| `backfill` \| null | 展示用 |
| day | `shifted_to_date` `total_shift_days` `latest_shift_created_at` | 保留 | **读入但不消费**(老包冻结期) |
| set | `load_mode` | `pct`/`rpe`/`rir`/`weight_range`/`rpe_range`/`fixed_weight` \| null | null = legacy 行,按 `intensity_mode`+`target_value` 解 |
| set | `pct_anchor` | `registered_1rm` \| `e1rm` \| `top_set`(以 backend schema 为准现场核) | % 锚 |
| set | `target_pct` `target_rpe` `rpe_low` `rpe_high` `weight_low` `weight_high` `target_weight` | string(".1"/".2") \| null | ⚠️ `rir_target` 是唯一 **number** |

- **`load_mode != null` 时不得信任 `intensity_mode`/`target_value`**(有损投影);legacy 行保持现状路径。
- 推荐日期 = `start_date + (week-1)*7 + (day_of_week-1)`(UTC gregorian,同 `PlanCalendarDayIdentity.utcCalendar`),不叠加 shift。
- 排序正典 `StudentPlanSequence.precedes`:`(week_number, day_of_week, sort_order, id.uuidString)` 升序。`cursorDay` = 第一个 `completed_at == null`;`day(after:)` = 序列下一项。
- 结算:`POST /plans/days/:dayId/complete` → 200 `{ id, plan_day_id, student_id, source, completed_at }`(幂等);错误 403 `NOT_PLAN_STUDENT`、409 `PLAN_NOT_ACTIVE`。撤销 `DELETE /plans/days/:dayId/complete` → 204;错误 `UNDO_WINDOW_PASSED`「只能在当天撤销」、`NOT_LATEST_COMPLETION`「只能撤销最近完成的一天」、`NO_COMPLETION_TO_UNDO`(幂等收敛,刷新不弹错)。通用失败文案 `todayWorkoutViewModel.copy001/002`。
- logs 拉取:按**当前计划全周期**一次拉(`scope=plan`,范围 = 全周期推荐日期 pad 1 天),不再按当周日期窗。
- 计划缓存(若有 projection 缓存)必须 bump schema 版本:旧缓存缺 `completed_at` 会把游标算错。
- **删**:`POST/DELETE /plans/:id/shift` 客户端调用、`ShiftPlanResponse`、顺延 mutation hooks。

## 2. 时间口径(spec 042/R6,`WorkoutDatePolicy`)
- **gym-day**:设备时区 + 墙钟 04:00 切点(`gymDayToday(now)`:04:00 前算前一天;`gymDayRange`/`dayRange` 起于 04:00)。用途只剩:日志时间戳归桶、`completedToday` 判定、撤销窗口、set-ref 分享「当日」。**游标与时钟无关**。
- 删 `Asia/Shanghai` 与 UTC 「今天」口径;`headerDateText` 用设备日历(`.current`)。
- 回前台/切回训练 tab 自动重拉计划:`StudentTodayRefreshThrottle` 25 s 节流(`full` vs `volatileOnly`),记录中不打断、草稿不丢。

## 3. Dashboard(今日 tab,`DashboardTodayScreen`)自上而下
1. **Header**:`MeetPRMark.header`(97×24)+ 日期 mono 12 tracking 0.72 textMuted(`dashboardTodayPresentation.copy004` = "{M月D日} · 星期{一}",每分钟刷新)→ 第二行:**W#D# 大字 display 54**(浮雕仅 dark 装饰,不移植)+ 可选状态胶囊(mono 12 bold,surfaceElevated 底 + borderStrong 边):`copy005` 编排中(无训练日)/ `copy006` 休息日(游标日零动作)/ `copy002` 已完成(无游标 = 周期完成);右侧 `HeaderChatButton`(未读数)→ 下方 **周进度条**(高 4,segments = 当前周各天,current 段宽 1.5×,gap 5)。无训练日时 headline = `dashboardTodayScreen.copy001` 今日。
2. `weekContentState`:initial/loading → 骨架;failed → `DashboardInlineFailureCard(message, retry)`;loaded 且无训练日 → `DashboardPlanWaitingState` + 资料指标;loaded → 下列 3–8。
3. **反馈卡** `DashboardFeedbackCard`(items/pending/coachName,可展开)—沿 v1 反馈段,数据源不变。
4. **周历条** `DashboardWeekCalendar(weekNumber, cells)`:标题行「本周进度 `copy012` + `已完成/总数` mono」+ 右侧「📅 教练推荐日期 `copy014`」;格子 = 当前周各天:状态图标(done ✓ success / current ● gold500 7pt / upcoming ○ textGhost)+ `D#` mono 10 + 推荐日期 `M/D 周X` mono 10;底色 done surfaceCard / current gold@0.12 + 1.5 gold 边 / upcoming bgInset;radius 12;minHeight 58。**格子身份 = 序数,不按日期反查**。
5. **游标日摘要** `DashboardSequenceDaySummary`(仅 completedToday 为空时):dayName body bold 16(主项全名列表 + 「日」,如「深蹲卧推日」;三项 → 「蹲·推·拉」;无主项 → 训练日 `copy002`)/ `copy003` "{N} 个动作 · {M} 组" mono 12 / `dashboardPrimaryAction.copy009` "教练推荐 {M月D日}" body 12 textDim。
6. 资料指标 `DashboardProfileMetricsView`(体重/资料档案,沿 v1)。
7. e1RM rail:标题 `dashboardTodayScreen.copy003` 本节 · E1RM 曲线(mono 12)+ 该日主项的趋势行。
8. **action**:游标为空 → `DashboardCycleCompletedAction`(🏆 gold500 34 / `copy006` "{N} 周计划已全部完成" body bold 18 / `copy007` "W1 – W{N} · 共 {M} 节" mono 12 / `copy008` 说明);completedToday 存在 → `DashboardCompletedAction`(✓ success 34 / `copy002` "{W#D#} 已完成" / 可撤销时下划线小字 `copy003` 撤销完成 · 仅限今天 / 下一节预览卡 bgInset:`copy004` "下一节 · {W#D#}" mono 12 gold + 摘要 / 次级按钮 `copy005` 继续下一节 capsule borderStrong minHeight 46)。
9. **吸底 CTA**(`safeAreaInset(.bottom)`,bgBase 底 + 顶 1px borderSubtle,padding h20 t10 b8):`GoldCTA(copy001 开始训练, sub: dayName, icon: .play)`;仅 `stickyStartDay` 非空(今日未完成且有游标)。点击 → 训练 tab 交棒 **dayID**(`TodayWorkoutPlanHandoff(plan, dayID, existingLogs)`),不再交日期。
- `completedToday` = 序列中最后一个 `completed_at` 落在当前 gym-day 范围内的天。
- `isAwaitingNextPlan` 改为「全部训练日已完成 或 存在更新的 published 计划」。

## 4. 训练 tab(`TodayWorkoutScreen`)
- 选中态 `selectedDayID`(不是日期);初始/「回到今天」= 游标日 ID(无游标 → 最后一天)。
- `TodayWorkoutDayState`:`completed(canUndo)` / `current` / `upcoming(previousDay)`;**`isEditable` 仅 current**。
- **顶部序列提示** `TodayWorkoutSequenceNotice`(非 current 时显示,控件圆角 12 + borderSubtle):completed → ✓ `copy024` 已完成 · 不可修改 + 右侧 `copy023` 撤销完成(canUndo 时);upcoming → 👁 `copy026` 未轮到 · 仅预览 + 第二行 `trainingCalendarLogic.copy012` "练完 W{n} · {dayName} 后自动轮到这一节。";current 不显示(标题 `copy025` 仅 a11y)。
- **区块顺序固定**:「今日训练」置顶,周编排列表在下;当前周默认展开。
- **Hero**(左侧 3pt 金色竖渐变条 gold300→500,bgInset 底,右侧圆角 16 + borderStrong 边)两态互斥:
  - `list`(未开始态 = 零组真实记录且未点开始):`TodayWorkoutActionSummary`(`copy017` 今日训练 / `copy018`+`copy019` "共 N 个动作 · M 组" / 每动作一行 `copy020` "{处方} × {次} · {组} 组")+ 可编辑时 `GoldCTA(copy008 开始第一组, sub nil, icon none)`。
  - `recording`(已开始 = 点过开始第一组 或 ≥1 组真实记录(含失败,不含 assumed)或该日已完成):当前动作名 display 22 + 当前组大卡(重量大数字 / 强度锚文本,见 §5)+ `todayWorkoutPresentation.copy002+003` "第 i / n 组 · 动作 a / b" + 上次/最佳 `copy004/005` + 「记录此组」`copy015` / 「记录本组视频」`copy016` + 右上「问教练」角标(有 chat 时)。
  - 一旦已开始,重进(含冷启)直接恢复 recording,不回汇总卡。
- **分动作组表** `TodayWorkoutExerciseList` 仅 recording 态渲染(可折叠;行 = `SetRow` v1 规格 + 视频指示)。
- **完成区** `completionContent`:completed → `DayCompletionBanner`(`dayCompletionBanner.copy001` "今日训练完成 · {N} 组" + `copy002` 查看回顾 → 回顾页);editable 且 `allowsManualCompletion`(= recording 且有 ≥1 组非 assumed 真实记录)→ 未全记满时 `TodayWorkoutRemainingPill`(⏱ + `todayWorkoutPresentation.copy001` "还有 {n} 个动作 · {m} 组未记录",虚线 capsule borderStrong)+ **`HoldToCompleteButton`**。
- **长按结算** `HoldToCompleteButton`:文案 `copy021` "长按 · 完成今日训练"(a11y `copy022`);轨 holdTrack,填充 goldGradientStart→gold400 横向按 progress 增长;按住 ~1.2 s(以 iOS 常量为准,现场核 `HoldToCompleteButton.holdDuration`)期间进度填充 + 分级触感;手指移出边界或提前松手 → 进度回弹 + 取消反馈,**不得静默**;达时 → `onComplete`。状态机 `HoldToCompleteGestureState`:idle → holding(begin)→ 移出:cancelledUntilEnded(cancel)/ 达时:completedUntilEnded(complete)→ 松手 reset。安卓用 `Pressable` onPressIn/onPressOut + 计时器 + Reanimated-free 的 `Animated` 即可,加 `Vibration`?否——安卓不自造震动(与 G0-a 口径一致),视觉回弹为主。
- **0 组不可结算**(无「跳过这天」);记满全部处方组后 pill 消失、按钮保持。
- 完成后:`completeCurrentDay` → 乐观替换该日 `completed_at` → 游标推进 → Dashboard/训练 tab 双端切态(`completionRevision`);同 gym-day 内 Dashboard 出「已完成 + 继续下一节」,训练 tab 顶部出 completed 提示 + 撤销。撤销 `undoCurrentDayCompletion`。
- 未来日(upcoming)只读预览:hero list 态无 CTA;已完成日只读:组表可见,行不可编辑。
- 无计划:`TodayWorkoutPlanUnavailableCard`(`copy002` 第一周计划还没生效 / `copy003` "{教练}确认你的基线后…" / `copy004` 看看教练发来的消息 / `copy005` 刷新)。错误:`copy001` 加载失败 + message。

### 4.1 周编排列表(`TrainingCalendarView`,取代周/月日历)
- 标题行:`trainingCalendarView.copy001` 计划汇总 mono 12 textSecondary + 右 `copy002` "已完成 {x} / {y} 节" mono 11 textMuted。
- 只列 **当前周及之后**(`weeksFromCurrent`);每周一节:**周头**(bgStack 底、1px borderHairline、圆角 12、minHeight 44):`W#` display 13 textSecondary + 当前周时 `copy006` 本周 胶囊(mono 10 bold goldText,gold@0.14 底)+ 周摘要(各天 dayName 用「 · 」连)body 13 textMuted 单行 + meta(当前周 `copy003` "{done} / {n} 节";其它 `copy005` "{n} 节 · {M/D} 起";空 `copy004`)+ chevron(展开旋 90°)。点击折叠/展开;当前周默认展开。
- **行**(白卡 surfaceCard 圆角 14,内 padding h13,行 v10):左 `D#` mono 12 圆 32(current:gold500 字 + gold@0.12 底;其它 textPrimary + bgInset 底)→ dayName body bold 13(`trainingCalendarLogic.copy009/010/011`:无主项「训练日」/ 三项「SBD 日」/ 否则「蹲推日」形制 = 主项短名连写 + 「日」)+ `copy013` "{n} 个动作 · {m} 组" mono 10 + `copy008` "教练推荐 {M}/{D} {周X}" body 10 textDim → 右侧状态:completed ✓ circle success / current ● gold 8 / upcoming ○ textGhost 8;选中行底 gold@0.08。点击 → `selectedDayID`。
- **删**:`.missed` 红点态、日期网格、月视图、「今天」按日期反查。

## 5. 六形态强度(spec 072)+ % 锚(034 §9.4)——录入与渲染
- 解码见 §1。`PrescribedSet` 拆为 `weightKg?` + `intensity?`(`.pct(x)` / `.rpe(x)` / `.rir(n)` / `.rpeRange(lo,hi)` / `.weightRange(lo,hi)`;legacy rpe 行归 `.rpe`)+ `percentageAnchor?` + `loadMode?`。
- **文本格式 `StudentFormatting.prescribed`**(legacy 行:`{w}kg x {reps}`,连字符;新形式用 `×` 与 en dash):`weightRange` → `165–175kg × 5`;`pct` + 解析结果 → `{百分比展示} × 5`;有 `weightKg` → `170kg × 5` (+ ` @{强度}` 双锚);仅强度 → `RPE 8–9 × 5` / `RIR 2 × 5` / `72.5% × 5`;都无 → `× 5`。**禁止出现 `-kg x 5` 与 `目标 RPE 0/10`**。
- Hero 大数字:有记录重量 → 重量;否则 prescriptionDisplay(fixed/target_weight)→ 重量;否则 % 已解析 → `{解析 kg}`(`todayWorkoutTypes.copy019`)+ 副行 `{pct}% · 1RM/e1RM/顶组`(`copy014/015/016`);否则强度锚文本;单位「kg」只在有重量时显示;副标签 `todayWorkoutScreen.copy027` 目标强度。
- **建议引擎门控** `weightSuggestionOutcome`:目标行已有 `weightKg` → 不给建议;`.pct` → `PctAnchorResolver`(见下);`.rir` / `.rpeRange` / `.weightRange` → **安静降级,不给建议**;`.rpe` 与 legacy → 现行 RTS 路径(主项:需 rpe 与 reps∈1…12、rpe 6…10,否则给 `todayWorkoutTypes.copy001–007` 原因文案;先「同组上一组重量」,再 e1RM 反解 2.5 kg 向下取整;辅助项:上一组 / 最近记录)。
- **PctAnchorResolver**(三锚,`resolvedKg = floor(anchor × pct/100 / 2.5) × 2.5`,≤0 → nil):`registered_1rm` → onboarding 三大项 1RM(缺 → `missingRegisteredOneRM`);`e1rm` → 当前 e1RM(缺则回落登记 1RM,标 `fallbackToRegisteredOneRM`;两者皆缺 → `missingRegisteredOneRM`);`top_set` → 同日同动作、`sort_order` 更小、completed 且 !failed 且 reps≥1 的最大实际重量(缺 → `topSetNotCompleted`);非主项 family → `unsupportedExercise`。原因文案 `todayWorkoutTypes.copy008/009/010`;成功副注 `copy011/012/013` "{anchor}kg · 1RM/e1RM/顶组"。预填弱色 + 「自动换算」角标 + 来源行(spec 034 §9.4,四变体现场核 `SetEntrySheet`)。
- **预填止血**:只预填忠实值(`target_weight`/fixed → 重量;% 已解析 → 解析值弱色);其它新形式**留空**,空重量时禁用「完成」(显式 0 合法);legacy 行预填链与 v1 逐字节一致。
- rest 默认秒数按 RPE 派生:`rpe_range` 取下限;pct/rir/fixed 传 nil 走默认。

## 6. 空/错态兜底(#331,学员端 9 条,以 `DashboardInlineFailureCard` / `ContentUnavailableView` 形制)
Dashboard:周计划失败 → 内联失败卡 + 重试(`dashboardTodayScreen.copy008/009`;idle 但已尝试 → `copy004`);资料指标失败 → 同卡 + 重试;e1RM 趋势失败 → 同卡 + 重试;加载中 → 三处骨架;无计划 → PlanWaitingState(`dashboardPlanWaitingState.copy001–009`:"{教练}正在为你排 W{n}" / "会参考你这周的 RPE 和完成情况 · 通常 周日 21:00 前发布" / 给教练留言 / 本周小结 · W{n}:训练完成 / 周总量 / 新 PR)。训练 tab:无计划卡、错误 `ContentUnavailableView`。成长 tab 空态见 `GrowthEmptyStates.swift`(W1-g 复核时展开)。

## 7. RN 影响面(改动清单,供拆卡)
- `src/api/domains/plans.ts`:字段 + `completeDay`/`undoDayCompletion` + 删 shift;`src/domain/plan/sequence.ts`(新):排序/游标/`dayAfter`/`currentWeekDays`/`progressSegments`/`completedToday`/`recommendedDate(anchor_weekday)`;`src/domain/plan/prescription.ts`(新):六形态解码 + `prescribed()` 格式;`src/domain/e1rm/pct-anchor.ts`(新)。
- `features/dashboard`:DashboardScreen 重组(§3),删 顺延/休息日/`canShift`;`features/training`:TodayWorkoutView 两态 hero、SequenceNotice、HoldToComplete、DayCompletionBanner、TrainingCalendarView → 序列列表、`isEditable` 改游标、WorkoutDatePolicy 改设备时区 04:00、refresh throttle;SetEntrySheet 预填/建议门控;WorkoutBody 处方文本。
- 测试 seam(最高层):`domain/plan/sequence.test.ts`(排序四键、游标、跨周、全完成、anchor_weekday 三例)、`domain/plan/prescription.test.ts`(六形态 + 双锚 + 稀疏 + legacy 两种格式表逐条;`-kg x 5`/`目标 RPE 0` 不出现)、`pct-anchor.test.ts`(三锚 + 三种 unresolved + 2.5 floor)、`features/training/__tests__/hold-to-complete.test.ts`(状态机)、`features/dashboard/__tests__/today-model.test.ts`(completedToday gym-day 04:00 边界、action 三态、sticky 显隐)。
