# 卡 · spec 090 修订：辅助项在 hero 时下方不重复（安卓）

先读仓根 `AGENTS.md`，再读 `specs/090-training-flow/SPEC.md` 的 §1「分区」下新加的「辅助项在 hero 时下方不重复」一条与验收第 11 条（2026-11-04 修订，docs PR #127）。

- 级别：T1 / P1。分支 `fix/090-accessory-hero-dedupe`，工作树 `meetpr-rn-wt-090b`（基于 `origin/main`）。不 commit、不 push。
- 来源：David 真机截图——辅助项「高位下拉」在 hero 卡里已是整张可编辑组表，下方列表又列了一遍同一动作的只读组表卡。

## 目标

训练页记录态、可编辑、当天训练：当 hero 卡用的是辅助项记录卡形态（`WorkoutBody.tsx` 里 `accessory` 为真那一支，即 hero 渲染 `AccessoryLogCard`）时，hero 下方的动作列表不再渲染这个动作自己的组表卡，从下一个没做完的动作开始。主项 / 变式的 hero（`accessory` 为假）下方保持原样，仍以它自己的组表卡开头。

## 文件范围

- `src/features/training/WorkoutBody.tsx`（下方列表的过滤，现在在 `progress.completed` 过滤那一行附近）
- `src/features/training/__tests__/training-flow.test.tsx`（加用例）
- `PARITY.md` 一行登记；本卡 JOURNAL `docs/journal/2026-11-04-090-accessory-hero-dedupe.md`

## 约束

- 只改"下方是否带当前 hero 动作"这一件事。上收、退回、跳着做、滚动定位、吸底按钮、加一组、学员自加动作区一律不动。
- 非 `progressFlow` 路径、只读预览、已结算日详情、未开始汇总卡不变。
- 上收后的滚动定位如果依赖"下方第一张是当前动作"的 ref / 测量，要确认它仍对（辅助项做完上收后下一个顶进 hero、页面不跳错）。

## 验收标准（Opus 逐项收货）

1. 当前 hero 是辅助项：页面上这个动作的名字与组表只出现一次（在 hero 里）；hero 下方第一张卡是下一个没做完的动作。
2. 当前 hero 是主项 / 变式：下方第一张仍是它自己的组表卡（与修订前一致）。
3. 辅助项逐组打 ✓ 到最后一组、或「全部按计划完成」：它上收到 hero 上方；下一个动作顶进 hero，若它也是辅助项，下方同样不带它。
4. 对已上收的辅助项取消一组，它重新成为 hero：下方不出现它的重复卡。
5. 全部做完 / 部分做完的吸底与按钮位置不变。
6. 带历史的老用户（当天已记过若干组）升级后进训练页，第一屏按上述规则排好。
7. `npx tsc --noEmit`、`npm test` 全绿；Android 模拟器（AVD `meetpr`）截图为证：辅助项 hero 页、主项 hero 页、辅助项上收后的下一屏各一张，存 `docs/evidence/spec090-dedupe-20261104/`。

## 测试 seam

复用 spec 090 的页面层 seam `training-flow.test.tsx`（S4）。先红后绿：
- 新用例：hero 为辅助项时，hero 之后渲染的组表卡里不含该动作 id（先红）。
- 对照用例：hero 为主项时，下方第一张组表卡是该动作（应当本来就绿，防回归）。
