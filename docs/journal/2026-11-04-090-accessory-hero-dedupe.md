# 090 accessory hero dedupe · 2026-11-04 原始记录

- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-090b`；分支 `fix/090-accessory-hero-dedupe`；开工 `HEAD` 与本地 `origin/main` 均为 `250a25cb1fcedf3772ec567b79792e8d0a700682`。未 commit / push。
- 开工已有未跟踪的 `specs/090-training-flow/CARD-accessory-hero-dedupe.md`，未修改。卡片为本次权威输入。本地 SPEC 未包含修订；只读 `origin/docs/090-accessory-hero-dedupe:specs/090-training-flow/SPEC.md`，其 §1 辅助项去重条目及新增验收 11 与卡一致。该版本保留了两个编号 11；未修改 SPEC。
- 已读 AGENTS、CLAUDE（仅引用 AGENTS）、CONTEXT、PLAN、工程规约与 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。本工作树无 node_modules；与 `meetpr-rn-wt-100` 的 package-lock.json 经 `cmp` 相同，使用 APFS clone 复制其 node_modules 到本工作树作为本地依赖，无依赖清单修改。复制结束前一次命令出现 `jest: command not found`，不计为行为红测试。

## 改动与代码观察

- `WorkoutBody.tsx` 只改 `progressFlow` 下方列表的一行过滤：在已完成过滤后，若现有 `accessory` 分支为真，排除 `active.exercise.id` 对应的计划动作。沿用现有含 load type 的判定，不新增动作分类。
- 页面 seam 增加辅助项去重、主项保留组表两个用例，以及存量部分记录 → 做完上收 → 下一辅助项 hero → 取消恢复的用例。最后一例的两个计划动作共用同一动作库 id，验证只排除当前计划动作。既有四条测试断言未删除或修改。
- 滚动位置静态追踪：`WorkoutBody` 的 `completedSectionY` 与 `completedRowLayouts` 来自上方已完成区；`TodayWorkoutView.revealCompletedRow` 按对应 id 的测量滚动。没有依赖下方第一张组表的 ref / 测量。此结论不等于实机验证滚动落点。
- 非 progressFlow、completedDay、学员自加区、完成按钮、存储与写入逻辑无代码改动。

## 测试原始输出

证据目录：`docs/evidence/spec090-dedupe-20261104/`。

| 命令 | 实测结果 | 日志 |
| --- | --- | --- |
| `npm test -- --runInBand src/features/training/__tests__/training-flow.test.tsx`（改生产代码前） | 1 failed / 5 passed / 6 total，退出 1；新增辅助项用例收到 `[Row, Squat, Bench]`，期望 `[Squat, Bench]`；主项对照已通过 | `test-red.log` |
| 同一命令（修复并加入恢复/上收/取消用例后） | 7 / 7 tests，1 / 1 suites，退出 0，15.9 s | `test-green.log` |
| `npx tsc --noEmit` | 退出 0，无诊断 | `tsc.log`（空输出） |
| `npm run lint` | 退出 0，无 warning / error | `lint.log` |
| `npm test -- --runInBand`（首轮全量） | 2 failed / 195 passed / 197 suites；40 failed / 2024 passed / 2064 tests；退出 1，302.99 s | `test-full.log` |
| `npm test -- --runInBand`（最终单独全量） | 197 / 197 suites；2064 / 2064 tests 全通过；退出 0，166.349 s | `test-full-final.log` |

首轮全量与 lint 有时间重叠。失败首因是 `set-save.test.tsx` 的 `a rate-limited background refetch...` 与 `completion-entry.test.tsx` 的 `successful settlement...` 超过默认 5000 ms，之后出现 overlapping act / renderer unmounted 等连锁失败。不以这些现象直接断言代码缺陷或环境根因。按 `diagnosing-bugs` 先缩小到失败的两个现有套件复跑；不改业务代码、测试断言或超时配置。

- `npm test -- --runInBand src/features/training/__tests__/set-save.test.tsx src/features/training/__tests__/completion-entry.test.tsx`：1 failed / 1 passed suites；1 failed / 68 passed / 69 tests，退出 1，85.35 s（`test-retry.log`）。首轮两条超时用例均通过，本轮只有另一条 `extra and student-added saves retain their identities...` 超过 5000 ms。失败位置不同，尚未得到稳定最小复现，未进入按假设修改代码阶段。
- 单独执行 `npm test -- --runInBand src/features/training/__tests__/set-save.test.tsx -t 'extra and student-added saves retain their identities'`：1 passed / 38 skipped，退出 0，11.412 s（`test-isolated.log`）。未调整默认超时，未修改代码；此轮不能代替全量通过。
- 最终全量期间未并行运行其它检查；未改业务代码、测试、依赖或超时配置。全部 2064 tests 通过。该结果支持存在运行时波动，但没有证明其根因；未实施针对超时的修复。未加临时调试代码。
- 最终 `git diff --check` 退出 0。仓内交付改动仅卡片指定的两个源码/测试文件、PARITY 一行、本 JOURNAL 与明确要求的 evidence 目录；原有未跟踪卡片未改。设备验证缺口如下。

## 独立只读审查

- 按 `review-loop` 本地双轴流程，固定 `git diff HEAD` 的本卡文件和新证据；Standards reviewer：0 项问题；Spec reviewer：0 项代码偏差，明确指出下列设备证据缺口。T1 一轮，无返修项。审查不等于验收。
- 缺 `docs/agents/issue-tracker.md`；用户已直接提供卡和 spec，未通过 tracker 取规格、未私建配置。通用 tracker 流程待 David 调用 `$setup-matt-pocock-skills` 配置，不阻塞本次本地双轴审查。

## Android 实测阻塞

已按仓规设置 PATH、JAVA_HOME、ANDROID_HOME，执行：

```sh
CI=1 npx expo run:android --device meetpr --no-bundler
```

退出 1；ADB 启动子进程退出 255，在构建/安装前失败。`android.log` 原文：

```text
could not install *smartsocket* listener: Operation not permitted
* failed to start daemon
error: cannot connect to daemon
```

当前 sandbox 阻止 ADB listener，approval policy 为 never；未绕过权限或改用其它 AVD。

**截图路径：无，未生成 PNG。** 辅助项 hero、主项 hero、辅助项上收后下一屏三张图均未取得。模拟器交互（逐组 / 全部完成、取消、滚动落点、吸底、带历史升级首屏）尚未验证；组件渲染测试不能代替上述设备证据。卡片未达到完整交付条件，留待 ADB 可用环境继续验证。

## David 授权接棒 · 2026-11-04

- David 明确授权 Codex 完成本卡 commit、push、对 main 创建 PR 并启用 merge 方式的 auto-merge；覆盖卡内此前「不 commit、不 push」的执行限制。David 确认 Opus 已审查并接受现有 diff；本轮不修改业务代码或测试。
- 接棒现场分支仍为 `fix/090-accessory-hero-dedupe`，HEAD 为 `250a25cb1fcedf3772ec567b79792e8d0a700682`。核对已有最终全量日志为 197 / 197 suites、2064 / 2064 tests 通过；tsc / lint 通过沿用上一轮记录，本轮未重跑。
- 按交接指定设备执行 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb -s emulator-5556 get-state`，退出 1。当前 sandbox 仍无法连接 ADB daemon，客户端尝试启动 listener 后报 `Operation not permitted`。原始输出见 `docs/evidence/spec090-dedupe-20261104/android-handoff.log`；不能据此断言宿主机 daemon 未运行。
- 按 David 明确指示跳过设备截图，不绕过权限。没有生成 PNG，保留「尚未验证 / 未宣告收货」；未触碰 Metro 8081，也未停止 Metro 8082。
- 提交前 `git diff --check` 通过；显式 `git add` 本卡源码、测试、PARITY、JOURNAL、卡片与证据目录时退出 128：`fatal: Unable to create '/Users/david/Projects/apps/meetpr-rn/.git/worktrees/meetpr-rn-wt-090b/index.lock': Operation not permitted`。真实 gitdir 位于当前可写根之外；未改 gitdir、未另建仓、未绕过 sandbox。因暂存失败，本轮未 commit / push、未创建 PR 或启用 auto-merge，也未触发本卡新 CI；本地测试绿不代表远端 CI 绿。

### 待权限可用后提交的说明

Commit message：

```text
Fix accessory hero duplication in training (spec 090)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

PR 对 main，标题：`Keep the accessory hero from repeating below the hero card (spec 090)`；创建后按 David 指示运行 `gh pr merge --auto --merge`。正文：

```markdown
训练页的辅助项已在 hero 中显示完整组表时，下方从下一个未完成动作开始，主项及变式仍保留自己的组表卡。
已有 Jest 全量 2064/2064（197/197 suites）、tsc 和 lint 通过；测试与设备阻塞证据在 `docs/evidence/spec090-dedupe-20261104/`，ADB 被 sandbox 拒绝连接及启动 listener，未取得截图、未宣告设备验收，详见 `docs/journal/2026-11-04-090-accessory-hero-dedupe.md`。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
