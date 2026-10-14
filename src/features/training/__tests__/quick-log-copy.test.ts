import { afterEach, expect, test } from '@jest/globals';
import { setLocaleOverride } from '@/i18n';
import { training22 as copy } from '../build22-strings';

afterEach(() => setLocaleOverride(null));

test('English quick-log copy is unchanged from the approved build 22 Global literals', () => {
  setLocaleOverride('en');
  expect([copy.entry, copy.title('W1D2'), copy.back, copy.date, copy.today, copy.done, copy.next, copy.sync(3), copy.auto,
    copy.weight, copy.reps, copy.include, copy.skipped, copy.restore, copy.count(1, 3), copy.summary(2, 7), copy.empty,
    copy.hold, copy.saving, copy.partial(2, 3), copy.completionFailed, copy.invalid, copy.locked, copy.saved('W1D2'),
    copy.previousMonth, copy.nextMonth, copy.includeSet(2), copy.cell('Squat', 2, 'reps', '5'), copy.padContext(2, 'weight')]).toEqual([
    'Already trained? Log this session', 'Quick log · W1D2', 'Back', 'Training date', 'Today', 'Done', 'Next cell →',
    'Apply to all 3 sets', 'Auto', 'Weight', 'Reps', 'Log', 'Not performed', 'Restore sets', '1 / 3 logged',
    'Log 2 exercises · 7 sets', 'Include at least one exercise', 'Hold · Log and complete session', 'Saving session…',
    '3 sets could not be saved. 2 saved sets are safe. Please retry.',
    'Your sets are saved, but the session could not be completed. Please retry.',
    'Check the training date, weights, repetitions and RPE before saving.',
    'Saved sets are safe. Retry this submission, or go back to edit the session.', 'W1D2 logged',
    'Previous month', 'Next month', 'Log set 2', 'Squat, set 2, reps, 5', '2 · weight',
  ]);
});

test('Chinese quick-log copy follows the iOS quickLog strings and never falls back to English', () => {
  setLocaleOverride('zh');
  expect(copy.entry).toBe('练完了?补记今天');
  expect(copy.title('W1D2')).toBe('补记 · W1D2');
  expect(copy.hold).toBe('长按 · 补记并完成今日训练');
  expect(copy.summary(2, 7)).toBe('将记录 2 个动作 · 7 组');
  expect(copy.partial(2, 3)).toBe('有 3 组没有保存,已保存的 2 组不会丢失,请重试');
  expect(copy.padContext(2, 'weight')).toBe('第 2 组 · 重量');
  const all = [copy.entry, copy.back, copy.date, copy.today, copy.done, copy.next, copy.sync(3), copy.auto, copy.weight,
    copy.reps, copy.include, copy.skipped, copy.restore, copy.count(1, 3), copy.empty, copy.saving, copy.completionFailed,
    copy.invalid, copy.locked, copy.saved('W1D2'), copy.previousMonth, copy.nextMonth, copy.includeSet(2), copy.cell('深蹲', 2, 'reps', '5')];
  for (const text of all) expect(text.replace(/RPE/g, '')).not.toMatch(/[A-Za-z]{3,}/);
});
