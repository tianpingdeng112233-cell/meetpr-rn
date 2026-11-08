# 2026-11-08 Ask coach 显示规则 · RN T1

本卡实现与本地检查完成，等待 Opus 模拟器验收。未 commit/push，未执行 adb。

## 范围与依据

- David 2026-11-08 本卡指令：开练前、训练中显示；当天已结算或全部完成后隐藏；浅色与深色一致；点击行为及无绑定教练等既有门禁不变。
- 分支 `fix/ask-coach-visibility`，改前 HEAD `295e331`，开工工作区干净。
- 已读 AGENTS.md、CLAUDE.md（仅引用 AGENTS）、CONTEXT.md、PLAN.md、工程闭环与相关记忆索引；仓内未找到 FOLLOWUPS.md 或本卡独立 spec。本卡用户指令即实现及验收范围。
- 编码前已读 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。没有修改依赖、导航、样式或文案；iOS 仓与正典台账未改。
- 测试 seam：现有 `SetRefEntryVisibility.shouldShow` 和真实 `WorkoutBody` 渲染；采用 diagnosing-bugs、tdd、review-loop。

## 原因与修复

1. 入口只检查是否存在任意 draft，没有排除已结算日，也未区分尚待记录的处方组与全部完成的组。改为 `liveDrafts.some(needsSetResult)`，并明确传入 `isDayCompleted`。
2. `WorkoutBody` 非 recording 分支的 active 会回退到最后一个处方组，全部完成时仍可能显示按钮。按钮增加 `needsSetResult(active)` 判断，保留该回退供其他展示使用。
3. 开练前显示在本基线已成立。浅深主题共用同一条件，没有复现深色专属缺失；新增真实 ThemeProvider 渲染测试，防止此处回归。不能据此认定 11/02 设备报告的全部原因已查明。

`needsSetResult` 沿用现有语义：complete/failed 属于已记录；assumed 仍待真实记录；额外组与自加动作不计入处方进度。已结算日即使仍可编辑或含 assumed 组，也由显式结算条件隐藏入口。

核心 diff（省略未改上下文）：

```diff
- }) => isEditable && hasAvailableSet && hasActiveCoach && hasSharingContext,
+ }) => isEditable && !isDayCompleted && hasAvailableSet && hasActiveCoach && hasSharingContext,
- hasAvailableSet: liveDrafts.length > 0,
+ hasAvailableSet: liveDrafts.some(needsSetResult),
+ isDayCompleted: dayState?.kind === 'completed',
- editable && active && onAskCoach
+ editable && active && needsSetResult(active) && onAskCoach
```

## 先红后绿证据

专项命令：

```sh
npm test -- --runInBand --watchman=false src/features/training/__tests__/set-ref-entry.test.tsx
```

| 阶段 | 实际结果 |
| --- | --- |
| 红 1：已结算但仍 editable | 1 failed / 22 passed；expected false, received true |
| 绿 1：显式结算门禁 | 23 passed |
| 红 2：双主题全部完成且 recording=false | 2 failed / 23 passed；两种主题均 expected visible=false, received true |
| 绿 2：待记录组门禁及三态覆盖 | 29 passed |

保留原 16 组 eligibility 组合；新增开练前、训练中、未结算但全部完成（含 failed）、recording 关闭但全部完成的计算与渲染断言；独立覆盖已结算门禁。浅深主题可见时都验证点击传入当前待记录组。

测试从持久化 appearance 经真实 ThemeProvider 取色，断言按钮文字和底色：浅色 `#111827` / `#FFFFFF`，深色 `#EDEDED` / `#141416`。按 sRGB 相对亮度计算文字/底色对比度分别约 17.74:1、15.72:1。样式本身没有修改；该数值与渲染树断言不替代模拟器视觉检查。

原始本机会话日志在 `/tmp/ask-coach-red-settled.log`、`/tmp/ask-coach-green-settled.log`、`/tmp/ask-coach-red-completed.log`、`/tmp/ask-coach-green-completed.log`；以上表格保存关键结果，临时目录不是长期证据存储。

## 最终验证与审查

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `CI=1 npm run lint -- --no-cache` | exit 0，无 warning/error |
| `npm test -- --runInBand --watchman=false` | exit 0；209 suites、2272 tests 全通过；55.302 秒 |
| `git diff --check` | 通过 |
| 临时诊断代码 | 目标文件无 `[DEBUG-` 标记 |

全量日志：`/tmp/ask-coach-tsc.log`、`/tmp/ask-coach-lint.log`、`/tmp/ask-coach-jest-full.log`。这是本地检查结果，未运行远端 CI。

本 worktree 初始无 node_modules。与 `../meetpr-rn-wt-release-cn10/package-lock.json` 经 cmp 确认完全相同后，通过忽略的 node_modules 符号链接复用其依赖；没有安装依赖或改锁文件。

一轮独立只读双轴审查（review-loop）：

- Standards：无阻塞 finding；复用既有 needsSetResult 与主题 tokens，未发现实质仓规违反或需返修的坏味道。
- Spec：无阻塞 finding；三态、结算、既有门禁与双主题断言符合本卡，点击/样式/文案/导航未改。

仓缺 `docs/agents/issue-tracker.md`，本次依 review-loop 以用户指令做本地双轴审查，未声称执行依赖 tracker 的分支 code-review 流程；已告知 David 后续用 `$setup-matt-pocock-skills` 配置。

## 交接 Opus

按用户本卡范围，在 Android AVD `meetpr` 验证浅/深主题开练前、训练中按钮可见且文字清楚，已结算/全部完成后隐藏；确认点击行为与无教练等原门禁保持。沙箱内未尝试 adb，未获取新模拟器截图，不宣布功能验收通过。PARITY 与其他正典台账由 Opus 收货后定稿。
