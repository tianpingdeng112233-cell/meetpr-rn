# 056 legacy bodyweight 严格识别返修 · 2026-10-30

## 范围与现场

- 用户本轮返修要求为依据：只将 `load_mode == null`、`intensity_mode === 'rpe'`、`Number(target_value) === 10`、备注命中 `/自重|bodyweight/i` 同时成立的组识别为 legacy bodyweight projection。这替代旧 CARD 中只写「空模式 + 备注标记」的宽泛描述。
- 工作目录 `/Users/david/Projects/apps/meetpr-rn-wt-056`，分支 `fix/056-legacy-bodyweight-strict`；开工工作区干净，HEAD 与本地 origin/main 均为 `6725a1fb0c5871c6123dcc6def19137d507c3e6d`（rn#112 已合并）。已运行 worktree/status/log 核对；未 fetch，不声称核验远端最新状态。
- 已读根 CONTEXT、AGENTS、CLAUDE（仅引用 AGENTS）、PLAN、056 CARD、前卡 JOURNAL、工程流程与记忆索引；仓内无 FOLLOWUPS。已读取 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)。采用 tdd；根因和测试 seam 已由本轮任务明确。
- 无 git 写操作、commit、push；无后端、依赖、正典台账或无关重构。

## Bug 与修复

旧 `effectiveLoadMode` 在空 `load_mode` 时仅凭备注判定自重。于是 `weight/135.00 + 自重` 丢失 135 kg，`rpe/8 + 自重` 丢失 RPE 8，且备注被误剥离。

新增导出 `isLegacyBodyweightProjection(set)`，精确检查上述四条件；`effectiveLoadMode` 调用它，显式模式继续优先。生产源码仅修改 `src/domain/plan/prescription.ts`。

`withoutBodyweightMarker` 的两个现有调用已受有效自重判断保护，不改其签名或扩大改动：

- `WorkoutBody.tsx:172`：只在 `effectiveLoadMode(active.planSet) === 'bodyweight'` 时剥离。
- `accessory-quick-log.ts:64`：只在 `decodePrescription(...).loadMode === 'bodyweight'` 时剥离。新增行模型回归确认真实重量/RPE 组保留完整「自重」备注，精确 legacy 与显式 bodyweight 剥离标记。

现有自重测试里原先使用 `weight/25`、`weight/80` 或 `null/null` 搭配备注模拟 legacy 的 fixture，改为真实 `rpe/10.00` 编码；未删除或放松断言。

## 全 src 调用点审计

全量检索 `自重|bodyweight`，另查转义标记和 `withoutBodyweightMarker`。除共享入口外没有独立 marker-only 负荷判断；修复共享入口即可覆盖以下路径。

| 调用点 | 路由及处理 |
| --- | --- |
| AccessoryLogCard | 直接使用 effectiveLoadMode；行内容经 accessoryRows → decodePrescription |
| LoadTypeSummary | decodePrescription → effectiveLoadMode → 严格 predicate |
| chat/set-ref.ts | decodePrescription 决定独立负荷分支；真实 legacy weight/RPE 保留旧字段值 |
| training/drafts.ts | synthesizeDrafts → policy.planSetPrescription → decodePrescription |
| WorkoutBody、QuickLogSheet、set-log-input | effectiveLoadMode（部分展示另经 decodePrescription） |
| accessory-quick-log、SetEntrySheet、suggestion-gating | decodePrescription |
| schema、i18n、demo seed | 枚举/文案/数据生成，不是 marker-only 负荷决策；无须修改 |

检索日志：`/tmp/056-legacy-strict/marker-audit.log`。剩余两处 marker 正则分别为严格 predicate 与已受调用条件保护的字符串剥离 helper。

## 先红后绿证据

先仅添加测试，实际看到行为断言失败后才改生产实现。必要四类行为均覆盖；另覆盖英文大写 BODYWEIGHT 和 decimal `10.00`。

| 命令 | 红（修复前） | 绿（修复后） |
| --- | --- | --- |
| `npm test -- --runInBand src/domain/plan/__tests__/prescription.test.ts` | exit 1；1 suite；2 failed / 21 passed / 23 total。135 与 RPE 8 实际均为 undefined | exit 0；1 suite；23/23 passed |
| `npm test -- --runInBand src/features/training/__tests__/accessory-quick-log.test.ts` | exit 1；1 suite；2 failed / 53 passed / 55 total。真实目标丢失、extraNote 从「自重」变 null | 随下列定向命令与完整 Jest 全部通过，55/55 passed |

定向绿色命令：

```sh
npm test -- --runInBand src/domain/plan/__tests__/prescription.test.ts src/features/training/__tests__/accessory-quick-log.test.ts src/features/training/__tests__/load-types-entry.test.tsx src/features/training/__tests__/workout-coach-notes.test.tsx src/features/chat/__tests__/set-ref.test.ts
```

结果：exit 0，5/5 suites，117/117 tests，0 snapshots。日志位于 `/tmp/056-legacy-strict/`：`prescription-red.log`、`notes-red.log`、`prescription-green.log`、`targeted-green.log`。

## 最终检查与审查

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0，0 diagnostics |
| `npm run lint` | exit 0，0 errors / 0 warnings |
| `npm test -- --runInBand` | exit 0，194/194 suites，2021/2021 tests，0 snapshots，44.055 s |
| `git diff --check` | exit 0，无空白错误 |

完整日志：`/tmp/056-legacy-strict/typecheck.log`、`lint.log`、`jest-full.log`。没有未决检查失败，无需做 origin/main 失败归因。Jest 日志包含 React 测试环境 console 输出，但无失败用例。

采用 review-loop 本地双轴独立只读审查，固定范围为下面五个代码/测试文件的未提交 diff：Standards 0 findings；Spec 0 findings。审查后未改生产或测试语义，主代理复读最终 diff。仓内缺 `docs/agents/issue-tracker.md`，未声称运行依赖 tracker 的 code-review 流程；需要该流程时由 David 调用 `$setup-matt-pocock-skills`，本次明确任务规格的本地审查不依赖它。

本次为开发回归验证；未运行 Android 模拟器或取得设备截图，不以 Jest 结果代替设备验收。未改 UI 布局或样式，无已知未决代码项。

## 文件清单

1. `src/domain/plan/prescription.ts`：严格 predicate 和共享入口。
2. `src/domain/plan/__tests__/prescription.test.ts`：新增 5 个解码回归。
3. `src/features/training/__tests__/accessory-quick-log.test.ts`：新增 4 个目标/备注回归及精确 legacy fixture。
4. `src/features/training/__tests__/load-types-entry.test.tsx`：精确 legacy fixture。
5. `src/features/training/__tests__/workout-coach-notes.test.tsx`：精确 legacy fixture。
6. 本 JOURNAL。
