import { test, expect } from '@jest/globals';
import { e1rmTotals, trendArrow, formatE1RM } from '../coach-e1rm';

test('totals use available server families and preserve an absent total', () => {
  expect(e1rmTotals({ e1rm: { squat: { value: '180.5' }, deadlift: { value: '220' } }, one_rm: { squat: '200', bench: '120', deadlift: '240' } })).toMatchObject({ latestTotal: 400.5, oneRMTotal: 560 });
  expect(e1rmTotals({ one_rm: {} })).toMatchObject({ latestTotal: null, oneRMTotal: 0, progress: 0 });
});
test('new and unknown trends never acquire a direction', () => {
  expect(['up', 'flat', 'down', 'new', 'unknown', 'future'].map(trendArrow)).toEqual(['↑', '→', '↓', null, null, null]);
});
test('display rounds to zero or one decimal place without trailing zeroes', () => {
  expect([180, 92.5, 92.56, 0, null].map((value) => formatE1RM(value, 'en-US'))).toEqual(['180', '92.5', '92.6', '0', '—']);
});
test('progress clamps to the bar bounds and zero registered total never divides by zero', () => {
  expect(e1rmTotals({ e1rm: { squat: { value: '200' } }, one_rm: { squat: '100' } }).progress).toBe(1);
  expect(e1rmTotals({ e1rm: { squat: { value: '-10' } }, one_rm: { squat: '100' } }).progress).toBe(0);
  expect(e1rmTotals({ e1rm: { squat: { value: '200' } }, one_rm: { squat: '0' } }).progress).toBe(0);
});
