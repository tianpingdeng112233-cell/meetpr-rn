import { afterEach, expect, test } from '@jest/globals';

import { type Locale, setLocaleOverride, t } from '..';

afterEach(() => setLocaleOverride(null));

// David's approved Global copy: USAGE-NOTICE-COPY-CARD.md, 2026-10-03.
test.each([
  ['en', 'To improve the training experience, MeetPR collects product interactions, an anonymous device identifier, and feedback text you choose to provide. This data is used only for product functionality and is stored on our own DigitalOcean infrastructure in the United States. It is not shared with third-party analytics SDKs and is not used for tracking or advertising. We keep it while your account exists; if you delete your account, it is unlinked from you and becomes anonymous records that can no longer identify you. Uninstalling clears the anonymous installation identifier. You can delete your account or contact us to request deletion.'],
  ['zh', '为改进训练流程，MeetPR 会收集产品交互、匿名设备标识，以及你主动填写的反馈文本。数据仅用于产品功能，存放在我们位于美国的 DigitalOcean 自有服务器上，不接入第三方统计 SDK，也不用于追踪或广告。账号存续期间我们会保留这些数据；删除账号后，它们会与你断开关联，成为无法识别你的匿名记录。卸载会清除匿名安装标识，你可通过删除账号或联系我们请求删除。'],
] satisfies [Locale, string][])('usage notice uses the approved Global copy verbatim in %s', (locale, expected) => {
  setLocaleOverride(locale);
  const body = t('appShell.privacy.analytics.body');

  expect(body).not.toMatch(/90|Alibaba|阿里云/);
  expect(body).toContain('DigitalOcean');
  expect(body).toBe(expected);
});
