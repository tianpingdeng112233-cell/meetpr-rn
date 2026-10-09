# Spec 088 · 实装卡 1（安卓）：Profile 首页改为身份摘要卡 + 五行，三个二级页

开工先读仓内 `AGENTS.md`、`specs/088-profile-redesign/SPEC.md` **全文**（行为定义、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点）。本卡只做 SPEC 的**第一步**：§1、§2、§3，验收 1–12。§4 头像上传、§5 教练端、验收 13–24 不在本卡。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-088`，分支 `feat/088-profile-redesign`（叠在 `feat/085-today-final-walkthrough@dd946b6` 上，085 改过的 Profile 行为是本卡的起点）。`node_modules` 是指向主仓的软链，不要重装依赖。
- 这是 David 2026-10-09 拍板并「定稿」的新结构，不属于"1:1 复刻 build 22"，不受身份卡"v1 严禁夹带新功能"约束；除本卡所列外不得顺手改别的。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥、真实邮箱。
- 后端零改动：**不新增任何请求**。页面数据全部来自现有的东西——`useSessionStore` 里的 `user`（`email` / `phone`）、`useOnboardingProfile`、`useMineBindRequest`（`src/api/domains/bind.ts`，取 `bind_request.status === 'accepted'` 时的 `coach_display_name`）、`useReadiness`、`useRestPreference`、`useReminderPreference`。不要去读登录响应里的 `name`（后端从不返回），不要调用 `GET /me`（那是第二步）。
- 屏幕稿你打不开，结构与文案已转写在 SPEC「屏幕稿」一节。稿只管布局／层级／间距：颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件，不新造一套样式，不写死色值。
- SPEC 没写的产品口径不要自己定：记进 JOURNAL 的"待 Opus 决定"并跳过那一点。

## 复用 087 的两个组件（避免两套行样式）

spec 087（Progress 列表入口，PR #83，尚未合并，本分支里没有）已经做了同款的行与二级页导航行。把这两个文件**逐字节原样**取到本分支的同一路径，不要改它们的内容（两个 PR 先后合并时相同内容不冲突）：

```
git show origin/feat/087-progress-menu:src/features/history/ProgressMenuRow.tsx  > src/features/history/ProgressMenuRow.tsx
git show origin/feat/087-progress-menu:src/features/history/ProgressPageHeader.tsx > src/features/history/ProgressPageHeader.tsx
```

- 首页五行用 `ProgressMenuRow`（`Settings` 行 `value` 传空串）。三个二级页的导航行用 `ProgressPageHeader`。
- 需要不同行为时在 profile 目录里另包一层，不改这两个文件。如果这两个文件依赖了本分支没有的东西（token、文案键），停下把缺的东西记进 JOURNAL 并回报，不要自己改它们来适配。

## 要做的三项（安卓落点）

### §1 首页

- `src/features/profile/MyProfileScreen.tsx`：页面改成 现有页头 + 身份摘要卡 + 五行 + 失败时的重试行，保留下拉刷新。
- `src/features/profile/MyProfileHeader.tsx`：去掉大标题下面那行副标题（`student.myProfileView.copy017`）。
- 新建身份摘要卡组件（放 `src/features/profile/`），结构按「屏幕稿 · 1」：
  - 头像位第一步是纯展示的首字母圆，**不可点**，不要留任何上传入口或占位角标；但组件的入参要让第二步能传入图片地址与点击回调而不改布局。
  - 名字位：`user.email`，没有则 `user.phone`，都没有则这一行不渲染。
  - 教练行：只在绑定记录 `status === 'accepted'` 且 `coach_display_name` 非空时渲染 `Coach · {name}`。绑定数据加载中或失败时不渲染这一行，不显示占位与报错。
  - 四格数值用现有 `oneRMValues(profile)`（`model.ts`），不改它的算法。三项标签复用 `coach.planning.lift.squat` / `.benchPress` / `.deadlift` 的现有文案**会得到 `Bench Press`**，稿上是 `Bench`：新增短标签键（见文案表），不要改现有键。
  - 锁定说明行与四格区域整体是一个可点区域，点击弹出现有的说明弹窗（现在 `MyProfileOneRMCard` 里 `Alert.alert(copy019, copy020)` 那个），文案不改。
- `MyProfileOneRMCard`、`MyProfileRecoveryRow`（`MyProfileCards.tsx`）在首页不再使用；确认没有别的调用方后删除，连同只为它们服务的样式。`copy017` / `copy018` / `copy021` / `copy022` / `copy023` / `copy003` / `copy006` / `copy010` / `copy014` 这些文案键不再被引用时**从目录里删掉还是留着**，按仓内 i18n 守卫测试的要求办（守卫要求无孤儿键就删，不要求就留）。
- 首字母、名字位回落、五行右侧值都做成纯函数放 `src/features/profile/model.ts`：
  - 首字母：SPEC §1 的规则（两个词取两个首字母；单个词取一个；中日韩取第一个字；邮箱取 `@` 前第一个字符；一律大写；空输入返回空串，此时头像圆内不显示文字）。
  - About me 值：现有 `profileRowValues(profile).basics` 的内容，但两项都没填时是 `—` 而不是 `Not provided`。
  - Health & recovery 值：现有 `injurySummary(profile.injury_areas)`。
  - Meet 值：现有 `competition` 行的值；没设是 `—`。
  - Note to coach 值：`note_to_coach` 去空白后非空 → `Added`，否则 `—`。
- 行的点击：About me、Health & recovery、Settings 走新路由（见 §2）；Meet 与 Note to coach 直接打开现有 `ProfileEditor`（`section="competition"` / `"note"`），与现在点对应行的行为相同。
- 状态（SPEC §1「状态」）：
  - 加载中：身份卡与五行立即渲染，四格与右侧值为空（不是 `—`）；去掉现在那三块灰色骨架卡与转圈。
  - 失败：四格与右侧值为空，列表下方一行现有的 `student.myProfileView.copy002`，点击重试。
  - 无档案（`profile.data` 为空且不在加载、没有失败）：身份卡照常（四格 `—`），第 1–4 行换成现有那张 `student.myProfileView.copy001` 提示卡，`Settings` 行保留。
  - 三种状态下 `Settings` 行都可点并能走到 `Sign out`。
- `MyProfileFallbackRows` 现在承担"档案没加载出来时仍能改偏好与退出"，新结构里这件事由 `Settings` 行承担；确认行为被覆盖后删除它。
- `src/app/(student)/profile.tsx` 的 `edit` / `returnTo` 参数处理**不要动**；带 `edit=weight | competition | note | basics` 进入时的行为与现在逐一相同。

### §2 三个二级页（新路由）

- 新建路由文件（只做 re-export，照 `src/app/training-history.tsx` 的写法），并在 `src/app/_layout.tsx` 的根 Stack 里与 `training-history` 并列注册（无系统导航栏，页面自己画导航行）：
  - `src/app/profile/about.tsx` → `src/features/profile/ProfileAboutScreen.tsx`
  - `src/app/profile/health.tsx` → `src/features/profile/ProfileHealthScreen.tsx`
  - `src/app/profile/settings.tsx` → `src/features/profile/ProfileSettingsScreen.tsx`
- 三页各自用现有 hooks 取数（查询有缓存，不会多打请求）；加载与失败态沿用 `TrainingHistoryScreen` 现在的写法（导航行 + 加载文案 / 失败与重试）。`Settings` 页不依赖档案：档案加载失败时偏好与账号两段照常可用，只有 `Training reminders` 需要的 `training_days` 取不到时按现在 `MyProfileFallbackRows` 的做法处理（不传）。
- 二级页卡内的行：新建一个行组件（名称在上、灰色值在下、右侧箭头），按「屏幕稿 · 2」；不要复用 `MyProfileValueRow` 现在"小灰标签 + 大粗值"的样式。`MyProfileValueRow` 若因此没有调用方了就删；账号安全那三行（`AccountSecuritySection`）改用 Settings 页的单行样式。
- About me：四行，值取 `profileRowValues(profile)` 的 `basics` / `background` / `environment` / `muscles`；第一行名称用 `student.profileCardsSection.copy002`（`Basic information`）。点行 → 在本页上打开现有 `ProfileEditor` 对应 `section`。
- Health & recovery：两行。
  - `Recovery assessment`（`student.myProfileView.copy004`）：值 = 今天有打卡用 `readinessSummary(checkin)`，否则 `recoverySummary(profile)`，用 ` · ` 连接；空则 `Not provided`。点行 → 现有 `ReadinessSheet`（入参与现在 Profile 里的用法相同）。
  - `Injury history`（`student.myProfileView.copy005`）：值 = `injuryChips(profile.injury_areas)` 用 ` · ` 连接。点行 → `ProfileEditor section="injuries"`。
- Settings：按「屏幕稿 · 4」。
  - `Appearance`：改写 `MyProfileAppearanceRow.tsx` 为"名称 + 下方三等宽块"，仍用 `useTheme()` 的 `appearance` / `setAppearance`。**选中块用 `colors.ctaBackground` 底、`colors.ctaText` 字，描边同底色**（与 `src/features/onboarding/controls.tsx` 的 `meetSelected` 同一组 token；不要用 `ctaFill` / `inkOnCTAFill`，那一组不随深色主题变）。保留现有的读屏标签与 `accessibilityState.selected`。
  - `Rest between sets` / `Training reminders`：把现在 `PreferenceRows` 里的两行与它们打开的两个设置页原样搬来，只换成单行样式（名称左、值右）；读取失败时的值与点击重试行为不变。
  - 账号三行：`AccountSecuritySection` 里的三行与三个弹层原样搬来，去掉它自带的小标题（`copy014`），由 Settings 页自己画 `Account` 小字。`Delete account` 名称红色。
  - `Sign out`：现在 `SignOut` 组件的逻辑原样保留（`client.clear()` + `logout()`，无二次确认），按钮改成稿上的描边样式——用 `AppButton` 现有的某个非危险变体（如 `secondary`），不新造按钮。
- 从二级页打开的编辑页 / 弹层关闭后回到该二级页；系统返回键与导航行返回都回到首页；首页与二级页的值在保存后即时更新（同一份 query 缓存）。

### §3 「改动会通知教练」那一行

- `ProfileEditor.tsx`：仅当 `section === 'injuries'` 时，在保存按钮正上方渲染一行灰色小字（居中、12 号、`colors.textMuted`）。其他 section 不渲染。
- `src/features/training/ReadinessSheet.tsx`：在最后一步的提交按钮（`student.readinessCheckinSheet.copy018` 那个）正上方渲染同一行。弹层其余内容、步骤、提交逻辑不动。从 Today 开练前打开时同样出现（同一个组件）。

## 文案

所有新文案进 i18n 目录，**中英文都要有**；RN 自增的键放 `src/i18n/catalog/RnExtras.json`（键名用 `student.rn.profile.*` 前缀），过仓内 i18n 守卫测试（`src/i18n/__tests__`）。已有的键直接复用，不复制。

| 用处 | 英文 | 中文 |
|---|---|---|
| 行名 / 页标题 | `About me` | `关于我` |
| 行名 / 页标题 | `Health & recovery` | `健康与恢复` |
| 行名 | `Meet` | `比赛`（复用 `student.rn.meet.title`） |
| 行名 | `Note to coach` | `给教练的留言`（复用 `student.rn.profile.note`） |
| 行名 / 页标题 | `Settings` | `设置` |
| 行值 | `Added` | `已填写` |
| 教练行 | `Coach · {0}` | `教练 · {0}` |
| 四格标签 | `Squat` / `Bench` / `Deadlift` / `Total` | `深蹲` / `卧推` / `硬拉` / `合计` |
| 锁定说明 | `Training 1RM in kg · set by your coach` | `训练 1RM（kg）· 由教练设定` |
| Settings 小字 | `Preferences` / `Account` | `偏好` / `账号` |
| §3 提示 | `Your coach will be notified of changes` | `改动会通知你的教练` |
| 读屏 · 身份卡 1RM 区 | `Training 1RM: squat {0}, bench {1}, deadlift {2}, total {3} kilograms` | `训练 1RM：深蹲 {0}，卧推 {1}，硬拉 {2}，合计 {3} 千克` |
| 读屏 · 返回 | 复用 `student.feedbackInboxView.copy005` | 同左 |

首页每行的读屏标签 = "名称，当前值"（值为空或 `—` 时只读名称，`ProgressMenuRow` 已如此）。

## 测试 seam（先红后绿，按此顺序）

1. `src/features/profile/__tests__/model.test.ts`（已有，追加）：首字母规则全部分支；名字位回落顺序；五行右侧值各自的有值 / 无值；教练行在无绑定、`pending`、`accepted` 但名字为空三种情况下为空。
2. 新增 `src/features/profile/__tests__/profile-home.test.tsx`（挂载方式参考同目录 `editor.test.tsx` / `header.test.tsx` 对 query 与 session 的装配）：首页渲染出身份卡 + 五行、顺序与名称正确；页面上找不到 `Notify coach`、任何原小标题文案、`Sign out`；About me / Health & recovery / Settings 三行触发对应路由；Meet / Note to coach 两行打开对应编辑页；加载中、失败、无档案三种状态下 `Settings` 行都在且可点；带 `editSection` 入参时直接渲染对应编辑页。
3. 新增 `src/features/profile/__tests__/profile-pages.test.tsx`：About me 四行顺序与值、点行打开对应编辑页；Health & recovery 两行的值（今天有打卡 / 无打卡用引导值 / 都没有）、点行打开状态打卡弹层与伤病编辑页；Settings 页外观三块的选中态与切换调用、两行偏好的值与失败重试、账号三行打开对应弹层、`Sign out` 调用现有退出；档案失败时 Settings 页仍可用。
4. `editor.test.tsx`（已有，追加，不改旧断言）：`injuries` 的保存按钮上方有那一行；`basics` / `background` / `competition` / `note` / `weight` 没有。`ReadinessSheet` 现有测试里追加一条：最后一步有那一行。
5. 现有 `editor.test.tsx`、`header.test.tsx`（副标题那条断言随副标题移除而改，是唯一允许改的旧断言）、账号安全、组间休息、训练提醒、引导相关测试保持通过。被删除组件的旧测试：每条断言要么在新测试里有对应，要么在 JOURNAL 里说明为什么不再适用，不是直接删掉。

## 验收标准

SPEC「验收清单」第 1–12 条（第 1、10、11 条的实屏部分由 Opus 在模拟器上看；你负责让对应的组件测试与全量检查通过）。交付时在 `docs/CODEX-JOURNAL.md` 追加一节：改了哪些文件、每条验收对应的测试名、`npx jest --runInBand`、`npx tsc --noEmit`、`npm run lint` 的最后几行原始输出、未做或存疑的点、"待 Opus 决定"的点。

另外自查一条并写进 JOURNAL：改前 Profile 页上的 17 行信息与入口（Current 1RM 三项与合计及说明、Recovery assessment、Injury history、Muscles to improve、Appearance、Rest between sets、Training reminders、Meet、Note to coach、Height / Body weight、Training background、Training environment、Change password、Export training data、Delete account、Sign out、消息按钮）在新结构里各自落在哪一页哪一行，逐项列出，一项不能少。

## Out of Scope

SPEC 同名一节全部；另加：头像上传与任何图片选择 / 相机代码、`GET /me`、名字显示（第二步）；教练端任何文件；`ProfileEditor` 各 section 的表单内容与校验；`ReadinessSheet` 除那一行以外的任何改动；`src/app/(student)/profile.tsx` 的参数处理；Today、Training、Progress 三个 Tab 的任何文件（上面两个从 087 原样取来的组件文件除外）；Tab 栏；任何后端请求的增删。
