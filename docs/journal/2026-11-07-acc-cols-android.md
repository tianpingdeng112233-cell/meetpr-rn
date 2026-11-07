# acc-cols Android 实装记录

状态：实装、相关回归、类型检查、lint 与双轴审查已完成；全量 Jest 门禁尚未通过，不能宣告本卡交付完成。

- 工作目录：`/Users/david/Projects/apps/meetpr-rn-wt-acc-cols`。
- 分支：`fix/accessory-table-columns`；开工 HEAD：`434c274`。
- 范围与验收依据：根目录 `CARD-acc-cols.md`。开工目录临时写入/删除成功，确认 `node_modules/.bin/jest` 存在；未运行 `npm ci`。
- 已读 `AGENTS.md`、`CLAUDE.md`、`CONTEXT.md`、`PLAN.md` 与 Expo SDK 57 文档。

## 改动

- `AccessoryLogCard.tsx`：表头、待填、完成、额外组和自加动作继续共用 `column()`。强度列与次数列同宽，取消强度列 88dp 下限；旧下限转为「上次」的 flex basis，同时从它的增长比例扣除强度列份额，保留手机宽度下其余列的原分配。
- 强度表头的切换按钮与说明按钮仍是两个独立无障碍按钮，label 不变。`EffortHelpButton.tsx` 增加默认关闭的 `superscript` 参数：辅助项使用 14dp 图标和 14×44dp 纵向触区，图标上移，横向不扩展；其他调用保持原样，说明卡内容未改。
- `accessory-quick-log.ts` 的行展示模型保留历史强度并生成 `previousText`：优先 `actual_rir`，否则 `rpe`，没有强度则省略后缀，没有记录为 `—`。重量沿用原 kg/lb 换算及去尾零格式。点击「上次」仍只填重量和次数。
- 「上次」字号自动适配列宽，限制为 10–11sp。独立审查发现 RN 0.86 Android Fabric 未将 `minimumFontScale` 用作测量下限，因此改为本地字号计算。读取已安装 IBM Plex Mono Regular 字体的 TTF 表验证：unitsPerEm=1000，advance widths=[0,600]；计算使用 0.6em 字宽并考虑系统 `fontScale`。
- 不改独立 `free_weight && !allowsRIR` 排版、主项卡、后端或持久化模型。

## 测试与结果

所有命令均在上述工作目录执行。

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 行模型 red | `npm test -- --runInBand --watchman=false src/features/training/__tests__/accessory-quick-log.test.ts` | 新增 6 项失败，原有 55 项通过；`previousText` 尚未实现 |
| 行模型 green | 同上 | 61/61 通过 |
| 列宽 red | `npm test -- --runInBand --watchman=false src/features/training/__tests__/accessory-log-card.test.tsx -t 'effort and reps share'` | 1 失败、23 跳过；实际强度 minWidth=88，次数为0 |
| 列宽 green | 同上 | 1 通过、23 跳过 |
| 字号返修 red | `npm test -- --runInBand --watchman=false src/features/training/__tests__/accessory-log-card.test.tsx -t 'previous text automatically fits'` | 1 失败、24 跳过；缺少自动测宽处理 |
| 最终相关回归 | `npm test -- --runInBand --watchman=false src/features/training/__tests__/accessory-quick-log.test.ts src/features/training/__tests__/accessory-log-card.test.tsx` | 2 suites、86/86 通过，含字号缩至10/恢复11、历史文案、lb格式、点击不填强度 |
| 首轮全量 | `npm test -- --runInBand --watchman=false` | 206 suites 通过、1 suite 失败；2210 项通过、1 项失败。`load-types-entry.test.tsx` 仍断言旧文案 `20 × 10`，按卡改为 `20×10`；原填值及保存断言保留 |
| 第二轮全量 | `npm test -- --runInBand --watchman=false` | 206 suites 通过、1 suite 失败；2210 项通过、1 项失败。旧文案断言已通过，`hero-camera-upload.test.tsx` 的 during-camera 场景超过默认5000ms；首轮该项通过，无相关代码改动 |
| 超时单测复跑 | `npm test -- --runInBand --watchman=false src/features/training/__tests__/hero-camera-upload.test.tsx` | 默认5000ms下3/3通过；先前超时场景耗时2636ms |
| 高负载复跑 | `npm test -- --runInBand --watchman=false --testTimeout=15000 --silent` | 本机1分钟load average实测238.06；之前通过的辅助项2条UI测试超过15000ms，该文件耗时192.675s。主动中止此轮，退出码130 |
| 限制资源的全量尝试 | `npm test -- --maxWorkers=2 --workerIdleMemoryLimit=512MB --watchman=false --testTimeout=60000 --silent` | `completion-entry.test.tsx` 通过但耗时255.5s；`set-save.test.tsx` 耗时376.656s并出现真实计时重试相关断言失败，见下方。主动中止，退出码130，无完整汇总 |
| 类型检查 | `npx tsc --noEmit` | 退出码0，0 errors |
| lint | `npm run lint` | 退出码0，0 errors / 0 warnings |

## 审查

- Standards：独立只读初审无发现；字号返修的定向复审无新增发现。
- Spec：初审发现 Android 原生字体下限未生效；修复并补先红后绿回归后，独立复审确认缺口消除，无新增发现。
- 仓库缺 `docs/agents/issue-tracker.md`；未私建配置，按 `review-loop` 的本地卡片流程执行双轴审查，未声称运行 tracker 工作流。

## 偏差与遗留

- 无产品范围偏差。工程实现因 Android 原生限制改用 JS 自动字号适配；额外补了字体下限的 UI 回归。
- 全量执行遇到超时及本机高负载；相机测试单独默认超时复跑通过。最终命令采用2个worker、512MB闲置内存回收阈值、60000ms运行超时，并抑制普通控制台输出。未改仓库测试配置、跳过用例或修改相机代码。
- 全量门禁遗留：待本机负载回落后重新执行完整 Jest。最后一次观测的1分钟load average=227.85；资源限制复跑仍未得到完整通过结果，已停止进程，不留后台任务。
- 最后一条失败：`src/features/training/__tests__/set-save.test.tsx:493`，`complete all submits serially without rest, leaves 2 empty rows and keeps all local completions on transport failure`。预期请求序列 `[0, 1]`，实际 `[0, 1, 1]`。该测试之后才显式触发重试并期待第三次请求；`set-sync/queue.ts:235` 则会在首次失败1000ms后自动重试。结合前两轮该文件通过及本次高负载，推断为真实计时与断言竞争；没有据此修改卡外同步逻辑或测试。需要低负载复验，不能把此推断写成功能无回归的证明。
- 按本次任务明确约束，未使用 adb、未截图、未构建安装。卡片的 360dp 长文本、切换/说明独立触控、完成/待填/加组行视觉对齐，由 Opus 在验收阶段确认；本记录不宣告视觉验收通过。
- 未修改 PARITY 或其他正典台账，留给 Opus 收货。未 commit/push。`CARD-acc-cols.md` 保留原样。

## 返修 1

本节为最新状态：本轮代码验证门禁已通过（全量 Jest、类型检查、lint）；上方初轮阻塞记录保留为历史。视觉与触控验收仍交 Opus。

### 改动

- 按 David 的返修要求纠正表头视觉偏差：`AccessoryLogCard.tsx` 恢复使用带边框的 `EffortToggleLabel`，传入 `compact`。
- `EffortToggleLabel.tsx` 新增 `compact?: boolean`，默认 `false`；开启时仅将 `paddingHorizontal` 置为0，字号、字重、纵向padding、边框、圆角及颜色均沿用原样。
- `QuickLogSheet.tsx`、`SetEntrySheet.tsx` 没有修改，继续使用默认样式。
- `accessory-log-card.test.tsx` 新增一条断言，确认辅助项表头切换按钮内仍渲染一个 `EffortToggleLabel`。
- Standards / Spec 独立定向复审均无新增发现。

### 验证

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 新断言 red | `npm test -- --runInBand --watchman=false --testTimeout=30000 src/features/training/__tests__/accessory-log-card.test.tsx -t 'accessory header keeps the bordered'` | 1失败、25跳过；预期1个组件，实际0个 |
| 新断言 green | 同上 | 1通过、25跳过 |
| 全量 Jest | `npm test -- --runInBand --watchman=false --testTimeout=30000` | 207/207 suites、2212/2212 tests通过；耗时453.143s，退出码0 |
| 类型检查 | `npx tsc --noEmit` | 退出码0，0 errors |
| lint | `npm run lint` | 退出码0，0 errors / 0 warnings |

### 基线对照

- 现场核实本地 `origin/main` 与 HEAD 均为 `434c2741c4349abc963e78f1b9d0237c80ec4301`，`package.json` / `package-lock.json` 无差异。
- 本轮全量中 `set-save.test.tsx` 通过（84.552s），`[0,1,1]` 失败未重现，故未触发用户指定的 `origin/main` 临时基线对照条件；没有创建临时基线目录或使用 stash。
- 对照结论：本轮没有该失败，但未做对照实验，不能将历史失败“与本卡无关”写成已证实结论。初轮真实计时竞争的解释仍仅为推断；当前代码已通过指定的完整测试命令。
- 本轮未 commit/push；视觉与触控验收仍由 Opus 完成。

## 返修 2

本节为最新状态：按 Opus 的 360dp 验收反馈修复表头 RPE 换行；本轮全量 Jest、类型检查和 lint 均通过。设备上的最终视觉与触控验收仍由 Opus 完成。

### 改动

- `EffortToggleLabel.tsx`：文字增加 `numberOfLines={1}`，保留原边框、字号与 compact 样式。
- `AccessoryLogCard.tsx`：表头用不收缩的固有宽度容器包住标签，切换按钮取消横向 flex 分配，使盒子获得完整文字宽度。
- `EffortHelpButton.tsx`：仅 superscript 模式改为 `position: 'absolute', left: '100%', top: 0`。14dp 角标从标签容器右边缘开始，借用通往 Done 列的间隙；不参与横向 flex 分配，保持14×44dp触区，横向与切换按钮相邻不重叠。两个按钮的无障碍 label 未改。
- `accessory-log-card.test.tsx`：新增两项回归，覆盖 RPE/RIR 切换前后文字均为单行，以及角标绝对定位、纵向触区至少44dp、标签不分配 flex 且容器不收缩。
- 本轮未改 `column()`、PreviousLogText、历史文案模型、QuickLogSheet/SetEntrySheet 调用或说明卡内容；没有新增卡外改动。

### 验证

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 单行 red | `npm test -- --runInBand --watchman=false --testTimeout=30000 src/features/training/__tests__/accessory-log-card.test.tsx -t 'accessory header keeps both'` | 1失败、26跳过；numberOfLines 预期1，实际undefined |
| 单行 green | 同上 | 1通过、26跳过 |
| 角标 red | `npm test -- --runInBand --watchman=false --testTimeout=30000 src/features/training/__tests__/accessory-log-card.test.tsx -t 'accessory header help borrows'` | 1失败、27跳过；角标缺少 absolute/left/top 样式 |
| 角标 green及文件回归 | `npm test -- --runInBand --watchman=false --testTimeout=30000 src/features/training/__tests__/accessory-log-card.test.tsx` | 1/1 suite、28/28 tests通过 |
| 全量 Jest | `npm test -- --runInBand --watchman=false --testTimeout=30000` | 207/207 suites、2214/2214 tests通过；66.89s，退出码0 |
| 类型检查 | `npx tsc --noEmit` | 退出码0，0 errors |
| lint | `npm run lint` | 退出码0，0 errors / 0 warnings |

### 审查与遗留

- Standards / Spec 独立只读定向复审均无新增发现。检查已安装 RN 0.86 的 Android `TouchTargetHelper.kt`：默认可见 overflow 支持越出父视图边界的子节点触控；设备上的点击与360dp无截断效果仍需 Opus 验收，Jest 样式断言不替代原生渲染验收。
- `set-save.test.tsx` 本轮通过，历史 `[0,1,1]` 失败未重现；没有触发 origin/main 基线对照条件，未使用 stash 或修改卡外代码。
- 只读查看两张返修1证据截图，前后 SHA-256 一致：header=`89af2aac6e4a68b806b262c5afa608d826950d929f1f2838be457a27adb6af85`，wrap=`5043e4a57ce9a2d98872761d0e410e9344f2080507560c96e3832868230f45ef`。未修改截图、未使用 adb、未构建安装或截图。
- 无新增范围偏差；`CARD-acc-cols.md` 保留，未 commit/push。
