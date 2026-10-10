# Spec 089 · 卡 A（安卓，数据层）：辅助项判定、记录卡行模型、休息时长

开工先读仓内 `CONTEXT.md`、`AGENTS.md`、`specs/089-accessory-quick-log/SPEC.md` **全文**。本卡只做纯函数与测试，**不接任何界面、不改任何现有组件的渲染**；界面由卡 B 在屏幕稿定稿后做。

- 级别：T1。工作树 `/Users/david/Projects/apps/meetpr-rn-wt-089`，分支 `feat/089-accessory-quick-log`（叠在 `feat/086-training-strip-coach-note` 之上）。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开，不写账号、密钥。
- 零后端改动；不改 API schema；不加依赖。

## 要交付的纯函数

放在 `src/features/training/` 下的新文件（文件名自定，一到两个文件），全部无副作用、不读全局状态、不调 `t()`：

1. **辅助项判定** `isAccessoryExercise(metadata)`：入参是 `resolveExerciseMetadata` 的返回值（或其中的 `exercise_type`）。`'accessory'` → true；`'main_lift'`、`'main_lift_variation'`、其他任何字符串、`null` / `undefined`（解析不到）→ false。
2. **行模型** `accessoryRows({ drafts, previousLogs, unit })`：入参是同一个动作的 `WorkoutSetDraft[]`（现有类型，已含处方与已有记录）、这个动作上一次训练的记录、学员单位偏好。每行输出：
   - `stableSetId`、`setIndex`、状态（未记录 / 已完成 / 失败）、是否有视频标记的入参透传位（由调用方提供，本函数只负责携带）；
   - 重量预填文本（已有记录优先，其次处方的固定重量；没有则空串）与重量占位文本（上次同组序的重量，没有则空串）；
   - 次数预填文本（已有记录优先，其次处方次数）；
   - RPE 文本（仅已有记录里学员填过的值；处方值**不**进文本）与 RPE 占位（处方是 RPE 时为目标值文本；处方是 RIR 时给出 `{ kind: 'rir', value }` 供界面渲染；否则空）；
   - `isBodyweight`（组级 `coach_note` 命中自重标记：与网页编辑器同一正则 `/自重|bodyweight/i`）——自重行重量按 `0` 记录、不可编辑；
   - `previous`：上次同组序的 `{ weightText, reps }` 或 null；
   - `extraNote`：组级 `coach_note` 去空白后非空且不是自重标记时的原文，否则 null。
   单位换算、数字格式沿用仓内现有函数（`formatWeight` 等），不要另写一套。
3. **能否记录** `accessoryRowWritable(row, edited)`：给定行与当前编辑中的重量 / 次数 / RPE 文本，返回是否可 ✓ 以及哪个字段不合法。规则与 `quick-log.ts` 里 `QuickLogAttempt.submit` 的逐行校验一致（重量 ≥ 0 的有限数、次数 1–99 的整数、RPE 为空或 0–10）；自重行不校验重量。优先把那段校验抽成共享函数供两处使用，`quick-log` 的行为与测试不得变化。
4. **请求体** `accessoryLogRequest(row, edited, { planExerciseId, loggedDate? })`：生成现有 `SetLogUpsertRequest`（coached 形态）。记录：`completed: true, failed: false`，RPE 没填时不带 `rpe` 字段（或为 null，以现有 `set-save` 路径的写法为准，两者保持一致）；取消：`completed: false, failed: false`，重量次数保留原值。重量一律换算成 kg 的十进制字符串（沿用现有换算）。
5. **全部按计划完成的选择** `rowsToCompleteAll(rows, editedById)`：返回 `{ toWrite: Row[], skipped: Row[] }`——未记录且可记录的进 `toWrite`（按组序），未记录但重量为空 / 不合法的进 `skipped`；已完成与失败的两边都不进。
6. **休息时长**：
   - `src/features/settings/rest-timer.ts` 的 `RestTimerPreference` 两种形态都追加可选字段 `accessory?: number`（秒）；新增 `accessoryRestSeconds(preference)`：缺字段或非有限数 → 60；否则钳到 30–300、15 秒步进。新增常量 `ACCESSORY_REST_DEFAULT = 60`。
   - `src/features/training/policy.ts` 新增 `resolveAccessoryRestSeconds({ prescribed, preference })`：`prescribed ?? accessoryRestSeconds(preference)`，上限沿用 `TRAINING_LIMITS.restMaximumSeconds`。现有 `resolveRestSeconds`、`restSecondsForRPE` 的行为不变。
   - 偏好的读写 / 持久化若有 schema 校验（先找到它存在哪），让旧数据（没有 `accessory`）照常通过，不做迁移、不改已有字段。

## 约束

- 不动 `WorkoutBody.tsx`、`TodayWorkoutView.tsx`、`SetEntrySheet.tsx`、Profile 页的渲染与行为。
- 不引入"快速记录"专用的记录类型或标记；写入就是普通记录。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam（先红后绿，每个函数一个测试文件或合并为两个）

1. 判定：三种类型、未知字符串、null / undefined。
2. 行模型：固定重量处方、纯 RPE 处方（重量空、占位 = 上次）、RIR 处方（占位 kind）、自重组、已有记录覆盖处方、失败组、lb 单位、没有上次记录、`extraNote` 的三种情况。
3. 能否记录：各字段的边界值；自重行；与 `quick-log` 共享校验后 `quick-log.test.ts` 原断言不改而通过。
4. 请求体：记录（带 / 不带 RPE）、取消、自重（`weight_kg` 为 `0`）、lb → kg。
5. 全部完成的选择：混合已完成 / 未记录 / 空重量 / 失败的一组行。
6. 休息：缺字段 60；30 / 300 边界与步进；教练 `rest_seconds` 优先；`resolveRestSeconds` 既有用例不变。

交付前跑通：`npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint`。发现 SPEC 与本卡冲突以 SPEC 为准并在 JOURNAL 记录；需要产品取舍的地方停下写进 JOURNAL，不自行裁决。
