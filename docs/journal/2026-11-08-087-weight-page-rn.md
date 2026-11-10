# 087 第二步 — 安卓 Progress 体重页

## 范围与基线

- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-087w`；分支 `feat/087-weight-page`；起点 `295e331`，初始工作区干净。中途机器重启，恢复后核对保留 diff 继续实现。
- 依据：[087 SPEC](../../specs/087-progress-menu/SPEC.md) §5、决策表 2/7/8/9/10、入口第 4 行及验收 14–21；085 单项编辑沿用现有 `ProfileEditor`。后端契约只读：`/Users/david/Projects/apps/MeetPR-backend-wt-046/specs/046-body-weight-records/SPEC.md` §2–3。
- 已读 AGENTS、CLAUDE、CONTEXT、PLAN、工程规约与记忆索引；仓内未发现 FOLLOWUPS。写代码前核对 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。
- 无新增依赖、后端改动、迁移或部署；只在现有受保护 Stack 注册 `/progress/body-weight`，Tab 与其余入口结构不变。
- 本树缺少依赖，`node_modules` 链接到 `meetpr-rn-wt-release-cn10/node_modules`，`cmp` 核对两树 package-lock 完全一致；未改依赖或锁文件。
- 按授权不 commit/push、不运行 adb。实现与本地自测完成；模拟器视觉和真实后端验收交 Opus，不宣称功能验收通过。

## 实现与接口口径

- `src/api/domains/body-weights.ts`：GET `/students/me/body-weights`、PUT `/students/me/body-weights/:date`、DELETE 同一路径。zod 校验合法日历日、两位小数字符串及 `0 < kg < 500`；保留服务端 `current_weight_kg`，删除允许 null。登记 `BODY_WEIGHT_DATE_OUT_OF_RANGE` / `BODY_WEIGHT_NOT_FOUND` 错误码。
- 写入日期在点击保存时由设备当地日历日生成，不采用 UTC 截日或凌晨 4 点训练日。只有新 PUT 返回 HTTP 404 才回落 PUT `/students/me/onboarding`；读取与删除不回落，其他错误正常向上传递。旧接口成功后不伪造历史记录。
- 查询缓存按学员 id 隔离。写／删成功先取消旧读取、更新已有记录与档案当前值，再使两份缓存失效重取；同日替换、删最新退回次新、删完为 null。
- Progress 第 4 行显示最新记录 `83.00 kg`；加载中留空；接口 404 显示 `—`。体重查询独立于其他四行，错误时保留全部入口并显示重试，下拉刷新同时刷新体重。
- 体重页：Latest 与当前值、30/90/All 三档范围及两位带符号变化量；现有 SVG 几何函数绘制金色线和逐日点，单点带值，多条同值仍画；零条、范围无点、单点分别呈现。Records 按日期倒序，删除按钮 44dp 命中区并弹不可撤销确认；确认成功即时刷新，取消无写入。
- 本页按钮复用 085 单项 `ProfileEditor`，保存或取消回本页；Today 沿用既有进入和返回路径。两个单项入口每次保存都调用今天的 PUT，包括同值再保存。
- Profile Basic information 先保存不含体重的其他字段，仅体重相对打开编辑器时初值变化才调用今天的 PUT。后台档案刷新不会把未触碰的旧值误写；原本体重为空且未编辑可保存其他信息，输入 0／500 仍校验失败。引导第 1 步继续原档案接口。
- Basic information 两次请求并非服务端事务：若基础字段成功而体重失败，保留编辑页与输入供重试；已保存基础字段仍然有效。未新增回滚接口或改后端。
- 新文案覆盖 en / zh，繁中使用现有生成脚本同步。

## 先红后绿与回归

按用户给定 API domain、presentation、入口值 seam 推进；采用 tdd 技能。

| 行为 | 观察到的红测 | 最终覆盖 |
| --- | --- | --- |
| API 读取解析 | 新 domain 不存在 | 正常日期／两位字符串；拒绝非法日历日、数字型 wire 值、三位小数、500 |
| 当地今天写入 | `saveToday is not a function` | 手机凌晨 1:30 写今天；保留服务端 current 值；UTC+14 另跑通过 |
| 写入 404 回落 | 404 被直接抛出 | 旧档案成功；400/403/500 不回落 |
| 删除契约 | `remove is not a function` | 次新值、null、404 BODY_WEIGHT_NOT_FOUND 不回落 |
| presentation | 新 model 不存在／入口格式函数缺失 | 曲线升序、列表倒序、范围变化量、最新值两位、空态、单点、同值多点、范围无点 |
| 页面与删除 | 页面缺失；删除按钮尚不存在 | 点数／日期、范围切换、取消、删最后清空档案、删最新回退、404 Retry 恢复 |
| 入口第 4 行 | 预期五行实际四行，体重按钮缺失 | 中英五行顺序与路由、两位最新值、404 不影响其余行 |
| 单项与 basics 写入 | 新 PUT 未调用；basics 仍传未改体重 | kg/lb 输入、未改体重不写、改后写今天、无当前体重保存其他字段 |
| 审查返修 | 档案刷新误写旧体重；初始为空时 0/0.00/500 错误放行 | 捕获打开时初值，追踪输入是否编辑；四个回归先红后绿 |

原有 Today 和 Profile 页面集成测试更新 API 边界 fixture，保留原来的返回路径、界面即时更新断言；Today 额外覆盖新接口存在／404 回落。体重页实际挂载单项编辑器并保存，验证一个日期仍只有一个点且档案同步。

## 最终验证

命令均在本工作树运行，原始日志位于 `/private/tmp/087-weight-page-rn/`。

| 检查 | 结果 | 日志 |
| --- | --- | --- |
| `./node_modules/.bin/tsc --noEmit` | exit 0 | `tsc.log` |
| `npm run lint` | exit 0，无告警 | `lint.log` |
| `./node_modules/.bin/jest --runInBand --silent` | **212 suites / 2285 tests 全绿，exit 0** | `jest-full.log` |
| `TZ=Pacific/Kiritimati ./node_modules/.bin/jest src/api/domains/__tests__/body-weights.test.ts --runInBand --silent` | 4 tests 全绿，exit 0 | `jest-local-date.log` |
| `git diff --check` | 通过 | 终端输出 |

全量 Jest 末尾提示异步操作未在一秒内退出，随后进程正常 exit 0；未使用 forceExit。首次全量有旧 fixture 未适配新接口及新增红测失败，定向修复后重新跑以上最终全量。中断前曾遇磁盘 ENOSPC，重启恢复后最终检查正常。

## 独立双轴自审

采用 `review-loop` 的未提交 diff 入口，固定基线 HEAD `295e331`，含全部本卡新文件；两个只读 reviewer，未修改文件。

- **Standards**：初审 1 个 P2（空档案体重输入非法值绕过校验）；补回归并修复，第二轮定向复审 CLEAN。
- **Spec**：初审 1 个 P2（编辑期间档案刷新误判体重改变）；补回归并修复，第二轮定向复审 CLEAN。
- 无遗留代码 finding。仓内缺 `docs/agents/issue-tracker.md`，已告知可另行运行 `$setup-matt-pocock-skills`；未私建 tracker。本地双轴自审不替代 Opus 按验收清单收货。

## 交接与 PARITY 建议（Opus 定稿）

1. `PARITY.md` 顶部 spec 087 授权差异，把“第二步未开工”更新为“第 4 行 Body weight 与体重页已实装，本地 212 suites / 2285 tests、tsc/lint 绿，设备与联调待验收”，然后由 Opus 依实际验收补状态。
2. spec 085 体重写入条目补充：Today 单项与 Profile 已接 046 今日记录；仅 PUT 404 回落旧档案；引导继续旧档案；085 两位显示与单位输入规则保留。
3. 按 **087 验收 14–21** 补目标 Android AVD `meetpr`：零／一／多条及范围、三处保存后四处更新、同日覆盖、删除取消／回退／清空 Today、升级回填首条、无接口环境、Light/Dark 与 360×640dp / 字体 1.3×（含中文）。不另造验收矩阵。
4. 回填与“档案最后修改日”的真实性需使用后端已迁移账号核实；本次仅验证这种记录可解析、显示和删除。未连接 staging 或 Global，不声称 046 已部署或生产已放行。
5. 未修改 PARITY、发布台账或正典 spec；本文件为实现与原始验证记录。
