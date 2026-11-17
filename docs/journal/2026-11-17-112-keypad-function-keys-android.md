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
