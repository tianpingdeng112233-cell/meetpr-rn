# Spec 084 · 卡 A（安卓）：序号、可点卡片、去横幅、提醒默认日

开工先读仓内 `CONTEXT.md`（如存在）、`AGENTS.md`、`specs/084-walkthrough-polish/SPEC.md` 的 §2、§3、§5、§6 与「存量数据与升级」「测试 seam」「验收清单」。

- 级别：T2。基线：`fix/walkthrough-small-fixes`（PR #68 顶），分支 `feat/084a-walkthrough-behaviors`。
- 这四项是 David 2026-10-02 拍板的两端口径调整，iOS 同步在改（iOS 仓 `feat/084a-walkthrough-behaviors`，本机只读路径 `/Users/david/Projects/apps/MeetPR-wt-084a`，可用来对照实现口径）。它们不属于"1:1 复刻 build 22"，是已获批准的新口径，不受身份卡里"v1 严禁夹带新功能"约束；除这四项与文末的 D-31 外不得顺手改别的。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。

## 要做的四项（行为定义以 SPEC 为准，这里只补安卓落点）

### §2 W#D# 的 D 改为"本周第几练"

现状落点：`src/domain/plan/sequence.ts` 的 `dayCode(day)` 返回 `` `W${day.week_number}D${day.day_of_week}` ``；训练页周条、Today 周条、训练历史、补录、聊天训练卡等处另有直接把 `day_of_week` 当 D 序号展示的地方（`src/features/training/TodayWorkoutView.tsx`、`src/features/history/`、`src/i18n/catalog/RnExtras.json` 的模板等）——自行 grep 找全，在 JOURNAL 列出清单。教练端学员详情（`src/features/coach/student-detail/OverviewSection.tsx`）现状用的是列表下标，需确认它与新口径对同一天给出同一序号，不一致就改走同一入口。

要求：在 `sequence.ts` 里新增**一个**序号计算入口（输入一周的训练日，输出每天从 1 起的序号，顺序沿用 `sequenceDays` 的既有排序，已完成的也占号，重复 id 不得抛错）；所有展示点都走它。`day_of_week` 字段、排序、推荐日期、完成推进、补录归日一律不动。教练排课界面的 `DAY n` 不在范围内。

### §3 Today 的 Meetday 卡与体重卡可点

落点：`src/features/dashboard/DashboardScreen.tsx` 里的体重卡与比赛卡（各有空态与有值态）。要求：四种状态都可点；Meetday → 现有的 Meet / notes 编辑页；体重 → Basic information 编辑页（复用 Profile 已有的编辑路由与保存路径，不新建编辑界面）；保存或返回后回到 Today，卡片立即反映新值（让相关 query 失效或复用同一份缓存）。补按压反馈与 `accessibilityRole="button"`、可读的无障碍标签。卡片外观不变。

### §5 删除训练页的 e1RM 祝贺横幅

落点：`src/features/training/TodayWorkoutView.tsx` 及其用到的 PR 事件读取 / 确认（`src/domain/e1rm/repository.ts`、`recorder.ts`）。要求：训练页不再展示这条横幅（含 "First record" 形态）；原本会展示的未确认 PR 事件在同一时机静默确认，不堆积；PR 的记录、Progress 的曲线与记录点不变。删掉因此不再使用的组件与文案键（中英文目录同步，过 i18n 守卫）。

### §6 训练提醒默认日取教练计划

落点：`src/features/settings/training-reminder.ts`（现有默认：档案训练日，回落一三五）与 `TrainingReminderSettingsScreen.tsx`、`TrainingReminderSession.tsx`。要求：从未保存过设置的用户，默认星期 = 当前这一周（游标所在周；全部完成则最后一周）各训练日的教练推荐日期所在星期，推荐日期按现有 `recommendedDate` 的日历口径取星期；无已发布计划回落档案训练日；再回落一三五。已保存的设置不动，存储格式不变。Profile 里提醒那一行的摘要与设置页显示同一组默认值。

## 顺带修（走查 D-31，同一张卡验收）

组录入页 RPE 刻度下方的数字（5、6 … 10）在系统字体 1.3× 时被裁掉下半截（360×640 dp 下可见），默认字号正常。位置：`src/features/training/SetEntryRPEScale.tsx`。要求：1.3× 下数字完整可读，默认字号下观感不变；不改拖动手势逻辑（PR #67 刚修过起手手势，其测试必须保持通过）。

## 约束

- 不改后端契约与本地持久化结构；不加依赖；颜色字号间距用 `src/design` 现有 token。
- 存量照护：老用户升级后已完成进度、当前训练日、休息计时、草稿、已保存的提醒设置都不变（只有 W#D# 的显示从槽位变序号）。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam（先红后绿，只在这些边界）

1. `src/domain/plan/sequence.ts` 的序号函数与标签函数（含重复 id、补加更早训练日后的重排），以及一个调用方的标签输出。
2. Dashboard 卡片点击 → 路由到对应编辑页（复用现有 dashboard 测试的挂载方式）。
3. 训练页的 PR 事件处理：不渲染横幅、事件被确认。
4. `training-reminder.ts` 的默认星期推导（三级回落 + 已保存不动）。

D-31 是样式修正，不写测试。

## 验收清单（Opus 收货，逐项核）

- [ ] 训练日在星期二/四/六/日的一周，各处显示 D1–D4；补加一个更早的训练日后重排为 D1–D5；教练端与学员端对同一天显示同一序号。
- [ ] 推荐日期、完成推进、补录归日与修改前一致。
- [ ] 两张卡在空态与有值态都可点，进入正确的编辑页；保存后回 Today 即时更新；返回不写。
- [ ] 触发一次 e1RM 提升（含首次记录）后训练页无横幅；Progress 出现对应点；下次进入不再触发任何提示。
- [ ] 新用户首次打开提醒的默认星期符合三级回落；已保存设置升级后不变。
- [ ] D-31：360×640 dp、字体 1.3× 下 RPE 刻度数字完整。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。
- [ ] 模拟器 Light / Dark 实屏：Today、训练页、提醒设置页、组录入页。

模拟器实屏由 Opus 收货时做；沙箱里跑不了模拟器就如实写"未做设备验证"。

## Out of Scope

SPEC §1、§4、§7–§10（另两张卡）；`day_of_week` 的数据语义；Progress 页与 PR 判定规则；提醒的发送机制；视频剪辑；休息计时常驻通知。
