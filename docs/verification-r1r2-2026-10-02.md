# R1 + R2 收货记录 · 2026-10-02

卡：[R1-R2-CARD](../specs/build22-parity/R1-R2-CARD.md)。基线 RN `a203d9c`（业务代码同 `d818bf8`），固定 iOS `beta/1.0-22@0748931`。实装方 Codex，收货方 Opus；实装方未做设备验证，本文是收货方的实屏结论。

环境：AVD `meetpr`，本地合成 API（localhost，合成账号与数据，不连任何真实后端），debug 签名的 fixture 包。未在 Global 真账号上验证，未做真机验证。

## 结论

9/25 核对的 P2-12、P2-13、P2-14、P-33 四处已修复并通过模拟器收货。P1-7 视频剪辑（R3）不在本卡，仍未修。

## 逐项

| 清单项 | 观察 | 证据 |
|---|---|---|
| P02 基础资料 | 标题 `Basic information`；Units / Gender / Date of birth / Height / Body weight 五项齐全，顺序同 iOS。改为 pounds · inches、Male、2001 并补身高后保存，返回再进回读一致，83 kg 显示为 183 lb，Profile 行摘要仍按公制显示（iOS 同为公制）。身高为空时保存被拦，字段标红，输入保留 | [回读](evidence/r1r2-20261002/basics-saved-reopen.png) |
| P03 Meet / notes | 标题 `Meet / notes`；备赛选择 → 日期 → 级别 → 教练备注 → Save。备注保存后重开回读；改动后点 Cancel 无写请求、重开仍是旧值；注入 503 后提示失败且输入保留，恢复后重试成功 | [填写](evidence/r1r2-20261002/meet-note-filled.png) |
| T02 历史入口 | 页头下方靠右一行：金色时钟 + `Training history` + chevron；页头按钮剩刷新、readiness、消息三个。记完第 1 组、休息倒计时进行中进入历史再返回，仍是 D1、Set 2 of 3，倒计时继续 | [入口](evidence/r1r2-20261002/training-history-light.png)、[返回后](evidence/r1r2-20261002/training-history-return-timer.png) |
| C02 教练角标 | Messages 计数 2 显示 `2`，计数 120 显示 `99+`；Students 计数 0 不显示；不遮图标。学员端底栏无变化 | [两种计数](evidence/r1r2-20261002/coach-badges-2-and-99plus.png) |
| 深浅色 | 四处在 Light / Dark 均可读 | [Dark 首轮](evidence/r1r2-20261002/dark-before-rework.png)、[返修后](evidence/r1r2-20261002/units-dark-light-after-rework.png) |
| 小屏大字 | 360×640 dp @1.3×：历史入口不截断；基础资料页在日期滚轮以外的区域上滑可到 Save | [训练页](evidence/r1r2-20261002/small-dark-training.png) |

## 返修一轮

首轮实屏发现两处并退回，返修后复验通过：

- Dark 下 Units 分段控件选中段与轨道几乎同色，看不出选中项（见上方"Dark 首轮"截图左栏）。
- 七个编辑页标题用了 Profile 行标签的键，与 iOS `EditKind.title` 不一致（如 `Height / Body weight` 应为 `Basic information`）。

## 自动检查

收货方在本工作树复跑：`npx jest --runInBand` 133 suites / 931 tests、`npx tsc --noEmit`、`npm run lint` 全部通过。

## 观察到但不属于本卡

- 360×640 dp @1.3× 下，训练页周标题行的 `Coach-recommended date` 被截断。原有问题，记入走查清单 X01。
- 小屏上在日期滚轮区域内上滑会滚动滚轮而不是页面；向导第 1 步是同一控件、同一行为。
- 校验不通过与网络失败共用 `Failed to save. Try again` 文案，原有行为。
- Dark 选中段的底色取了文字类 token `textDisabled`，视觉可辨，语义上不理想，留待设计 token 整理时处理。

## 未覆盖

真机、Global 真账号保存回读、TalkBack；教练端 Students 角标的多位数（合成 API 的申请数恒为 0，由单测覆盖 0 / 1 / 120）。
