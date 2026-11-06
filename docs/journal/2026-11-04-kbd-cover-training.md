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

## 2026-11-04 06:02 UTC 接棒验收：环境阻塞

- David 本轮授权 Codex 收尾：安卓验收通过后提交、push、开 PR 到 main，不合并；取代上文原先「不 push / PR」的任务限制。现场 HEAD 仍为 `41d1131`，开始时工作区干净。
- 已按指定 PATH 和 15 秒超时执行 `adb -s emulator-5560 get-state`。实际返回 `daemon not running`、`could not install *smartsocket* listener: Operation not permitted`、`cannot connect to daemon`（exit 1）。当前会话未能连接交接所述宿主 adb server；不能安装验收包、进入训练页或取得 uiautomator bounds。原始输出见 `docs/evidence/kbd-cover-2026-11-04/handoff-blockers.txt`。
- 未执行 install/uninstall，未覆盖正式包 `com.meetpr.app`，未操作 emulator-5556/5558，未新建 AVD。首/中/末截图、输入框与键盘边界数字、收键盘后空白检查均未完成，不能宣布安卓验收通过；没有产品失败反馈，不启动返修轮次。
- 生成目录 `android/app/build.gradle` 的临时 applicationId 已恢复为 `com.meetpr.app`；未重建，现存独立验收 APK 保留。该目录被 gitignore，不纳入提交。
- iOS 对照检查：`defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false` 返回 `Could not write domain com.apple.iphonesimulator; exiting`（exit 1）。遵照 David「沙箱仍挡则停下，不绕过」，未继续重启或尝试其他键盘切换途径。iOS 需 David 在 iPhone 17e 按 ⌘K；本轮未取得系统键盘截图，是否同病仍未知。
- 只读核实 iOS 分支 `fix/training-keyboard-covers-input-ios` @ `bfc0fdc8`；`git diff --exit-code HEAD -- Modules/StudentKit/Sources/StudentKit/Demo/TrainingFlowDemoScenario.swift` 返回 0，临时五动作源码已经还原。原 iOS JOURNAL 仍记录 1,091 tests 中 22 个既有本地化失败，本轮未重跑，不声称全绿。
- 本会话仅允许写当前安卓 worktree 和临时目录，iOS worktree 不在可写范围内；未改写 iOS JOURNAL 或旧截图。其更新候选保存于 `/tmp/2026-11-04-kbd-cover-training-ios-handoff.md`，尚未写回目标仓。
- 当前停留在设备验收门禁前，未 commit / push / PR / merge；无需新的产品决策，继续需要可连接宿主 adb 的执行环境、iPhone 17e 软件键盘和 iOS worktree 写权限。

## 2026-11-06 Opus 模拟器收货（补上方环境阻塞）

- AVD `meetpr-cn-accept`（emulator-5560，Android 15，软键盘），装独立包名 `com.meetpr.app.kbdverify` 的离线 DEMO 验收包（基于 41d1131，debug 签名，不可分发），正式包 `com.meetpr.app` 未动。
- 今日训练页进入记录态，先把目标输入滚到屏幕下沿再聚焦（复现真机场景），uiautomator 读聚焦框 bounds，键盘上沿约 y=1632（截图 1360×1.2）：
  - 第一张系统键盘卡 Leg Press 第 1 组重量：聚焦前 y=1745–1862 → 聚焦后 1454–1570，完整可见。`01-first-legpress-set1.png`
  - 中间卡 Cable Row 第 2 组重量：1996–2113 → 1454–1570，可见。`02-middle-cable-row-set2.png`
  - 最后一张卡 Pull-up 第 3 组重量（列表末尾，需靠新增底部余量才能滚上来）：1784–1900 → 1454–1570，可见。`03-last-pullup-set3.png`
- 收起键盘后页面恢复，末尾无多余空白：`04-after-hide.png`。键盘打开时列表仍可手动上下滚动，未被拉回。
- 主项（Squat/Bench）走应用内数字键盘，不涉及系统键盘。
- 结论：安卓验收通过。
