# Hero 摄像头首次上传失败 · Android CN 0.1.0(7)

- 开工基线：`fix/hero-camera-upload-fail` @ `250a25c`，初始 worktree 干净；包含 CN versionCode 7。无 commit/push/PR。
- 已读：根 CONTEXT/AGENTS/CLAUDE（仅引用 AGENTS）、PLAN、全局 engineering-workflow、memory/INDEX、diagnosing-bugs、tdd；无更近的 AGENTS/override 或 FOLLOWUPS 文件。已读取 Expo SDK 57 文档：https://docs.expo.dev/versions/v57.0.0/ 。
- Scope：training 代码及对应测试、本 JOURNAL。无后端、其它 tab、布局或文案改动；正典台账由 Opus 收货。
- 测试 seam：按任务授权使用 TodayWorkoutView → Hero/onVideo → SetEntrySheet(initialCamera) → CameraRecorder.onUse → VideoAttachmentControls → 真实 upload manager → 真实 commit/建记录队列。仅 API、存储、原生视频 I/O 使用 mock；CameraRecorder.onUse 模拟已拍视频交接，物理摄像头另列 HITL。

## Phase 1 · 造反馈环

完成判据：一条已运行、确定性、秒级、无人值守命令，在真实 initialCamera 首次 attach 链上断言 failed/copy004 症状，修复后应 uploaded。

命令：
```sh
npm test -- --runInBand --watchman=false src/features/training/__tests__/hero-camera-upload.test.tsx
```

先遇到 `jest: command not found`；本 worktree 无 node_modules，以忽略的软链复用本机 `meetpr-rn-wt-kbd/node_modules`，未修改依赖清单。补齐原生 File/安全区测试环境后得到业务红灯，未在环境错误上推断根因。

脱敏输出（原始实现，测试 1.640s、Jest 6.014s）：
```text
Expected { status: "uploaded", error: null, copy004: false }
Received { status: "failed", error: "The log was not saved. Try again. Your entries remain on this page.", copy004: true }
Test Suites: 1 failed, 1 total
Tests: 1 failed, 1 total
```
测试明确确认拍摄期间 suggestion 已变为 80 kg，随后交接视频，没有伪造 ensureSetLog 抛错。Phase 1 完成。

## Phase 2 · 复现与最小化

完成判据：重复红灯同一症状；逐项删减，保留触发首次上传错误所需条件。

以下为重复与最小化证据。

重复原环：1 failed/1，Jest 1.582s，仍为 failed + copy004。仅把 profile 就绪提前到打开相机之前：1 passed/1，Jest 2.446s（用例 710ms），首次完成上传并建记录 1 次。已还原原环。

最小 fixture 只保留一名学员、一天、一个未记录组、一个视频，不依赖动作名称、第 4 组、RPE 6.5、重试次数或真实网络。承重时序为：未预填时打开相机 → 异步预填更新 → 用所拍视频首次 attach。没有视频交接不触发上传；没有晚到预填（提前就绪）则绿。Today/Sheet/manager 保留为真实调用链验证 seam，不模拟其错误。Phase 2 完成。

## Phase 3 · 可证伪假设

完成判据：先记录 3–5 个排序假设及预测，再逐个验证；已向 David 展示排序，不等待回复。

| 排名 | 假设 | 可证伪预测 |
| --- | --- | --- |
| 1 | Overlay 中的 CameraRecorder.onUse 捕获了打开相机时的 attach/ensure/buildRequest，使用旧空重量 | 同时观察当前表单和回调重量会不一致；仅让回调读取最新参数，原环转绿 |
| 2 | 异步 suggestion 到达但 Sheet 的预填 reducer 没有更新 | 上传时可见重量仍为空；若字段已是 80，则排除 |
| 3 | 并发 commit 队列或 liveDrafts 变化令目标组消失 | ensure 的错误应是 Set log unavailable；若 draft 存在且 error 为 Invalid set input，则排除 |
| 4 | 网络/接口异常错误归类为 deterministic | 应发生 /sets/log 或上传请求并返回错误；若这些请求之前就抛本地校验错误，则排除 |

Phase 3 完成。

## Phase 4 · 定向探针

完成判据：每个探针对应预测，一次只改变一个变量，日志统一前缀 `[DEBUG-h7c1]`，无真实用户数据。

探针结果（原实现）：
```text
[DEBUG-h7c1] commit { weightText: '', repsText: '5', draftFound: true }
[DEBUG-h7c1] form { weight: { text: '80 KG' }, writes: 0 }
```
当前字段确实已更新，排除 H2；draft 存在，空重量在本地校验抛错，排除 H3；建记录网络请求数为 0，排除 H4。支持 H1：表单 80，回调仍传空串。Phase 4 完成（待 Phase 5 单变量修复验证 H1）。

## Phase 5 · 修复与回归

完成判据：已红回归在正确 seam 转绿；重新运行原环；真正非法重量仍提示且视频保留；全量 test/tsc/lint。

开始修复：先只更新 VideoAttachmentControls 的异步回调取值，验证 H1。不改变预填算法、处方或重试分类。

单变量修复验证 H1：日志变为 `commit weightText: '80'`，API writes=1，原环 1/1 绿。清除探针后追加第二条时序回归：拍摄交接发生在预填到达之前；该用例先红，仍 failed + copy004，第一条已绿（1 passed / 1 failed）。

第二条修复：只对本次附件因重量未就绪而失败的情况，在字段变为有效时自动重试；等待前次 attach/job 收尾以免 execute 复用刚失败的 job。retry 更新持久化的 logRequest，避免继续使用空重量快照。空重量不构建可后台提交的请求（保存 null），仍执行真实本地校验、保留已拍视频，并显示已有 missingWeight 提示。未把校验错误统一改成网络重试。没有新增文案或布局。

新增边界用例：free_weight 为空时建记录 0 次、保留 source、logRequest=null、显示既有 missingWeight；仅改 RPE 不上传，录入 92.5 kg 后自动上传，保存 RPE 6.5 与 reps=5。

检查中曾出现一次编辑语法错误，立即修正；并行冷加载时用例超过 Jest 默认 5 秒（最长 5.511s），不是业务断言失败，需以最后独立复跑和全量结果为准。

## 原生验收 / HITL

已尝试已有 adb 路径 `adb devices -l`，沙箱拒绝 ADB listener (`could not install smartsocket listener: Operation not permitted`)，未连接/新建 AVD、未启动带代理的 CN 包。此环境不能给出 Android 原生截图或真机上传证据。

HITL 留给验收：在 CN 真机已有账号/计划上，从 Hero 摄像头直接录制第 4 组并 Use，核对首次送达、RPE 6.5 保留、完成本组恢复可用；另复核弱网下预填晚到的自动续传、free_weight 空重量的提示和视频保留。Jest 的 native I/O/API mock 不等同于真机 CN 联调。

## 独立代码自审（review-loop，1 轮）

固定范围：HEAD `250a25c` 到本工作树的 4 个 production 文件及新增 regression 文件；需求源为本任务正文。缺少 `docs/agents/issue-tracker.md`，已告知正式 tracker 流程需 `$setup-matt-pocock-skills`，未私建；本地 review-loop 不依赖 tracker。

- Standards 只读 reviewer：0 findings；检查 callback ref、retry 收尾/identity 防重复、请求持久化、视频保留。
- Spec 只读 reviewer：0 代码 findings；确认拍摄中/拍摄后预填自动恢复与空重量提示，要求交付前补齐本 JOURNAL、全量数字与 HITL。
- 两轴分别完成；这是开发自测/自审，不替代 Opus 收货或真机验收。

定向最终环（同 Phase 1 命令）：3 passed / 3，1 suite，7.570s（各用例 2.073 / 0.933 / 0.914s），无手动 Retry。类型检查输出 0 诊断，lint 输出 0 问题；全量测试已完成，最终结果见下。

## 最终根因与修复说明

已证实的可复现根因：OverlayHost 保存相机打开时创建的 React element，onUse 闭包继续使用当时的空重量；即使 Sheet 已预填 80 kg，ensureSetLog 仍把空串交给真实 commit，触发 Invalid set input → deterministic failed/copy004。若值在视频交接后才就绪，原实现还缺少自动续传。该结论由确定性真实 JS 调用链证实；用户真机的原生/网络时序仍按 HITL 复核。

修改文件：
- `src/features/training/video-upload/VideoAttachmentControls.tsx`：相机交接读取最新 callback；本次附件因输入未就绪失败后，字段有效时自动续传。
- `src/features/training/SetEntrySheet.tsx`：传递重量就绪状态；上传触发校验时显示已有输入提示。
- `src/features/training/video-upload/manager.ts`：允许缺少合法请求时先保留视频；retry 等待旧任务收尾、防止重复触发，并可重新构建请求。
- `src/features/training/video-upload/model.ts`：retry 事件携带更新后的 logRequest，沿用现有持久化路径。
- `src/features/training/__tests__/hero-camera-upload.test.tsx`：3 条组件链回归；既有 TodayWorkoutView 无最终改动。

## 最终检查

| 命令 | 结果 |
| --- | --- |
| `npm test -- --runInBand --watchman=false src/features/training/__tests__/hero-camera-upload.test.tsx` | 1 suite / 3 tests 全绿，7.570s；先红后绿证据见 Phase 1/5 |
| `npm test -- --runInBand --watchman=false` | 198 suites / 2064 tests 全绿，204.041s，退出 0 |
| `npx tsc --noEmit` | 通过，0 诊断 |
| `npm run lint` | 通过，0 errors / 0 warnings |
| `git diff --check` | 通过 |
| `rg -n '\[DEBUG-' src/features/training` | 空输出，无运行代码/测试调试日志 |

全量 Jest 仍有仓内既有 Expo Go/React act 控制台警告，未通过隐藏输出来消除；没有失败用例。完整命令输出临时保留于 `/private/tmp/hero-upload-full-test.log`，数字已固化于本文件。Phase 5 完成。

## Phase 6 · 清理

完成判据及结果：
- 原始 initialCamera 环重跑通过；拍摄期间预填已就绪时，第一次建记录/上传成功，无 copy004。
- 拍后才就绪的预填自动续传，无需手动 Retry；真正空重量不上传、不伪造 0 kg，视频保留并提示。
- 回归 3/3 与全量 2064/2064 通过；类型/lint 通过。
- 所有运行代码与测试中的临时调试日志已删除；JOURNAL 保留脱敏探针证据。
- 没有遗留一次性 harness；Phase 1 用例已成为正式 regression，临时测试快照已删除。
- 正确假设 H1 与晚到预填缺少恢复机制已写入本文件，供 Opus 收货与 commit message 使用。
- Standards / Spec 各 0 findings；未修改 UI 布局/文案、后端、其它 tab、版本号或正典台账。

Phase 6 完成。开发修复与自测已交付；真机 CN 物理拍摄、网络上传与页面复走查为 HITL，未宣称验收完成。没有 commit/push/PR。
