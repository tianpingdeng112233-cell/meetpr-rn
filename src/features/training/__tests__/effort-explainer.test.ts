import { afterEach, expect, test } from '@jest/globals';

import { setLocaleOverride, t, type Locale } from '@/i18n';
import { effortExplainerFor } from '../effort-explainer';

afterEach(() => setLocaleOverride(null));

test.each([
  ['zh', 'RPE · 这组有多吃力', '满分 10，越高越吃力', [
    ['10', '做不动了'], ['9.5', '做不了下一次，但能再加点重'], ['9', '还剩 1 次'],
    ['8.5', '还剩 1–2 次'], ['8', '还剩 2 次'], ['7.5', '还剩 2–3 次'], ['7', '还剩 3 次'], ['5–6', '还剩 4–6 次'],
  ], '估不准没关系，选最接近的就行'],
  ['en', 'RPE · How hard was that set', 'Out of 10. Higher means harder.', [
    ['10', "Couldn't do another rep"], ['9.5', 'No more reps, but could add a little weight'], ['9', '1 rep left'],
    ['8.5', '1–2 reps left'], ['8', '2 reps left'], ['7.5', '2–3 reps left'], ['7', '3 reps left'], ['5–6', '4–6 reps left'],
  ], 'Not sure? Pick the closest one.'],
] as [Locale, string, string, [string, string][], string][])('RPE card has exactly the approved %s copy and eight rows', (locale, title, subtitle, rows, footer) => {
  setLocaleOverride(locale);
  const card = effortExplainerFor('rpe');
  expect(t(card.title)).toBe(title);
  expect(t(card.subtitle)).toBe(subtitle);
  expect(card.rows.map(row => [row.value, t(row.copy)])).toEqual(rows);
  expect(t(card.footer)).toBe(footer);
  expect(card.example).toBeNull();
});

test.each([
  ['zh', 'RIR · 还能再做几次', '这组做完，同样的重量还能再做几次，就填几', '例：做了 6 次，觉得最多能做 8 次 → 填 2', '一次也做不动了就填 0'],
  ['en', 'RIR · Reps left in the tank', 'After the set, how many more reps could you do with the same weight? Enter that number.', 'Example: you did 6 and could have done 8 → enter 2', "Couldn't do another rep? Enter 0."],
] as [Locale, string, string, string, string][])('RIR card has the approved %s copy without an RPE conversion', (locale, title, subtitle, example, footer) => {
  setLocaleOverride(locale);
  const card = effortExplainerFor('rir');
  expect(t(card.title)).toBe(title);
  expect(t(card.subtitle)).toBe(subtitle);
  expect(card.rows).toEqual([]);
  expect(`${t(card.example!.before)} → ${t(card.example!.answer)}`).toBe(example);
  expect(t(card.footer)).toBe(footer);
});
