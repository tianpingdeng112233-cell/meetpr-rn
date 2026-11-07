# Hero 动作逐组展开：Android 实装记录

日期：2026-11-07。任务卡：`docs/cards/2026-11-07-hero-expand-sets.md`。
工作目录：`/Users/david/Projects/apps/meetpr-rn-wt-hero-expand`。
分支：`feat/hero-expand-sets`；起点：`434c274`。开工时任务卡已是未跟踪文件，未修改。

## 改动

- `src/features/training/WorkoutBody.tsx`：hero 动作行使用独立的组件内 `expandedHero` 状态，默认收起；增加按钮语义、expanded 状态和展开箭头。展开区沿用 completed-day-card 的字号、颜色、间距与最小命中区，按 `draft.setIndex + 1` 展示处方组，过滤所有带 `kind` 的记录。逐组文本使用 `prescribed(decodePrescription(draft.planSet), suggestionForDraft(draft).percentage)`。
- `src/features/training/__tests__/hero-expand-sets.test.tsx`：复用 `day`、`set` 和 `synthesizeDrafts` fixture，在 WorkoutBody 渲染/点击 seam 覆盖今日和预览入口的默认收起、展开、再次收起、无障碍状态、组号、不同重量、百分比解算重量和 extra/自加组过滤。
- 本 JOURNAL：记录实现、自测和审查证据。

回顾卡、训练中记录流、处方摘要函数、i18n、教练端与后端未修改。`prescribed` 和 `decodePrescription` 已导出并由 WorkoutBody 导入，因此无需修改领域文件。

## 测试证据

非登录 shell 均先执行 `export PATH="/opt/homebrew/bin:$PATH"`。

1. 修改生产代码前运行 `npm test -- --runInBand src/features/training/__tests__/hero-expand-sets.test.tsx`：1 suite failed，2 tests failed。两例均在 `expect(exerciseButton()).toBeDefined()` 失败，实际值为 `undefined`，确认缺少可点击的 hero 动作行。
2. 实装后运行相同命令：1 suite passed，2 tests passed，退出码 0。
3. 首轮全量 `npm test -- --runInBand`：207 suites passed / 1 failed；2199 tests passed / 6 failed，共 208 suites、2205 tests，退出码 1。失败集中于既有 `set-save.test.tsx`：5 个测试超过默认 5000 ms，1 个测试未找到 WorkoutBody。该轮与 tsc/lint 曾并行；这只是环境条件记录，尚未证明因果。
   - 未修改代码或超时配置，单独运行 `npm test -- --runInBand src/features/training/__tests__/set-save.test.tsx`：1 suite passed，43 tests passed，退出码 0。首轮失败未稳定复现，未据此做卡外修复。
   - 第二轮全量相同命令：207 suites passed / 1 failed；2201 tests passed / 4 failed。失败仍集中于 `set-save.test.tsx`，退出码 1。
   - 为区分日志开销影响，第三轮运行 `npm test -- --runInBand --silent`（仅关闭控制台日志，保留全部测试及默认超时）：208 suites passed，2205 tests passed，退出码 0，耗时 213.017 s。新测试与既有 set-save 套件均在这一次全量运行中通过；没有合并分次结果。
4. `npx tsc --noEmit`：通过，无诊断输出，退出码 0。
5. `npm run lint`：通过，无错误或警告输出，退出码 0。
6. `git diff --check`：通过。

新增测试名称：

- `today hero toggles per-set prescriptions and excludes student-added sets`
- `preview hero toggles per-set prescriptions and excludes student-added sets`

## 审查与遗留

使用 review-loop 的本地任务卡流程，Standards 与 Spec 各一名独立只读 reviewer，完成一轮审查：Standards 0 findings；Spec 0 findings。审查覆盖 `434c274` 起的 WorkoutBody diff 和新增测试全文。仓内无 `docs/agents/issue-tracker.md`，已告知完整 Matt tracker 流程需 `$setup-matt-pocock-skills`；未创建配置。

按卡和用户指令未尝试 adb、未截图；Android 视觉验收由 Opus 收货时补。未 commit、push 或创建 PR；未修改主仓及正典台账。本记录为开发自测证据，不代表 Opus 最终验收。

任务范围无偏离。验证命令最终增加 `--silent` 以排查控制台日志开销，未跳过测试、改断言或调高超时。前两轮全量失败及第三轮通过均保留如上；日志开销或运行时调度可能影响既有时序测试，但未确定单一根因，不能宣称已修复其不稳定性。
