import { beforeEach, expect, jest, test } from '@jest/globals';
import { getLocales } from 'expo-localization';

import student from '../../../docs/w0-reference/i18n/StudentKit.json';
import { getLocale, setLocaleOverride, t } from '..';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-US' }]),
}));

beforeEach(() => {
  setLocaleOverride(null);
  jest.mocked(getLocales).mockReturnValue([{ languageTag: 'en-US' }] as unknown as ReturnType<typeof getLocales>);
});

test('uses the device language, with English for non-Chinese locales', () => {
  expect(t('student.bindGateView.copy001')).toBe('Checking connection status');
  for (const languageTag of ['zh-CN', 'zh-Hant-TW']) {
    jest.mocked(getLocales).mockReturnValue([{ languageTag }] as unknown as ReturnType<typeof getLocales>);
    expect(getLocale()).toBe('zh');
    expect(t('student.bindGateView.copy001')).toBe('正在检查绑定状态');
  }
  jest.mocked(getLocales).mockReturnValue([{ languageTag: 'fr-FR' }] as unknown as ReturnType<typeof getLocales>);
  expect(getLocale()).toBe('en');
});

test('supports debug overrides and returning to the device language', () => {
  setLocaleOverride('zh');
  expect(t('student.bindGateView.copy001')).toBe('正在检查绑定状态');
  setLocaleOverride(null);
  expect(getLocale()).toBe('en');
});

test('formats positional placeholders using the canonical pending-bind copy', () => {
  expect(t('student.pendingBindViewModel.copy002', [3, 2])).toBe(
    student['student.pendingBindViewModel.copy002'].en.replace('{0}', '3').replace('{1}', '2'),
  );
});

test('substitutes object and positional placeholders without reprocessing parameter text', () => {
  expect(t('student.filter.accessibilityLabel %@', ['Squat'])).toBe('Filter by exercise, currently Squat');
  expect(t('student.pendingBindViewModel.copy002', ['%@', '{0}'])).toBe('%@d {0}h');
  expect(t('coach.inbox.pendingVideoPreview %lld %@', [2, 'Squat'])).toBe('2 videos awaiting feedback · Squat');
});

test('selects English one/other and the Chinese plural copy', () => {
  expect(t('coach.bind.card.age %lld', [1])).toBe('1 year old');
  expect(t('coach.bind.card.age %lld', [2])).toBe('2 years old');
  expect(t('coach.bind.card.age %lld', [0])).toBe('0 years old');
  setLocaleOverride('zh');
  expect(t('coach.bind.card.age %lld', [1])).toBe('1 岁');
  expect(t('coach.bind.card.age %lld', [2])).toBe('2 岁');
});

test('returns an unknown runtime key without throwing, while rejecting it at compile time', () => {
  // @ts-expect-error Unknown catalog keys are rejected by TypeScript.
  expect(t('missing.key')).toBe('missing.key');
});
