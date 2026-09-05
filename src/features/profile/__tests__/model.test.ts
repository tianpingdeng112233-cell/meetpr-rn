import { expect, test, beforeEach, afterEach } from '@jest/globals';
import { setLocaleOverride, t } from '@/i18n';
import { createEmptyOnboardingForm, type OnboardingStep } from '@/features/onboarding/model';
import { injuryChips, injurySummary, oneRMValues, profilePatch, readinessSummary, recoverySummary, rowValue } from '../model';

beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));

test('injury chips name each area and preserve other and empty fallbacks', () => {
  expect(injuryChips(['shoulder', 'knee', 'other'])).toEqual([
    t('student.myProfileV3Presentation.copy009', [t('student.onboardingLabels.copy029')]),
    t('student.myProfileV3Presentation.copy009', [t('student.onboardingLabels.copy034')]),
    t('student.myProfileV3Presentation.copy008'),
  ]);
  expect(injuryChips([])).toEqual([t('student.myProfileV3Presentation.copy007')]);
  expect(injuryChips(null)).toEqual([t('student.myProfileV3Presentation.copy007')]);
});

test('readiness summarizes sleep, mood and stress out of five', () => {
  expect(readinessSummary({ sleep_quality: 4, mood: 3, stress: 2 })).toEqual([t('student.myProfileV3Presentation.copy001', [4]), t('student.myProfileV3Presentation.copy002', [3]), t('student.myProfileV3Presentation.copy003', [2])]);
});
test('assessment summary and missing row values use canonical copy', () => {
  expect(recoverySummary({ daily_life_intensity: 3, life_stress: 2, recovery_speed: 4 })).toEqual([t('student.onboardingLabels.copy050') + t('student.myProfileV3Presentation.copy004'), t('student.onboardingLabels.copy049') + t('student.myProfileV3Presentation.copy005'), t('student.onboardingLabels.copy057') + t('student.myProfileV3Presentation.copy006')]);
  expect(rowValue([])).toBe(t('student.myProfileV3Presentation.copy010'));
  expect(rowValue(null)).toBe(t('student.myProfileV3Presentation.copy010'));
  expect(rowValue(['A', 'B'])).toBe('A · B');
});
test('injuries have none, counted and other states', () => {
  expect(injurySummary([])).toBe(t('student.myProfileV3Presentation.copy007'));
  expect(injurySummary(['shoulder', 'knee'])).toBe(t('student.myProfileV3Presentation.copy009', [2]));
  expect(injurySummary(['other'])).toBe(t('student.myProfileV3Presentation.copy008'));
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
