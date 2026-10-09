# Spec 085 · 卡 B（安卓）：四处界面接线——周条选中与概览卡、体重单项页、Meet 编辑、营养占位

开工先读仓内 `CONTEXT.md`（如存在）、`AGENTS.md`、`specs/085-today-final-walkthrough/SPEC.md` **全文**（行为定义、存量照护、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点）。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-085`，分支 `feat/085-today-final-walkthrough`，在卡 A 的提交 `861fd29` 之上继续。
- 这四项是 David 2026-10-09 拍板并「定稿」的新口径，不属于"1:1 复刻 build 22"，不受身份卡"v1 严禁夹带新功能"约束；除这四项外不得顺手改别的。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。
- 屏幕稿你打不开，结构与文案已转写在 SPEC「屏幕稿」一节。稿只管布局／层级／间距：颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件（`Card`、`AppButton`、`FeedbackPressable`、引导里的 `FieldLabel` / `ChoiceGroup` / `FormInput` / `DateWheel`、Profile 的 `ProfileModal` 等），不新造一套样式，不写死色值。

## 卡 A 已提供、必须复用的纯函数（不要重写一份）

- `src/domain/meet/weight-class.ts`：`MEET_FEDERATIONS`、`weightClassesFor`、`formatMeetClass`、`parseMeetClass`、`meetClassTableSex`。
- `src/features/onboarding/meet.ts`：`meetPatch`、`removeMeetPatch`、`invalidMeetFields`。
- `src/domain/profile/body-weight.ts`：`bodyWeightInput`、`bodyWeightKgFromInput`、`bodyWeightInputFromKg`、`formatBodyWeightKg`。注意 `formatBodyWeightKg` 对空值会返回 `NaN`，调用处先判空（现有代码已有 `profile?.weight_kg` 的判断，保持）。

## 要做的四项（安卓落点）

### §1 Today 周条选中 + 概览卡

- `src/features/dashboard/WeekCalendar.tsx` 的 `WeekGrid`：现在高亮只看 `status === 'current'`。改成两种标记分开——选中（`selectedDayID === day.id`）= 深色 2pt 粗框；当前训练日 = 淡金底、金色实心圆点、序号加粗、**不再有金色描边**；两者可叠加。未选中的格子要预留同样粗细的透明边框，点选时格子尺寸不能跳。`WeekGrid` 还被别处复用（先 grep 调用方），其他调用方的观感不得因此变化——需要的话加一个显式开关，只在 Today 启用新样式。
- `src/features/dashboard/DashboardScreen.tsx`：周条下方现有的"训练日名称 + 摘要 + Coach recommends"三行文字换成 SPEC §1 的概览卡（可点，整卡一个按压区，`accessibilityRole="button"`）。动作名按 `sort_order` 取，用页面里已有的 `resolve`（动作目录解析）拿名称，解析不到的跳过。点卡 = 调用页面里已有的 `openTraining(day)`（它走 `useStudentTabsStore` 的 `handoffTraining`，训练页据此选中那一天）。
- 现状在"今天已完成当日训练"时不显示所选日摘要（`!vm.today.completedToday && …`）；按 SPEC 改为概览卡照常显示。
- `src/features/dashboard/use-dashboard.ts`：离开 Today 再回来时选中重置为当前训练日（页面重新聚焦时清掉 `requestedDayID`）；进入时默认选中沿用现有推导。
- e1RM 小标题：所选日不是当前训练日时用新文案 `Selected day · e1RM chart`。
- 页头 `W#D#`、底部 `Start training` 一律不动。

### §2 体重单项页与两位小数

- `src/features/profile/model.ts` 的 `ProfileSection` 加一个 `weight`（只写 `weight_kg` 一个字段）；`ProfileEditor.tsx` 为它提供只含一个输入框的内容（SPEC「屏幕稿 · 2」）；`src/app/(student)/profile.tsx` 的 `edit` 参数白名单与 `MyProfileScreen` 的 `editSection` 类型加上 `weight`（以及下面的 `note`）。Profile 页的行列表**不**新增体重行。
- `DashboardScreen.tsx` 体重卡（有值、空态）改为 `edit('weight')`；数字显示改用 `formatBodyWeightKg`。空态文案不变。
- `src/features/onboarding/OnboardingSteps.tsx` 的 `BodyMeasurementsSection`：体重输入改用卡 A 的过滤与换算（两位小数、英制换算到两位 kg）；**身高那一列不动**。这个组件同时服务引导第 1 步和 Profile 的 Basic information 页，两处一起生效。
- `src/features/profile/model.ts` 的 `profileRowValues`：Basic information 行里的体重改两位小数。
- 校验沿用现有的 `positive(form.weightKg)` 路径即可；单项页里空值、0、≥ 500 kg 不可保存并标红。

### §3 Meet 编辑、Profile 两行、引导第 7 步

- `OnboardingSteps.tsx` 的 `CompetitionSection`（Profile 的 Meet 编辑页与引导第 7 步共用）按 SPEC §3 重写：去掉是/否题与留言框；日期滚轮 + 赛事方四块 + 级别网格（+ 性别未定时的 `Men` / `Women` 切换）。它需要两种外观：Profile 编辑页里直接展开（带 `Remove meet`）；引导里是"收起的虚线按钮 ↔ 展开三段 + `Remove`"。
- 表单状态：**本地草稿的存储结构不变**（`storage.ts` 的 schema 不加字段）。赛事方与级别的"已选齐"状态用 `form.targetWeightClass` 存格式化后的字符串；"只选了赛事方、还没选级别"这种中间态放组件内部状态，不进草稿。打开页面时用 `parseMeetClass(form.targetWeightClass)` 回填；解析不出且原值非空 → 按"旧的手填值"处理（显示 `Previously entered: …`，赛事方与级别未选）。
- `src/features/onboarding/model.ts`：第 7 步的校验与 patch 改走卡 A 的函数——`isCompeting === null` 不再判为缺项；`isCompeting === true` 时用 `invalidMeetFields` 判缺项；patch 在备赛时用 `meetPatch`，不备赛时等价于 `removeMeetPatch`（`is_competing=false`、日期与级别为空）。`note_to_coach` 在引导第 7 步照旧随这一步提交。把 `'federation'` / `'weightClass'` 的缺项映射到页面上对应那一段标题的标红（`errorFields` 的键类型需要相应扩展）。
- Profile 的 Meet 编辑页：`profilePatch` 的 `competition` 白名单去掉 `note_to_coach`（只写三个比赛字段）；`Remove meet` 走确认框（用仓内现有的确认弹窗写法）后提交 `removeMeetPatch()` 并关闭。
- 新增 `ProfileSection` `note`：只含一个多行输入框，只写 `note_to_coach`，输入规则沿用现状。`MyProfileScreen.tsx` 的行列表里，原 `competition` 一行标题改为 `Meet`，其后加一行 `Note to coach`；`profileRowValues` 给出两行各自的值（Meet = 日期 + ` · ` + `target_weight_class` 原文，没有比赛用现有占位；Note = 留言首行）。
- `DashboardScreen.tsx` 的 Meetday 卡：有值态在倒数下加一行灰字显示 `target_weight_class` 原文（空则不显示）；判定"有比赛"沿用现状并补一条：`is_competing` 为真但没有日期按没有比赛处理。
- 教练端代码不动。

### §4 营养占位卡

- `DashboardScreen.tsx`：在体重 / Meetday 行（`profile` 那个节点）之后、e1RM 小标题之前，加 SPEC §4 的占位卡。纯展示组件，放在 `src/features/dashboard/` 下一个新文件里；不可点、不请求、不埋点。

## 文案

所有新文案进 i18n 目录，**中英文都要有**，键放在仓内给 RN 自增文案用的目录（先看 `src/i18n/catalog/RnExtras.json` 与 084 三张卡当时加键的做法，照同一惯例），过仓内 i18n 守卫测试。英文原文以 SPEC「屏幕稿」转写为准；中文对应：

| 英文 | 中文 |
|---|---|
| Today's session / Upcoming / Completed | 今日训练 / 待练 / 已完成 |
| Selected day · e1RM chart | 所选训练日 · e1RM 曲线 |
| Body weight（页标题）/ Weight / Up to two decimal places | 体重 / 体重 / 最多两位小数 |
| Meet（页与行标题）/ Meet date / Federation / Weight class | 比赛 / 比赛日期 / 赛事方 / 体重级别 |
| Men / Women | 男子 / 女子 |
| Previously entered: {0} | 之前填写：{0} |
| Remove meet / Remove this meet? / Remove / Cancel | 移除比赛 / 移除这场比赛？ / 移除 / 取消 |
| Note to coach | 给教练的留言 |
| Add a meet (optional) | 添加比赛（可选） |
| Opens meet date, federation and weight class. Skip it if you are not competing. | 展开后填写比赛日期、赛事方和体重级别；不比赛可跳过。 |
| Nutrition / Coming soon / Carbs / Protein / Fat / Fiber | 营养 / 暂未开放 / 碳水 / 蛋白质 / 脂肪 / 膳食纤维 |

仓内已有等价文案的（如 `Cancel`、`Save`、`Completed`）复用已有键，不重复加。因本卡不再使用的旧键（是/否题那三条等）删掉，中英文目录同步。赛事方代码 `CPA` `IPF` `IPL` `WP` 与级别数字不翻译。

## 约束

- 零后端改动；不改 API schema（`src/api/domains/onboarding.ts`）；不改本地草稿存储结构；不加依赖。
- 存量照护照 SPEC「存量数据与升级」逐条落实，尤其：旧手填级别原样显示且只有保存才覆盖；给教练的留言不丢；只打开再取消不产生任何写入。
- 教练端、训练页、Today 的其他区块、Tab 栏不动。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam（先红后绿，只在这些边界）

1. `src/features/onboarding/model.ts`：第 7 步校验与 patch 的新口径（未展开不报错且 `is_competing=false`；展开缺项报错；齐全时三个字段正确；留言照旧提交）。
2. `src/features/profile/__tests__/editor.test.tsx`（沿用已有挂载方式）：`weight`、`competition`、`note` 三个编辑页各自只发出自己的字段；Meet 页缺赛事方或级别时不提交并标红；旧手填值显示 `Previously entered` 且取消不写；`Remove meet` 经确认后提交清空。
3. `src/features/dashboard/__tests__/week-calendar.test.tsx` 与 `visual-parity.test.tsx` / `use-dashboard.test.tsx`（已有）：选中状态跟随点选而当前训练日标记不动；概览卡对所选日给出名称、状态小标、动作数与组数、动作名一行，点卡把所选日交给训练页；当天已完成时概览卡仍在；体重卡两位小数；两张卡路由到 `weight` / `competition`；Meetday 卡显示级别行；营养占位卡存在且没有按压处理。
4. `src/features/profile/__tests__/model.test.ts`：`profileRowValues` 的 Meet 行、Note 行、两位小数体重；`profilePatch` 三个新白名单。

样式（颜色、间距）不写断言，由 Opus 在模拟器实屏验收。现有测试里因口径变化必须改的断言可以改，但要在 JOURNAL 里逐条列出改了哪条、为什么；不得为了变绿删测试或放宽与本卡无关的断言。

## 验收清单

以 SPEC「验收清单」全部条目为准（1a–1d、2a–2c、3a–3g、4、5、6），由 Opus 逐项收货，实装方不得增删范围。模拟器实屏、老用户升级第一屏、Light / Dark 与小屏大字号由 Opus 做；沙箱里跑不了模拟器就在 JOURNAL 如实写"未做设备验证"，并写清你认为最需要实屏确认的三处。

交付前跑通：`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。

## 返修一（2026-10-09，Opus 读全量 diff + 模拟器实屏后）

主体通过：升级后第一屏、周条双标记、概览卡跳训练页并在返回后重置、体重单项页（kg 与 lb）、Meet 编辑页（旧手填值、缺项拦截、保存、移除确认）、Profile 两行、营养占位，实屏均符合 SPEC。以下八项定向修，**不要动别的**；规则同前（不 commit / push，JOURNAL 追加「卡 B 返修一」，三项全量检查通过）。

1. **Profile 的基础信息行标题被改名了，恢复原样。** `profileTitles.basics` 改回 `student.myProfileView.copy009`（`Height / Body weight` / `身高 / 体重`），把这个键恢复进 `StudentKit.json`；编辑页标题仍是 `Basic information`。原因：屏幕稿转写时把这一行的现有标题写错了，属于范围外改名。相应测试断言改回。
2. **Basic information 页与引导第 1 步的体重字段标题恢复为现有的 `student.step1BasicsSection.copy003`（`Body weight`，非堆叠布局时后面仍带单位括号）。** 只有单项体重页用 `Weight`。给 `WeightSection` 加一个参数区分即可。
3. **概览卡单复数。** 实屏出现 `1 exercises · 3 sets`。动作数与组数各自处理单数（`1 exercise`、`1 set`），按仓内已有的 `.one` 后缀惯例（参照 `student.dashboardProfileMetricsView.copy005.one` 的用法）；中文不受影响。补测试：1 个动作 3 组、3 个动作 1 组。
4. **Meet 编辑页缺项提示语。** 现在缺赛事方或级别时显示的是通用的 `Failed to save. Try again`，会让人以为是网络失败。缺赛事方或级别时改为新文案：`Choose a federation and weight class` / `请选择赛事方和体重级别`；只有日期不合法时沿用现有提示。只改 Profile 的 Meet 编辑页；引导向导里的提示不动。补测试。
5. **学员端不要借用教练端命名空间的键。** `coach.planning.studentHeader.competition` 在 `profileTitles`、编辑页标题、引导区块标题三处被用来显示 `Meet`；新增 `student.rn.meet.title`（`Meet` / `比赛`）并替换这三处。
6. **级别网格尾行对不齐。** CPA 女子表最后一行只有 3 格时，每格比上面几行宽约 4px（实测 237 对 233）。尾行每格宽度要与满行一致，补位元素要和真实格子走同一套间距。
7. **级别块大字号下贴边。** 360×640 dp + 字体 1.3× 时 `140+ kg` 几乎贴到块的左右边。级别块与赛事方块的文字设为单行，并允许按现有做法略微缩小（如 `adjustsFontSizeToFit` + `minimumFontScale` 约 0.85），不得换行、不得截断。
8. **新加的 import 位置。** `DashboardScreen.tsx`、`OnboardingSteps.tsx`、`ProfileEditor.tsx`、`onboarding/model.ts`、`profile/model.ts` 里新 import 被插在文件最顶部、原有第一行之前；挪到各文件原有 import 分组里对应的位置（第三方 → `@/` → 相对路径，照该文件原来的顺序）。

## 返修二（2026-10-09，深色主题实屏后；最后一轮）

返修一交回的八项另行复核。深色主题（Profile → Appearance → Dark）实屏发现两处，只修这两处：

9. **深色下 Meet 页的选中块看不出来。** 选中的赛事方 / 级别块用的是 `colors.ctaFill`，它在深浅两套主题里都是深藏青（`#111827`），深色主题下与未选中的块几乎同色。改用随主题变化的那一对：底色 `colors.ctaBackground`、文字 `colors.ctaText`、描边同底色（浅色下仍是深底白字，深色下是金底深字，与页面上的 Save 按钮同一套）。
10. **深色下几处浅底衬不出来。** 用了 `colors.bgStack` 做底的四处——概览卡的 `Upcoming` 小标、营养卡的 `Coming soon` 小标、营养卡的四个小格——在深色卡片上看不到底色。改用 `colors.surfaceRaised`（浅色下与现在同色，深色下可见）。`Today's session` 小标（`goldSoft`）不动。

规则同前：不 commit / push，JOURNAL 追加「卡 B 返修二」，三项全量检查通过。样式改动不要求新测试；若现有断言里写死了旧 token 名，同步改并在 JOURNAL 列出。
