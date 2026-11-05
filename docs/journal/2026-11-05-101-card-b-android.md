# Spec 101 · B 卡 · Android 开发记录

## 基线与边界

- 工作树 `/Users/david/Projects/apps/meetpr-rn-wt-102`，分支 `feat/101-video-delivery-b`。
- 2026-11-05 主代理确认 #139 的 check / android-build 全绿并按 David 授权合入后，基于 `origin/main@271e47776e19c75a99e2a9b50ac2c7feffde13f7` 开工。该基线已含 #136 的 A 卡与 #139 的 spec 102。
- 范围：`CARD-b-android.md`，SPEC §2 与稿 C/D/E①②。无后端、依赖、上传协议、版本号或共享验证代理改动。未 commit/push，未使用设备、未构建 APK。
- 已读仓规、CONTEXT、101 SPEC/HANDOFF/B 卡、102 SPEC/JOURNAL，以及 Expo SDK 57 官方 reference / notifications 文档。沿用既有 tokens、danger 失败色、`video-upload-v2` 通道和单聚合 identifier。

## 接线入口

接入 102 现有 `CompletionGate.updateConditions(dayId, { setsSynchronized, videosDelivered })`，不另建完成闸门。`SetCompletionCoordinator.begin(dayId, retry, videoContext)` 仍先同步组；20 秒/4xx 的失败行为、奖励内容不变。

- `CompletionGate` 原有按账号持久化记录增加可选视频上下文、长按时间和超时已通知标记。完成请求仍由原串行 gate 发出；恢复后只处理已有待完成意图，已完成历史日不新建意图。
- `accountSetSync` 在账号生命周期订阅上传 store 与组回执。冷启动/回前台/恢复网络重读真实上传状态，并向同一 gate 更新两个条件。只在存在待完成日时 hydrate 视频，避免干扰原上传/冷启动留存流程。
- 当天身份包含当时的 set id / server log id / plan exercise id；每次唤醒还合并最新组队列与上传请求，等待期间新增、更换、删除后重加视频会重新参与条件。最新删除记录排除该组，后续重加覆盖旧删除回执。
- 超时以长按时刻起算；持久标记先写入再发送一次通知。退出账号释放订阅和计时器，同账号重新登录继续恢复。
- C 的汇总和 D 的上传卡共用 `completionVideoSummary`，失败判定复用 A 的 `hasVideoDeliveryFailure`。只有所有组记完且尚未长按时显示汇总/小字，102 同步和失败阶段不夹入视频汇总。
- 奖励关闭后若 gate 仍在等视频，留在训练页并立即插队重试该日的视频；正常无视频/已送达路径保持原来的导航。进度卡不阻挡改组。
- 自动完成及超时通知共用 `video-upload-failures` 聚合 identifier；携带账号和 day id，通知点击进入训练页相应日并沿用 A 的全量重试。繁体由原生成脚本生成。

## 红绿证据与回归

原始测试输出在同目录 `101-card-b-android-evidence/`：

- `summary-red/green.log`：不存在汇总 seam → 实现后统计失败、正常在传、已送达；挂起等组 id 和退避均不算送达。
- `gate-red/green.log`：30 分钟无通知为红 → 注入时钟与上传状态后，重建仍等待、超时一次、组与视频均满足才完成一次为绿。
- `dynamic-red/green.log`：后来新增/更换的视频必须纳入同一天，排除别日/别账号。
- `runtime-red/green.log`：冷启动 runtime 原硬编码 true 提前完成为红 → 不挂载训练页也等待新增视频送达才完成为绿。
- `ui-red/green.log`：真实 TodayWorkoutView 没有汇总为红 → 汇总、奖励、关闭后 D 卡、最终完成一次为绿。
- `edit-red/green.log`：旧删除回执错误排除后来重加的视频为红 → 以最新写入为准为绿。
- `rearm-red/green.log`：完成请求失败后新增视频、再长按时没有持久视频等待为红 → 补入既有意图为绿。
- 首轮全量曾发现 3 个旧 Hero 上传/旧文件留存回归，原因是无待完成意图时 runtime 也提前 hydrate 上传 store。限制恢复范围后，原测试与 B 定向组合 73/73 通过（`targeted.log`）；不是修改预期来放过。
- 通知 adapter 测试验证完成/超时共用 identifier、day id、单复数与既有 DEFAULT 渠道；系统横幅仍待设备实测。

## 设备收货待办

本卡实现代理未占用设备；以下交主代理安排实际 APK 与 AVD `meetpr` 验证，不以单测代替收货：

1. 当日 3 组视频在传/失败：全部记完看 C；长按先走 102，奖励后关闭看 D（0/3），服务器未 complete；恢复网络后送达、只 complete 一次、卡消失、通知①。
2. D 卡时杀进程，断网冷启动后仍等视频；恢复网络自动续传并完成。再验证等待期间替换/新增视频，以最新记录为准。
3. 时钟 seam 已验证 30 分钟一次；设备确认通知②点击跳对应日、插队重试且仍等送达。
4. 无视频/全部送达旧路径、历史已完成日升级第一屏不出现 D；简中/英文/繁体、深浅色和窄屏 C/D。
5. parent 已补 102 的真实系统飞行模式 + TCP 断开冷启动/恢复证据：`/Users/david/Documents/Codex/2026-11-05/jie-sho/work/102-takeover/android-flight-cached-training.png` 与 `android-flight-restored-server.json`。这是 102 补验，不能代替本卡视频联合验收；未改写 102 JOURNAL。

## 最终自测交付

- `npm test -- --runInBand`：**206 suites / 2150 tests 全绿**，58.542 秒，进程 exit 0。
- `npx tsc --noEmit` 与 `npm run lint`：exit 0；`git diff --check` 通过。
- 最终日志：`101-card-b-android-evidence/full-final.log`、`tsc-final.log`、`lint-final.log`。
- 开发自测完成，交回主代理统一独立双轴审查、APK 构建与设备收货。此处不宣布 B 卡验收通过。

## R1 · 独立审查定向返修

- Standards P2：旧失败通知跨 `dismiss` / `schedule` await 后覆盖较新的完成通知。两种原生异步边界都注入悬挂，最终通知错误地回到 failure 为红。复用 `SerialTaskQueue` 串行化同一 identifier 的取消、移除与发布副作用；代次和实时失败数跨 await 复核。新 complete 排在旧原生 schedule 结束之后发布，消除仅检查一次仍存在的异步覆盖。`r1-notify-red/green.log`。
- Spec P1：首次长按时上传 store 还未 hydrate，空内存被判成全送达。真实 TodayWorkoutView 延迟 AsyncStorage 返回已有 waiting 视频，观察 `/complete` 先发为红。`SetCompletionCoordinator` 的主动 begin 现在等待 `prepareVideos` 屏障，runtime 发完成前也复核；不恢复无意图的后台抢先 hydrate。读盘异常/坏格式不再标记 hydrated 或当作空视频，提示原错误后可重试。`r1-hydrate-red/green.log`、`r1-storage-error-red/green.log`。
- Spec P1：A 已送达、B 在传时更换 A；复制未返回，B 送达会抢先 complete。真实 `videoUploadManager.attach` + native File.copy 延迟 + account runtime 两种原先失败序列为红。复用 `preserveVideoAttachment` 事务令牌，在调用 attach 时同步登记，读取条件时将其视为 pending；原 durable source 全程不覆写，直到新副本真实持久化。结束/失败/取消释放令牌并重新评估。另覆盖未在静态 set 集合里的新增视频通过 logRequest 识别当日。成功、复制失败、取消、新增四例均通过。`r1-copy-red/green.log`；四例完整结果见 `r1-targeted-green.log`。
- 定向组合：125/125（包含原 Hero 相机、旧升级留存、trim 取消、102 协调器/runtime 和通知）。测试中清理 API mock 历史，避免前一例完成请求污染新增断言；未放宽产品预期。

R1 最终自测：206 suites / 2159 tests 全绿（50.173 秒、进程 exit 0），tsc / lint exit 0，diff-check 通过。最终日志为 `r1-full-final.log` / `r1-tsc-final.log` / `r1-lint-final.log`。仅复制本地 Jest 的合成 fixture 证据，无设备账户、凭证或真实上传 URL；设备原始证据仍留主会话 scratch。返修后停止写入，交主代理复审与构建。

## R2 · 设备通知标题定向修正

主代理设备联合验收发现完成通知沿用了「训练视频上传失败」标题，与送达成功正文矛盾。本轮仅将 B 的完成/超时通知标题设为现有品牌 `MeetPR`，普通失败通知原标题保持不变；未改正文、渠道、导航、上传/完成逻辑。先在通知公开 seam 补标题断言，旧标题失败（`r2-title-red.log`），修正后通知 8/8（`r2-title-green.log`），tsc/lint exit 0，diff-check 通过。未使用设备；交主代理重打并复核系统通知。

## 主会话独立审查与设备联验（进行中）

- Standards / Spec 两轴 R1 定向复审均 CLEAN，三项时序 blocker 已关闭；主代理已读全部最终 diff。R2 仅改 B 通知标题为品牌，通知8/8、tsc/lint通过，原通知顺序不变。
- 最终验收 APK bundle + assembleDebug 成功，AVD meetpr 覆盖安装。仅使用本轮获准 emulator-5556；无卸载/清数据。
- 旧包来源核对线上 CN7 清单及文件 SHA；验证副本只用 debug key 重签以允许本机覆盖，1620 个非签名 ZIP 条目逐字节相同。CN7 离线选择视频并退出后覆盖 B，原未送达文件 SHA256 前后完全一致，自动补回组记录回执，新失败条显示。此证据验证旧业务代码/本机数据兼容，不冒充生产签名链或真机升级。
- 三组视频联验：视频网关维持不可用，全部记完显示 C；系统飞行模式下长按照常出奖励，关闭后显示 D「上传中0/3」，请求记录中完成接口为0。杀进程并真正停止验证 TCP 监听后冷启动，缓存训练页恢复并继续显示0/3。
- 恢复系统网络与 TCP 网关后未手点重试，三条视频实际到达后端及对象存储；三个上传 complete 200 均早于唯一一次训练日 complete 200，D 消失、日进度变1/3。收到系统通知①并点击回到对应训练日。
- 全部视频已送达路径：撤销测试日完成→重新长按，正常奖励/完成，不出现等待卡。再次撤销、替换一条测试视频后形成2/3等待，证明重新选择的视频进入条件；本次等待正在跑真实30分钟超时，以核对最终系统通知标题/点击。
- 设备初次通知①发现标题沿用失败文案，已作为R2修正；新 APK 已覆盖安装，等待意图仍恢复2/3。
- 离线测试曾只停内层代理，外层返回502，页面按服务端失败阻挡；改为停止当前应用实际连接的外层监听后，真实网络错误场景正常恢复。没有将502误当离线成功，也未为测试改变产品网络判定。
- 首次账号输入期间 AVD 曾报告输入超时，现场日志显示系统/输入法负载；切换键盘并重试后录入、选片、恢复等流程正常。未据此改产品代码，原始日志留本机。

原始设备截图、签名/哈希及有序请求证据仅存本会话 `work/101-evidence/`、`work/101-upgrade-android/`，避免公开仓出现真实账号/设备状态。核心链路已亲验；超时、剩余语言/外观与弱网验收尚在继续，PR 可先运行 CI，不代表已宣布完整验收通过。

## Opus 接手验收追加（2026-11-05 11:01–11:17 UTC，emulator-5556，繁體/浅色）

- 30 分钟超时：长按起 10:31:25，11:01 系统通知出现，标题 `MeetPR`，正文「還有 1 條影片沒傳上，點選重試」，渠道 `video-upload-v2`，importance 3（DEFAULT）。
- 点通知 → 回到 W1D1，顶部「1 條影片沒傳上，正在自動重試 · 立即重試」，底部「影片上傳中 2/3」；点击同时触发一次重试（测试网关仍拦截，503），状态保持等待送达。
- 弱网送达：仅 5556 的 MeetPR UID TCP443 加 10% 随机丢包 + 延迟 1000–2000ms + 512/1024kbps；11:02:41 解除该动作的上传拦截后 initiate 201，11:15:41 upload complete 200，紧接着 `POST /plans/days/80d16876…/complete` 200（本轮仅一次），丢包规则计数 691 包。
- 完成通知：「今日訓練已完成，3 條影片已送達」，标题 `MeetPR`。
- 收尾：DROP 规则已删（`iptables -S OUTPUT` 无残留），`emu network delay none`、`speed full` 已恢复。
- 截图（本机证据目录，不入公开仓）：android-b-timeout-tap-return.png、android-b-weaknet-delivered.png、android-b-complete-notice.png。

## iPhone 12 走查发现的同类问题（安卓侧，2026-11-05，Opus 实装，Codex 额度不足降级）

David 在 iOS 真机发现「当天组已同步、视频已全部送达时，飞行模式下长按完成，奖励页弹出后立刻撤下」（David 拍 A：断网也照常完成，联网后自动补发）。安卓同样存在：奖励后 `gate.updateConditions` → 完成请求断网失败 → `callbacks.error` 撤奖励并弹错误；挂起记录仍在，runtime 之后静默补发，但学员看到的是失败且没有等待卡。

修：`SetCompletionCoordinator` 奖励后完成请求遇连接失败（`ApiError.kind === 'network'` 或 `TypeError /network/`）不再报错，`CompletionGate.holdForNetwork` 标记该日 `heldOffline` 并保留奖励；训练页把 `awaitingNetwork` 日视同等待，底部卡片 0 条视频时显示「等待联网完成今日训练 / 联网后会自动完成…」；联网补发成功后对 `heldOffline` 日发「今日训练已完成」（无条数）。正常在线、无视频的完成不发通知。业务拒绝保持原行为。

测试：`completion.test.ts` 新增「offline completion … keeps the reward and completes once online」（撤掉修复时红）与「a normal online completion without videos sends no completion notice」。全量 jest `--runInBand` 2161/2161、tsc、lint 绿（并行跑在主机负载 60+ 时会出现超时假失败）。
