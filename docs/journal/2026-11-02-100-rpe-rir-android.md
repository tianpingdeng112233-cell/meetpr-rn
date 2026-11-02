# spec 100 Android 开发记录（2026-11-02）

- 工作区：`/Users/david/Projects/apps/meetpr-rn-wt-100`，分支 `feat/100-rpe-rir-explainer`，基线 `687b98a`。第一条 shell 操作在此目录 `mktemp ./write-probe.XXXXXX` 后删除成功。未切换 checkout；未 commit、push、开 PR。
- 正典：`specs/100-rpe-rir-explainer/SPEC.md`；布局按 `docs/cards/2026-11-02-100-rpe-rir-explainer.md` 的已定稿转写。spec 的“屏幕稿待定稿”状态说明由任务卡明确的已定稿布局补充，功能范围无冲突。
- 读取 [Expo SDK 57 版本文档](https://docs.expo.dev/versions/v57.0.0/)。已有 `rirCopy` 按 key 查表的实现不需修改；仅更新 `student.setEntryRpe.copy001…011` 的值，key 和数值范围不变。

## 实装

- `EffortHelpButton.tsx`：三入口共用的问号按钮与居中说明卡，原生 Modal 承接返回键，支持遮罩/关闭按钮收起，卡片可滚动。组件只管理自身显示状态，不改输入草稿。
- `effort-explainer.ts`：`effortExplainerFor` 返回 i18n key 结构；`rirStepperCopy` 处理空值、0、1–9 与英文单复数。
- `SetEntrySheet.tsx`、`AccessoryLogCard.tsx`、`QuickLogSheet.tsx`：按当前模式打开卡片，保留原切换条件与提交逻辑；记录弹窗增加 RIR 小字。
- `SetEntryRPEScale.tsx`：长提示可换行；拖动气泡以底边定位，不限制为一行。
- `StudentKit.json`、`RnExtras.json` 与生成的 `zh-Hant.json`：按 spec 英/简中原文；繁体运行 `npm run i18n:zh-Hant`，未手写生成文件。`scripts/i18n/reps-keys.json` 只登记本卡五个含训练次数的新 key，沿用台湾用语“下”的现有生成流程。
- 未修改 `WorkoutBody.tsx`、`TodayWorkoutView.tsx`、onboarding、bind gate、存储字段、回顾/完成页或正典发布台账。初始已有的未跟踪任务卡保留。

## Red → Green

证据目录：`docs/evidence/rpe-rir-20261102/`，下列 `.log` 为真实执行输出。

| seam / 命令 | Red | Green | 日志 |
| --- | --- | --- | --- |
| `npm test -- --runInBand src/features/training/__tests__/training-policy.test.ts` | 12 failed / 11 passed / 23 total；旧文案与新期望不符 | 23 passed | `rpe-red.log` / `rpe-green.log` |
| `npm test -- --runInBand src/features/training/__tests__/effort-explainer.test.ts` | suite failed，模块尚不存在；0 tests 执行 | 4 passed；两卡英/简中逐字与 8 行表格 | `explainer-red.log` / `explainer-green.log` |
| `npm test -- --runInBand src/features/training/__tests__/rir-stepper-copy.test.ts` | 5 failed；函数尚未实现 | 5 passed；空、0、1、2、9，英/简中 | `stepper-red.log` / `stepper-green.log` |

后续补齐两份新测试的 `@jest/globals` 显式导入与 mutable tuple 类型，解决 TypeScript 的测试声明检查；原逐档表同时补英文断言。最终全量检查见下节。

## 布局与转写的差异

- 常规字体下表格数值列为 40dp；放大字体时为 `40 × fontScale`，避免 `9.5` / `5–6` 被截断。文字不限制行数，整卡可滚动。
- 辅助项与补记表头强度列最小宽度 88dp，分别留出两个不重叠的 44dp 命中区；输入列同步保持对齐。这是问号入口所需的列宽调整。
- 9.5 刻度小字与金色气泡允许换行，优先保留原字号、完整文案和系统字体缩放。气泡改用底边定位以容纳多行。
- 遮罩使用现有 `numberPadScrim`，表面为 `surfaceElevated`，其余颜色均来自现有 token。没有另起设计。

## 模拟器阻塞及未完成验收

已设置仓规 PATH、JAVA_HOME、ANDROID_HOME，执行：

```sh
CI=1 npx expo run:android --device meetpr --no-bundler
```

命令退出 1；ADB 子进程退出 255。在构建/安装前启动 ADB 时失败，原始输出见 `docs/evidence/rpe-rir-20261102/android.log`：

```text
could not install *smartsocket* listener: Operation not permitted
* failed to start daemon
error: cannot connect to daemon
```

当前 sandbox 不允许该 listener，审批策略为 never。未绕过限制，未新建或改用其它 AVD，未访问真实训练账号。

**截图路径：无，未生成任何 PNG。** 上述目录现存的是测试/阻塞日志，不能当成模拟器截图或 UI 验收证据。

待环境允许 ADB 后，在现有 AVD `meetpr` 用 demo/test 数据完成 spec 1–6 与第 8 条的 Android 上机部分：三处入口按模式打开、切换正常、关闭/返回后输入不变、全部刻度含 9.5、RIR 空/0/1/2/9、英/简/繁两卡、深浅色、最大字体滚动与不截断。截图保存到同一 evidence 目录。

第 7 条历史用户覆盖升级、回顾/完成页数值不变的设备验证亦未完成；无存储或数值逻辑改动不代替该项实测。iOS 不在本卡 Android 工作区执行。

## 代码自审

独立只读 Standards / Spec 双轴审查：各 0 项代码问题。Spec 审查指出大字体数值列宽的适配需记录，已在上文说明；两轴均不将静态审查等同于上机验收。

仓内 `docs/agents/issue-tracker.md` 缺失；本次用户已直接提供正典 spec 与任务卡，不依赖 tracker 取规格。该通用配置缺口待 David 调用 `$setup-matt-pocock-skills` 补齐，不在本卡私建。

## 全量检查与超时排查

- 首轮 `npm test -- --runInBand`：197 suites 中 195 passed / 2 failed；2037 tests 中 1998 passed / 39 failed，499.165 s。`set-save.test.tsx` 首个后台 refetch 用例与 dashboard `visual-parity.test.tsx` 出现 5000 ms 超时，随后出现 overlapping act / 未挂载组件的连锁失败。此轮与 tsc/lint 同时运行，不能把超时归为已证实的代码缺陷，也不能忽略失败。
- 缩小复现：`npm test -- --runInBand src/features/training/__tests__/set-save.test.tsx -t 'a rate-limited background refetch'`，1 passed / 38 skipped，10.453 s。
- 完整重跑两个失败套件：`npm test -- --runInBand src/features/training/__tests__/set-save.test.tsx src/features/dashboard/__tests__/visual-parity.test.tsx`，2 suites / 69 tests 全通过，83.094 s。未修改任何业务代码或测试超时设置。
- 暂定解释是运行负载或冷启动的时序波动，尚无稳定最小复现证明根因。依 `diagnosing-bugs` 的复现门槛，不凭假设改业务代码；完整套件复跑作为回归信号，未加临时调试代码或新 UI 快照。
- 繁体生成一致性：`npm run i18n:zh-Hant -- --check` 退出 0。
- 上述统计原始摘录见 evidence 目录的 `all-tests-summary.log`、`integration-retry-summary.log`、`refetch-probe-summary.log`。最终单独执行的全量结果追加如下。

- 最终 `npx tsc --noEmit`：退出 0，无诊断；`npm run lint`：退出 0，0 errors / 0 warnings。执行在第二轮全量测试之前，避免同时竞争资源。日志为 `tsc-final.log` / `lint-final.log`。

- 最终单独执行 `npm test -- --runInBand`：**197 / 197 suites、2037 / 2037 tests 全通过**，0 snapshots，212.724 s，退出 0；没有调整默认超时。真实汇总：`docs/evidence/rpe-rir-20261102/all-tests-final-summary.log`。本卡三个 seam 共 32 tests 包含在这次全量运行中。
- 最终 `git diff --check` 退出 0；`git diff HEAD -- src/features/training/WorkoutBody.tsx src/features/training/TodayWorkoutView.tsx` 为空。

代码实现与本地自动检查已完成；由于上述 ADB 权限阻塞，模拟器截图及相关验收项仍未完成，不能宣布 spec 全项验收通过。所有改动留在工作区，供 Opus 收货。

- 繁中校正：在 `phrase-overrides-zh-Hant.json` 为 `training.explainer.rpe.footer` 添加「估不准 → 估不準」映射；运行 `npm run i18n:zh-Hant`，生成产物仅此字符串变化。`npm run i18n:zh-Hant -- --check` 退出 0；`npm test -- --runInBand src/features/training/__tests__/effort-explainer.test.ts`：1 suite passed，4 tests passed，0 failed。
