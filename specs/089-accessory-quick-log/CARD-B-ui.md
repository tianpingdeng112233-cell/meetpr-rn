# Spec 089 · 卡 B（安卓，界面）：辅助项记录卡、写入接线、Profile 休息时长

开工先读仓内 `CONTEXT.md`、`AGENTS.md`、`specs/089-accessory-quick-log/SPEC.md` **全文**（行为定义、存量照护、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点），以及 `docs/CODEX-JOURNAL.md` 里卡 A 一节的"导出函数签名一览"。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-089`，分支 `feat/089-accessory-quick-log`，在卡 A 的提交之上继续。
- David 2026-10-09 已对屏幕稿「定稿」。屏幕稿你打不开，结构与文案已转写在 SPEC「屏幕稿」一节。稿只管布局／层级／间距：颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件，不新造一套样式，不写死色值。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。
- 零后端改动；不改 API schema；不加依赖。

## 必须复用卡 A 的纯函数（不要重写一份）

`src/features/training/accessory-quick-log.ts`（及卡 A 在 `settings/rest-timer.ts`、`training/policy.ts` 里新增的导出）：辅助项判定、行模型、能否记录、请求体、全部完成的选择、辅助项休息时长。函数名与签名以卡 A 的 JOURNAL 为准。卡 A 的函数若缺一个界面必需的输入 / 输出，可以在不改变既有测试断言的前提下扩展，并在 JOURNAL 写明。

## 要做的三项（安卓落点）

### §1 辅助项记录卡

- 新组件放 `src/features/training/`（如 `AccessoryLogCard.tsx`），由 `WorkoutBody.tsx` 在"记录态 + 可编辑 + 当前动作是辅助项"时渲染，取代该状态下 hero 卡里的大号重量、处方行、上次成绩行、`Log this set` 与摄像机按钮；标题行、`Ask coach`、086 的教练备注淡金块、左侧金色竖条保持。其他状态（主项 / 主项变式、只读预览、已完成详情、未开始汇总卡）一行都不要变。
- 当前动作是否辅助项：`isAccessoryExercise(exerciseType)`，类型取自动作库的 `exercise_type`。现有的动作元数据解析（`createExerciseMetadataResolver` 的返回值）不带这个字段——在解析结果里补上 `exerciseType`（动作库里查不到时为 null），不要用计划里的 `is_main_lift` 代替。
- 行数据：这个动作的全部 `WorkoutSetDraft` + 上一次训练同动作的记录（页面里已有 `historyLogs`，"上次"的取法与现有 `reference()` 那行一致地取同一次训练，按组序对应）+ 单位偏好 → 卡 A 的行模型。
- 行内编辑态（重量 / 次数 / RPE 文本）放组件本地状态，以 `stableSetId` 为键；服务器记录回来后以记录为准重置该行。数字键盘：重量与 RPE 用小数键盘，次数用整数键盘；输入过滤沿用现有的重量 / 次数 / RPE 输入规则（先找 `set-entry-weight.ts`、`set-entry-rpe.ts` 与 `SetEntrySheet` 里的过滤函数复用）。
- 点"上次"格：把该行的重量与次数填成上次的值（不直接记录）。
- 点组号：调用页面里现有的"打开该组完整录入页"的入口（`onRecord(draft)`）。组有视频时组号按钮里显示视频标记——视频状态的取法与下方分动作组表里现有的视频标记一致。
- 软键盘弹出时保证正在编辑的行可见（沿用页面现有 `ScrollView` 的键盘处理方式，不引入新库）。
- 读屏：每个输入框有"第 n 组 重量 / 次数 / RPE"标签；✓ 按钮按状态读"完成第 n 组" / "取消第 n 组"；置灰时读出原因（需要重量）。

### §2 写入：✓、取消、全部按计划完成

- 卡 A 的 `accessoryLogRequest` 默认是记录；取消要显式传 `action: 'cancel'`（它会在该行不可取消时抛错，调用前先按行状态与视频标记判断）。
- 逐组 ✓：用卡 A 的请求体，经页面里现有的保存路径提交（与 `SetEntrySheet` 的 "Complete set" 走同一个保存函数 / mutation 与同一套失败提示、缓存更新、PR 提示、埋点；不要另开一条直连 API 的路）。提交期间该行 ✓ 显示进行态并禁用。
- 成功后起休息计时：时长用卡 A 的 `resolveAccessoryRestSeconds`（教练 `rest_seconds` → 学员辅助项设置 → 60）；若这是该动作最后一个未记录的组则不起。休息计时条、通知沿用现有调用。首次"休息时间跟 RPE 走"的说明弹层在辅助项场景不触发。
- 取消：对已完成的行点 ✓ → 提交 `completed:false` 的请求体。该组有视频（含上传中）时不提交，改为提示 `This set has a video. Open the set to manage it`（中文"这组带有视频，请点组号进入处理"），用现有的轻提示组件。
- 全部按计划完成：用卡 A 的选择函数，按组序逐条提交（复用 `quick-log.ts` 里已有的串行提交思路或 `serial-task-queue.ts`，中途失败即停，已写的保留）；不起休息计时；有跳过行时显示 `{n} sets still need a weight`（单数 `1 set still needs a weight`；中文"还有 {n} 组需要填重量"）。进行中主按钮显示进行态并禁用，行内 ✓ 同时禁用。
- 全部组记完后，hero 卡按现有的"切到下一个动作"逻辑前进；当天全部记完后的长按结算、庆祝页不动。

### §3 Profile → Rest between sets

- `src/features/settings/RestTimerSettingsScreen.tsx`：按 SPEC「屏幕稿 · 3」加两个小节标题和 `Accessory exercises` 卡；加减按钮每次 15 秒，边界置灰；改动即保存（沿用本页现有的保存方式与失败提示）。切换"自动 / 自定义"模式时必须把已有的辅助项时长带过去（卡 A 的持久化两种形态都能存，但本页现在的切换逻辑不带它）。页底说明文字按转写改为复数。
- Profile 列表里 `Rest between sets` 那一行的摘要值保持现状（不追加辅助项时长）。

## 文案

所有新文案进 i18n 目录，**中英文都要有**，键的放法照仓内现有惯例，过 i18n 守卫测试。英文原文以 SPEC「屏幕稿」转写与本卡为准；中文对应：

| 英文 | 中文 |
|---|---|
| Accessory | 辅助项 |
| bodyweight（副标题里） | 自重 |
| Set / Last / Reps / RPE / Done（表头；KG / LB 不译） | 组 / 上次 / 次数 / RPE / 完成 |
| BW | 自重 |
| RIR {0}（占位） | RIR {0} |
| Tap a set number to record video or mark it failed | 点组号可拍视频或标记未完成 |
| Complete all as planned | 全部按计划完成 |
| {0} sets still need a weight / 1 set still needs a weight | 还有 {0} 组需要填重量 |
| This set has a video. Open the set to manage it | 这组带有视频，请点组号进入处理 |
| Main lifts and variations / Accessory exercises | 主项与主项变式 / 辅助项 |
| Rest after each set / 30 sec to 5 min | 每组后休息 / 30 秒到 5 分钟 |
| 读屏：Set {0} weight / reps / RPE；Complete set {0}；Undo set {0}；Set {0} details；Use last time for set {0}；15 seconds less / more | 第 {0} 组重量 / 次数 / RPE；完成第 {0} 组；取消第 {0} 组；第 {0} 组详情；第 {0} 组填入上次数值；减少 / 增加 15 秒 |

仓内已有等价文案的复用已有键，不重复加。

## 约束

- 主项与主项变式的 hero 卡、`SetEntrySheet`、补记（`QuickLogSheet`）、分动作组表、训练日结算与撤销、教练端、Today 页、Tab 栏不动。
- 不引入"快速记录"专用的记录类型、标记或埋点事件名；写入就是普通记录（沿用现有事件）。
- 存量照护照 SPEC「存量数据与升级」逐条落实，尤其：解析不到类型的动作走完整录入；旧偏好没有辅助项字段时为 60 秒且主项设置原样保留。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam（先红后绿，只在这些边界）

1. `src/features/training/__tests__/` 新增记录卡渲染测试（挂载 `WorkoutBody` 或新组件）：辅助项出现表格、主项不出现；预填 / 占位 / `BW` / 置灰 ✓ / 视频标记；提示行存在；点"上次"填入；点组号调用 `onRecord`。
2. 写入：在已有能挂载训练页的测试方式里（`set-save.test.tsx` / `completion-entry.test.tsx`）补——点 ✓ 发出的请求体（RPE 没填时不带值）；成功后起计时且时长为 60 / 学员设置 / 教练设置三种；最后一组不起；取消发出 `completed:false`；带视频的组取消时不发请求并出提示；全部按计划完成的逐条提交、跳过提示、中途失败停下且已写的保留。
3. `src/features/settings/__tests__/settings-screens.test.tsx`：新一段的渲染、加减与边界、保存后的偏好值；旧偏好（无字段）显示 `1:00` 且保存后原有字段不变。
4. 现有 `set-save` / `completion-entry` / `quick-log-entry` / `set-ref-entry` / `rest-timer` / `workout-coach-notes` 测试保持通过；因口径变化必须改的断言逐条写进 JOURNAL，不得为了变绿删测试或放宽无关断言。

样式（颜色、间距、列宽）不写断言，由 Opus 在模拟器实屏验收。

## 验收清单

以 SPEC「验收清单」全部条目为准（1–13），由 Opus 逐项收货，实装方不得增删范围。模拟器实屏、老用户升级第一屏、Light / Dark、小屏大字号、软键盘遮挡由 Opus 做；沙箱里跑不了模拟器就在 JOURNAL 如实写"未做设备验证"，并写清你认为最需要实屏确认的三处。

交付前跑通：`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。SPEC 与本卡冲突以 SPEC 为准并在 JOURNAL 记录；需要产品取舍的地方停下写进 JOURNAL，不自行裁决。

## 返修一（2026-10-10，Opus 模拟器收货后）

首轮实屏通过：主项卡不变、辅助项表格、逐组 ✓ 与取消、行内改数字覆盖、RPE 选填、全部按计划完成与跳过提示、自重 + RIR、点组号进完整录入、三级休息时长、最后一组不起计时、Profile 新段落与切换模式保留时长、训练到一半的账号首屏、360×640 dp + 1.3× 六列不截字。以下六处返修：

1. **"上次"列把本次训练当成了上次**（缺陷）：记了本动作任意一组后，已记那行的"上次"变成刚记的数字，其余行变 `—`、重量占位也消失。`WorkoutBody.tsx` 里取 `previousLogs` 时必须排除当前训练日这个动作自己的记录（`plan_exercise_id === active.exercise.id`），"上次" = 这个动作在**此前**最近一次训练里的记录。证据：`/Users/david/Projects/scratch/rn-089-accessory-20261010/ui/03-crop.png`、`08-crop.png`。先红后绿：挂载测试里先记一组，再断言各行"上次"与占位不变。
2. **空重量一上来就标红**：教练没给重量的组，首屏三个重量框全是红框，像报错。改为：重量为空且学员没动过 → 普通描边、✓ 置灰；只有"输入了不合法的值"或"点过『全部按计划完成』后被跳过的行"才标红。
3. **已完成行不要显示预设占位**：已完成且没记录 RPE 的行，RPE 格留空，不显示教练预设的灰字（现在看起来像记了 RPE 8）。未完成的行照旧显示占位。
4. **自重组的"上次"**：上次记录来自自重组时显示 `BW × 8`（中文"自重 × 8"），不是 `0 × 8`；点它只回填次数。
5. **输入框聚焦态**：正在编辑的输入框用深色描边（与仓内其他输入框的聚焦样式一致），现在聚焦与未聚焦看不出区别。
6. **主按钮文字换行时居中**：小屏大字号下 `Complete all as planned` 折成两行且左对齐；折行时文字居中（若 `AppButton` 已支持就用其现有属性，不要改它对其他调用方的表现）。

只动这六点相关的文件；测试先红后绿（第 1、2、3、4 点），日志存 `/private/tmp/rn-089/b-r1/`；JOURNAL 追加"返修一"小节；不 commit、不 push；交付前重跑三条命令。
