import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { setLocaleOverride, t } from '@/i18n';
import { decimalText, oneRMTrio, relativeText, waitingText } from '../formatting';
beforeAll(() => setLocaleOverride('en'));
afterAll(() => setLocaleOverride());
test('coach copy renders named values and the total-based training-days plural', () => {
  expect(t('coach.bind.accept.confirmQuestion', ['Amy'])).toBe('Accept Amy as your student?');
  expect(t('coach.applicationProfile.title', ['Amy'])).toBe('Amy · Application Profile');
  expect(t('coach.today.trainingDaysCompleted %lld %lld', [1, 3])).toBe('1 / 3 training days completed');
  expect(t('coach.today.trainingDaysCompleted %lld %lld', [1, 1])).toBe('1 / 1 training day completed');
});
test('relative and waiting durations clamp future times and retain hours plus minutes', () => {
  const then = new Date(2026, 8, 9, 10);
  const now = new Date(2026, 8, 9, 11, 30);
  expect(relativeText(then, now)).toBe('1 hour ago');
  expect(waitingText(then, now)).toBe('Waiting 1 hr 30 min');
  expect(waitingText(now, then)).toBe('Waiting 1 minute');
  expect(relativeText(now, then)).toBe('1 minute ago');
  expect(decimalText('180.00')).toBe('180');
  expect(decimalText('92.50')).toBe('92.5');
  expect(oneRMTrio('180.00', null, '220.50')).toBe('S:180　B:—　D:220.5');
});
