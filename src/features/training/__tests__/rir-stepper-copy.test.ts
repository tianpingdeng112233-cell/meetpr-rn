import { afterEach, expect, test } from '@jest/globals';

import { setLocaleOverride } from '@/i18n';
import { rirStepperCopy } from '../effort-explainer';

afterEach(() => setLocaleOverride(null));

test.each([
  ['', null, null],
  ['0', '做不动了', "Couldn't do another rep"],
  ['1', '还剩 1 次', '1 rep left'],
  ['2', '还剩 2 次', '2 reps left'],
  ['9', '还剩 9 次', '9 reps left'],
] as [string, string | null, string | null][])('RIR %s has exact hints including empty and singular', (value, zh, en) => {
  setLocaleOverride('zh');
  expect(rirStepperCopy(value)).toBe(zh);
  setLocaleOverride('en');
  expect(rirStepperCopy(value)).toBe(en);
});
