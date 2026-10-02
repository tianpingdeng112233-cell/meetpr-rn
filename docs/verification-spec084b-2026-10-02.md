# Spec 084 卡 B（安卓）· 收货记录 · 2026-10-02

卡：[CARD-B-android](../specs/084-walkthrough-polish/CARD-B-android.md)，口径见同目录 SPEC §1、§4 与「设计定稿」。RN 基线 `7279d30`（PR #69 顶）。实装方 Codex，收货方 Opus，返修 2 轮。

环境：AVD `meetpr`（Android 15）+ 本地合成 API 与合成账号，debug 签名 fixture 包；另在 360×640 dp、字体 1.3× 下复看；Light / Dark 都看过。合成计划共 4 周，当前在第 3 周。未做真机验证，未在 Global 真账号上验证。

## 逐项结论

| 验收项 | 结论 | 证据 |
|---|---|---|
| 登录页顺序 | 通过。邮箱、密码、Sign in、Create account / Forgot password?、or、Continue with Google、法律文案；邮箱密码登录照常 | [截图](evidence/spec084b-20261002/login-order.png) |
| 无 Plan summary | 通过 | [当前周](evidence/spec084b-20261002/week-strip-current-week.png) |
| 周条翻周 | 通过。右箭头到 W4 后右箭头置灰，左滑右滑各翻一周，翻到 W1 后左箭头置灰且不可点；4 个小点里正在看的周是拉长的深色点，离开当前周后当前周的点是金色 | [未来周](evidence/spec084b-20261002/week-strip-upcoming-week-preview.png)、[已完成周](evidence/spec084b-20261002/week-strip-completed-week.png) |
| 选中与当前训练日 | 通过。当前训练日整格淡金底、日期金色加粗；选中是深色粗框；同时出现时都可辨 | 同上 |
| 翻到其他周 | 通过。页头右侧换成 Back to today，标题为所选那天的 W#D#；未来训练日是只读预览（推荐日期、训练日名称、动作数与组数、动作行、解锁说明），无开练按钮；已完成训练日沿用原有的已完成展示 | 同上 |
| Back to today | 通过。回到 W3 并选中当前训练日，页头恢复三个圆形按钮 | — |
| 小屏大字 | 通过。周条不截断 | [截图](evidence/spec084b-20261002/week-strip-360dp-1.3x-dark.png) |

## 返修

1. 第 1 轮：去掉首轮多加的下拉刷新（卡面笔误带出来的，训练页原本只有页头刷新按钮）；动作小结行在 360×640 dp @1.3× 下把 "Squat" 折成两截，改为不在词中折行。
2. 第 2 轮：第 1 轮把动作小结行在所有屏宽下都改成了上下两行，默认屏宽下原本是一行（与 iOS 一致）。改为按宽度自适应：放得下一行，放不下时处方文字整体换行。[对比](evidence/spec084b-20261002/exercise-row-default-vs-small.png)

## 没验到的

- 计划超过 8 周不画小点：单测覆盖，合成计划只有 4 周。
- 切 tab 回来、完成一天后回到当前训练日：没有逐项点，读代码与挂载测试确认。
- 记组、休息计时、补录流程的回归：没有重走，依赖现有测试（138 suites）。
- Google 登录本身未接通（W4 的事），只看了按钮位置。

## 自动检查

收货方复跑：`npx jest --runInBand` 138 suites / 1008 tests、`npx tsc --noEmit`、`npm run lint` 通过。
