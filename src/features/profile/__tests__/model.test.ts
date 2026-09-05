import { expect, test, beforeEach, afterEach } from '@jest/globals';
import { setLocaleOverride } from '@/i18n';
import { createEmptyOnboardingForm, type OnboardingStep } from '@/features/onboarding/model';
import { injurySummary, oneRMValues, profilePatch, readinessSummary, recoverySummary, rowValue } from '../model';

beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));

test('readiness summarizes sleep, mood and stress out of five', () => {
  expect(readinessSummary({ sleep_quality: 4, mood: 3, stress: 2 })).toEqual(['睡眠 4/5', '状态 3/5', '压力 2/5']);
});
test('assessment summary and missing row values use canonical copy', () => {
  expect(recoverySummary({ daily_life_intensity: 3, life_stress: 2, recovery_speed: 4 })).toEqual(['中等强度', '较低压力', '约1天恢复']);
  expect(rowValue([])).toBe('未填写');
  expect(rowValue(null)).toBe('未填写');
  expect(rowValue(['A', 'B'])).toBe('A · B');
});
test('injuries have none, counted and other states', () => {
  expect(injurySummary([])).toBe('无伤病记录');
  expect(injurySummary(['shoulder', 'knee'])).toBe('2部伤病');
  expect(injurySummary(['other'])).toBe('其他伤病');
});
test('1RM total requires all three lifts and missing values display an em dash', () => {
  expect(oneRMValues({ squat_1rm_kg: '150.5', bench_1rm_kg: '100', deadlift_1rm_kg: '200' })).toEqual({ lifts: ['150.5', '100', '200'], total: '450.5' });
  expect(oneRMValues({ squat_1rm_kg: null, bench_1rm_kg: '100', deadlift_1rm_kg: null })).toEqual({ lifts: ['—', '100', '—'], total: '—' });
});
test.each<OnboardingStep>([1, 2, 3, 4, 5, 6, 7])('profilePatch step %s cannot transmit any 1RM field', (step) => {
  const patch = profilePatch(step, { ...createEmptyOnboardingForm(), squat1RMKg: '200', bench1RMKg: '150', deadlift1RMKg: '250' });
  for (const field of ['squat_1rm_kg', 'bench_1rm_kg', 'deadlift_1rm_kg']) expect(patch).not.toHaveProperty(field);
});
test('row patches cannot clear fields belonging to another step7 section', () => {
  const form = { ...createEmptyOnboardingForm(), injuryNotes: 'knee', isCompeting: true, competitionDate: '2027-01-01' };
  expect(profilePatch(7, form, 'injuries')).toEqual({ injury_notes: 'knee', injury_areas: null });
  expect(profilePatch(1, { ...form, heightCm: '180', weightKg: '80' }, 'basics')).toEqual({ height_cm: '180', weight_kg: '80' });
});
