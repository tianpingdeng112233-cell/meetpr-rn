import { afterEach, expect, jest, test } from '@jest/globals';
import { setLocaleOverride } from '@/i18n';
import * as restRules from '@/features/settings/rest-timer';
import { restExplanationRows } from '../rest-explanation';
afterEach(() => { jest.restoreAllMocks(); setLocaleOverride(null); });
test('explanation formats the three default RPE rules and follows their source', () => {
  setLocaleOverride('en');
  expect(restExplanationRows()).toEqual([
    { label: 'RPE below 7', duration: '2 min' },
    { label: 'RPE 7 to below 9', duration: '3 min' },
    { label: 'RPE 9 or above', duration: '4 min' },
  ]);
  jest.spyOn(restRules, 'restSecondsForRPE').mockReturnValue(150);
  expect(restExplanationRows().map(row => row.duration)).toEqual(['2.5 min', '2.5 min', '2.5 min']);
  setLocaleOverride('zh');
  expect(restExplanationRows()[0]).toEqual({ label: 'RPE 低于 7', duration: '2.5 分钟' });
});
