# 102 · 卡 A · 返修第 1 轮（Opus 收货意见）

在现有未提交改动上继续改，不要回退已有实装。仍按 CARD-A 的约束执行（不 commit、不 push、不加依赖）。收货时本机复跑结果：tsc、lint 通过，全量 202 个套件、2090 条用例通过。下面三条是必修项。

## 1. 回执与闸门记录只增不删（Spec 轴：违反交付红线「不得让已上线功能失效」）
`queue.ts` 的 `state.confirmed` 和 `completion.ts` 的 `days` 都整块存在同一个 AsyncStorage key 里，只增不删。安卓 AsyncStorage 单个值读取有 CursorWindow 上限（约 2MB）。训练几个月后 `getItem` 会失败，`ready` 会 reject，整个同步队列就不可用了。
- 回执的作用只是盖住迟到的 GET。当服务器快照里已经出现同一组（`sameSet` 判定命中，且服务器那一条不比回执旧），这条回执就可以删掉。另外加一道兜底：`logged_date` 早于今天往前 14 天的回执一律清理。清理要落盘。
- 闸门里 `completed: true` 的天，完成后可以删掉（撤销完成走的是 `forget`）。
- 测试：回执被服务器快照覆盖后会删除；超过 14 天的会清理；清理之后 `overlaySetLogs` 结果不变；闸门已完成的天会被移除。

## 2. 改已有记录时训练日期被改成今天（Spec 轴：loggedDate 是训练日真源）
`TodayWorkoutView.commit` 现在给所有入队请求都写 `logged_date: logDate`，主项的 `logDate` 等于 `gymDayText(new Date())`。原来不带这个字段，由服务器在首次插入时填写，冲突更新时不改（见后端 `sets-log.ts` 的注释）。现在学员如果改一组昨天已经记下的记录，`logged_date` 会被挪到今天。
- 第一次写入（没有 `sourceLog`，或 `sourceLog.id` 还是 `local:`）时，带上点 ✅ 那一刻的训练日，这是离线排队必须的。
- 改已有记录时，沿用 `sourceLog.logged_date`，或者不带这个字段，两种都可以，但必须与改动前服务器的最终结果一致。
- 测试：昨天记下的组今天编辑后，入队请求的 `logged_date` 仍是昨天；第一次写入时带的是点击当时的训练日。

## 3. 失败态颜色（Spec 轴：屏幕稿与 101 统一为橙色）
`SetSyncCompletionControl` 的失败块现在用的是 `goldSoft` / `gold500`。SPEC 屏幕稿要求失败用橙色，与品牌金在亮度上拉开，101 也会复用这个颜色。
- 在 `src/design/tokens.ts` 浅深两套里各新增 `failure` / `failureSoft`：深色 `#F0954A` / `rgba(240,149,74,0.14)`，浅色 `#C2410C` / `rgba(194,65,12,0.10)`。失败块的图标、标题和底色改用这两个 token；说明文字仍用 `textSecondary`，「重试」按钮仍是主按钮。
- 不要改动任何其它使用金色的地方。

## 交付
在 `docs/journal/2026-11-05-102-card-a.md` 末尾追加「返修第 1 轮」一节：逐条写改动、红 → 绿证据，以及三项全量检查的结果。
