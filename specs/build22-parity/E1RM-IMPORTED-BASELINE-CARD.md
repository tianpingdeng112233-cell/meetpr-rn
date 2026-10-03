# 任务卡：移植 iOS 1.0(23) 的 e1RM 导入基线修复

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、本卡，再读 iOS 的修复说明与实现。

- 级别：T2 / P1。David 2026-10-02 真机走查发现并批准移植（走查问题 D-25）。
- 基线：RN `fix/android-icon-scale@b996f7d`。iOS 参照 = 修复提交 `03021ff6cbe82aba26827df70b48fb6451105c6d`（已随 `beta/1.0-23` 发出），本机只读仓 `/Users/david/Projects/apps/MeetPR`，用 `git -C <仓> show 03021ff6:<path>` 读。
  - 说明：`specs/050-e1rm-single-source/IMPORTED-BASELINE-REPAIR.md`
  - 实现：`Modules/StudentKit/Sources/StudentKit/Features/Shared/E1RMRecorder.swift`、`E1RMImportedBaselineRepair.swift`、`E1RMCoachRPEReconciler.swift`，`Features/MyProfile/GrowthCurveViewModel.swift`
  - 测试：`Modules/StudentKit/Tests/StudentKitTests/**/E1RMImportedBaselineTests.swift` 与 `ImportedBaselineTestSupport.swift`
- 这是 Opus 派的实装卡：在当前分支 `fix/e1rm-imported-baseline` 的工作区改，**不 commit、不 push**；只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节；`PARITY.md`、走查清单由 Opus 收货后更新。本仓已公开，不写账号、密钥、内网细节。

## 现象（真机）

新装的手机上登录一个服务器已有训练历史的学员，当天实练一组明显高于历史的深蹲后：训练页横幅提示 e1RM 提升，但 Progress 的深蹲卡显示 "Not enough data for the last 30 days"，曲线不成线、点不了。

## 已查到的原因（请先自行复核，再动手）

1. `src/domain/e1rm/recorder.ts` 的异常比较基线取"全部可信点"，只排除了同一 `setLogId` 的导入点；导入来源的点会成为实练的异常基线。iOS 修复后：实练异常基线只取同学员、同比赛主项的 **normal + logged** 点，导入/assumed 点保留展示与复核语义但不作基线，首次实练沿用既有冷启动规则。
2. `src/features/history/history-points.ts` 的 `loadGrowthHistory` 把"服务器真实训练日志的回放"一律存成 `origin: 'imported'`（`replayE1RMHistoryPoints` 本身已经排除了 `assumed` 日志）。这与 iOS 的语义不同：iOS 里真实日志重放出来的是实测点，"导入"指导入/assumed 的估算。**请对照 iOS 的回放与修复实现确认真实日志回放点应有的 origin**；不能把修复做成"新设备上所有历史都不算基线"，那样异常保护在每台新设备上都会被清零。

## 目标

同一份输入（服务器日志 + 本地已存点），RN 的记录、回放、修复与 Progress 快照的结果与 iOS `03021ff6` 一致。

- 实练异常基线规则与 iOS 一致；10% / 18% 阈值、入选规则、公式、主项解析、重量 PR 都不变。
- 打开 Progress 首次读取和下拉刷新前，执行与 iOS 同一口径的旧数据修复：识别"存在可信导入历史、最早合格实练被标 low"的主项，按完整真实日志时序重算该主项。
- 修复保留：导入点及其状态、原 point ID、其他主项的置信度、已有 PR 事件。重复刷新零写入；失败或并发写入留到下次重试，不留半成品。

## 存量数据照护（交付红线）

本地 e1RM 点存储里已有的数据不得丢、不得改坏：修复只改受影响主项里被误判的实测点置信度；任何一步失败都保持修复前状态。带历史的老安装升级后打开 Progress 的第一屏要对（见验收）。

## 测试 seam（先红后绿，只在这些边界加测试）

1. `E1RMRecorder.record`（`src/domain/e1rm/__tests__/recorder-series-repository.test.ts`）：有可信导入历史时，首个合格实练为 normal；实练之间的异常判定仍生效（误录的离谱值继续被隔离）。
2. 回放 / 回填（`replayE1RMHistoryPoints`、`loadGrowthHistory`，`src/features/history/__tests__/history-points.test.ts`）：真实日志回放点的 origin 与 iOS 语义一致；已存点仍是其估值的权威，不被回填覆盖。
3. 修复入口 → 仓储 → `growthSnapshot`（`src/features/history/__tests__`）：把 iOS 测试里的去身份化真实案例（38 组：5 导入、2 高次数不入选、31 实练）搬成 RN 用例，升级刷新后恢复可信实练和曲线状态；覆盖导入高值不被改写、不同主项不被误改、重复刷新零写、失败重试、并发写保护、仓储重开后的首屏。

不在未约定的 seam 加测试；不写镜像实现的测试。

## 验收清单（Opus 收货时逐项核，实装方不得自定范围）

- [ ] 用 iOS 测试的同一组去身份化数据，RN 得到同样的每点置信度和同样的 Progress 卡状态。
- [ ] 新设备场景：本地无点、服务器有 3 个以上不同日期的历史深蹲训练，当天再实练一组比历史高 20% 以上 → 结果与 iOS 23 对同一输入的结果一致，并在 JOURNAL 里写明这个结果是什么、为什么。
- [ ] 升级场景：本地已有被误判为 low 的实测点 → 打开 Progress 后恢复；导入点、point ID、其他主项、PR 事件不变；再次刷新没有写入。
- [ ] 修复过程中注入一次仓储写失败 → 数据保持修复前状态，下次刷新重试成功。
- [ ] 阈值、公式、入选规则的既有测试全部不改断言并通过。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。

模拟器实屏由 Opus 收货时做；沙箱没有 ADB 就如实写"未做设备验证"。

## Out of Scope

阈值与公式、暂停变式入选、平值曲线文案、训练页横幅在新设备上显示 "First record" 的问题、横幅与 Progress 数值口径、后端与网页、服务器训练日志的迁移或删除、追溯 PR 或通知、iOS 仓。

## 返修 1（2026-10-02，Opus 读全量 diff 后退回）

首轮的基线规则、CAS 原子替换、失败/并发保护、重复刷新零写方向正确，测试 134 suites / 943 tests 通过。退回三处：

1. **入选规则追齐 iOS（授权）**。首轮报告的差异属实：RN `E1RM_POLICY.minimumEligibleRPE = 7` 来自旧基线 `3799f67` 的参照包；固定 iOS `beta/1.0-22` 与 `03021ff6` 的 `E1RMEligibility.isEligible` 都没有 RPE 下限——`nil` 与低于 7 的 RPE 都入选，只排除 RPE > 10，另有次数上限（10，硬拉 5）。这是 RN 的基线漂移缺陷，本卡一并修：入选规则与 iOS 该文件逐条一致，RPE < 6 的估值算法沿用 RN 计算器现有的 Epley 回落（iOS `E1RMCalculator` 同）。卡面"入选规则不变"一句作废。真实案例须达到与 iOS 相同的每点置信度（31 个实练点的结果一致）。
2. **RN 旧存储里"真实日志被存成导入点"要迁移**。修复前 `loadGrowthHistory` 把真实日志回放存成 `id: imported-<setLogId>`、`origin: 'imported'`；首轮只改了新回填（现在是 `history-<id>` / `logged`），旧点原样保留。后果：像走查手机这样的安装（先打开过 Progress，再实练出高值），最早的合格回放点在本地是 `imported`，`needsRepair` 判为 false，被误判为 low 的实测点永远不恢复，且全部历史继续被排除在实测基线之外。要求：本地点若对应一条真实（非 assumed）服务器日志，其语义就是实测——把它的 origin 归正为 `logged`，置信度按完整真实日志时序重算；保留 point ID、估值、来源字段与 PR 事件；真正的导入/assumed 点不动。归正与修复走同一次 CAS 原子替换，幂等，重复刷新零写。
3. **损坏存储的降级**。`readE1RM` 现在对无法解析的存储抛错，保护了数据不被空存储覆盖，这一点保留；但 Progress 的 `pointsQuery` 一旦报错整页进入错误态，损坏存储会让成长页永久不可用。要求：存储不可读时不写入、不覆盖，页面仍用服务器日志回放出的只读曲线正常展示；训练记组照常（现有 best-effort 语义）。

新增验收（Opus 复验）：
- [ ] 走查现场的去身份化重放：本地无点 → 首次打开 Progress（旧代码行为：全部历史存成 `imported-*`）→ 实练一组比历史高 20% 以上并被旧代码标 low → 升级到本修复后打开 Progress：结果与"同一批日志在 iOS 23 上"的结果一致；重复刷新零写；point ID 与估值不变。
- [ ] 入选规则的测试按 iOS 行为更新断言（RPE 6、6.5、nil 入选；RPE > 10 不入选；次数上限不变），并在 JOURNAL 写明这是追齐基线而非新规则。
- [ ] 存储损坏用例：成长页可读、无写入、原始字节不变。
- [ ] 全量 jest、tsc、lint 通过。

仍然不 commit、不 push；在 JOURNAL 本卡一节后追加返修记录。
