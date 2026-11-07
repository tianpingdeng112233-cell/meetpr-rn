# 103 Android RN：聊天时间分隔与视频首图

代码实现及自动测试已完成；设备与 staging 验收未完成，不宣告功能验收通过。按本卡要求未 commit、未 push。

## 来源与现场

- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-103`，分支 `feat/103-chat-time-poster`，基线 `3aa7fe4`，开工 clean。
- 已读本仓 AGENTS / CONTEXT / CLAUDE / PLAN、全局 engineering-workflow 与 memory INDEX。本仓未发现 FOLLOWUPS。
- 当前工作树缺少指定 SPEC；唯一依据读取自同仓 spec 工作树 `meetpr-rn-wt-103-spec/specs/103-chat-timestamps-video-poster/SPEC.md`（`684b63e`，Ready），未自行改写验收范围。
- 实装前读取 [Expo v57](https://docs.expo.dev/versions/v57.0.0/)、[Localization](https://docs.expo.dev/versions/v57.0.0/sdk/localization/) 与 [Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/) 文档。
- 当前工作树无 node_modules；使用本机 `meetpr-rn-wt-102/node_modules` 只读符号链接。两工作树 package-lock 完全一致；未新增依赖、未改锁文件。

## 实现

- `student-timeline.ts` 增纯函数 `chatTimeSeparators`：首条及相邻间隔 ≥5 分钟插分隔，按设备本地日历区分今天、昨天、7 天内、今年、往年。中英文、繁体与英文 12/24 小时制均有单测。
- 两角色页面使用同一 `ChatTimeSeparator`，复用原 `font.body(11)` / textDim / 下方留白。历史每次按完整条目重算；消息、反馈、计划均参与。pending 在发送时记录本机时间。
- 为保证确认跨 5 分钟阈值时不换组，纯函数可选接收同长度 groupingTimestamps；缺省就是原 timestamp 列表。仅本次会话按 client_id 保留发送时间锚点，文案继续使用服务端时间；学员排序同样保留锚点，未写入持久化或修改服务端数据。
- `FeedbackVideoSchema` 与 `ChatMessageSchema` 增 nullish `poster_url` / `duration_seconds`。新增 `ChatVideoCover` 同时用于反馈卡和两角色的分享组卡，现有封面尺寸不变；expo-image cover + memory-disk，加载中、空 URL、失败保留原背景。按新 URL 重建图片请求状态。
- 共享组视频播放刷新取得新消息时回写列表中的 poster/duration。播放钮与时长角标叠轻暗底；有时长为 m:ss，无时长不渲染角标。应用源代码已移除未知时长占位，负向测试仍保留该字符串。
- 新增 Yesterday 文案经 `npm run i18n:zh-Hant` 生成繁体；t 增可选 locale 参数，使纯函数不依赖全局语言覆盖状态。
- 未改导航/tab、聊天外视频封面、后端或正典台账。

## 红→绿与检查

日志均在仓根 `scratch/103/`，Jest 使用 `--runInBand --watchman=false`。

| 循环 | 红测证据 | 绿测证据 |
| --- | --- | --- |
| 分隔位置与历史拼接 | time-red.log：1 failed | time-green.log：6 passed |
| 五档格式与日历边界 | formats-red.log：5 failed | formats-green.log：11 passed |
| 两角色历史、pending、确认 | screens-time-red.log：2 failed | screens-time-green.log：53 passed |
| 无时长隐藏角标 | duration-red.log：2 failed | duration-green.log：46 passed |
| 两类卡首图、时长、失败/空回落 | poster-red.log：2 failed | poster-green.log：39 passed |
| 新签名 URL 原页恢复（取消测试 remount） | refresh-red.log：1 failed | refresh-green.log：57 passed |
| 两角色确认跨阈值正反场景 | ack-red.log：4 failed | ack-green.log：72 passed |

- 首轮全量 `jest-full.log` 在首图夹具修正前启动，结果 205 suites passed / 1 failed；两项失败已修正为 schema 对应的 canonical set_ref、等待 Query 通知。不可将该轮写成全绿。
- 最终 `npx tsc --noEmit`：exit 0，`tsc-final.log`。
- 最终 `npx expo lint`：exit 0，`lint-final.log`。
- 最终全量 `npx jest --runInBand --watchman=false`：206 suites / 2177 tests 全绿，145.197 秒，exit 0；`jest-final.log`。
- `git diff --check` 通过。完整代码 diff（含新组件）见 `scratch/103/changes.patch`。

## 独立审查

使用 review-loop 本地双轴，不依赖缺失的 `docs/agents/issue-tracker.md`；已告知可用 `$setup-matt-pocock-skills` 补齐仓流程。

- Standards：初审 0 项；返修后定向复审 0 项。审查覆盖仓规、依赖/范围、共享组件、刷新生命周期及时间锚点。
- Spec：初审 2 项：旧 poster 的新签名链接被播放刷新丢弃；服务端确认跨 5 分钟阈值改变分组。均补红测后返修，定向复审确认两项闭环、无新增代码问题。
- 审查仅确认代码，不替代设备验收。主代理已读最终 diff 与新增文件。

## 验收清单状态与设备阻塞

严格对应 SPEC 原清单，不另定验收矩阵：

1. 两端时间分隔、五档格式：纯函数和页面自动测试覆盖；设备逐档截图未完成。
2. 加载更早历史：两端页面测试覆盖拼接后原首分隔消失；设备未完成。
3. pending 与确认位置：两端页面测试及跨阈值正反用例覆盖；设备未完成。
4. staging 已有老视频、MonsterXTY 类反馈首图：未完成；尚无后端 spec 060 真实响应/设备证据。
5. 空 poster / 403 事件回落、播放入口保留：自动测试覆盖；真实断网、403 及播放联调未完成。
6. duration 显示/隐藏：两类卡测试覆盖，源代码不再渲染未知时长占位；设备未完成。
7. 深浅色、放大字体与播放钮清晰：未完成视觉验收。
8. 老账号升级后首屏完整/顺序/稳定性：未完成真实升级验收。

设备探测命令：`/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices`。ADB 启动本地监听被本会话沙箱拒绝：`could not install *smartsocket* listener: Operation not permitted`。本次原始启动日志摘录保存在 `scratch/103/adb-blocked.log`。当前权限不可提升，未绕过限制、未改用其它 AVD。

因此未执行 Android 安装/运行，也没有亲眼看 `meetpr`。所要求的时间分隔、有 poster、无 poster 三类模拟器截图均未生成；`scratch/103/` 当前只有测试与阻塞证据，没有冒充设备截图的图片。后续需要可访问 ADB 的执行环境，在同一 AVD `meetpr` 上继续 SPEC 原清单并补入实际截图路径。

## 2026-11-07 返修 R1：第 1 步，设备取证日志

本轮依据 David 明确指令，只做取证并停下等设备 Metro 日志；未开始修复、未新增根因回归测试、未 commit/push。当前基线为 `feat/103-chat-time-poster` @ `4fd1708`（PR #151 由 David 告知，本轮未访问远端核验）。开工已有 `src/demo/backend.ts` 的 `TEMP-ACCEPT-103` 验收 fixture 及 scratch 日志变更，均原样保留。

### 反馈环与证据边界

Opus/David 报告的真实复现：AVD `meetpr`，`EXPO_PUBLIC_DEMO_MODE=1`、CN build track、英文界面；冷启动后只显示 `Oct 17 13:00`，随后 New plan、3 张 feedback、5 条相隔一小时的消息没有其它分隔。Metro 已由验收方核对为本 worktree。同时间戳的 Node/Jest 函数调用返回多个分隔，不能代替设备渲染结果。完整设备输入数组、运行时输出与布局尚未回传。

本轮按 `/diagnose` → diagnosing-bugs 取证纪律执行；由于 David 明确要求先列假设、加日志后由其跑设备，这里采用人工设备反馈环，阶段 1/2 的 agent 自行复现与最小化仍未完成，不声称已有命中原症状的红测。下一步信号是同一次页面渲染的 `input → time.output → map → render → separator.layout` 与设备缺失时间行的对照。

### 五个可证伪假设（暂按优先级；均未证实）

| 假设 | 日志预测 | 否证条件 |
| --- | --- | --- |
| H1：真实 `groupingTimestamps` 与展示条目错位，或本地发送锚点覆盖了应有间隔 | input 两数组长度/逐项时间不符；`time.index` 中本应跨天/小时的 gapMs <300000、负数或 NaN，skip 与预期不同 | 实际数组对应一致、每个目标间隔正确且 skip=false |
| H2：Hermes Date.parse / Intl 对 locale、weekday 或时区的处理与 Node 不同 | `time.index` 的解析值异常，或 `time.label` 文案为空/异常，或 `time.error` 出现；locale/now/timezoneOffset 可与 Node 对照 | 同一真实输入在设备输出的标签和目标下标完整正确；单纯时区一小时差异不等于分隔缺失原因 |
| H3：运行时 flatMap 输出或 Map 构造/键类型导致后续分隔丢失 | `time.label` 已算出多条但 time.output 缺失，或 screen.map 的 result 与 entries/size 不符、keyType 不是 number | output、Map entries 和数值 key 完整一致，get 能取到 |
| H4：页面映射/下标偏移只把 index 0 的结果传到组件 | screen.map 有多个分隔，但 screen.render 缺非零 index，或 has=false/label=null；pending 偏移与 itemCount 不一致 | 每个应有分隔的实际渲染调用都记录正确的 index、kind、label |
| H5：Text 已收到非空文案，但原生布局/可见性使其不显示 | screen.render 与 separator.render 均有正确文案，而 layout 缺失或宽高为零/异常；若尺寸正常仍不可见，需要与实际滚动视口及截图对照 | 对应 label 有正常布局，且设备实际可见；仅 Node render pass 不能否证 |

### 探针位置

- `student-timeline.ts`：`[D103] time.input`（完整输入/分组时间数组、locale、now、本地时区偏移）；`time.index`（每条 index 类型、解析值、相邻 gapMs、skip）；`time.label`（本地日期、daysAgo、time/prefix/label）；`time.output`（完整返回值）。Intl/格式化异常用 `time.error` 记录后原样抛出，不吞错误。
- `StudentConversationScreen.tsx`：`student.input`（真实渲染数组、条目种类/数量、pending 数量）；`student.map`（返回值、Map size、所有 key 与类型）；`student.render` 位于 JSX 的真实 label 取值路径，记录每个普通/pending index 的 `separators.get` 结果和 has。
- `ConversationScreen.tsx`：同样的 `coach.input / coach.map / coach.render`。静态检查确认教练端共用分组函数、Map 和时间组件；是否同病尚未实机确定，不能根据共用代码宣布复现。
- `ChatTimeSeparator.tsx`：`separator.render` 记录最终 label、是否返回 Text、颜色；`separator.layout` 记录原生 Text 的 x/y/width/height，区分“未传入”与“已渲染但看不到”。

所有日志使用唯一 `[D103]` 前缀及 JSON 快照；undefined label 明确写为 null 并附类型，NaN 间隔保留字符串以免被 JSON 隐去。只输出时间、类型、布局，不输出消息正文、账号或媒体 URL。此次没有调整分隔阈值、日期格式、Map 键、组件样式、数据或排序规则。

### 回传与后续边界

在当前 worktree 冷启动进入同一学员聊天，滚动经过全部反馈卡和消息，保留 `[D103]` 日志；再进入教练聊天同样采集，按 `student.*` / `coach.*` 区分。希望回传从该页 input 到各次 layout 的完整片段（含 time.error，如有），不要只截第一条时间行。

收到设备日志后才确定正确假设、选择真实调用 seam 写先红后绿回归、修复并删除全部 `[D103]` 探针；最后复跑原始设备场景。当前根因：**未确定**。

本轮探针校验：`npx tsc --noEmit`、4 个改动 TS/TSX 文件的定向 ESLint 均 exit 0；既有 timeline/student-screen/coach-screen 三组 Jest 共 72 项通过（7.806 秒），日志在 `scratch/103/r1/{tsc,lint,jest}.log`。这些测试仅验证取证改动没有打破已有 Node 行为，不是设备缺陷的红→绿证明。目标代码与本卡 JOURNAL 的 `git diff --check` 通过；全工作树 diff-check 会报开工已存在的 scratch 原始日志/patch 空白，未改写取证原文。本轮停于第 1 步。

## 返修第 1 轮结论（Opus，2026-11-07）

误报，代码无缺陷。首轮「只有顶部一行时间」的截图来自模拟器上另装的旧版 `com.meetpr.app`（dev-client 深链 `meetpr://` 被旧包/Global 包接走；证据：标签为旧代码的 24 小时制「Oct 17 13:00」）。改用独立包名 `com.meetpr.app.accept103` + export:embed 打包后，`[D103]` 日志显示 9 个分隔全部计算并渲染，AVD `meetpr` 截图确认：反馈卡与每条相隔 1 小时的消息之间均有时间行，组视频卡显示 staging 真实截帧首图与 1:05 角标。`[D103]` 日志已全部撤掉，源码回到 PR #151 提交态。
