# Spec 087 · 实装卡 1（安卓）：Progress 列表入口 + e1RM 四段页 + 历史三格 + 强度指标页

开工先读仓内 `CONTEXT.md`（"Total（三项合计 e1RM）"）、`AGENTS.md`、`specs/087-progress-menu/SPEC.md` **全文**（行为定义、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点）。本卡只做 SPEC 的**第一步**：§1（四行，不含 Body weight 那一行）、§2、§3、§4，验收 1–13。§5 体重页、验收 14–21 不在本卡。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-087`，分支 `feat/087-progress-menu`（基于 `main@aeb1020`）。`node_modules` 是指向主仓的软链，不要重装依赖。
- 这是 David 2026-10-09 拍板并「定稿」的新结构，不属于"1:1 复刻 build 22"，不受身份卡"v1 严禁夹带新功能"约束；除本卡所列外不得顺手改别的。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。
- 后端零改动：不新增任何请求，页面数据全部来自现有的 `useHistoryViewModel`（`src/features/history/use-history.ts`）已经取到的东西。
- 屏幕稿你打不开，结构与文案已转写在 SPEC「屏幕稿」一节。稿只管布局／层级／间距：颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件（`Card`、`StatTile`、`ListRow` 可参考但不强制复用），不新造一套样式，不写死色值。金棕色字 = `colors.goldText`，选中块深色底 = `colors.ctaFill` / 白字 `colors.inkOnCTAFill`。
- SPEC 没写的产品口径不要自己定：记进 JOURNAL 的"待 Opus 决定"并跳过那一点。

## 要做的四项（安卓落点）

### §1 入口页

- `src/features/history/GrowthScreen.tsx` 改成：现有页头（`GrowthScreenHeader`，去掉大标题下那行 e1RM 释义）+ 四行列表 + 加载失败时列表下方的重试行 + 下拉刷新。页面上不再有任何图表、统计格、小标题、弹层。
- 行组件新建（放 `src/features/history/`），结构按「屏幕稿 · 1」。四行顺序与名称见 SPEC §1 的表；**不渲染 Body weight 行**，但行的数据结构要让第二步能在第 4 位插入一行而不改其余代码。
- 右侧值由一个纯函数从已加载的数据派生（放 `src/features/history/model.ts`）：
  - e1RM：`stats.sbdTotalKg` 非空 → `Total {formatKg} kg`，否则 `—`。
  - Training history：`stats.trainingSessionCount`，0 → `—`，1 → `1 session`，其余 `{n} sessions`。
  - Coach feedback：未读数 = `feedback` 里 `read_at === null` 的条数；>0 → `{n} new`（并标记为强调色）；否则总条数 >0 → `{n}`；否则 `—`。
  - Intensity metrics：`stats.unlocksTrends` 为真且 `volumeIntensity.points` 最后一个点的 `averageRPE` 非空 → `RPE {一位小数}`，否则 `—`。
- 路由：e1RM → `/progress/e1rm`；Training history → 现有 `/training-history`；Coach feedback → 现有 `/(student)/feedback`（用 `router.navigate`，与 `DashboardScreen` 里反馈卡的跳法一致）；Intensity metrics → `/progress/intensity`。
- 加载中：行与名称立即渲染，右侧值为空；失败：右侧值为空 + 重试行（文案沿用 `student.trainingHistoryView.copy022` / `copy023`）；行始终可点。
- 删除：三张 e1RM 卡、对比两格、反馈文字弹层与 `FeedbackDetail` 弹层、三格统计、历史入口卡、容量强度图在本页的渲染，以及只为它们服务的本地状态。`feedbackJumpToken` / `bumpFeedbackJump`（`src/features/student-tabs.ts`）现在没有调用方，连同本页里消费它的滚动逻辑一起删掉。
- 从反馈页读完返回后未读值要更新：入口页重新聚焦时让反馈数据失效重取（沿用现有 query 的失效方式，不新开轮询）。

### §2 e1RM 页（新路由 `/progress/e1rm`）

- 新建 `src/app/progress/e1rm.tsx`（只做 re-export，照 `src/app/training-history.tsx` 的写法）与 `src/features/history/E1RMScreen.tsx`；在 `src/app/_layout.tsx` 的根 Stack 注册（与 `training-history` 并列，无系统导航栏，页面自己画返回行）。
- 页面：返回行 + 标题 `e1RM` → 释义行（`student.trainingHistoryView.copy014`）→ 四段切换（默认 `Total`，每次进页回到 `Total`）→ 曲线卡 →（仅 Total 段）对比两格与突破行。
- 时间范围：把现在 `GrowthE1RMCard` 内部的 `range` 状态提到页面，四段共用，切段不重置。`GrowthE1RMCard` 改为接收 `range` 与 `onRangeChange`（或拆出不带状态的内层），其四种状态的内部渲染、`GrowthE1RMChart` 的点选与 `GrowthSourceSheet` 来源弹层**原样保留**。零数据态里的"去 Today"按钮条件由"仅深蹲卡"改为"零训练时三段都出现"。
- Total 序列：在 `src/features/history/model.ts` 新增纯函数，按 SPEC §2「Total 段 · 序列口径」实现：输入三项的 `GrowthCurve`（取各自主线 `trajectory`，不含 `lowConfidence`），输出按日期升序的 `{ date, valueKg }[]`；三项未齐返回空数组并能给出缺哪几项。再加一个按时间范围取窗口、算当前值与变化量与状态（`missing` / `sparse` / `chart`）的派生函数。日期比较用 `E1RMSample` 上已有的日期字段，不自己解析时间戳。
- Total 段的曲线复用现有 e1RM 图的几何与画法（`src/features/history/charts/growth-geometry.ts` / `GrowthE1RMChart`），不可点选（不传 `onSelect`），不显示 `student.e1rmSourceHint`。
- 对比两格与突破行：从 `GrowthScreen` 原样搬来（`StatTile` + `copy015` / `copy016` / `copy017`），只在 Total 段渲染。
- 埋点：进页发 `ProgressViewed { tab: 'e1rm' }`。

### §3 历史记录页

- `src/features/history/TrainingHistoryScreen.tsx` / `HistoryEntriesView.tsx`：在标题行之下、历史列表之上加三格卡（从 `GrowthScreen` 搬 `StatCard` 的样子与 `copy018` / `copy019` / `copy020`）。数据来自同一个 view model 的 `stats`。零训练时三格显示 `—`。
- `HistoryEntriesView` 的其他行为、`presentation` 两种形态、列表本身不动。三格只在 `presentation="stack"`（即本页）出现。
- 埋点：进页发 `ProgressViewed { tab: 'history' }`（原来在入口卡的点击里，挪到这里或保留在入口行的点击里，二选一，不重复发）。

### §4 强度指标页（新路由 `/progress/intensity`）

- 新建 `src/app/progress/intensity.tsx` 与 `src/features/history/IntensityScreen.tsx`，根 Stack 注册。页面：返回行 + 标题 → 一张卡，卡内小标题（`copy008`）+ 现有 `VolumeIntensityChart`（原样，含未解锁态）。
- 埋点：进页发 `ProgressViewed { tab: 'volume' }`。

三个页面（e1RM、强度、历史）的加载与失败态沿用 `TrainingHistoryScreen` 现在的写法（返回按钮 + 标题 + 加载文案 / 失败与重试）。返回行的样式三页一致，抽一个小组件。

## 文案

所有新文案进 i18n 目录，**中英文都要有**；RN 自增的键放 `src/i18n/catalog/RnExtras.json`，过仓内 i18n 守卫测试（`src/i18n/__tests__`）。已有的键直接复用，不复制。

| 用处 | 英文 | 中文 |
|---|---|---|
| 行名 / 页标题 | `e1RM` | `E1RM 曲线`（页标题同） |
| 行名 | `Training history` | `历史记录`（复用 `student.e1rmSourceHistory`） |
| 行名 | `Coach feedback` | `教练反馈`（复用 `student.feedbackInboxView.copy006`） |
| 行名 / 页标题 | `Intensity metrics` | `强度指标` |
| 行值 | `Total {0} kg` | `合计 {0} kg` |
| 行值 | `1 session` / `{0} sessions` | `{0} 次训练` |
| 行值 | `{0} new` | `{0} 条未读` |
| 行值 | `RPE {0}` | `RPE {0}` |
| 分段 | `Total` / `Squat` / `Bench` / `Deadlift` | `合计` / `深蹲` / `卧推` / `硬拉`（三项名优先复用 `LIFT_PRESENTATION` 现有文案） |
| 卡内标题 | `Total E1RM` | `合计 E1RM` |
| Total 空态 | `Total appears once squat, bench and deadlift each have an e1RM` | `深蹲、卧推、硬拉都有 E1RM 后显示合计` |
| Total 空态第二行 | `Still missing: {0}` | `还缺：{0}`（{0} 是缺的项名，用顿号或逗号连接） |
| 读屏 · 返回 | 复用 `student.feedbackInboxView.copy005` | 同左 |

入口页每行的读屏标签 = "名称，当前值"（值为 `—` 时只读名称）。

## 测试 seam（先红后绿，按此顺序）

1. `src/features/history/__tests__/model.test.ts`：Total 序列与窗口派生——SPEC 测试 seam 第 1 条全部断言。
2. 同文件：入口行右侧值派生——SPEC 第 2 条全部断言。
3. `src/features/history/__tests__/growth-screen.test.tsx`：改写为入口页断言（四行、顺序、名称、无图表、路由目标、加载中与失败时行仍在、没有 Body weight 行）。该文件里针对已移走内容的旧断言随内容迁到对应新页面的测试里，不是直接删掉——每条旧断言要么在新测试里有对应，要么在 JOURNAL 里说明为什么不再适用。
4. 新增 `e1rm-screen.test.tsx`（挂载方式参考 `growth-chart-selection.test.tsx`）：默认 Total；切段后范围不重置；Total 段有对比两格、无点选提示、点不可选；三段保留来源弹层；三项未齐的空态与缺项文字。
5. 新增历史页三格与强度页各一个渲染测试（有数据 / 零训练或未解锁）。
6. `history-points` / `imported-baseline` / `source-detail` / `growth-chart-selection` 现有测试不改断言保持通过（`growth-chart-selection` 若因挂载对象从入口页变成 e1RM 页而需要改挂载方式，可以改挂载、不改断言）。

## 验收标准

SPEC「验收清单」第 1–13 条（第 11、12 条的实屏部分由 Opus 在模拟器上看；你负责让对应的组件测试与全量检查通过）。交付时在 `docs/CODEX-JOURNAL.md` 追加一节：改了哪些文件、每条验收对应的测试名、`npx jest --runInBand`、`npx tsc --noEmit`、`npm run lint` 的最后几行原始输出、未做或存疑的点。

## Out of Scope

SPEC 同名一节全部；另加：体重行与体重页（第二步）；教练反馈页本身；e1RM 的算法、主线判定、来源弹层内容；`VolumeIntensityChart` 与历史列表的内部实现；Tab 栏；训练页；任何后端请求的增删。

## 返修一（2026-10-09）

1. Total 序列改取三段各自主线点（`growthSnapshot(curve, 'all').samples`），不取 `trajectory`；大号数字取 `stats.sbdTotalKg`，不取最后一个 Total 点。本卡 §2 里"取各自主线 `trajectory`"的写法作废，以 SPEC §2 的 2026-10-09 修订为准。
2. 取消被跳过的那条测试并改为真实数据路径断言（600 → 300 → 330 → 360）。
3. `ProgressPageHeader` 标题紧贴返回箭头左对齐，不居中。

## 返修二（2026-10-09，实屏后；最后一轮）

4. 深色主题下选中的分段看不出来：本卡指定的 `colors.ctaFill` / `colors.inkOnCTAFill` 不随主题变，改用 `colors.ctaBackground` / `colors.ctaText`，描边同底色。
5. 小屏 + 大字体下入口行标题被拆行：标题单行不收缩，右侧值占剩余宽度右对齐、放不下才换行，去掉值的固定最大宽度。
