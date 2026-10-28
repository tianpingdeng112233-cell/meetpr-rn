# Spec 092 · 卡 A(安卓学员端):本周内换天练、额外组、自加动作、点 ✓ 震动

开工先读仓内 `CONTEXT.md`、`AGENTS.md`、`specs/092-flexible-day-self-added/SPEC.md` **全文**(含文末「屏幕稿」与文案表),再读 `specs/089-accessory-quick-log/SPEC.md`(行内表格的既有行为)、`git log --oneline -15` 与 `docs/CODEX-JOURNAL.md` 末尾 catch-up。

- 级别:T2。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-092`,分支 `feat/092-flexible-day-self-added`(基于 `origin/main`)。**先 `cd` 进这棵树再启动**,启动后试写并删除一个临时文件确认可写;不可写立刻带原始报错返回,不许改去别的树干活。`node_modules` 是指向主仓的软链,不要重装。
- **不 commit、不 push、不开 PR**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。`SPEC.md`、`CONTEXT.md`、`PARITY.md` 不要动。本仓已公开:不写账号、密钥;不读任何 `.env` 类文件。
- 不加依赖、不加安卓权限、不动原生目录 `android/`。
- **本卡只动学员端**:`src/features/training/`、`src/domain/plan/`、`src/app/(student)/`、`src/api/domains/sets.ts`、`src/i18n/` 与相关测试。`src/features/coach/`、`src/domain/coach/`、`src/app/(coach)/` 归卡 B(另一棵树同时在改),不要碰。

## 目标

实现 SPEC 的 §1、§2、§3、§3b、§4,以及「存量数据与升级」。界面结构与文案以 SPEC 文末「屏幕稿」的第 1–4 张与文案表为准(稿只管布局,颜色字号用 `src/design` 现有 token 与组件);英文为主语言,中英文案都要进 i18n 目录。

## 后端契约(后端 spec 050,PR 已开、尚未部署;本卡按契约写,用测试替身验证)

1. **额外组** = 现有 coached 形态的 `POST /sets/log`,`plan_exercise_id` 是该计划动作,`set_index` ≥ 该动作的处方组数(接在已有记录之后)。无新字段。
2. **自加动作** = 现有 adhoc 形态的 `POST /sets/log`,新增可选字段 `plan_day_id`:
   ```json
   { "exercise_id": "…", "plan_day_id": "…", "logged_date": "2026-10-13", "set_index": 0, "weight_kg": 12.5, "reps": 12, "completed": true }
   ```
   错误:400 `SETS_PLAN_DAY_NOT_PUBLISHED`(训练日不属于本人已发布计划);409 `SETS_ADHOC_DAY_CONFLICT`(同一天同一动作同一组序已挂在另一个训练日)。幂等键是(学员、动作、`logged_date`、组序)——**同一张自加动作卡的所有组必须用同一个 `logged_date`**(取这张卡第一组写入时的 gym-day,之后沿用,跨过凌晨 04:00 也不变)。
3. **删除** `DELETE /sets/:id` → 204。409 `SET_NOT_STUDENT_ADDED` / `SET_HAS_ATTACHMENT` / `SET_HAS_COACH_FEEDBACK`,404 `SET_NOT_FOUND`(当作已删处理)。
4. **读取**:学员自己的 `GET /sets` 用 `scope=all` 才会带回自加动作行;响应每行多一个 `plan_day_id: string | null`(只有自加动作行非空;老后端没有这个字段时按 null 处理,schema 不能因缺它而整体解析失败)。训练页当前用的读取若是 `scope=plan`,要拿到自加动作需要改用 / 追加 `scope=all` 并按 `plan_day_id` 归到训练日——注意历史页、导出等既有调用方的行为不能变。

后端没部署到的环境里,自加动作的写入会被老后端当成普通 adhoc 行(`plan_day_id` 被忽略或被拒)——不需要为此写兼容分支,但失败时走现有的保存失败提示,不崩。

## 实现要点(顺序即建议的推进顺序,每步先红后绿)

1. **可写判定与默认选中**(`src/domain/plan/sequence.ts` 一带):把「只有游标日可写」改成 SPEC §1 的规则——本周(游标日所在 `week_number`)内任何未结算日可写;其他周只读;已结算只读。`workoutDayState` 的调用方很多,保持它对「已结算 / 其他周」的返回不变,只给本周未结算的非游标日一个可写的状态。默认选中:游标日;当天(gym-day)已在某个未结算日有 ≥1 组真实记录时选那一天(多个取最后记录的)。
2. **训练页接线**(`TodayWorkoutView.tsx` / `WorkoutBody.tsx`):`editable` 与保存前的拦截改用新判定(现有 `cursorDay(latestPlan.days)?.id !== selectedDayID` 那处);选中本周非游标未结算日时,训练日卡底部显示「开始训练」主按钮(取代「完成 X 后解锁」的说明),点了进入与游标日相同的记录态;其他周的预览照旧。周历、页头、「回到今天」的外观与交互一律不改。换天时不清空另一天的任何记录或本地草稿。
3. **额外组**:草稿 / 行模型在处方组之后并入「已有的额外组记录」与「新加未记录的额外组」;稳定 id 不能与处方组的 id 冲突,且要在重进页面后与已有记录对上(视频、休息计时、PR 判定都按现有路径走)。进度、组进度条、「还差几组」、「全部按计划完成」只看处方组。主项的额外组行按屏幕稿第 2 张上卡(「记录这组」进现有完整录入页);辅助项的额外组行在行内表格里。删除按 SPEC §2。上限 10。
4. **自加动作**:行模型、请求体、`logged_date` 钉住规则、`plan_day_id` 归日;卡片按屏幕稿第 3 张;移除整卡 = 逐条删除其已记录的组,任一条被 409 拦下时停止并提示,已删的不回滚。上限每日 10 个、每个 10 组。已结算日的只读详情与训练历史页里显示(带「自加」标记)。
5. **动作库选择页**(屏幕稿第 4 张):先找仓内有没有可复用的动作列表 / 搜索(教练端若有,只复用纯逻辑,不改它的文件);没有就新建在 `src/features/training/` 下。搜索匹配中文名、英文名;别名字段若动作库响应里没有就不做别名。三行标签的归类是纯函数(输入动作库条目,输出它命中的标签集合),规则见 SPEC §3「筛选标签」。
6. **震动**(SPEC §3b):只在把一组记为完成的那次按下时震一次,用仓内现有机制。
7. **补记页**(SPEC §4):已有的额外组显示为只读行、不参与勾选。

## 约束

- 不改后端、不改 API 的既有请求形态;`src/api/domains/sets.ts` 只做加法(可选字段、删除方法)。
- 不改休息计时的既有规则,只按 SPEC 给额外组 / 自加动作选用哪一条。
- 不改完成结算、撤销的规则与接口。
- 遇到 SPEC 没覆盖、需要产品取舍的情况:停下写进 JOURNAL,不自行裁决;纯工程细节自己定并在 JOURNAL 记一句。
- 守仓内 eslint 与 TypeScript 配置;不新增 `any`、不关规则。

## 验收标准

SPEC「验收清单」学员端第 1–11 项与 9b。逐项在 JOURNAL 写明对应的测试名;只能在真机 / 模拟器上验的(震动的体感、断网)写明「待 Opus 上模拟器验」并说明代码路径。

## 测试 seam(先红后绿,复用现有 seam,不新增 seam 类型)

1. `src/domain/plan/` 的纯函数测试:可写判定(本周非游标未结算日可写 / 其他周只读 / 已结算只读)、默认选中(含当天已有记录的例外、多个候选取最后记录的、跨 04:00)、周条在乱序完成时各日的状态。
2. `src/features/training/` 的纯函数测试:行模型合并(处方组 + 已有额外组 + 新加的)、进度只数处方组、额外组预填、自加动作行模型、`logged_date` 钉住、两个上限、「全部按计划完成」不含额外组。
3. 请求体构造测试:额外组的 coached 请求、自加动作的 adhoc 请求(带 `plan_day_id`)、删除、各错误码到提示文案的映射。
4. 标签归类纯函数测试:三个「族」、每个肌群标签、并入规则(握力→前臂、髋屈肌→髋、胫骨前肌→小腿、灵活性与心肺→其他)、多肌群动作、无肌群信息的动作。
5. API schema 测试(`src/api/domains/__tests__`):响应缺 `plan_day_id` 仍能解析;有则保留。
6. 屏幕级:训练页现有屏幕测试里加一条「本周换天 → 开始 → 记一组 → 结算」主路径;震动只断言「完成时调用一次、取消时不调用」。

交付前跑通:`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。发现 SPEC 与本卡冲突以 SPEC 为准并在 JOURNAL 记录。
