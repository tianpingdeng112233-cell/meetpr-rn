# 任务卡（安卓）：使用数据告知文案改为 Global 轨事实，正文保证读得全

开工先读仓内 CONTEXT.md（如存在）、AGENTS.md 与本卡。

- 级别：T1。基线 `integration/land-main-20261003@9636521`（即将落 main 的整栈），分支 `fix/usage-notice-copy`。iOS 同步卡在 meetpr 仓 `specs/084-walkthrough-polish/CARD-USAGE-NOTICE-ios.md`。
- 来源：走查 D-32。David 2026-10-03 定稿。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。

## 背景事实（已核实）

- 首次启动的"About usage data"弹层（`src/analytics/PrivacyNoticeSheet.tsx`，文案键 `appShell.privacy.analytics.body`，在 `src/i18n/catalog/AppShell.json`）照抄了 iOS CN 轨文案：写"存放在中国大陆自建阿里云、不出境、保留 90 天"。本仓只做 Global 轨，后端在美国（DigitalOcean 纽约）；后端也没有 90 天到期清理，实际是账号存续期间保留、删号后与账号断开关联成为匿名记录。

## 要做的

1. 把 `appShell.privacy.analytics.body` 的中英文值换成下面的定稿原文，逐字照录，不要润色。标题与其他键不动。

   English：
   > To improve the training experience, MeetPR collects product interactions, an anonymous device identifier, and feedback text you choose to provide. This data is used only for product functionality and is stored on our own DigitalOcean infrastructure in the United States. It is not shared with third-party analytics SDKs and is not used for tracking or advertising. We keep it while your account exists; if you delete your account, it is unlinked from you and becomes anonymous records that can no longer identify you. Uninstalling clears the anonymous installation identifier. You can delete your account or contact us to request deletion.

   简体中文：
   > 为改进训练流程，MeetPR 会收集产品交互、匿名设备标识，以及你主动填写的反馈文本。数据仅用于产品功能，存放在我们位于美国的 DigitalOcean 自有服务器上，不接入第三方统计 SDK，也不用于追踪或广告。账号存续期间我们会保留这些数据；删除账号后，它们会与你断开关联，成为无法识别你的匿名记录。卸载会清除匿名安装标识，你可通过删除账号或联系我们请求删除。

2. 仓内若有测试把 RN 文案目录与 iOS 参照（`docs/w0-reference/i18n/`）逐键比对，这个键是**有意的差异**：按仓内既有的"授权差异"登记方式处理（参照 "Meetday" 文案的做法），不要改参照包，也不要删比对测试。同时在 `PARITY.md` 登记这条差异（一行）。
3. 正文完整可读：`PrivacyNoticeSheet` 现在没有滚动容器。确认在 360×640dp、系统字体 1.3× 下正文、"Privacy Policy" 链接与 "Got it" 按钮都完整可见可点；放不下时让正文滚动、按钮固定在底部。默认尺寸下外观保持不变。
4. 仓内其他位置若引用了旧的"90 天 / 90 days"使用数据表述，列出来并同步；没有就写明没有。

## 测试 seam（先红后绿）

- `src/i18n/__tests__/`：该键中英文不含 "90"、"Alibaba"、"阿里云"，且含 "DigitalOcean"。
- `PrivacyNoticeSheet` 组件测试（没有就在 `src/analytics/__tests__/` 新增）：正文位于可滚动容器内，确认按钮在滚动容器之外。

## 验收（Opus 收货，实装方不得自定范围）

1. 模拟器全新安装 fixture 包：首启弹层显示英文定稿，最后一句 "…contact us to request deletion." 可读，"Got it" 点后进入登录页，再次启动不再弹。
2. 360×640dp + 字体 1.3×：无截断，按钮可点。
3. `npm test` 全量、`npm run lint`、`npx tsc --noEmit` 通过。

## Out of Scope

CN 轨文案（本仓不做 CN 轨）、官网隐私政策、后端、登录页。
