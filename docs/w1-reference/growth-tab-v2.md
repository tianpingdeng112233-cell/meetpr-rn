# 成长 tab 参照包 v2(iOS `release/1.0` @ 202e95db,`StudentKit/Features/TrainingHistory`)

> ⚖️2026-09-05 重 pin 基线后补写,供 W1-g(悬空 worktree `feat/w1g-history`)复核收货。文案 key 指 `docs/w0-reference/i18n/StudentKit.json`(省略 `student.` 前缀)。v1 `core-training-loop.md` §4 的「结构/HistoryEntriesView/容量强度图」被本文取代。

## 0. 屏幕(`TrainingHistoryView`,隐藏导航栏,下拉刷新 = 导入回填 + 重载)
自上而下,横向 padding `pageHorizontal=20`,块间距 14:
1. **Header** `GrowthScreenHeader`:标题 `trainingHistoryView.copy013` 成长(display 34 Black,LargeTitleBar 形制)+ 副标题 `copy014` "E1RM ＝ 用你完成的组数估算的单次最大重量"(footnote textSecondary)+ 右上 `HeaderChatButton`(有 chat 时,未读数,a11y `copy012`)。
2. **三张 `GrowthE1RMCard`**(深蹲/卧推/硬拉,`MainLiftExerciseFamilyResolver.dashboardFamilies` 顺序):见 §1。
3. `GrowthSectionLabel(copy001 "E1RM vs 训练 1RM")` → **`GrowthComparisonCard`**:两列 StatTile 形制——`copy015` 三项 E1RM 合计(三主项当前 e1RM 之和)/ `copy016` 训练 1RM 合计(onboarding 三项登记 1RM 之和);e1RM 合计超过训练 1RM 时显示 `copy017` "已突破训练 1RM · {pct}%"(success 色)。任一缺失显示 "—"。
4. `GrowthSectionLabel(copy002 "教练反馈记录")` → **反馈入口** `GrowthNavigationCard`:有反馈 → 标题 `copy009` 全部教练反馈 + 副 `copy010` "共 {N} 条 · 含视频回放",点开反馈归档全屏(`feedbackArchiveCover`,列表行 = 未读点 + 正文 2 行 + 日期 + chevron,点开详情即 markRead);无反馈 → 同标题 + `copy011` "完成训练后,教练点评会归档在这里",禁用态。
5. `GrowthSectionLabel(copy003 "全部历史")` → **`GrowthHistoryStatsCard`**(三格 stat):`copy018` 训练次数 / `copy019` 训练周 / `copy020` 训练总容量(kg,千分位);`isZeroTraining` 时值显 "—"。→ **`GrowthNavigationCard`(icon clock)**:`copy004` 全部训练历史 + 副 `copy005` 第一次训练后解锁(零训练,禁用 opacity 0.55)/ `copy006` "按周 / 月查看 · 含每组数据";点开 `AllHistoryScreen`(导航标题 `copy024` 训练历史,内容 = `HistoryEntriesView`)。
6. `GrowthSectionLabel(copy008 "容量 / 强度")` → **`VolumeIntensityChart(buckets, isUnlocked)`**:最近 6 个 ISO 周的容量/强度桶(`ProgressMetrics.weeklyVolumeIntensity`);`isUnlocked = trainingSessionCount >= 3`,未解锁显示占位/锁态(以源 `VolumeIntensityChart.swift` 为准现场核)。
- 加载:两 VM(history + growthCurve)任一 error → `GrowthFailureCard`(`copy022` 加载失败 + message + `copy023` 重试);两者 loaded → 内容;否则 `GrowthScreenSkeleton`(a11y `copy021` 正在加载成长数据)。
- 埋点:`progressViewed(.e1rm)`、`.volume` 进屏;`.history` 点开全部历史。

## 1. `GrowthE1RMCard`(每主项一张,surfaceCard 圆角 16)
- 头行:`"{主项} E1RM"`(body 15 semibold)+ 右侧时间范围胶囊(surfaceElevated 底 + borderStrong 1px,`{range} ⌄`;点击循环 30天 → 90天 → 历史总览;`growthScreenPresentation.copy001/002/003`;a11y `growthE1Rmcard.copy001/002`)。
- 数值行:当前 e1RM `display 28`(一位小数)+ "kg";右侧:`formingProgress` 态显 `growthE1Rmcard.copy003` 首次估算;`chart` 态显 delta(`+x.x` / `−x.x`,窗口首尾差,success/danger)。无值:zero 态 `copy004` 未设定,否则 "—"。
- **卡态策略** `GrowthE1RMCardPolicy.state`(阈值 `trendUnlockThreshold = 3`):
  - `familyTotal == 0` → **zero**:`GrowthZeroTrainingState`(幽灵图 + `growthEmptyStates.copy006` "第一个数据点·等你练出来" + `copy008` 说明;**仅深蹲卡且全局零训练**时带按钮 `copy009` 去看今天的安排 → 切今日 tab)。
  - `familyTotal < 3` → **formingProgress**:`GrowthFormingTrendState`(虚线成形图 + 富文本 `copy003+004+005` "已记录 N 次——再练 M 次{主项},虚线就变成你的曲线",当前 kg 与最近记录日期)。
  - 窗口内主线点 < 3 或窗口值域为 0 → **formingWindowSparse**:`growthScreenPresentation.copy004` "近 {window} 数据不足 · 切到更长时间范围查看"。
  - 否则 **chart**:`GrowthE1RMChart`(宽高比 320:118;日均最佳 samples 折线 + 原始合格点;轴标 `growthE1Rmcard.copy006` 重量 / kg、`copy007` 日期;当前点高亮)。
- 数据源:`GrowthCurveViewModel`(e1RM 历史,W1-b 引擎 + spec 050 主项解析);`snapshot` 字段:samples / rawEligiblePoints / windowDataPointCount / eligibleDataPointCount / currentKg(headline point)/ deltaKg / latestRecordDate / chartCurrentPoint。**成长曲线单独页 `GrowthCurveScreen`(growth-curve 路由)在 iOS 已并入卡片,保留路由但仅作详情跳转,不再是主入口**(现场核 `GrowthCurveView` 是否仍可达;若不可达则 RN 删路由)。

## 2. `GrowthHistoryStats`(`historyStats(logs)`)
- 只算 `completed && !assumed` 的 set logs;`trainingSessionCount` = 去重的 `startOfDay(loggedAt)`(设备日历);`trainingWeekCount` = 去重 `(yearForWeekOfYear, weekOfYear)`;`totalVolumeKg` = Σ weight × reps。
- `unlocksTrends = sessions >= 3`(容量/强度图与趋势共用阈值)。

## 3. `HistoryEntriesView`(全部训练历史)
- 按周分组(`historyEntriesView.copy002` "第 {n} 周"),每日一行:日期 / 日名 / `copy004` "{done}/{total} 组";无训练 → `copy003` 休息日(**注意:此处「休息日」是历史视图对无记录日的标签,与 Dashboard 删掉的休息日概念无关**);组行 `copy001` "第 {i} 组" + 重量×次数@RPE;详情 `DayDetailView`。以源文件 `HistoryEntriesView.swift`(329 行)为准逐段核:排序、周/月切换、每组数据、视频指示。
- 反馈跳转 token(`feedbackJumpToken`)定位反馈段:沿 w1g 现实装。

## 4. 对 w1g 悬空实装的复核清单
- `GrowthScreen.tsx`(425 行)按 §0 顺序与文案 key 重排;三卡态策略按 §1 四态实现(现 RN 可能只有有图/无图两态);范围胶囊三档;delta 与「首次估算」。
- `model.ts`:`historyStats` 口径(去重日/周、只算 completed && !assumed)、`chartBuckets` 最近 6 周、`unlocksTrends`。
- `E1RMChart.tsx` / `VolumeIntensityChart.tsx`:v3 tokens(gold 线、chartLine 网格、bgInset 底);victory-native 仍按 PLAN 选型,但 W3 才做像素对齐,本轮只保证数据与四态正确。
- 空态 9 条中属成长 tab 的:zero / forming / windowSparse / 反馈空 / 历史锁 / 失败卡 + 重试。
- 文案全部 `t(key)`;`GrowthCurveScreen` 路由去留按 §1 现场核。
