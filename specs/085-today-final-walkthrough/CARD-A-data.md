# Spec 085 · 卡 A（安卓）：数据层——级别表、比赛写入口径、体重两位小数

开工先读仓内 `CONTEXT.md`（如存在）、`AGENTS.md`、`specs/085-today-final-walkthrough/SPEC.md` 的 §2「存储」、§3「写入口径」「级别表」、「存量数据与升级」「测试 seam」。

- 级别：T1。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-085`，分支 `feat/085-today-final-walkthrough`（基线 `main@aeb1020`）。
- 这是 David 2026-10-09 批准的新口径，不属于"1:1 复刻 build 22"，不受身份卡"v1 严禁夹带新功能"约束。
- 本卡**只加纯函数与测试，不接界面**：不改任何现有文件的行为，不动 `src/features/onboarding/model.ts`、`OnboardingSteps.tsx`、Dashboard、Profile 的现有代码，不加文案，不加依赖。界面接线是卡 B（等屏幕稿定稿后另派）。做完后 App 的可见行为必须与基线完全一致。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开，不写账号、密钥。

## 要做的三块

### 1. 级别表与格式：`src/domain/meet/weight-class.ts`（新建）

导出（命名可微调，语义不可变）：

- `MEET_FEDERATIONS`：`['CPA', 'IPF', 'IPL', 'WP'] as const`，以及类型 `MeetFederation`。
- `MeetSex`：`'male' | 'female'`。
- `weightClassesFor(federation, sex): readonly string[]`：返回该赛事方该性别的公开组级别，元素是不带单位的字符串，顺序从轻到重，表内容**逐项**照 SPEC「级别表」：

| 赛事方 | male | female |
|---|---|---|
| IPF | 59 66 74 83 93 105 120 120+ | 47 52 57 63 69 76 84 84+ |
| WP | 62 69 77 85 94 105 120 120+ | 48 53 58 64 72 84 100 100+ |
| IPL | 52 56 60 67.5 75 82.5 90 100 110 125 140 140+ | 44 48 52 56 60 67.5 75 82.5 90 100 110 110+ |
| CPA | 52 56 60 67.5 75 82.5 90 100 110 125 140 140+ | 44 48 52 56 60 67.5 75 82.5 90 100 100+ |

- `formatMeetClass(federation, weightClass): string`：`IPF · 83 kg`（赛事方代码、空格、间隔号 U+00B7、空格、级别、空格、`kg`）。级别不在该赛事方任一性别的表内时抛错（调用方的编程错误）。
- `parseMeetClass(text: string | null | undefined): { federation: MeetFederation; weightClass: string } | null`：只认上述格式（首尾空白可容忍）。以下一律返回 `null`：空值、旧的手填值（`83kg`、`-93`、`IPF 83`）、只有赛事方代码（`IPF`）、赛事方不在四家之内、级别不在该赛事方任一性别的表内。
- `meetClassTableSex(federation, weightClass, profileGender): MeetSex`：编辑页决定显示哪张表用。`profileGender` 为 `'male'` / `'female'` 时直接返回它；为 `'other'` / `null` / `undefined` 时：`weightClass` 只出现在该赛事方的一张表里就返回那张，其余情况返回 `'male'`。

### 2. 比赛的写入口径：`src/features/onboarding/meet.ts`（新建）

- `meetPatch({ competitionDate, federation, weightClass })` → `{ is_competing: true, competition_date, target_weight_class: formatMeetClass(...) }`。
- `removeMeetPatch()` → `{ is_competing: false, competition_date: null, target_weight_class: null }`。
- `invalidMeetFields({ competitionDate, federation, weightClass }, now = new Date())` → 缺项或非法项的列表，元素取自 `'competitionDate' | 'federation' | 'weightClass'`：日期超出现有 `onboardingDateBounds(now).competition` 范围 → `competitionDate`；未选赛事方 → `federation`；未选级别或级别不在该赛事方任一表内 → `weightClass`。三项齐全合法时返回空数组。
- 返回值的类型要能直接交给现有的 `useUpsertOnboarding`（即兼容 `OnboardingUpsertInput`），不新建 DTO。

### 3. 体重两位小数：`src/domain/profile/body-weight.ts`（新建）

- `bodyWeightInput(text: string): string`：输入过滤。只留数字与第一个小数点，小数点后最多两位（第三位丢弃）。
- `bodyWeightKgFromInput(text: string, unit: 'kg' | 'lb'): string`：把输入框文字换成要存的 kg 字符串。`kg` 原样（去掉多余的尾随小数点）；`lb` 除以 `2.2046226218` 后四舍五入到两位。结果不是有限正数或 ≥ 500 时返回空字符串（表示不可保存）。
- `bodyWeightInputFromKg(kg: string | null | undefined, unit: 'kg' | 'lb'): string`：把存量 kg 值换成输入框初值。`kg` 去掉无意义的尾随零（`83.00` → `83`、`83.50` → `83.5`）；`lb` 乘以系数后四舍五入到两位，同样去尾随零。空或非法返回空字符串。
- `formatBodyWeightKg(value: string | number): string`：展示用，固定两位小数（`83` → `83.00`、`83.5` → `83.50`、`83.256` → `83.26`）。

## 约束

- 纯 TypeScript、无副作用、不读写存储、不调用 `t()`；不改后端契约与本地持久化结构。
- 守仓内 eslint 与 TypeScript 配置；测试放各自目录的 `__tests__/` 下，沿用仓内 jest 写法。
- 发现 SPEC 与本卡冲突，以 SPEC 为准并在 JOURNAL 里写明；发现 SPEC 自身有矛盾，停下写进 JOURNAL，不要自行裁决。

## 测试 seam（先红后绿，只在这三个新文件的导出函数上）

1. `weight-class`：四家 × 两性别的表与上表逐项相等；`format` → `parse` 往返（含 `120+`、`67.5`、`100+`）；上面列出的每一种"返回 null"的输入；`meetClassTableSex` 的四种分支（男、女、未填且唯一归属、未填且两表都有或都没有）。
2. `meet`：`meetPatch` / `removeMeetPatch` 的三个字段；`invalidMeetFields` 的每种缺项、日期越界、三项齐全。
3. `body-weight`：过滤（`83.256` → `83.25`、`8a3..2` → `83.2`）；kg 与 lb 的换算（`183.25` lb → `83.12`）；读回值再保存 kg 不变（对 `183.26` lb：存 → 读回 → 再存，两次 kg 相等）；`0`、空、`500` 判为不可保存；`formatBodyWeightKg` 的三例。

在 JOURNAL 里按仓内惯例列出每条测试的红 → 绿与原始日志位置。

## 验收清单（Opus 收货，逐项核）

- [ ] 级别表与 SPEC 逐项一致（Opus 另行逐格比对，不只看测试）。
- [ ] `parseMeetClass` 对旧手填值、只有赛事方代码、表外级别都返回 `null`。
- [ ] 体重换算与过滤符合上面的每个例子。
- [ ] `git status` 只有三个新源文件、它们的测试文件与 `docs/CODEX-JOURNAL.md`；没有现有源文件被改。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。
