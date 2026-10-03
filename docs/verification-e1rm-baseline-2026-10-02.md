# e1RM 导入基线修复移植 · 收货记录 · 2026-10-02

卡：[E1RM-IMPORTED-BASELINE-CARD](../specs/build22-parity/E1RM-IMPORTED-BASELINE-CARD.md)。RN 基线 `b996f7d`；iOS 参照 `03021ff6`（`beta/1.0-23`）。实装方 Codex，收货方 Opus。来源：2026-10-02 真机走查 D-25（Progress 提示数据不足、曲线不成线）。

环境：AVD `meetpr`，本地合成 API 与合成账号，debug 签名 fixture 包。未做真机验证，未在 Global 真账号上验证。

## 改了什么

1. 实练的异常比较基线只取同主项的 normal + logged 点，导入/assumed 点不再作基线（同 iOS `E1RMRecorder`）。
2. 入选规则追齐 iOS `E1RMEligibility`：去掉"RPE 低于 7 不入选"，只排除 RPE > 10 与超出次数上限的组。这条下限来自旧基线 `3799f67` 的参照包，固定 iOS 早已没有。
3. RN 旧存储把真实服务器日志的回放存成了 `imported-*` / `origin: imported`。这类点归正为 `logged`，置信度按完整真实日志时序重算；point ID、估值、来源字段、PR 事件不变；归正与修复同一次带版本号的原子替换，重复刷新零写。
4. 本地存储不可读时不写入、不覆盖；成长页用服务器日志只读回放照常展示。

## 收货

- 读全量 diff；首轮退回三处（入选规则、旧存储迁移、损坏存储降级），返修后通过。
- 收货方复跑：`npx jest --runInBand` 134 suites / 952 tests、`npx tsc --noEmit`、`npm run lint` 通过。
- 模拟器升级路径：
  1. 装修复前的包，打开 Progress（旧逻辑把历史存成导入点），记一组 162 kg × 5 @ RPE 6 的深蹲。Progress 深蹲卡停在 9/17、194.9 kg，今天这组完全没出现。[截图](evidence/e1rm-20261002/before-fix-rpe6-set-ignored.png)
  2. 覆盖安装修复后的包，打开 Progress。原有四个点和 194.9 kg 不变；今天这组作为未验证散点出现在图上。[截图](evidence/e1rm-20261002/after-upgrade-progress.png)
  3. 点散点：来源页显示 162 kg × 5、RPE 6、70% → 231.4 kg，标注 Unverified、不计入可信趋势。它比历史最好高约 19%，超过 18% 的可疑阈值，iOS 对同样输入的判定相同。[截图](evidence/e1rm-20261002/after-upgrade-source-unverified.png)
  4. 点 9/17 的历史点：来源页显示 152 kg × 5、RPE 8、78% → 194.9 kg，Daily best。[截图](evidence/e1rm-20261002/after-upgrade-source-trusted.png)

## 未覆盖

真机；Global 真账号；iOS 测试里去身份化真实案例（38 组）的逐点对照由单测覆盖，未在设备上重放；并发写与写失败由单测覆盖。

## 观察到但不属于本卡

训练页 PR 横幅在新设备上显示 "First record"（本地无历史）；横幅取原始估值、Progress 取平滑值，两者数字不同。走查决定横幅两端删除，届时一并处理。
