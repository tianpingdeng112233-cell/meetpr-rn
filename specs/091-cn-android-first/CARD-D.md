# 卡 D · 091 CN 轨「使用数据说明」文案

先读仓根 `CONTEXT.md` 与 `AGENTS.md`。

- 来源：David 2026-10-10 看上机截图后拍「A」——CN 轨首次打开的「使用数据说明」里「存放在我们位于美国的 DigitalOcean 自有服务器上」不成立（CN 轨数据在阿里云），随 091 这一波改掉。
- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-091`，分支 `feat/091-cn-android-first`。只在这棵树里写；不 commit、不 push、不开 PR。`node_modules` 是软链，不要重装依赖。

## 要做的事

`src/analytics/PrivacyNoticeSheet.tsx` 的正文现在固定用 `appShell.privacy.analytics.body`。改为按构建轨取文案：

- `global` 轨：仍用 `appShell.privacy.analytics.body`，中英文一字不改。
- `china` 轨：用新键（放 `src/i18n/catalog/RnExtras.json`，命名跟现有风格，例如 `appShell.privacy.analytics.bodyChina`）。新键的内容＝现有正文逐字照抄，只替换存放地点那半句：
  - zh：把「存放在我们位于美国的 DigitalOcean 自有服务器上」换成「存放在我们位于中国大陆的阿里云服务器上」。
  - en：把 `is stored on our own DigitalOcean infrastructure in the United States` 换成 `is stored on our Alibaba Cloud servers in mainland China`。
  其余句子（收集什么、不接第三方统计、保留与删除）一个字都不动。
- `china` 轨该面板里「隐私政策」链接指向 `https://meetpr.app/privacy`（中文页）；`global` 轨保持现状。若该链接现在是按语言而不是写死的，说明现状，不要改 `global` 的行为。

## 不做

不改面板的布局、按钮、出现时机；不改 `AppShell.json` 里现有键的值；不碰登录注册代码。

## 测试 seam（先红后绿）

`src/analytics/__tests__/PrivacyNoticeSheet.test.tsx`（已有）：`china` 轨渲染的正文是新键、不含 `DigitalOcean` 与「美国」；`global` 轨渲染的正文与今天逐字一致。`src/i18n/__tests__/usage-notice.test.ts` 现有断言不改、保持通过。

## 自检

`npx tsc --noEmit`、`npm run lint`、定向测试（上面两个文件），结果如实写进 `docs/CODEX-JOURNAL.md`。不要在工作树里留临时日志。返回改动文件列表与自检结果行。
