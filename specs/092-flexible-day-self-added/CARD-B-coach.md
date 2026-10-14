# Spec 092 · 卡 B(安卓教练端):训练日详情显示额外组与自加动作

开工先读仓内 `CONTEXT.md`、`AGENTS.md`、`specs/092-flexible-day-self-added/SPEC.md` **全文**(重点 §5、文末「屏幕稿」第 5 张与文案表),再 `git log --oneline -15` 与 `docs/CODEX-JOURNAL.md` 末尾 catch-up。

- 级别:T1。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-092b`,分支 `feat/092b-coach-student-added`(叠在 `feat/092-flexible-day-self-added` 之上)。**先 `cd` 进这棵树再启动**,启动后试写并删除一个临时文件确认可写;不可写立刻带原始报错返回,不许改去别的树干活。`node_modules` 是指向主仓的软链,不要重装。
- **不 commit、不 push、不开 PR**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节(标题写明「卡 B」)。`SPEC.md`、`CONTEXT.md`、`PARITY.md` 不要动。本仓已公开:不写账号、密钥;不读 `.env` 类文件。
- 不加依赖。
- **本卡只动教练端**:`src/features/coach/`、`src/domain/coach/`、`src/app/(coach)/`、教练端用到的 `src/api/domains/` 读取与 `src/i18n/`,及相关测试。`src/features/training/`、`src/domain/plan/`、`src/app/(student)/` 归卡 A(另一棵树同时在改),不要碰。两张卡都可能改 `src/api/domains/sets.ts` 与 i18n 目录——只做加法、改动尽量小,方便之后合并。

## 目标

教练在学员详情 → 训练日详情里看得到学员自加记录(SPEC §5),界面按屏幕稿第 5 张:

1. 计划动作卡里,处方组的只读行之后,若有额外组:先一行小灰字「学员自加」(英文 `Added by student`),再列额外组的只读行——**与其他行同一样式,行上不加标签**。副标题「已记录 x / y 组」的 x 只数处方内的组(组序号 < 处方组数)。
2. 计划动作之后,该训练日的每个自加动作一张卡:标题是动作名(不带标签),副标题一行小灰字「学员自加 · 不在计划里 · 记录了 N 组」(英文 `Added by student · not in plan · N sets logged`),其下同样的只读行。
3. 跳练:学员本周先结算靠后的天时,周 / 日列表上各训练日按各自的完成状态显示。逐个核对教练端凡是假设「游标之前的天都已完成 / 之后的都未完成」的展示逻辑(学员详情的周视图、计划卡状态、概览等),有错的修,没错的在 JOURNAL 写一句核对结论。不加任何「跳练」标记。

## 后端契约(后端 spec 050,PR 已开、尚未部署;按契约写,用测试替身验证)

- 教练读取 `GET /students/:id/sets?from=&to=&scope=`:现在客户端发 `scope=plan`(或不发)。改发 `scope=all` 后,结果里会多出自加动作行:`adhoc: true`、`plan_exercise_id: null`、`plan_day_id` = 所属训练日。
- 每行多一个字段 `plan_day_id: string | null`(只有自加动作行非空)。**老后端(未部署 050)会忽略 `scope=all` 并且不返回 `plan_day_id`**:schema 必须把它当可选、缺省按 null,界面此时与今天完全一样(看不到自加动作,不报错)。
- 额外组是普通的计划内行:`plan_exercise_id` 非空、`set_index` ≥ 该计划动作的处方组数。今天就可能出现在响应里。
- 教练读取到的训练日归集现在按日期把记录挂到训练日(`ExecutionDay`);自加动作行优先按 `plan_day_id` 归到对应训练日,没有 `plan_day_id` 的 adhoc 行不显示在训练日详情里(现状)。

## 约束

- 只读展示,不加任何编辑 / 删除入口。
- 待看视频、聊天组卡片、反馈流程不改。
- 现有「自由记录」(`coach.execution.freeLog`)分支的行为不变。
- 守仓内 eslint 与 TypeScript 配置。

## 验收标准

SPEC「验收清单」教练端第 12、13 项。逐项在 JOURNAL 写明对应测试名。

## 测试 seam(先红后绿,复用现有 seam)

1. `src/domain/coach/` 的纯函数测试(现有 `detail-week` 一类):额外组与处方组的划分与排序、x / y 只数处方组、自加动作按 `plan_day_id` 分到训练日并按动作分组、同一动作多组的顺序、没有 `plan_day_id` 的 adhoc 行不进训练日。
2. 乱序完成:靠后的天已完成、靠前的天未完成时,周视图 / 计划卡状态的派生结果正确。
3. API schema 测试:响应缺 `plan_day_id` 仍能解析;`scope=all` 被带进请求。
4. 训练日详情的组件测试(若现有同类测试):有额外组时出现「学员自加」小字且行上无标签;有自加动作时出现对应卡与副标题;两者都没有时渲染与改动前一致。

交付前跑通:`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。发现 SPEC 与本卡冲突以 SPEC 为准并在 JOURNAL 记录;需要产品取舍的地方停下写进 JOURNAL,不自行裁决。
