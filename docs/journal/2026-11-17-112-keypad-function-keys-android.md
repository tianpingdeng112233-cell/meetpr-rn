# 112 Android — 数字面板功能键与学员热身组

- 基线：`feat/112-keypad-function-keys@f07db69`，开工工作区干净。用户直派，明确 **不 commit / 不 push**，由 Opus 收货后提交。
- 唯一范围与验收真源：`specs/112-keypad-function-keys/SPEC.md`；背景为 105 §6 与 107。读取根 CONTEXT / AGENTS / CLAUDE、PLAN、工程工作流与记忆索引；已核对 Expo SDK 57 版本文档。
- 后端 068 契约现场读取自 `MeetPR-backend-wt-068/specs/068-warmup-sets/SPEC.md`：仅计划动作支持热身组；热身与额外组共用处方组之后的 set_index；缺省 is_warmup=false。不改后端或教练端。含此功能的 App 仍须等 068 线上部署后才可发布。

## 改动

- allDay 面板独立呈现数字区与四功能键；RPE/RIR 快选、悬浮收起；其它面板形态不变。
- 编辑器逐键预览、仅合法值保存；换格/收起回到最后合法值，强度可清空。批量向上/向下只改同动作同类组的一个字段，经过相同 saveRow / 待同步链路。
- 热身组使用独立草稿 kind 与稳定 ID，但与额外组共用递增索引；默认值复制、5 组上限、自动聚焦、无视频入口；读取按热身优先、set_index 升序。
- is_warmup 可选请求字段、读取缺省 false、离线 overlay / 持久化保留标记。计划动作不存在时不将热身转成不支持的 adhoc。
- 热身从动作摘要、完成计数/容量、本地 e1RM 重放、PR 历史基准与历史重量来源中排除；完成日丢弃空重量热身草稿。
- 简中/英文 catalog 补充，繁中按 `npm run i18n:zh-Hant` 生成。

## 逐条验收对应（按 spec 原顺序）

| # | 验收项 | 自动化对应与实测边界 |
|---|---|---|
| 1 | 四功能键、去 Next/底部收起、悬浮图标 | all-day-view `112 all-day keypad...`；原生外观待截图 |
| 2 | 面板开启时跨动作换格、结算保留 | `112 switching cells...`、`112 another exercise cell...`；number-pad-visibility 用真实 ScrollView responder 验证避让与收起清理 |
| 3 | 正式组向上/下批量改一个字段、额外组与原重量、热身隔离 | `112 fill down/up...`，130/135 具体例；`112 RIR...` 反向覆盖热身分区与强度清空 |
| 4 | RPE 九格与 RIR 六格 | `112 all-day keypad...`、`112 RIR...`；number-pad 单测合法值与回退 |
| 5 | 连加、复制、5 组上限、无相机 | `112 warm-ups precede...`；UI 隐藏相机且禁止自加动作创建热身 |
| 6 | 摘要、进度、按计划、成长不受热身影响 | UI warm-up/legacy cases；history-points `112 warm-ups do not change growth...`；`112 historical warm-ups...` 验证 100kg 正式历史、120kg 热身历史、今天 110kg 仍获 PR；教练 App/网页实际不可见为后端 068 联调验收，本卡未触碰教练界面 |
| 7 | 离线后联网服务器标记 | queue `112 offline warm-ups survive restart...` 验证持久化/发送标记；API `112 warm-up writes retain...` 验证实际 HTTP body；真实服务器落库未联调 |
| 8 | 老用户第一屏保持已有组与额外组 | `112 old records...` 无标记/混合热身两场景；API 缺省 false；实包覆盖升级未执行 |
| 9 | 三语文案 | RnExtras 中英补齐，繁体生成；全量 i18n 检查结果见下 |
| 10 | Android/iOS 深浅截图 | Android ADB 被当前 sandbox 拒绝启动监听（Operation not permitted）；未获取本卡截图。iOS 不在本仓任务范围，由 iOS 卡收货 |

## 先红后绿证据

日志位于 `docs/evidence/112-keypad-function-keys/`。每个行为先添加 seam 测试并运行，再实现；以下红测均为行为断言失败：

- API：旧读取 `is_warmup` 为 undefined；修为默认 false，写入 true 保留。
- 面板：缺四功能键；换格：非法次数 100 未回退到最后合法 10。
- 热身：没有 Add warm-up set 入口。
- 批量：第 3/额外组仍为 135，未改为 130。
- 完成：编辑空重量热身次数后错误发送 null-weight 热身。
- 跨动作：展开另一动作后面板被关闭。
- 成长：热身被重放为额外 e1RM 点；排除后容量/次数/点集相同。
- 队列：父计划动作被删除时错误把热身转成 adhoc；现保留失败待同步记录。
- 历史预填：热身历史错误用于工作组重量；现排除。
- PR 奖励页：历史热身 120kg 压掉今天正式 110kg 对正式历史 100kg 的 PR；先红再过滤历史热身。
- 表头切换：清空重量后切 RPE/RIR 错把空值写入；改为先结算，回最后合法值（20 逐次退格为 2、空，最终保留 2）。
- 原值标签：首次热身输入 20 错显示「was 2」；改为编辑入口捕获原值。

首次无 node_modules，`npm ci` 因网络沙箱 EPERM 失败，不算行为红测。核实与 wt-110 的 package-lock 完全一致后，复用其本机依赖（工作区内忽略的 node_modules 链接），没有修改依赖或 lockfile。首轮编译冷启动有测试超时，重跑取得真实行为红测后才实现。

## 验证与独立审查

最终验证均通过，终端摘要见 [final-checks.log](../evidence/112-keypad-function-keys/final-checks.log)：

- `npm test -- --runInBand --forceExit`：**222 suites / 2431 tests passed**，0 failed，374.507s，进程 exit 0。包含本卡新增/调整行为、离线队列、API、成长统计及旧面板回归。首轮为 222 suites / 2429 tests，返修新增 2 项。
- `./node_modules/.bin/tsc --noEmit`：无诊断输出，通过。
- `npm run lint`：0 error / 0 warning，通过。
- `npm run i18n:zh-Hant`：成功；全量 Jest 中 i18n 检查通过。
- `git diff --check`：通过。

独立审查使用 review-loop，本仓缺 Matt tracker，未私建配置或冒称执行已配置的 code-review。用户已指定本卡 JOURNAL，审查记录随交付落在此处：

- **Standards**：只读初审 0 finding；定向复审 0 finding。初审提醒悬浮键可能受父边界裁切，已移到 paddingTop=44 的 box-none 容器内，与面板同级，48×44 按钮贴面板外且在父命中范围内；仍需原生实测。
- **Spec**：初审 1 项 P2（历史热身污染完成奖励页 PR 基准）；修复并红绿验证后，第二轮定向复审确认关闭，0 未决代码 finding。
- 最终 diff 已逐项阅读。未 commit、未 push、未打包或部署。

Jest 使用 `--runInBand --forceExit`，原有异步句柄需强制退出；输出含 React act、Expo notifications 等警告，测试通过不等于原生运行通过。返修初次绿测日志中 PR 用例通过、模式切换用例因误把中间合法值 2 期望为 20 而失败，已修正该断言；最终两项及原值标签回归均通过，以最终全量为准。

## 原生环境阻塞

`/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices -l` 返回：`could not install *smartsocket* listener: Operation not permitted`，无法连接 `meetpr-cn-accept` / `meetpr16@5570`。当前审批策略禁止提权，未绕过沙箱、未伪造截图。待可连接环境补 Android 深浅色交互截图、真实后端与覆盖升级验收，不能据本地 Jest 宣称整卡收货。

## 返修 1

### 范围与现场

- David 2026-11-17 指派三项返修；当前基线 `1084f43`，开工工作区干净。本轮不 commit、不 push、不打包发布。
- 已重读 CONTEXT、AGENTS/CLAUDE、112 SPEC、原 JOURNAL、PLAN、工程闭环与记忆索引，执行 diagnose → diagnosing-bugs 六阶段及 tdd。Expo SDK 57 版本文档已核对。
- 补充的真实步骤包括：两组热身 60/100、正式第 2 组 140 向下填充、RPE 8.5、切回第 1 组、force-stop/restart、再加热身、切深色/回训练、引体 RIR 与空热身、长按完成。按用户确认，验收包来自本工作树 `1084f43`、12:22 的 CN release/demo 构建，无 Metro；不是旧 bundle。
- 自动化使用仓内真实 demo backend/seed，UI 调用 TodayWorkoutView、真实 SetSyncQueue/AsyncStorage。重启通过卸载组件、清 QueryClient、销毁账号 sync runtime，再重建账号/队列和 demo backend 实现；读取落盘状态，不以同一个内存 queue 冒充重启。设置往返用页面重新挂载覆盖；主题颜色本身未在自动化中重演。

### 问题 1：红测、最小化与根因

1. 最初未含重启的原步骤在当前代码下为绿（[记录](../evidence/112-keypad-function-keys/repair1-original-scenario-before.log)），不以夹具错误或超时作为行为红测。补完整重启后运行：

   `npm test -- --runInBand --forceExit src/features/training/__tests__/all-day-view.test.tsx -t 'finish today completes edited working'`

   得到 **13 sets / 8,975 kg**，期望 **15 sets / 10,375 kg**，精确少两组 140×5（[红测](../evidence/112-keypad-function-keys/repair1-restart-red.log)）。
2. 最小化：去掉第三热身、设置往返、引体操作，仍红；再去掉全部热身，仍红（[最小化](../evidence/112-keypad-function-keys/repair1-minimized.log)、[无热身](../evidence/112-keypad-function-keys/repair1-no-warmups.log)）。载荷是「已有记组回执 → demo 重启 → 写新组」。重启前后与完成后边界探针使用 `[DEBUG-112-*]`，现已从代码删除，合成数据证据保留于 [probe](../evidence/112-keypad-function-keys/repair1-probe.log)。
3. 红测后提出并逐项验证四个假设：恢复丢完成状态；completionWrites 跳过 pending actuals；demo 重启复用 ID；仅 presentation 漏计。探针证据：第 2/3 组落盘与恢复时均为 `status=complete`、`sourceLog.completed=true`；完成之后变成 `pending/log=null`。新第 1 组的 ID 与重启前第 2 组相同（`...0186a0`）。
4. **被证实的根因**：demo backend 每次启动把自增 serial 重置为 100000，但 SetSyncQueue 的 confirmed receipts 存在 AsyncStorage。新记录复用旧 set-log ID，overlay/reconcile 的 `sameSet` 按相同 ID 将它们视为同组，旧回执被覆盖/清理；demo 内存 backend 又没有旧记录，两个正式组因此退回 pending。恢复本身没有把 completed 改成 false，亦非统计层单独算错。
5. 单变量修复：仅把 demo **新 set-log** ID 改成现有 `createUUID()`；同组 upsert 仍保留已有 ID，不改 seed ID、真实后端或包配置。未先改 completionWrites，完整场景即转绿（[单变量绿测](../evidence/112-keypad-function-keys/repair1-restart-green.log)）。最终测试增加 **120 reps**、深蹲 **3 sets** 与正式记组请求 `completed=true` 断言。
6. **不是 112 引入**：在 `/private/tmp` 用 `git archive origin/main` 隔离还原 `8995895b498658c0ba22a7b6a134f87436472b81`，用同一 demo/UI/重启链，把向下填充替换为手动逐格修改第 2、3 组 140，同样红为 **13 / 8,975**（[对照日志](../evidence/112-keypad-function-keys/repair1-origin-main.log)、[可复跑测试 patch](../evidence/112-keypad-function-keys/repair1-origin-main-test.patch)）。origin/main 无 112 热身入口，故对照移除热身；最小化已确认它不是必要条件。网络代理不可连接，无法刷新远端引用，以上结论明确针对现场本地 origin/main SHA。
7. 另一个独立、真实的完成链缺口：已有 `completed=false, failed=false` actuals 会被 `!row.sourceLog || row.sourceLog.assumed` 排除。以保存的 140/140、RPE 8.5 回归先红 **1 set / 725 kg**，再仅放行已有非 terminal actuals，转绿 **3 sets / 2,125 kg**；已完成或失败 actuals 保持原行为，不抹掉失败标记（[红](../evidence/112-keypad-function-keys/repair1-pending-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-pending-green.log)）。此项是额外证实的缺口，不混称本次 demo 症状根因。
8. `completion-presentation.ts` 在入口显式排除 `kind=warmup` 或 `sourceLog.is_warmup`，所有组数/次数/容量/最佳组/PR/RPE 从过滤后的集合计算。高重量、高次数、高 RPE 热身夹具先红后绿，确保最佳组、均值与计划比较也不受污染（[红](../evidence/112-keypad-function-keys/repair1-presentation-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-presentation-green.log)）。

### 问题 2、3

- 复制默认值不是处方/已存实际值：手动编辑入口只从已有 sourceLog 或已有原值获取 baseline。热身与额外组首次输入的错误「was 60/80」均先红后绿（[红](../evidence/112-keypad-function-keys/repair1-original-default-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-original-default-green.log)）。正式处方比较沿用原行为；一键改仍记录目标原重量。
- 原值独立保存在账号 SetSyncQueue 的可选 `originalWeights` 中，以 stableSetId + loggedDate 归属；同日保留首个基准，删除组/丢弃草稿时清理，跨日期重置。它不随 confirmed receipt 清理，不进入 API 请求；旧存储缺该字段直接兼容，不伪造旧原值、不回填服务器或重写历史记录。手改与批量改均验证：刷新服务端/清掉回执 → 销毁 runtime → 从磁盘重建后，标记不消失（[红](../evidence/112-keypad-function-keys/repair1-original-restore-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-original-restore-green.log)）。
- 英文 filledUp/filledDown 改用已有 one/other 机制，1 set / N sets；简中、繁中不改（[红](../evidence/112-keypad-function-keys/repair1-plural-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-plural-green.log)）。

### 验证与独立审查

- 本地 review-loop 双轴只读审查：**Standards** 初审 1 个 P1，原值持久化在进入串行任务之前 await，首次写等待磁盘、后续写提前入队，快速输入可能反向覆盖。暂停 AsyncStorage 写入的真实 UI 回归先红（输入 7→70、最终落 7），将原值作为 commit 输入并在同一个 saveQueue operation 内持久化后转绿（最终显示/请求均 70）；相关 5 项通过（[红](../evidence/112-keypad-function-keys/repair1-order-red.log)、[绿](../evidence/112-keypad-function-keys/repair1-order-green.log)）。独立定向复审确认 P1 关闭，新增 0 finding。**Spec** 初审与定向复审均 0 finding。未私建 Matt tracker，使用 review-loop 本地批准 spec 路径。
- 最终 `npm test -- --maxWorkers=50% --forceExit --testTimeout=30000`：**222 suites / 2442 tests passed**，0 failed，37.448s，exit 0（[全量日志](../evidence/112-keypad-function-keys/repair1-jest-full.log)）。初轮同样 maxWorkers=50%，4 个既有用例触发默认 5 秒超时，非行为断言失败；保留 [初轮日志](../evidence/112-keypad-function-keys/repair1-jest-first-timeouts.log)，最终使用 30 秒上限，不修改既有用例的业务断言。
- Jest 仍有 React act、Expo notifications 与未清理异步 worker 的警告，沿用 --forceExit；未把这些警告抹去或宣称原生运行通过。
- 最终 `tsc --noEmit`、`npm run lint` 均 exit 0，无诊断（[tsc](../evidence/112-keypad-function-keys/repair1-tsc.log)、[lint](../evidence/112-keypad-function-keys/repair1-lint.log)）；`npm run i18n:zh-Hant` 成功且生成文件无变化（[日志](../evidence/112-keypad-function-keys/repair1-i18n.log)）。`git diff --check` 通过。
- 交付 [返修 diff](../evidence/112-keypad-function-keys/repair1-changes.patch)，HEAD 保持 `1084f43`，未 commit、未 push。
- 当前环境 ADB 仍返回 `could not install *smartsocket* listener: Operation not permitted`，未获取修后 APK/模拟器截图；不把 React 测试声明为原生验收。需 Opus 用修后 bundle 复走原始 CN/demo 深色流程；真实后端 068 发布门禁不变。

### Commit 说明草稿（仅草稿，未提交）

```text
Fix restored training completion and durable original-weight hints

The demo backend reused set-log IDs after a cold start while SetSyncQueue
retained confirmed receipts on disk. New writes matched old receipts by ID,
retired two completed squat rows, and produced 13 sets / 8,975 kg instead of
15 sets / 10,375 kg. The same restart failure reproduces on origin/main
8995895 with manual edits, so it predates spec 112. Allocate unique IDs for
new demo set logs; recovered records already had completed=true.

Also complete existing nonterminal actuals, exclude warm-ups inside the
completion presenter, persist original-weight provenance without treating
copied defaults as saved baselines, and pluralize English fill feedback.
Keep provenance and actual values inside the same serial save operation so
slow storage cannot reverse rapid numeric edits.
```
