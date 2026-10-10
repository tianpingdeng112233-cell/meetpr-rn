# Spec 090 · 卡（安卓）：做完的动作上收、组进度分段条、完成按钮吸底、录入页压矮

开工先读仓内 `CONTEXT.md`、`AGENTS.md`、`specs/090-training-flow/SPEC.md` **全文**（行为定义、存量照护、屏幕稿转写、验收清单都以它为准，本卡只补安卓落点）。

- 级别：T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-090`，分支 `feat/090-training-flow`，基线是 `feat/089-accessory-quick-log`（其下是 086）。
- David 2026-10-10 已对屏幕稿「定稿」。屏幕稿你打不开，结构、尺寸与文案已转写在 SPEC「屏幕稿」一节。颜色、字号、圆角、间距一律用 `src/design` 的现有 token 和现有组件，不新造一套样式，不写死色值。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md` 与收货记录由 Opus 写。本仓已公开，不写账号、密钥。
- 零后端改动；不改 API schema；不加依赖。除 SPEC 四节外不得顺手改别的。

## 落点

### §1 做完的动作上收（SPEC §1、屏幕稿 B / C）

- 新纯函数（放 `src/features/training/`，如 `exercise-progress.ts`）：输入 `WorkoutBody.tsx` 里现有的 `groups`（动作 + 该动作的 drafts），输出三段——做完的、正在做的、其余。"做完" = 该动作每个 draft 都满足现有的 `isDraftTerminal` 且不是 `sourceLog?.assumed`；"正在做的"必须与 `WorkoutBody.tsx` 现有 `active` 的取法一致（复用同一判定，不要另写一套）。
- `WorkoutBody.tsx`：只在"记录态 + 可编辑 + 非预览"时生效。做完的那一段渲染在 hero `Card` **之前**，其余仍在之后；hero 卡在"没有正在做的动作"（全部做完）时不渲染。其他状态（未开始汇总卡、只读预览、已结算详情）的渲染路径一行都不要变。
- 做完的一行：在现有 `RollUpCard` / `RollUpBody` 的基础上加"已完成"外观（屏幕稿 B / C），展开后的内容区沿用现有动作卡的内容与全部交互（点组进录入页、视频标记、辅助项取消）；不要复制一份表格代码，抽出共用部分。默认收起沿用现有 `collapsed` 与"刚做完自动收起"的逻辑。
- 滚动：上收后让 hero 卡完整可见。滚动容器在 `TodayWorkoutView.tsx`，沿用它现有的滚动 ref 与"软键盘开着 / 用户正在拖动时不抢滚动"的既有判断（089 为辅助项输入加过类似处理，先找到复用）。
- 动效：上收与顶替用现有的布局过渡手段（先看 `RollUpCard`、`TrainingRewardMotion.tsx` 与端内已有的"减少动态效果"判断），时长取 `motion` token；系统开启减少动态效果时不做过渡。只在本次运行内"刚做完"时播，进页面时已做完的直接就位。
- 文案加进 i18n 目录（英文为主、带中文）：`Completed · {n} sets` / `Completed · 1 set`，中文"已完成 · {n} 组"；读屏文案按 SPEC §1。

### §2 组进度分段条（SPEC §2、屏幕稿 A）

- 新纯函数：输入一个动作的 drafts，输出每段状态（已有结果 / 失败 / 当前 / 未到）。"当前"与 hero 正在展示的那一组一致。
- 新展示组件放 `src/features/training/`，在 `WorkoutBody.tsx` 的主项 / 变式 hero 形态里渲染，位置在动作名那一行与教练备注块之间；辅助项记录卡（`AccessoryLogCard`）不渲染。当前段的渐变用现有 `GradientFill`（注意记忆里的坑：百分比尺寸的 Svg 在容器变化后不重绘，按实测尺寸传数值并带 key 重建；Today 页 `DashboardScreen.tsx` 的周进度分段是现成参照）。
- 分段条对读屏隐藏；现有 `Set 2 of 3 · exercise 1 / 5` 一行不动。

### §3 全部记完：按钮吸底（SPEC §3、屏幕稿 D）

- `hold-to-complete.ts` 的 `completionAvailability`：在返回值里加"是否吸底"（全部记完，即 `button && remainingSets === 0`）。原有 `button` / `pill` 的取值与既有断言不变。
- `TodayWorkoutView.tsx`：吸底时把现有 `HoldToCompleteButton` 渲染在滚动容器之外、tab 栏之上的固定区（背景与页面一致、顶部细分隔线），滚动内容底部补等高留白；此时滚动区内不再渲染那一颗。不吸底时保持现状（按钮与"还剩…"提示在滚动区底部）。`HoldToCompleteButton` 本身的行为、触感、`onComplete` 不改，全页同一时刻只挂载一颗。
- 休息计时条存在时，固定区排在计时条上方、互不遮挡（先看 `RestTimer` 现在的停靠方式）。

### §4 组录入页压矮（SPEC §4、屏幕稿 E）

- 只改 `SetEntrySheet.tsx` 的布局与样式（及其内部的加减行组件）：片数说明与 `Add collars` 开关并成一行；`Weight` / `Reps` 两段的标题行、输入行高度、数值字号与段间距按屏幕稿 E；配片图高度、RPE 卡不动。各段顺序、全部交互、读屏标签不变；可点控件命中高度不低于 44。
- 数值字号缩小后，长数值（如 `227.5`）与磅单位下的数值仍不得截断或换行。

## 测试 seam（先红后绿，红的输出贴进 JOURNAL）

按 SPEC「测试 seam」S1–S4：

- S1 分区纯函数；S2 分段条模型纯函数；S3 `completionAvailability` 的吸底标志（加在现有 `hold-to-complete.test.ts`，原断言不改）。
- S4 页面层：复用现有训练页组件测试的搭建方式（参照 `completion-flow.test.tsx`、`accessory-log-card.test.tsx`、`workout-coach-notes.test.tsx`），断言：做完第一个动作后它排在 hero 之前并带已完成文案；全部做完后 hero 不在、固定区里有长按按钮且滚动区内没有第二颗；取消一组后恢复；未开始汇总卡与只读预览的现有断言不变。
- 录入页压矮不加快照测试。

## 你验证不了、由 Opus 实屏看的

模拟器上的滚动落点、过渡观感、固定区与 tab 栏 / 计时条的叠放、录入页首屏是否露出视频行、深色与中文。请在 JOURNAL 里写明这几处你是按什么假设实现的（例如固定区的高度来源、滚动目标的计算方式），方便对照。

## 交付

- 跑 `npm test -- --runInBand`、`npx tsc --noEmit`、`npm run lint`，把结尾几行贴进 JOURNAL。既有测试的断言不删不改；确需改的逐条写明原因。
- JOURNAL 一节写：改动文件清单、各 seam 先红后绿的证据、上面"按什么假设实现"的说明、没做到的项与原因。
- 最后一条消息列出 Files changed 与未做项。
