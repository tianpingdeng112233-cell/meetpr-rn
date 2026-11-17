import { afterEach, expect, test } from '@jest/globals';
import { setLocaleOverride, t } from '@/i18n';
afterEach(() => setLocaleOverride(null));
test.each(['en', 'zh', 'zh-Hant'] as const)('standalone video copy does not change the existing set picker contract in %s', locale => {
  setLocaleOverride(locale);
  expect(t('chat.videoUploading')).not.toContain('{0}');
  expect(t('chat.standaloneVideoUploading', [42])).toContain('42%');
  expect(t('chat.standaloneVideoUnavailable')).not.toBe(t('chat.videoUnavailable'));
});
