# 任务卡（安卓）：补验扫出的四项缺陷

开工先读仓内 CONTEXT.md（如存在）、AGENTS.md 与本卡。

- 级别：T1。基线 `fix/instant-completion-celebration`（PR #72 顶，`d433ef3`），分支 `fix/unverified-sweep-20261003`。
- 来源：Opus 2026-10-03 在安卓模拟器上补验「未验清单」第二组时发现，均已实屏复现（合成账号 + 本地 fixture）。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开，不得写入账号、口令、真机截图。
- 守仓内 eslint 与 TypeScript 严格模式；颜色 / 间距 / 字号只用仓内 token。

## 要做的

### 1. Meetday 倒计时跨冬令时多算一天

- 现象：设备时区 Europe/London，今天 2026-10-03，比赛日 2026-11-03，Today 页 Meetday 卡显示 32 天，应为 31 天。
- 落点：`src/features/dashboard/model.ts` 的 `localCompetitionDays`。它用两个本地零点的毫秒差除以一天再 `Math.ceil`；区间里跨过夏令时结束（那天有 25 小时）时差值是 31 天零 1 小时，向上取整成 32。
- 要求：按日历日计数，与 iOS `DashboardProfileMetrics.daysUntil`（`calendar.dateComponents([.day], …)`）结果一致（本机只读参照 `/Users/david/Projects/apps/MeetPR-wt-complete`）。仓内已有按 `Date.UTC(年, 月, 日)` 相减的写法（如 `src/domain/coach/detail-week.ts`），沿用即可。
- 顺手核对同文件及 `src/features/dashboard/` 下是否还有同样的"本地零点毫秒差 + ceil / floor"算天数的写法，有就一并改，并在 JOURNAL 里列出；没有就写明没有。

### 2. 聊天训练卡在无问题文字时塌成窄条

- 现象：教练端会话页里，学员发来的训练卡（消息带 `set_ref`、没有附加问题文字）显示成一条约 50dp 宽的白块，只剩右箭头，动作名与"Set 1 of 3 · 152kg × 5"不可见，时间戳叠在卡上。同一条消息在学员端正常，因为学员端底部状态行（"13:00 · ✓ Delivered · Waiting for coach"）较长，把容器撑宽了。
- 落点：`src/features/chat/ChatSetCard.tsx`。外层容器只有 `maxWidth: '88%'` 加 `alignSelf`，没有自身宽度；内层标题 / 副标题那一列是 `flex: 1`（基准宽度为 0），于是整张卡的宽度只由问题文字或底部时间行决定。
- 要求：卡片宽度不再依赖兄弟节点。无问题文字、底部只有时间的情况下，标题与副标题完整可见；有长问题文字时仍不超过会话宽度的 88%；收发两侧（左 / 右对齐）都成立；带视频的卡（左侧有播放方块）同样成立。

### 3. 组录入页上传状态行在小屏 + 大字体下挤坏

- 现象：屏幕 360×640dp、系统字体 1.3×，组录入页视频下方那一行里，"Upload failed"被折成"Uplo / ad / failed"三行，"Retry"按钮折成"Ret / ry"，被右侧 Change、Delete 两个按钮挤到约 45dp 宽。默认尺寸与默认字号下正常。
- 落点：组录入页视频行的状态 + 操作区（从 `src/features/training/` 下渲染 `SetVideoPlayerHost` / 上传状态文案 `student.videoAttachmentSection.*` 的组件找）。
- 要求：一行放不下时整体换行（状态文字与 Retry 一行，Change / Delete 另起一行，或等价做法），任何单词不得在词内断开，按钮文字单行，命中区不小于仓内 `minimumHitTarget`。默认尺寸下的外观保持不变。其余上传状态（Sending / Processing / Delivered to coach）同样检查。

### 4. 手指从视频画面起手时，组录入页无法上下滚动

- 现象：组录入页（内嵌播放器已加载出画面）里，手指落在视频画面上向上或向下拖，页面不滚动；从画面外（左右留白、RPE 区）起手则正常滚动。默认屏幕尺寸与 360×640dp 都能复现。小屏上播放器几乎占满"标题栏与底部 Complete set 之间"的可视区，用户会被卡住。
- 复现（模拟器，合成样片）：进入已附视频的组录入页，滚到播放器可见，`adb shell input swipe 200 1500 200 1100 400`（起点在视频画面上）前后，RPE 标题的纵坐标不变；`adb shell input swipe 1040 1500 1040 1100 300`（起点在画面右侧留白）会变。
- 落点：`src/features/training/video-upload/SetVideoPlayer.tsx`、`SetVideoPlayerHost.tsx`。**根因未确认**：进度条那一条有 `onStartShouldSetResponder`，但画面区不是它；先查清画面区是谁吃掉了纵向拖动（覆盖在画面上的可按区域、原生视频视图、还是宿主层），把确认的原因写进 JOURNAL，再改。只凭猜测改动不收货。
- 要求：内嵌态下，从画面起手的纵向拖动交给外层滚动；点一下画面的现有行为（中央播放按钮、暂停 / 继续）不变；进度条横向拖动不变；放大态（铺满整屏）不受影响。

## 测试 seam（先红后绿）

- 第 1 项：`src/features/dashboard/__tests__/model.test.ts`，对 `localCompetitionDays` 加跨夏令时结束、跨夏令时开始、同日、已过期四例。跨夏令时那两例必须在不依赖本机时区的前提下会红（例如给函数的 `now` 与日期构造注入，或在该测试文件内固定 `process.env.TZ` 的现有做法——以仓内已有惯例为准，没有惯例就写明选择）。
- 第 2 项：`src/features/chat/__tests__/chat-set-card.test.tsx`，无问题文字 + 来信方向时，标题列不再是零基准宽度（断言样式契约即可），并保留现有用例。
- 第 3 项：组录入视频行现有测试所在文件（没有就在最近的组件测试里加），断言状态 + 操作区允许换行且按钮文字单行。
- 第 4 项：若 jest 层造不出"拖动被吃掉"的红例，写明缺 seam 与原因，交由 Opus 按上面的 adb 步骤在模拟器验收；不要用与手势无关的断言充数。

## 验收（Opus 收货，实装方不得自定范围）

1. 模拟器时区 Europe/London：比赛日 2026-11-03、今天 2026-10-03 显示 31 天；比赛日当天显示 0 天的现有表现不变。
2. 教练端会话页：无问题文字的学员训练卡完整显示动作名与"Set 1 of 3 · 152kg × 5"，时间戳在卡下方不重叠；学员端同一条消息外观不变；带长问题文字的卡不超宽。
3. 360×640dp + 字体 1.3×：上传失败行无词内断行，Retry / Change / Delete 文字单行；默认尺寸外观不变。
4. 上面第 4 项的 adb 复现步骤：从画面起手的拖动能滚动页面；点画面仍能播放 / 暂停；进度条仍能拖。
5. `npm test` 全量与 `npm run lint` 通过，TypeScript 无新增错误。

## Out of Scope

上传重试与超时逻辑（另有排障在进行）、周条、奖励页、iOS、任何文案改动（"Change" / "Replace" 待拍板，不要动）。

---

## 返修一（2026-10-03，Opus 模拟器收货后）

第 1、2、3 项实屏通过，不要再动。**第 4 项不通过**：fixture 包（含本树当前改动）在模拟器默认尺寸下，

- `adb shell input swipe 200 1000 200 1500 400`（起点在画面上，向下拖）前后，RPE 标题纵坐标都是 431；1500 毫秒的慢拖同样不动；
- `adb shell input swipe 1040 1000 1040 1300 300`（起点在右侧留白）后 RPE 从 431 变为 794。

即 `picturePanHandlers` 这条"JS 接管后调用 `scrollTo` 转发"的路在真机运行时没有生效。并且即使生效，它也没有惯性滚动，手感与页面其余部分不一致。**撤掉这套转发，换成让触摸穿透：**

1. 内嵌态下，覆盖层里的画面区（视频本体与中央播放图标）不接收触摸（`pointerEvents="none"`），覆盖层容器保持 `box-none`，让落在画面上的触摸落到下方的 ScrollView，由原生滚动处理（自带惯性与回弹）。底部控件条（播放键、进度条、倍速、放大）仍在覆盖层内正常可点、可拖。
2. "点一下画面播放 / 暂停"改由 ScrollView 内容里的锚点承担：锚点处放一个与画面区同范围（不含控件条高度）的可按区域，按下后触发与现在相同的 `togglePlayback`；它在 ScrollView 内，滚动开始时按压会被原生取消，不会误触发。中央播放图标只负责显示。需要的回调通过现有的 host / entry 通道传递（参照 `collapse` 的做法）。
3. 放大态（铺满整屏）完全保持现状：画面与中央按钮照常接收触摸。
4. 删除 `picturePanHandlers` 及其类型、相关注释与不再需要的 import；不留死代码。

测试（`set-video-player.test.tsx`，先红后绿）：内嵌态画面层不接收触摸、锚点可按区域按下会切换播放 / 暂停；放大态画面层照常接收触摸且中央按钮可按。纯手势滚动仍无 jest seam，写明即可，由 Opus 用上面两条 adb 命令验收（画面起手的拖动必须让 RPE 坐标变化；轻点画面仍能播放 / 暂停；进度条可拖）。

结束前 `npm test` 全量与 `npm run lint`、`npx tsc --noEmit` 通过。不 commit、不 push；JOURNAL 末尾追加"返修一"一节，并更正上一节里关于第 4 项的结论。
