# 走查行为缺陷三项 · 收货记录 · 2026-10-02

卡：[WALKTHROUGH-BEHAVIOR-CARD](../specs/build22-parity/WALKTHROUGH-BEHAVIOR-CARD.md)。排障依据：[diagnose-walkthrough](diagnose-walkthrough-2026-10-02.md)。RN 基线 `e93beb8`。实装方 Codex，收货方 Opus。

环境：AVD `meetpr`（Android 15）+ 本地合成 API 与合成账号，debug 签名 fixture 包。收货方式是把排障阶段造的三个反馈环在修复后的包上重跑。未做真机验证，未在 Global 真账号上验证。

## A. D-20 记组无反馈、上传无兜底

| 反馈环 | 修复前 | 修复后 |
|---|---|---|
| `POST /sets/log` 延迟 20 秒后点 Complete set | 15 秒内界面无任何变化 | 约 1 秒内按钮置灰并显示加载图标，10 秒时保持；请求返回后进入下一步 |
| 忙碌态下再点两次 | — | 只发出 1 次保存请求 |
| `POST /sets/log` 返回 503 | — | 弹出 "Failed to save"，说明输入保留；关闭后重量、次数、RPE 都在，可直接重试 |

[忙碌态截图](evidence/walkthrough-behavior-20261002/set-save-busy-1s-and-10s.png)。上传兜底（原生调用悬置时按失败处理并进入退避重试、网络类型切换触发重试、切网后立即删除不再多发一次上传）由 `network-handover.test.ts` 覆盖；模拟器无法登录正式后端，上传链路未在设备上验证。

## B. D-28 训练提醒

- 打开开关 → 系统通知授权 → 未授权精确闹钟时页面显示 "Reminders may be delayed…" 与 "Allow alarms and reminders" 入口；此时 `dumpsys alarm` 为非精确（`window=+1h`）。[截图](evidence/walkthrough-behavior-20261002/reminder-exact-alarm-guidance.png)
- 点入口进入系统"Alarms & reminders"页，授权后返回：提示消失，三条提醒重排为精确（`window=0 exactAllowReason=permission`）。
- App 停在前台，到点 20:00:00 准时出现横幅通知；渠道 `training-reminder-v2`，importance=4（HIGH）。[截图](evidence/walkthrough-behavior-20261002/reminder-foreground-banner.png)
- 全仓只有一处通知处理器；上传失败通知仍是不弹横幅、进列表、不响（与修改前一致，单测覆盖）。

## C. D-12 RPE 起手

| 手势（每种 3 次，`adb shell input motionevent` 回放） | 修复前 | 修复后 |
|---|---|---|
| 起手先纵向 40 px 再水平 | 0 / 3 | 3 / 3 |
| 起手先纵向 15 px 再水平 | 1 / 3 | 3 / 3 |
| 45° 斜向起手 60 px 再水平 | 0 / 3 | 3 / 3 |
| 水平拖动中带纵向抖动、滑出卡片、起手 8 px 纵向等其余 5 种 | 15 / 15 | 15 / 15 |

小屏（360×640 dp）上从 RPE 卡片起手的纯纵向滑动仍然滚动页面，RPE 值不变。

David 真机上的原话是"拖着拖着停了"。这一形态在模拟器上修复前后都没有复现；读代码发现的可能中断路径列在 `docs/CODEX-JOURNAL.md` 本卡一节，待真机录屏后再查。

## 自动检查

收货方复跑：`npx jest --runInBand` 137 suites / 990 tests、`npx tsc --noEmit`、`npm run lint` 通过；`grep -rn "DEBUG-wb"` 为空。

## 未覆盖

真机（小米系）上的全部三项；真实网络切换；系统省电与自启动限制对提醒的影响；视频上传在设备上的行为。
