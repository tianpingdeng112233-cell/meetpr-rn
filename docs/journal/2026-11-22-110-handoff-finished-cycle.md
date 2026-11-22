# 110 返修 · 旧周期练完后被本机遗留状态卡住，不接新计划

**结论（2026-11-22）**：Claude 明示降级实装（Codex 额度至 11/23 10:14）。T1/P1，交 PR 等 David 放行，随下一个 CN 包。

## 现场

- 学员李小龙，安卓 CN 0.1.0 (16)。旧计划 10.19 练满 20/20（最后一天 11/20 11:41 手动结算），新计划 11.23 已发布。训练页从 11/21 起一直显示「5 周计划已全部完成」，三次冷启动都不变。
- 后端排除：用现网数据跑 `currentPlanId` 得 11.23；学员接口按当前绑定教练返回两份已发布计划。
- 埋点：11/21 08:33–08:34 三次进入训练页，之后三次冷启动都没切换，说明不是时序问题，而是存在手机本地的锁。
- 学员点「退出登录」时没有弹出「还有 N 组没上传」，说明他的发件箱是空的。他手机上到底是哪条遗留记录，远程查不到。

## 根因

`TodayWorkoutView` 的 `transitionLocked()` 把两类东西混在一起：屏幕上正在进行的操作（录入、录像、结算动画、上传中），和可以跨会话残留的状态（发件箱、结算等待、`pending`/`waiting` 的上传记录）。只要有任何一条残留状态，`enterPlan` 就不切换；冷启动时 `activeSummary` 也会因为 `pendingSync` 回退到本地快照里的旧计划。残留状态可能永远不会消失，例如被拒收的组只有退出登录时才会重发。旧计划练完以后，页面就永远停在完成页。

## 改动

- 新增 `settledCycle`：服务器给的当前计划是另一份，且当前显示的这份 `completed_training_days === total_training_days`。
- 已练完的周期只被屏幕上的操作和正在上传的视频（`preparing`/`uploading`）拦住；发件箱、结算等待和 `pending`/`waiting` 上传不再拦，冷启动也不再回退到旧快照。
- 没练完的周期照旧，spec 110「结算待同步时不提前切」不变。
- 跳过遗留状态时上报 `client_error`：`domain=persistence`，`code=handoff.settled_skip.<outbox|gate|upload_waiting|upload_pending>`。这个值符合后端的白名单格式，下次遇到能直接看出是哪种状态。

## 证据

先红后绿 seam：`plan-handoff-screen.test.tsx`（TodayWorkoutView 冷启动加真实本地存储）。

| 用例 | 修前 | 修后 |
|---|---|---|
| 发件箱残留一组被拒收的记录 | 红，停在旧计划 | 绿 |
| 早先日子残留 `waiting` 视频，网络稍慢 | 红 | 绿 |
| 结算等待里还挂着服务器已结算的日子，视频已失败 | 红 | 绿 |
| 跳过时上报遗留状态的种类 | 红 | 绿 |
| 视频正在上传时仍留在旧计划（护栏） | 绿 | 绿 |

全量 jest 2453/2453，`tsc --noEmit` 与 eslint 均通过。

模拟器 meetpr16@5570 跑 debug 包 `com.meetpr.app.accepthandoff`（demo 后端 + 本地临时把种子计划设为全部练完，验收后已还原）。直接往 RKStorage 写入旧计划快照和遗留状态，再冷启动：

- 修前，发件箱残留一组：停在「All 6 weeks completed」，见 [1-before-rejected-set.png](evidence/handoff-finished-cycle/1-before-rejected-set.png)，和李小龙的截图一致。
- 修后，同样的状态：进入「Next strength block · W1」并出现接续提示，见 [2-after-rejected-set.png](evidence/handoff-finished-cycle/2-after-rejected-set.png)。
- 修后，残留 `waiting` 视频：同样接续，见 [3-after-stale-video.png](evidence/handoff-finished-cycle/3-after-stale-video.png)。

## 未验

- 李小龙真机：他的手机先不清数据，装上新包后能看到 11.23 才算真验收。
- 遗留的发件箱条目本身仍不会自动重发，只有退出登录时才会被处理。这次不改，被拒收的组要怎么展示给学员，是单独的产品问题。
