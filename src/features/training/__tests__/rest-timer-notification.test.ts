import { afterEach, expect, jest, test } from '@jest/globals';
import { setLocaleOverride } from '@/i18n';
import { restTimerNotifications } from '../rest-timer-notification';

afterEach(() => {
  setLocaleOverride(null);
  jest.restoreAllMocks();
});

test.each<['en' | 'zh', string]>([
  ['en', 'Rest {0}'],
  ['zh', '休息 {0}'],
])('passes the localized countdown title template to native (%s)', (locale, titleTemplate) => {
  const native = { show: jest.fn() };
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule').mockReturnValue(native);
  setLocaleOverride(locale);

  restTimerNotifications.show(121000, 1000, 'Competition Deadlift');

  expect(native.show).toHaveBeenCalledWith(121000, 1000, 'Competition Deadlift', expect.objectContaining({ titleTemplate }));
});
