# 给苹果端会话的交接：2026-10-14 真机走查

David 2026-10-14 在安卓 CN 包上走查注册引导与训练页，提出三条；安卓已在分支 `claude/laughing-maxwell-x0br3l` 改完。按「新改动安卓与 iOS 一起开工、一起验收」，iOS 需要跟的只有第 3 条。

## 1. 引导第 1 步：键盘挡住身高框（iOS 不用改）

安卓的 `KeyboardAvoidingView` 没设 `behavior`，键盘弹出时页面不动。iOS 原生表单自带键盘避让，只需在真机上确认身高框在键盘弹出后仍可见、可滚到。

## 2. 引导第 2 步：训练年限滑条只能点不能拖（iOS 不用改）

安卓的滑条原来是一排可点的刻度点，现在可按住拖动、读屏可左右调整。iOS 用的是系统 `Slider`，本来就能拖；同样只需真机确认。

## 3. 训练页：已完成那天的「撤销完成」（iOS 要改）

David 选的方案 A：

- 去掉原来带边框的块（上一行「已完成 · 不可修改」，下一行「撤销完成 ›」链接）。
- 换成一行状态条，不带边框、不带底色：左边绿色对勾图标 + 「已完成」（`student.todayWorkoutScreen.copy009`，英文 `Completed`），中间留空，右边浅色小字按钮「撤销完成」（`student.todayWorkoutScreen.copy023`，英文 `Undo completion`）。
- 「撤销完成」只在原来能撤销时出现（当天最新结算的那一天），规则不变；不能撤销时这一行只有「✓ 已完成」。
- 行高与按钮点击区至少 44pt；文字用脚注字号，「已完成」次要文字色，「撤销完成」更浅的弱化色。
- 「已完成 · 不可修改」这条文案不再出现在页面上（安卓仍在「所选日已不可写」的保存拦截弹窗里用它，iOS 同理不动弹窗）。

安卓实现：`src/features/training/TodayWorkoutView.tsx` 里 `testID="training.completedDay"` 的那一行；测试见 `completion-entry.test.tsx` 末尾两条。
