# 排障：结算后回到 Training，页头以下整片空白（2026-10-10）

症状：学员结算当天训练后回到 Training tab，页头以下空白，周条与下一训练日都不显示，uiautomator 树里也没有这些节点；手指拖一下内容出现，位置与正常时相同。

环境：Android 15 模拟器 AVD `meetpr`（emulator-5556），fixture 包 `com.meetpr.app`（089 返修一那一版，不含 090）+ 本机合成服务（端口 39089）。真机未验。

## 结论

**不是结算或庆祝页的问题，是滚动位置没收回来。** Training 页的滚动容器停在一个比新内容还靠下的位置，内容整块在屏幕上方之外。

触发条件只有两个，缺一不可：

1. 页面往下滚过（结算按钮在最底下，所以结算前一定滚到了底）；
2. 页面内容在 **Training tab 不可见的时候** 变短——离开 tab 时 `TodayWorkoutView` 的失焦清理把 `requestedDayID` 置空，显示的训练日从"刚才那天（很长）"换成"当前待练日（未开始的汇总卡，很短）"。

React Native 安卓的 `ReactScrollView.onLayoutChange` 只在 `isShown() && isContentReady()` 时才把超出范围的滚动位置收回最大值（`node_modules/react-native/ReactAndroid/.../views/scroll/ReactScrollView.java:1458`）。tab 隐藏时 `isShown()` 为假，这一步被跳过；回到 tab 时没有任何东西补做。用户一碰，系统 ScrollView 自己回弹，于是"拖一下就好"。

## Phase 1 反馈环

```
zsh ~/Projects/scratch/rn-089-accessory-20261010/scenario.sh diag1 START=2026-10-05 DOW2=6   # 重启合成服务（状态归零）并拉起 fixture 包
zsh ~/Projects/scratch/rn-090-training-20261010/repro.sh <tag>                              # 最后一行 = 周条节点数，0 = 空白
```

输出 `0`，截图 `ui/diag-fx1-result.png` 即 David 描述的症状。约 55 秒，无人值守，三次都红（含早先的 runA / runB）。

注意：同目录的 `repro-demo.sh`（离线演示包 demo-r3）这次跑出来是 **绿的**——它在 demo-r3 上把所有动作都做完了，结算按钮吸底、页面没滚动，所以不触发。它不是这个 bug 的反馈环。

## Phase 2 最小化

用模拟器的 view server 直接读原生滚动位置（`~/Projects/scratch/rn-training-blank-20261010/scrolly.py`）。空白态实测：

| | 滚动位置 scrollY | 视口高 | 内容高 |
|---|---|---|---|
| 空白态 | 3862 | 1709 | 1369 |

内容在 y = −3862 … −2493，全在屏幕外。

最小复现（`~/Projects/scratch/rn-training-blank-20261010/min-repro.sh`，28 秒，两次都红）**不需要结算、不需要庆祝页**：周条点一个已完成的长训练日 → 滑到底 → 点 Today → 点 Training。

| 做法 | 离开前 | 回来后 | 周条 |
|---|---|---|---|
| 最小复现 | scrollY 3865 / 内容 5574 | scrollY 3865 / 内容 1369 | 0（空白） |
| 对照 A：不滚动 | scrollY 0 / 内容 5574 | scrollY 0 / 内容 1369 | 1（正常） |
| 对照 B：滚到底后点页头 `Back to today`（内容在页面可见时变短） | scrollY 3865 / 内容 5574 | scrollY 0 / 内容 1369 | 1（正常） |

这也回答了开工时没验证的那一项：从页面顶部结算不会空白（090 之后全部做完、按钮吸底的那条路径就是这样，demo-r3 上实测正常）。

## Phase 3 假设与判定

1. **滚动位置超出新内容高度，且在页面不可见时没被收回** —— 成立（上表实测 + RN 源码）。开工时"拖动后坐标与正常一致，所以不像滚动偏移"的推断不成立：拖动本身就会把位置回弹到合法范围，坐标自然正常。
2. 庆祝页盖住时内容变化导致没重绘 —— 排除：最小复现里没有庆祝页。
3. 原生视图漏了一次重绘，任何触摸都会触发 —— 排除：内容的原生坐标确实在屏幕外，不是没画。
4. LayoutAnimation 中途被打断留下透明或零高度 —— 排除：关系统动画仍复现（开工前已验），且内容高度实测为 1369 不是 0。
5. spec 090 的吸底 / 上收改动 —— 排除：不含 090 的包同样复现。

## 修复卡（T1，派 Codex）

目标：`TodayWorkoutView` 显示的训练日换了（`selectedDayID` 从一个非空值变成另一个值），就把页面滚动容器无动画地回到顶部（`scrollTo({ y: 0, animated: false })`）。y = 0 对任何内容高度都合法，所以不依赖 RN 在隐藏态做不做收回，也不依赖滚动指令与新内容挂载的先后顺序。

文件范围：`src/features/training/TodayWorkoutView.tsx`、`src/features/training/__tests__/completion-entry.test.tsx`、`docs/CODEX-JOURNAL.md`。

约束：

- 首次载入（空 → 第一个训练日）不发滚动指令；同一训练日内的任何变化（记组、上收、结算、撤销结算、刷新）不发。090 的"做完一个动作后滚到刚收上去那一行"行为与其现有用例不得改动。
- 不加 `onScroll` 监听，不改导航 / tab 配置，不动 `node_modules`。

验收标准：

1. `min-repro.sh` 输出 1，回来后 scrollY = 0。
2. 原始 `repro.sh`（结算路径）输出 1。
3. 对照 A / B 仍正常。
4. 全量 jest、`tsc --noEmit`、lint 通过。

测试 seam：`completion-entry.test.tsx` 已经渲染整个 `TodayWorkoutView`、能拿到 `useFocusEffect` 的回调并 spy 了 `ScrollView.prototype.scrollTo`。先红后绿两条：

- 选中另一个训练日后执行失焦清理（即 `useFocusEffect` 回调返回的清理函数），显示的训练日回到当前待练日 → `scrollTo` 被以 `{ y: 0, animated: false }` 调用一次。
- 首次载入与同一训练日内的重渲染 → 不调用。

**seam 的局限（本身是发现）**：jest 里没有原生 ScrollView，"隐藏态不收回滚动位置"这件事在单元测试里触发不了；上面的用例只锁住 JS 一侧的约定。真正能对这个 bug 变红的只有模拟器上的 `min-repro.sh`，它不在 CI 里。

## Phase 5 / 6 结果

修复：`TodayWorkoutView` 记住上一个显示的训练日，换成另一个时 `scrollTo({ y: 0, animated: false })`（8 行）。回归用例两条加在 `completion-entry.test.tsx`；去掉实现后第一条红（预期滚动 1 次、实际 0 次，1 failed / 29 passed），加回后全量 166 套 1526 条通过，`tsc --noEmit` 与 lint 退出码 0。

同一份源码打两个 fixture 包对比（基线 = `26bdefb`，修复 = 基线 + 本次改动），模拟器实测：

| 场景 | 基线 | 修复后 |
|---|---|---|
| 原始复现 `repro.sh`（结算路径） | 0，scrollY 3863 / 内容 1369 | 1，scrollY 0 |
| 最小复现 `min-repro.sh`（两次） | 0，scrollY 3865 / 内容 1369 | 1、1，scrollY 0 |
| 对照 A：不滚动 | —（089 包上为 1） | 1 |
| 对照 B：可见时 `Back to today` | —（089 包上为 1） | 1 |

截图：`docs/evidence/training-blank-20261010/01-before-blank.png`、`02-after-fix.png`。临时探针全部走模拟器 view server，没有往代码里加日志；一次性脚本留在 `~/Projects/scratch/rn-training-blank-20261010/`，不进仓库。

行为上的一处变化：页面可见时切换训练日（周条、`Back to today`、补记后跳到下一天），以前停在"旧位置与新内容最大值取小"的位置，现在一律回到顶部。

未验：真机；离线演示包（同一份 `TodayWorkoutView`，未单独出包）。

## 已知未覆盖

同一个训练日的内容在 Training tab 隐藏期间变短（例如教练在此期间改短了计划、后台刷新拉到）仍会走同一个 RN 缺口。目前没有已知的触发路径，本次不处理。
