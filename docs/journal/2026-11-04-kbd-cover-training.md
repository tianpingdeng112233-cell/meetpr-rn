# 今日训练 Android 键盘遮挡（P1 / T1）

## 范围与现场

- 基线：`30c60d6`，分支 `fix/training-keyboard-covers-input`；David 直驱，要求本地原子 commit，不 push / PR / merge。
- 已读 CONTEXT、CLAUDE（仅引用 AGENTS）、AGENTS、PLAN、工程规约、记忆索引、diagnose / diagnosing-bugs / tdd；根目录无 FOLLOWUPS。
- `npm ci` 成功，1100 packages；读取 Expo SDK 57 版本文档 https://docs.expo.dev/versions/v57.0.0/。
- 用户给出的 `~/Library/Android/sdk/emulator/emulator` 不存在；实际 SDK 在 `/opt/homebrew/share/android-commandlinetools`。`emulator -list-avds` 返回 `meetpr-cn-accept`、`meetpr`、`meetpr16`，未创建 AVD。
- `platform-tools/adb devices` 失败：`could not install *smartsocket* listener: Operation not permitted`。当前沙箱无法监听 adb 端口，且审批策略为 never；不能取得模拟器截图、窗口 inset 或宣称 vivo 实机复现。

## 阶段 1–2：红色反馈与最小化

测试 seam 沿用 David 指定的 TodayWorkoutView 输入聚焦 → 输入完整可见边界。现有 completion-entry 测试覆盖页面与 completedRowToReveal，但 RN Jest 默认把 ScrollView 滚动实现 mock 成空函数，不能用于证明几何错误。新增 keyboard-visibility.test.tsx，取消 ScrollView mock，执行真实 RN responder，只在原生布局测量、滚动命令及 API 网络边界提供测试环境。

命令：`npm test -- --runInBand --watch=false src/features/training/__tests__/keyboard-visibility.test.tsx`

实际红色结果：1 failed / 1 total；`Expected <= 476; Received 596`。输入内容坐标 top=600、高=44，页面固定头部=120，键盘屏幕 top=500；要求底边 ≤476（spacing.lg=24）。该测试是明确几何环境下的组件复现，不是设备录制。最初测试 harness 的 Keyboard.emit API 错误不计作 bug 红色证据。

## 阶段 3：待证伪假设（修复前记录）

| 优先级 | 假设 | 可证伪预测 | 结果 |
| --- | --- | --- | --- |
| 1 | RN responder 将输入的内容坐标与键盘屏幕坐标直接比较，忽略 ScrollView 上方固定头部 | 只把头部高度改为 0 会转绿；保持头部 120 时可滚动内容充足也仍遮挡 120 | 头部 0：绿；120：红（596 > 476）。只修坐标后两者均绿，成立 |
| 2 | edgeToEdge + adjustResize 下窗口不缩，且缺少足够内容底部余量 | 保持窗口高度并模拟原生 scroll clamp，列表底部无法到达目标；补偿覆盖区域后可到达 | 内容 clamp 案例红：696 > 476；只增加键盘余量及布局后重测后转绿。未证实 vivo 是否缩窗；本 worktree 无生成的 android/，不把 Opus 配置侦察当现场事实 |
| 3 | automaticallyAdjustKeyboardInsets 不能补偿 Android 键盘 | Android 键盘 show/hide 前后底部 padding 不变；iOS 自动 inset 不能作为 Android 的修复 | 原代码 Android show/hide 不更新 padding；RN 原生实现位于 iOS RCTScrollViewComponentView.mm，Android scroll 实现无对应 inset 调整，成立 |
| 4 | 主项输入未接入聚焦回调 | 主项存在的 TextInput 聚焦未调用页面滚动，而辅助项会调用 | 排除：主项自选重量/自重卡复用 AccessoryLogCard 同一聚焦链路，普通主项 SetEntrySheet 使用应用内 NumberPad；本页组内原生输入为重量/次数/RPE/RIR，无可编辑组备注 |

## 阶段 4：逐变量验证

1. 最小布局移除固定头部（120 → 0）后，原实现转绿；保留头部即稳定复现 596 > 476。RN `ScrollView.js` 的 `_inputMeasureAndScrollToKeyboard` 明示假设 ScrollView 占满屏幕，但本页位于固定头部下方。传入 measureLayout 得到内容坐标，算法却直接减键盘 screenY，少滚头部高度。
2. 仅将 Android 改为 `measureInWindow` 并以实际 scroll offset 增加遮挡距离，最小两例转绿。
3. 再仅加入末尾原生滚动 clamp 条件，新增红例 696 > 476；原底部 padding=28，无法提供目标滚动距离。增加 Android 键盘高度 + spacing.lg 的内容余量，并在内容/视口布局完成后再次测量，三例转绿。
4. 扩展同一真实调用链至主项自选重量与辅助项，第 1 / 中间 / 最后一张卡，逐个聚焦实际 TextInput；所有现存组内原生输入共享同一处理。测试数据含 5 张已完成主项后第 6 张辅助项。已完成卡恢复与揭示仍由原 completion-entry 测试覆盖。
5. 新增 Android Back 收键盘但输入仍有焦点 → 重开键盘案例，先红（764 > 476）。只改变 Android hide 时不清除输入引用（blur 仍清除）后转绿。iOS hide 原有行为保留。

6. Standards 审查提出异步测量风险；新增两个延迟 native 回调重叠测试，先红：输入顶边 -56 < 视口顶边 120。移除滚动偏移累加，改用 viewport 原生窗口坐标 + 输入相对内容坐标计算绝对目标，10 条键盘测试全部转绿；同时断言输入上下边界。首次孤立探针遇到 5s 超时，该超时不算 bug 红色；诊断重跑设 testTimeout=60000 后得到上述数值失败，最终定向用默认超时也已绿。

没有加入临时 debug 日志；未改变 native 配置、依赖、导航或 tab。

## 阶段 5：修复与回归

- Android 使用输入窗口坐标与键盘上沿比较，保留 spacing.lg；对确实被遮挡的输入，测量原生 viewport 位置与输入相对内容的位置，计算绝对滚动目标。测量返回时验证焦点与键盘仍是同一个，避免旧异步结果误滚。
- show 增加底部滚动余量；内容高度/视口变化后重测以处理原生 clamp 与 resize。hide 恢复原有 padding。
- iOS 保留原 responder 和 automaticallyAdjustKeyboardInsets 路径。
- 新测试必须单独取消 RN ScrollView mock，因此保留现有 completion-entry 测试文件，新增 keyboard-visibility 文件；不在原测试中破坏依赖 mock prototype 的 completed-row 用例。
- 最终定向：`npm test -- --runInBand --watch=false src/features/training/__tests__/keyboard-visibility.test.tsx src/features/training/__tests__/completion-entry.test.tsx`：2 suites / 40 tests 全绿，其中键盘 10 条、既有完成/揭示 30 条。
- 全量：`npm test -- --runInBand --watch=false`：198 suites / 2071 tests 全绿（435.478s）；最终原生 viewport ref 类型修正后再跑上述定向 40 条通过（6.18s）。
- `npm run lint`：exit 0，0 errors / 0 warnings；初次 import 顺序 warning 已清除。
- `npx tsc --noEmit`：exit 0，0 errors。`git diff --check` 通过；新增源文件无 `[KBD-DBG]` / `[DEBUG-` instrumentation。
- 命令输出摘录见 [checks.txt](../evidence/kbd-cover-2026-11-04/checks.txt)。

## 阶段 6：交付边界

模拟器/真机尚未验收：adb 服务监听被沙箱拒绝，不能获取截图或 dumpsys/uiautomator bounds。不能将上述原生边界模拟测试称为 CN 包视觉验收，更不能认定 OriginOS 根因已经设备确认。证据目录 `docs/evidence/kbd-cover-2026-11-04/` 仅保存命令输出摘要，不含截图。需在允许 adb 服务监听的环境补 CN 轨无代理现有 AVD 的首/中/末卡、主项/辅助项截图和收键盘页面检查。

独立审查：

- Standards：异步测量风险经先红后绿修复，定向复审通过；目标模拟器视觉证据门禁仍未满足。
- Spec：假设记录缺口已关闭，无新增行为越界；保留模拟器 CN 轨截图验收缺口。
- 仓内缺少 `docs/agents/issue-tracker.md`，已告知后续 `/setup-matt-pocock-skills` 补配置；本次直接按用户需求审查，不阻塞修复。

正典 PARITY/发布台账依既有职责留给 Opus，本卡仅 JOURNAL 与原始证据。本地 commit 的 message 记录已证实的坐标系假设错误和 Android 滚动余量缺失；未 push / PR / merge。
