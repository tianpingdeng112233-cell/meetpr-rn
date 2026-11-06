# 105 Android — app 内数字面板实现记录

日期：2026-11-06。分支：`feat/105-in-app-keypad`。开工 HEAD 与本地 `origin/main` 均为 `60f17019e3d3b517d821e7c8d9f5ac58d64bae41`，工作区原先干净；未联网刷新远端引用。

需求只取 `specs/105-in-app-keypad/SPEC.md` 与 David 本次已定稿屏幕稿转写。未改 spec、验收清单或正典台账。当前是待 Opus 收货的工作区改动，**不声明 spec 全部实现或验收通过**。

## 已实现

- `AccessoryLogCard` 的组内数字 TextInput 改为方框 Pressable，辅助项、自加动作、自选重量、自重行继续沿用现有值及保存请求。`NumberPad` 经透明 Modal 展示，遮罩、取消与 Android Back 放弃当前输入。
- 重量→次数→RPE/RIR→下一组；跳过现有布局没有的字段和不可编辑行，末格确定关闭。已确认的字段留在原 inline edits；RPE/RIR 删空清空，重量/次数删空保留先前值。
- `NumberPad` 增加显式 accessory 模式、单位与面板几何回调，默认主项分支及 `snapped()` 不变。辅助项不吸附、不套用 20 kg 下限，一位小数；RPE 半步校验，10.5 不能提交；RIR 小数键禁用。次数面板接受 1–100，但保存上限冲突见下文。
- 已批准样式接线：当前格品牌金 2px 描边、数值正文色、行浅暖底；面板一行上下文与当前值/单位；底部取消与金色实心 Next/确定。简中、繁中、英文文案齐备。
- `TodayWorkoutView` 按实际面板位置测量并滚动整行，保留 24 dp 间距，面板关闭移除额外 padding。
- 删除 #143 的 `revealAccessoryInput`、`androidKeyboardHeight`、键盘监听、TextInput focus 回调及 `keyboard-visibility.test.tsx`，以 app 面板几何测试替代。
- `Keyboard.isVisible()` 仍仅用于阻止完成动作的自动滚动抢焦点：完成整日的反思 Modal（`CompletionControls`）以及动作搜索 Modal（`StudentExercisePicker`）仍有文字输入。它不是旧组内键盘避让，未保留系统键盘高度、padding 或 focus 滚动处理。训练页常规组列表测试断言无可编辑 TextInput；不将 Modal 内文字输入改为数字面板。

范围补充：`WorkoutBody.tsx` 只改必要接线（动作名、面板布局回调替换旧 focus 回调）；新增测试 helper 供原保存测试通过实际按键输入。未改后端、请求 schema、主项 `SetEntrySheet`、导航或 tab。

## 测试证据

已读取 Expo SDK 57 版本文档。依赖以现有 lockfile 从本机 npm cache 离线安装，随后执行现有 `postinstall` patch；无依赖或 lockfile 改动。

TDD 按公开 seam 逐步执行：辅助项规则 1 红→4 绿；点格打开面板 1 红→1 绿；跨组 Next 1 红→2 绿；页面面板避让 6 红→6 绿。现有保存测试改走真实 NumberPad 按键，覆盖自加记录、历史值、英磅转换、失败重试、spec 102 离线链路与完成流程。

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0，0 错误 |
| `npm run lint` | exit 0，0 问题 |
| `npm test -- --runInBand` | 207 suites / 2178 tests 全绿，136.701 秒 |
| 最后局部回归（number-pad + AccessoryLogCard） | 2 suites / 26 tests 全绿 |
| `git diff --check` | exit 0 |

全量测试后只修正测试参数类型，并把辅助项重量键入位数保持为已有的 5 位上限；最后局部回归覆盖该单行。测试有现有 Expo Go notifications 与部分 act 日志告警，但无失败。精简原始输出见 [checks.txt](../evidence/spec105-20261106/checks.txt)。

几何测试验证首张、中间、末张卡打开时可见及关闭后的 JS inset 清理；它使用原生几何/命令 mock，**不能替代 Android 原生滚动生命周期或截图验收**。

## 独立审查（review-loop，一轮，未收货）

Standards：独立只读 reviewer 检查固定 diff 与新增测试，0 项实质问题。未发现命名、重复、耦合或过度抽象方面的必要返修。

Spec：独立只读 reviewer 报告 2 项未闭合；主代理已核实。最后重量位数单行补审无新增 finding。仓内无 `docs/agents/issue-tracker.md`，未假称执行 Matt tracker 流程；使用 review-loop 的本地双轴审查，已告知可通过 `$setup-matt-pocock-skills` 补配置。

## 未完成项与交接

1. **P1，次数 100 的保存契约冲突。** spec §4 要求 1–100；面板已接受 100，但 `set-log-input.ts`、`TodayWorkoutView` 提交校验、`api/domains/sets.ts` schema 都限制 99。当前 100 次不能完成并落库。已向 David 异步提出由 Opus 协调，或授权扩展客户端范围并核实后端；尚未收到选择。不自行把验收上限改成 99，也未绕过现有保存契约。建议 Opus 协调保存全链路边界后派定向修复。
2. **P2，末尾收起面板时的原生位置收紧。** 删除临时 padding 后，若 offset 大于新内容的最大 offset，Android RN `ReactScrollView.java` 的 `onLayoutChange` 会自动 `scrollTo(maxScrollY)`，存在与 spec §5「不回跳」不符的情况。代码未额外执行 JS 复位滚动，但这不足以证明不回跳。保留 padding 又会违反「底部不留空白」，不能用隐藏空白规避。需在原验收清单的末张卡末组场景实测并由 Opus 确认收起体验；若要求绝对位置不动，需要进一步明确列表末尾的布局处理。此项未宣称修好。
3. 模拟器截图、三语视觉、首/中/末卡末组、升级老用户与离线/完成整日的设备验收均未运行，按 David 本次指令由 Opus 在原 spec 清单上完成；本卡没有修改验收矩阵或勾选验收结果。
4. 未 commit、push 或创建 PR。Opus 负责收货、模拟器验收及后续提交交付。


## 2026-11-06 定向返修：次数上限 99（未完成项 1 关闭）

按 David 转达的 Opus 裁定，次数范围修订为 1–99；已核实本地修订提交 `e19fcde` 的 spec §4（当前实装分支尚未包含该文档提交，不在本轮改写 spec）。本轮仅把 `number-pad.ts` 的辅助项次数上限从 100 改为 99：100 可以键入，但确认按钮禁用，不提交、不推进，与 RPE 10.5 的处理一致；99 正常确认。主项 `snapped()`、保存链路及未完成项 2 的滚动代码均未改动。原文中「1–100」及未完成项 1 的待裁定状态为前轮记录，由本段替代。

先红后绿证据：辅助项规则测试先以「期望 undefined、实际 100」失败（1 failed / 3 passed）；新增组件测试先以「期望按钮 disabled=true、实际 false」失败（1 failed / 22 skipped）。改一行上限后，定向 2 suites / 27 tests 全绿。重跑 `npx tsc --noEmit`、`npm run lint` 均 exit 0、0 问题；全量 `npm test -- --runInBand` 为 **207 suites / 2179 tests 全绿**，33.366 秒，进程 exit 0；`git diff --check` 通过。全量运行出现 Jest 异步操作未立即退出提示，随后自行正常退出，未强制终止。精简输出追加在 [checks.txt](../evidence/spec105-20261106/checks.txt)。本轮自审未发现 Standards 问题；独立 Spec 补审无新增 finding，确认原 P1 关闭。未完成项 2 继续由 Opus 模拟器实测后裁定；未运行模拟器、未 commit、未 push。
