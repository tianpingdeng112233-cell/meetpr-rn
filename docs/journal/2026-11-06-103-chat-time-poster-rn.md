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
