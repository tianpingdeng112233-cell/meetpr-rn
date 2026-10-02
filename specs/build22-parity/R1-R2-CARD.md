# 任务卡 R1 + R2：补齐 Profile 编辑字段、训练页历史入口、教练数字角标

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、`specs/build22-parity/SPEC.md`、`docs/ios-parity-audit-2026-09-25.md` 的 P2-12 / P2-13 / P2-14 / P-33 四条。

- 级别：T1。来源：2026-09-25 全面核对的修复卡 R1、R2；David 2026-10-02 批准先修这两张再做真机走查。
- 基线：RN `audit/full-ios-parity-20260925@a203d9c`（业务代码同 `d818bf8`）；iOS 固定 `beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea`，本机只读仓 `/Users/david/Projects/apps/MeetPR`，用 `git show <sha>:<path>` 读。
- 这是 Opus 派的实装卡：在当前分支 `fix/parity-r1-r2` 上改，**不 commit、不 push**；只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节，`PARITY.md` 与走查清单由 Opus 收货后更新。
- 目标是复刻固定 iOS 已有行为，不新增产品能力。合成一张卡是因为四处都是 9/25 同一轮核对的小缺口、同一次真机走查前要一起验；改动面互不重叠。

## 改动一（P2-13）：基础资料编辑面补单位 / 性别 / 生日

参照 `docs/evidence/parity-20260925/ios-basics-edit.jpg`，iOS `.basics` 直接复用入组向导 Step1（`Features/MyProfile/ProfileCardsSection.swift` 的 `fields`，`Features/Onboarding/Steps/Step1BasicsSection.swift`）。页面自上而下：

1. Units：两段分段选择（Kilograms · Centimeters / pounds · inches）
2. Gender：三个并排选项（Male / Female / Other）
3. Date of birth：日期滚轮
4. Height：输入框 + 单位后缀
5. Body weight：输入框 + 单位后缀

RN 现状：`src/features/profile/ProfileEditor.tsx` 的 `sections.basics` 映射到 `BodyMeasurementsSection`，校验只保留 `heightCm` / `weightKg`；`src/features/profile/model.ts` 的 `profilePatch` 在 `basics` 分区只放行 `height_cm`、`weight_kg`。

要求：basics 编辑面呈现与 iOS 相同的五个字段和顺序，复用 `src/features/onboarding/OnboardingSteps.tsx` 里向导第 1 步已有的控件、文案键与校验；提交放行 `unit_preference`、`gender`、`birth_date`、`height_cm`、`weight_kg`。切换单位沿用向导现有语义（数值含义不变，输入文本按新单位重新初始化）。

## 改动二（P2-12）：Meet / notes 编辑面补教练备注

参照 `docs/evidence/parity-20260925/ios-meet-edit.jpg`，iOS `CompetitionFieldsSection`（`Features/Onboarding/Steps/Step7ExtrasSection.swift`）自上而下：备赛选择（No / Preparing for a meet）→ Meet date → Target weight class (optional) → `Anything to tell your coach? (optional)` 多行输入 → Save。

RN 现状：Profile 的 `CompetitionSection` 没有备注输入，`profilePatch` 对应分区也没有放行 `note_to_coach`；向导第 7 步已有 `noteToCoach` 的多行输入与文案键。

要求：Profile 的 Meet 编辑面在级别之后增加同一个备注输入（复用向导控件和文案键），该分区提交放行 `note_to_coach`。

## 改动三（P2-14）：训练页恢复文字版历史入口

参照 `docs/evidence/parity-20260925/ios-training.jpg` 与 RN 现状 `student-training.png`。iOS 页头区结构：第一行 wordmark；第二行左侧 `W#D#` 标题、右侧三个圆形按钮（刷新、readiness 心形、消息）；**页头下方单独一行、靠右**：金色时钟图标 + `Training history` 文字 + 右向 chevron，整行可点。

RN 现状：`src/features/training/TodayWorkoutView.tsx` 约 820 行把历史做成页头按钮组里的第四个图标，没有文字。

要求：把历史入口从页头图标组移出，改为页头下方靠右的独立一行（金色图标 + 既有文案键 `training22.history` 的文字 + chevron），导航目标 `/training-history` 不变。页头按钮组回到三个。命中区域不小于 44dp，保留 `accessibilityRole` 与可读标签。

## 改动四（P-33）：教练底栏角标显示数字

iOS `Modules/DesignSystem/Sources/DesignSystem/Components/Navigation/MeetPRTabBar.swift`：`item.badge > 0` 时显示 `TabUnreadBadge`，内容为数字，超过 99 显示 `99+`，mono 9 粗体白字、胶囊底。

RN 现状：`src/app/(coach)/(tabs)/_layout.tsx` 给 `TabBar` 传了 `badgeDot`，数字被隐藏；`src/design/TabBar.tsx` 已有数字与 `99+` 分支。

要求：教练底栏不再传 `badgeDot`，Messages 与 Students 两个 tab 的角标显示数字；0 不显示，>99 显示 `99+`，不遮挡图标。计数来源、tab 顺序、学员端底栏行为都不动。若去掉后 `badgeDot` 在全仓已无调用方，保留该 prop 不删（本卡不做清理）。

## 约束

- 只提交所编辑分区的字段：不得把其他分区的空值、三项 1RM（`squat_1rm_kg` / `bench_1rm_kg` / `deadlift_1rm_kg`）或既有资料覆盖掉；1RM 的结构性锁定保持。
- 取消不写；保存失败保留用户输入并可重试；保存成功后重开能回读。
- 不改导航目标、计数来源、Tab 顺序、后端 schema；不加依赖；文案优先复用现有翻译键，确需新增时中英文目录同步并通过现有 i18n 守卫。
- 颜色、字号、间距只用 `src/design` 现有 token。
- 守仓内 eslint 与 TypeScript 配置（唯一事实源是仓内配置）。

## 测试 seam（先红后绿，只在这些边界加测试）

1. `profilePatch`（`src/features/profile/__tests__/model.test.ts`）：basics 分区输出恰好五个字段；competition 分区包含 `note_to_coach`；任何分区都不输出三项 1RM；其他分区字段不泄漏。
2. `ProfileEditor` 用户输入 → 捕获到的 onboarding mutation 入参：改单位/性别/生日并保存；填备注并保存；保存失败后输入仍在。
3. 教练 tab 壳：给定计数 0 / 1 / 120，渲染出无角标 / `1` / `99+`（复用现有 TabBar 或教练壳测试的渲染方式）。
4. 训练页：历史入口以文字呈现且按下后跳转 `/training-history`（复用现有训练页测试的路由 mock）。

纯布局不写镜像样式的测试。

## 验收清单（Opus 收货时逐项核，实装方不得自定范围）

- [ ] P02 基础资料：五个字段齐全、顺序与 iOS 一致；改单位、性别、生日后保存，返回再进回读一致；身高体重无回归；1RM 卡数值不变。
- [ ] P03 Meet / notes：备注可输入多行、保存、重开回读；取消不写；失败保留输入；备赛选择/日期/级别无回归。
- [ ] T02 历史入口：页头下方靠右有可读的 `Training history` 文字行；页头按钮剩三个；进入历史再返回，训练日、当前组和休息倒计时保持。
- [ ] C02 教练角标：0 隐藏；1、两位数显示数字；>99 显示 `99+`；不遮图标；学员端底栏不受影响。
- [ ] 以上四处在 Light 与 Dark 下均可读；360×640 dp 与 1.3 倍字体下不截断、不遮挡 Save。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过；新增测试能说明先红后绿。

模拟器实屏与截图由 Opus 在收货时做；Codex 侧如果沙箱没有 ADB，如实写"未做设备验证"，不要声明通过。

## Out of Scope

视频剪辑（R3）、烧录导出、完成页 `0/1` 与 `All completed` 并存的问题、训练算法、教练权限、后端 schema、资料迁移、收件箱排序、Tab 重构、`badgeDot` 清理、任何 iOS 上没有的新入口。

## 返修 1（2026-10-02，Opus 实屏收货后退回）

收货环境：AVD `meetpr` + 本地合成 API，Light/Dark、360×640 dp @1.3 倍字体。四处改动的字段、顺序、保存回读、取消不写、失败保留、历史往返保持、数字角标与 `99+` 均已实屏通过。退回两处，只改这两处：

1. **Dark 下 Units 分段控件看不出选中项**。`src/features/onboarding/controls.tsx` 的 `selectedSegment` 用 `surfaceCard`，轨道用 `bgStack`；这两个 token 在 Dark 下几乎同色，选中与未选中无法区分（Light 正常）。要求：选中段在 Light 与 Dark 下都与轨道有清楚的明度差，选中文字用主文字色、未选中用次级文字色；只用 `src/design` 现有 token（可按主题取不同 token），不新增色值，不改 `wrap` / `row` 两种既有布局的外观。
2. **Profile 编辑页标题与 iOS 不一致**。iOS `ProfileCardsSection.swift` 的 `EditKind.title` 用 `profileCardsSection002`–`008`（basics = "Basic information"，competition = "Meet / notes"）；RN `ProfileEditor.tsx` 的 `profileTitles` 用的是 Profile 行标签的键（实屏显示 "Height / Body weight"、"Meet date"）。要求：七个分区的编辑页标题逐一对照 iOS `EditKind.title` 取对应的已有翻译键；Profile 列表里的行标签不动。

测试 seam：沿用 `ProfileEditor` 的现有测试，补"basics / competition 编辑页标题"两条断言即可；分段控件属纯样式，不写镜像测试。

验收（Opus 复验）：
- [ ] Dark 与 Light 下 Units 选中段一眼可辨；Gender 等其他选择控件外观无变化；向导第 1 步外观无变化。
- [ ] basics 编辑页标题为 "Basic information"，competition 为 "Meet / notes"，其余五个分区与 iOS 对应；Profile 列表行标签不变。
- [ ] 全量 jest、tsc、lint 通过。

仍然不 commit、不 push；在 `docs/CODEX-JOURNAL.md` 本卡一节后追加返修记录。
