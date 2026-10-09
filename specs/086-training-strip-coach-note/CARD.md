# Spec 086 · 实装卡（安卓）：训练页周条落后状态与新版式、hero 卡教练备注上移

开工先读仓内 `CONTEXT.md`（如存在）、`AGENTS.md`、`specs/086-training-strip-coach-note/SPEC.md` **全文**（行为定义、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点）。周条沿用的规则见 `specs/084-walkthrough-polish/SPEC.md` 的「§4 训练页周条」与「§4 修订」。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-086`，分支 `feat/086-training-strip-coach-note`（基于 `main@aeb1020`）。
- 这是 David 2026-10-09 拍板并「定稿」的新口径，不属于"1:1 复刻 build 22"，不受身份卡"v1 严禁夹带新功能"约束；除本卡三项外不得顺手改别的。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。
- 屏幕稿你打不开，结构与文案已转写在 SPEC「屏幕稿」一节。稿只管布局／层级／间距：颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件，不新造一套样式，不写死色值。金棕色字 = `colors.goldText`，淡金底 = `colors.goldSoft`。

## 要做的三项（安卓落点）

### §1 周条格子内容与落后判定

- `src/domain/plan/week-strip.ts`：`trainingWeekStrip` 增加可选入参"今天"（`YYYY-MM-DD`，默认 `gymDayToday()`，来自 `src/domain/plan/workout-date-policy.ts`）。每个训练日格（`cells` 与 `calendarCells` 里的训练格）带上推荐日期与 `isBehind`（未完成且推荐日期 < 今天；推荐日期用现有 `recommendedDate`，含 `shifted_to_date`）。返回值增加 `daysBehind`：当前训练日（`cursorDay`）的推荐日期早于今天的天数，否则 0；没有当前训练日时为 0。现有字段与现有测试的断言不变。
- `src/features/training/TrainingWeekStrip.tsx`：
  - 训练日格三层 = 星期缩写 / 状态图形 / 第三行；第三行按 SPEC §1 的表取（已完成或没到期 = 短日期 `M/D`；已落后 = `Behind`）。删除 `D{序号}` 那一行。当前训练日的状态图形改为金色实心圆点（现状是金色空心圆）。
  - 休息日格 = 星期缩写 + `Rest`，删除日期行。
  - 读屏文字按 SPEC §1。
- `src/features/training/TodayWorkoutView.tsx` 传给 `WorkoutBody` 的 `preview.recommendedDate`：所选日已落后时不传日期，`WorkoutBody.tsx` 里那行"Coach recommends …"相应不渲染；没落后照旧。
- "今天"要随时间更新：训练页重新聚焦或应用回到前台时重算（沿用页面里已有的聚焦／刷新时机，不新开定时器）。

### §2 周条版式（2B）

- 周次信息搬家：`W{n}` + 状态胶囊 + `已完成 / 总数` 从 `TrainingWeekStrip` 的换周行移到 `TodayWorkoutView.tsx` 页头里 `Training history` 入口那一行的左侧（该行左右两端对齐）。只在有计划且非加载态时显示；`Training history` 入口本身的行为、文案、读屏不变。
- 胶囊文字：所看的是当前周且 `daysBehind > 0` 时显示落后天数（见文案表），否则沿用 `Current week` / `Upcoming` / `Completed`。
- `TrainingWeekStrip` 只剩格子行：最左、最右各一个换周箭头（沿用现有的禁用规则与读屏标签），中间 7 格。删除周数小点（`indicators` 的渲染；`week-strip.ts` 的 `indicators` 字段可保留不动）。
- 横向滑动翻周的手势保留。跨度超过 7 天时的横向滚动保留：箭头固定在两端，中间格子区滚动。
- 高度：格子行约 64；训练日格与箭头的可点高度不低于 `spacing.minimumHitTarget`。

### §3 hero 卡教练备注

- `src/features/training/WorkoutBody.tsx`：把现在卡片底部的备注块（`active.planSet.coach_note ?? active.exercise.notes`）移到动作名行之下、大号重量之上，按 SPEC §3 与「屏幕稿 · 3」的结构渲染。
- 取值抽成一个纯函数（放 `src/features/training/` 下，新文件），输入组备注、动作备注、动作显示名，输出 0–2 段（每段：小标题、正文、是否主段）；空白字符串按没有处理。组件只负责渲染。
- 下方分动作组表里的动作备注行、只读预览、已完成详情不动。

## 文案

所有新文案进 i18n 目录，**中英文都要有**，键的放法照 084 三张卡当时的惯例（`student.trainingWeekStrip.*` 在 `src/i18n/catalog/StudentKit.json`；RN 自增的看 `RnExtras.json`），过仓内 i18n 守卫测试。

| 英文 | 中文 |
|---|---|
| Behind | 已落后 |
| {0} days behind / 1 day behind | 已落后 {0} 天 / 已落后 1 天 |
| {0}, behind schedule（训练日格读屏） | {0}，已落后 |
| {0} days behind schedule（胶囊读屏，单数同理） | 已落后 {0} 天 |
| Coach note · this set | 教练备注 · 本组 |
| Coach note · {0} | 教练备注 · {0} |

复数写法沿用目录里已有的 `.one` 后缀惯例（参见 `student.trainingWeekStrip.summary` / `summary.one`）。仓内已有等价文案的复用已有键；因本卡不再使用的旧键删掉，中英文同步。

## 约束

- 零后端改动；不改 API schema；不改本地存储结构；不加依赖。
- 推进规则（`cursorDay`、完成、撤销）、推荐日期算法、`day_of_week` 语义一律不动。
- Today 页（`src/features/dashboard/`）、教练端、Tab 栏不动。`src/features/dashboard/` 若复用了 `trainingWeekStrip` 的返回值，其表现不得变化。
- 不用红色表达落后；不加弹窗、提醒或任何拦截。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam（先红后绿，只在这些边界）

1. `src/domain/plan/__tests__/week-strip.test.ts`：`isBehind` 与 `daysBehind`——已完成不算落后；推荐日期等于今天不算；早于今天且未完成算；`shifted_to_date` 按后移后的日期算；当前训练日落后 0 / 1 / 18 天；全部练完时 `daysBehind` 为 0。`gymDayToday` 的凌晨 4 点界线若尚无测试，在其所在测试文件补一条。
2. `src/features/training/__tests__/` 新增 `training-week-strip.test.tsx`：训练日格没有 `D{n}` 文本；三种第三行各一例；休息格没有日期；没有周数小点；箭头禁用状态；读屏文字。
3. `src/features/training/__tests__/` 新增备注纯函数测试：仅组 / 仅动作 / 都有 / 都无（含空白字符）四种组合的输出。
4. 页头胶囊：在已有能挂载训练页的测试里（如 `completion-entry.test.tsx` 的挂载方式）补一例落后、一例不落后的胶囊文字；若挂载成本过高，把"胶囊文字"抽成纯函数测并在 JOURNAL 写明。
5. 现有 `set-save` / `completion-entry` / `quick-log-entry` / `set-ref-entry` 测试保持通过；因口径变化必须改的断言可以改，但要在 JOURNAL 里逐条列出改了哪条、为什么；不得为了变绿删测试或放宽与本卡无关的断言。

样式（颜色、间距、高度）不写断言，由 Opus 在模拟器实屏验收。

## 验收清单

以 SPEC「验收清单」全部条目为准（1–11，含 3b），由 Opus 逐项收货，实装方不得增删范围。模拟器实屏、老用户升级第一屏、Light / Dark 与小屏大字号由 Opus 做；沙箱里跑不了模拟器就在 JOURNAL 如实写"未做设备验证"，并写清你认为最需要实屏确认的三处。

交付前跑通：`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。发现 SPEC 与本卡冲突时以 SPEC 为准并在 JOURNAL 记录；发现 SPEC 自相矛盾或需要产品取舍时停下写进 JOURNAL，不自行裁决。

## 返修一（2026-10-09，Opus 模拟器收货后）

首轮其余验收项实屏通过（落后 18 / 4 天、进度正常、跨度超 7 天、翻周、四种备注、深色）。一处不过：

- **验收 10 失败**：360×640 dp + 系统字体 1.3× 时，页头那一行里的胶囊把 `18 days behind` 截成了 `18 days`（"behind" 被裁掉，没有省略号）。证据：`/Users/david/Projects/scratch/rn-086-training-20261009/ui/50-small-18.png`。同屏 1.0× 字体不截。
- 要的结果：这一行在任何宽度与字体倍率下，**胶囊文字完整显示，不截字、不丢词、不出省略号**；`W{n}`、`已完成 / 总数`、`Training history` 也都完整。宽度不够时让 `Training history` 入口整体换到下一行并靠右，而不是压缩或裁剪胶囊；宽度够时仍是定稿的同一行。胶囊不得因为换行而变成两行文字。
- 只动 `TodayWorkoutView.tsx` 里这一行的布局样式；周条格子、备注块、文案、落后判定都不要动。
- 测试：样式不写断言。若为此抽出了任何纯逻辑则先红后绿；否则在 JOURNAL 本卡一节后追加"返修一"小节，写清改了哪几条样式、为什么这样能保证不截字。
- 仍然不 commit、不 push。交付前重跑 `npx jest --runInBand`、`npx tsc --noEmit`、`npm run lint`。
