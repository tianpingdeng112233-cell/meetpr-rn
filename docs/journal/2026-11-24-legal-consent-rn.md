# Android 法律同意版本与协议入口

- 日期：2026-11-24。
- 任务卡：`/Users/david/Projects/scratch/legal-company-20261124/card-rn.md`（完整阅读后执行）。
- 工作区：`/Users/david/Projects/apps/meetpr-rn-wt-legal`；分支 `feat/legal-consent`；开工 HEAD `7b12c12`，工作区干净。
- 首个操作为试写 `.codex-write-test` 后删除，exit 0；交付时该文件不存在。
- 未重装依赖，未 commit、push 或开 PR。未改官网正文、隐私政策地址或 `src/features/updates/`。

## 实装与文件

| 文件 | 改动 |
| --- | --- |
| `src/analytics/legal.ts` | 唯一定义 `LEGAL_VERSION = '2026-12-01'`。 |
| `src/analytics/storage.ts` | 新键 `meetpr.legal.accepted_version`；读取必须匹配当前版本；同意时写版本。旧布尔键不再授权放行，不删除原数据。 |
| `src/analytics/PrivacyNoticeSheet.tsx` | 增加与隐私政策 URL 并列的 `TERMS_URL`；正文分别链接两份文件；同意仍调用 `confirmPrivacyNotice()`；拒绝进入说明页，可再看看或 `BackHandler.exitApp()`，无自动重弹或倒计时；保留两轨使用分析说明。 |
| `src/app/_layout.tsx` | 显示判断显式排除 demo，保持任务卡规定的 demo 不弹、不保存同意。普通启动沿用共享存储判断。 |
| `src/features/coach/profile/CoachProfileSheets.tsx` | 用户服务协议使用与隐私政策相同的可点击行、样式及打开失败处理。 |
| `src/features/auth/GlobalLoginScreen.tsx` | CN / Global 条款行同时链接用户服务协议与隐私政策；统一服务协议地址，保留原两轨隐私政策地址（Global 为 `/privacy/en`）。 |
| `src/i18n/catalog/AppShell.json` | 新文案集中在 `appShell.privacy.*`，包含简体和英文。 |
| `src/i18n/generated/zh-Hant.json` | 按 `npm run i18n:zh-Hant` 生成繁体文案。 |
| `src/analytics/__tests__/PrivacyNoticeSheet.test.tsx` | 同意持久化与真实埋点客户端闸门、拒绝/返回/退出/新启动、两份链接、三语、保留原说明和可滚动正文。 |
| `src/analytics/__tests__/root-layout.test.tsx` | 四种存储状态、同意后关闭、demo 不保存同意；真实弹窗与存储接入现有 root 测试。 |
| `src/analytics/__tests__/analytics.test.ts` | 将既有“已同意”测试夹具改为当前版本，保留周期/网络/会话/闸门断言。 |
| `src/features/coach/profile/__tests__/invite-card-state.test.ts` | 复用已有教练个人页测试文件，新增服务协议行点击断言。 |
| `src/features/auth/__tests__/global-auth-screens.test.tsx` | 增加 CN / Global 登录页协议链接与条款行断言。 |
| `src/features/training/video-upload/__tests__/attachment-trim.test.tsx` | 仅迁移“已同意”的测试夹具；不改视频业务或断言。 |
| `src/features/training/video-upload/__tests__/manager-attach.test.ts` | 同上；新版本闸门要求原诊断上报测试显式同意当前版本。 |

学员端 `src/features/profile`、settings 及 `(student)` 路由未发现隐私政策入口，按卡不新增用户协议入口。

## 先红后绿证据

### 版本同意第一轮

先添加 root-layout 测试，再运行：

```text
npx jest src/analytics/__tests__/root-layout.test.tsx --runInBand
Test Suites: 1 failed, 1 total
Tests:       4 failed, 2 passed, 6 total
```

第一次测试启动曾因 AsyncStorage import 先于 `@jest/globals` 导致 hoisted mock 的 `jest` 未初始化；仅调整测试 import 顺序后得到上面的行为红灯，之后才实装生产代码。

| 卡内测试 | 红灯摘要 | 绿灯验证 |
| --- | --- | --- |
| 1. 全新安装、同意、存版本、开闸、关闭 | 首启显示原本就通过；完整同意路径找不到 `Agree and continue`，`Received: undefined`。 | root 测试验证新键为 `2026-12-01` 且弹窗关闭；sheet 测试通过真实 `configure/track/flushNow` 验证同意前 POST 0 次、同意后 1 次，调用完成回调。 |
| 2. 仅旧键 true 的老用户 | `Expected: true; Received: false`，旧实现不显示。 | 新存储判断忽略旧布尔授权，显示同意弹窗。 |
| 3. 新键为当前版本 | `Expected: false; Received: true`，旧实现仍显示。 | 当前版本不显示。 |
| 4. 新键为其他版本 | `Expected: true; Received: false`，存在旧布尔键时旧实现直接放行。 | 旧版本重新显示。 |
| 5. 不同意、再看看、退出 | sheet 新测试找不到「不同意」，`Received: undefined`。 | 显示指定说明、可回到同意页、exitApp 调用 1 次；新键不写、回调不调用、埋点 POST 0 次；重新挂载回同意页。 |
| 6. 两份协议分别打开 | sheet 新测试 `Expected length: 2; Received length: 0`（旧组件没有正文中的两份可点链接）。 | 英文、简体、繁体均分别调用 `/terms` 与 `/privacy`。 |

版本实装后 root 第一轮为 `6 passed / 6 total`。随后先增加拒绝与双链接测试：

```text
npx jest src/analytics/__tests__/PrivacyNoticeSheet.test.tsx --runInBand
Test Suites: 1 failed, 1 total
Tests:       9 failed, 5 passed, 14 total
```

其中拒绝 1 条、三语双链接 3 条为新增行为红灯；另外 5 条是既有隐私链接测试按新正文链接的可访问标签调整后的定位失败。实装弹窗后两个文件合计 `20 passed / 20 total`。

### 入口和 demo

先新增教练行、CN / Global 登录条款链接、demo 回归，再运行：

```text
npx jest src/features/coach/profile src/features/auth src/analytics/__tests__/root-layout.test.tsx --runInBand
Test Suites: 3 failed, 3 passed, 6 total
Tests:       4 failed, 114 passed, 118 total
```

教练行与双轨用户协议链接均找不到（`Received: undefined`）；demo 的空存储启动为 `Expected: false; Received: true`。实现入口与明确 demo 排除条件后，卡内定向测试全部通过。

### 全量测试夹具兼容

首次全量：`2 failed, 224 passed, 226 total` suites；`25 failed, 2444 passed, 2469 total` tests。

失败集中在视频诊断上报的两个既有测试文件，症状为预期 `client_error` 数组，实际 `Array []`。缩小到两个文件仍稳定为 `25 failed, 74 passed, 99 total`。其“已同意”夹具仍写旧布尔键，被新版闸门正确拦住。只把这些夹具改为新键与 `LEGAL_VERSION`，独跑结果为 `2 passed` suites、`99 passed` tests。未改变视频实现、断言或未同意分支；不需要新增视频 seam 或扩大缺陷修复范围。

## 最终验收

- 定向：`npx jest src/analytics src/features/coach/profile src/features/auth --runInBand`，**8 suites / 159 tests 全部通过**。
- 全量：`npm test -- --runInBand`，**226 suites / 2469 tests 全部通过**，0 failed，耗时 62.759 s，exit 0。
- TypeScript：`npx tsc --noEmit`，**通过，0 diagnostics，exit 0**。
- lint：`npm run lint`（`expo lint`），**通过，exit 0**。
- `node scripts/generate-zh-hant.cjs --check`：通过。
- `git diff --check`：通过。
- `git grep -n "userAgreement.unavailable" -- src`：仅命中 catalog 与 generated 两处 i18n 定义，组件无引用。
- 独立只读双轴审查：Standards 无需返修项；Spec 无需返修项。Spec 补审两个视频测试夹具，确认属于版本闸门所需兼容更新。

## 限制与需收货者知悉的差异

1. 卡内全仓 `git grep -n "userAgreement.unavailable"` 的字面条件未完全满足：除 i18n 定义外，基线已有 `docs/evidence/w3-20260923/fixture-coach-privacy.xml` 的历史 UI 抓取，以及 `docs/w2-reference/coach-v2.md` 的旧复刻参照；`docs/w0-reference/i18n/CoachKit.json` 为历史文案定义。它们不是运行组件引用。为避免改写历史证据或扩大任务范围，本卡保留这些文件；不能把全仓 grep 写成“只剩 i18n”。
2. Android 视觉验收未完成。运行 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices -l`，exit 1，原始关键错误：

   ```text
   ADB server didn't ACK
   could not install *smartsocket* listener: Operation not permitted
   * failed to start daemon
   adb: failed to check server version: cannot connect to daemon
   ```

   当前沙箱不允许启动 ADB，未绕过权限，也未声称模拟器截图通过。
3. 任务卡描述 demo 原来不弹；现场 `_layout.tsx` 却独立读取持久化键，未检查 demo，空存储回归因此为红。按卡明确的目标行为增加 `isDemoMode()` 排除，demo 不写同意记录，埋点客户端原有 demo 禁用路径不改。
4. 只验证客户端打开固定 URL；官网两份文档内容和上线由另一张卡负责。

测试日志位于 `/private/tmp/legal-rn-*.log`，关键红绿输出已摘要保存在本 JOURNAL。首轮 tsc 检出参数化测试 readonly tuple 的 TS2345，改为 `satisfies` mutable tuple 类型后通过；不涉及业务逻辑。

## 返修第 1 轮（2026-11-25）

返修卡：`/Users/david/Projects/scratch/legal-company-20261124/rework-rn-1.md`，已完整阅读。首个命令在指定工作区创建并删除 `.codex-write-test`，exit 0。保留上一轮改动；未修改或删除 `android/`，未重装依赖，未 commit、push、开 PR 或操作暂存区。

### 1. 常量归位：完成

- `src/analytics/legal.ts` 集中唯一定义 `LEGAL_VERSION`、`PRIVACY_POLICY_URL`、`TERMS_URL`。
- `PrivacyNoticeSheet.tsx` 从 legal 导入并 re-export 两个 URL，保留原调用方兼容性。
- `GlobalLoginScreen.tsx`、`CoachProfileSheets.tsx` 改从 `@/analytics/legal` 引入；登录页 CN 隐私地址改用常量，Global `/privacy/en` 不变。
- `rg -n 'TERMS_URL\s*=' src` 仅命中 `src/analytics/legal.ts:3`；排除测试后的隐私地址字面搜索仅命中 `src/analytics/legal.ts:2`。
- 卡内字面 `git grep` 有两点限制：`legal.ts` 是上一轮尚未跟踪的新文件，`git grep` 不搜索它；四处既有测试保留独立的隐私 URL 字面断言或夹具。因此未声称字面命令验收通过，也未为满足 grep 改写已通过测试或操作 index。

### 2. 繁体文案核对：完成

运行 `npm run i18n:zh-Hant` 和 `node scripts/generate-zh-hant.cjs --check`，均 exit 0。逐项核对源 catalog 与生成器输出，十个键原本全部齐全，重新生成没有额外差异，不需手改 generated 或转换表。

| 键后缀（appShell.privacy） | 生成值 |
| --- | --- |
| title | 歡迎使用 MeetPR |
| intro | 請閱讀並同意《 |
| terms | 使用者服務協議 |
| and | 》和《 |
| protection | 》。我們會按照政策保護你的個人資訊。 |
| disagree | 不同意 |
| declined | 需要同意後才能使用 MeetPR |
| review | 再看看 |
| exit | 退出 |
| agree | 同意並繼續 |

`appShell.privacy.terms` 与 `coach.profile.userAgreement` 均为「使用者服務協議」，已用断言核对。

### 3. 返回后主按钮文字：未完成，未修改生产逻辑

已查看卡内正常/异常两张截图，异常图确实只有主按钮深色底、无可见文字。先在 `PrivacyNoticeSheet.test.tsx` 增加中英文参数化测试：首次渲染断言文字颜色为 `colors.ctaText`，点击「不同意」→「再看看」后再次断言同样颜色。使用真实 PrivacyNoticeSheet、AppButton 与 Text，没有模拟错误颜色。

修前运行：

```text
npx jest src/analytics/__tests__/PrivacyNoticeSheet.test.tsx --runInBand -t 'reviewing after declining'
Test Suites: 1 passed, 1 total
Tests:       14 skipped, 2 passed, 16 total
```

该结果表明指定 Jest seam 未复现原生画面缺陷；不能将它记录为红灯，也不能声称根因已确认为 React 节点复用。保留这两条 JS 样式测试，尚未给按钮加 key 或更改分支逻辑。

ADB 检查 `/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices -l` exit 1，关键原始报错：

```text
ADB server didn't ACK
could not install *smartsocket* listener: Operation not permitted
* failed to start daemon
adb: failed to check server version: cannot connect to daemon
```

已向 David 提出测试 seam 补充选项：允许增加「返回后不复用拒绝页按钮节点」断言，先红再使用独立 key 修复，原生画面交 Claude 复验；或保留本项待可用原生环境复现。截至本节记录尚未收到答复，未擅自替换验收条件。节点隔离测试即使通过，也不能单独证明原生文字恢复。

### 本轮验证与审查

- 定向：`npx jest src/analytics src/features/coach/profile src/features/auth --runInBand`，**8 suites / 161 tests 全通过**，exit 0。
- 全量：`npm test -- --runInBand`，**226 suites / 2471 tests 全通过**，0 failed，61.953 s，exit 0。
- `npx tsc --noEmit`：**通过，0 diagnostics，exit 0**。
- `npm run lint`：**通过，exit 0**。
- 繁体生成检查、`git diff --check`：通过；`.codex-write-test` 已不存在。
- 独立只读 Standards 审查：本轮增量无新增违规；颜色测试不能记作红灯。
- 独立只读 Spec 审查：第 1、2 条符合；第 3 条未完成；字面 grep 限制如上。未发现范围扩大。

日志：`/private/tmp/legal-rn-rework-color-before.log`、`legal-rn-rework-targeted.log`、`legal-rn-rework-full.log`、`legal-rn-rework-tsc.log`、`legal-rn-rework-lint.log`（后四项同目录）。本轮不是三条返修全部完成的交付。

## 返修第 2 轮（2026-11-26）

完整阅读返修卡 `/Users/david/Projects/scratch/legal-company-20261124/rework-rn-2.md`，沿用上一轮提议、经 Claude（编排方）收货时批准的节点隔离测试 seam。首个命令成功创建并删除 `.codex-write-test`，exit 0；已读仓内 CONTEXT 和本 JOURNAL 的前轮记录。

### 先红后绿

仅在现有中英文 `reviewing after declining` 用例中补充实例隔离断言：保存首次同意按钮实例，点击「不同意」后保存「再看看」实例；返回后断言同意按钮与这两个旧实例均不同，保留前后文字颜色为 `colors.ctaText` 的断言。

先修改测试、尚未加 key 时运行：

```text
npx jest src/analytics/__tests__/PrivacyNoticeSheet.test.tsx --runInBand -t 'reviewing after declining'
Test Suites: 1 failed, 1 total
Tests:       2 failed, 14 skipped, 16 total
```

exit 1；两种语言都在 `expect(returnedAgreeButton).not.toBe(reviewButton)` 失败，表明返回后的按钮确实复用了拒绝页同位置实例。随后仅给 `PrivacyNoticeSheet.tsx` 四颗 AppButton 加互不相同的 `review`、`exit`、`agree`、`disagree` key，让分支切换时重新挂载。

### 验证与审查

- `npx jest src/analytics --runInBand`：**3 suites / 50 tests 全通过**，exit 0；包含新增的两条节点隔离断言。
- `npm test -- --runInBand`：**226 suites / 2471 tests 全通过**，0 failed，62.95 s，exit 0。
- `npx tsc --noEmit`：**通过，0 diagnostics，exit 0**。
- `npm run lint`：**通过，无错误或警告输出，exit 0**。
- `git diff --check`：通过。
- 独立只读 Standards 审查：0 项问题；独立只读 Spec 审查：0 项代码问题，交付所需验证结果和 JOURNAL 已补齐于本节。
- 以本轮开工文件哈希对比：仅指定组件、它的测试及本 JOURNAL 发生变化。此前所有未提交改动保留；未改 `android/`、AppButton 或其他实现，未重装依赖，未运行 adb，未 commit、push 或开 PR。

本轮代码返修和自动化验证完成；原生文字恢复仍由 Claude 按卡在模拟器复验，Jest 节点隔离通过不等同于画面验收通过。仓内缺少 `docs/agents/issue-tracker.md`，已提示后续可调用 `$setup-matt-pocock-skills`；本轮使用明确返修卡和开工快照审查，未新建 tracker 配置。

日志位于 `/private/tmp/legal-rn-rework2/`：`red.log`、`targeted.log`、`full.log`、`tsc.log`、`lint.log`。
