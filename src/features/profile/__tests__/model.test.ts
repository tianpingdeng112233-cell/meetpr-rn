import { OnboardingProfileSchema } from '@/api/domains/onboarding';
import { expect, test, beforeEach, afterEach } from '@jest/globals';
import { setLocaleOverride, t } from '@/i18n';
import { createEmptyOnboardingForm, type OnboardingStep } from '@/features/onboarding/model';
import { profileInitials, profileIdentity, profileCoachName, profileMenuValues, profileRowValues, injuryChips, injurySummary, oneRMValues, profilePatch, profileSteps, type ProfileSection, readinessSummary, recoverySummary, rowValue } from '../model';

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
});

const editedForm = {
  ...createEmptyOnboardingForm(), unitPreference: 'lb' as const, gender: 'female' as const,
  birthDate: '1995-06-15', heightCm: '180', weightKg: '80',
  squat1RMKg: '200', bench1RMKg: '150', deadlift1RMKg: '250',
  trainingYears: 3, squatStance: 'high_bar' as const, deadliftStyle: 'conventional' as const, benchGrip: 'standard' as const,
  trainingDays: [1, 3], gymTier: 'commercial' as const, equipmentOverrides: ['barbell_dumbbell'],
  dailyLifeIntensity: 3, lifeStress: 2, recoverySpeed: 4, sleepHours: 8, muscleGroupsToStrengthen: ['quad'] as const,
  injuryNotes: 'Existing injury', injuryAreas: ['knee'] as const,
  isCompeting: true, competitionDate: '2027-01-01', targetWeightClass: 'IPF · 83 kg', noteToCoach: 'Meet goal\nKeep it steady',
};

test.each<[ProfileSection, object]>([
  ['weight', { weight_kg: '80.00' }],
  ['note', { note_to_coach: 'Meet goal\nKeep it steady' }],
  ['basics', { unit_preference: 'lb', gender: 'female', birth_date: '1995-06-15', height_cm: '180', weight_kg: '80.00' }],
  ['background', { training_years: 3, squat_stance: 'high_bar', deadlift_style: 'conventional', bench_grip: 'standard' }],
  ['environment', { training_days: ['mon', 'wed'], gym_tier: 'commercial', equipment_overrides: ['barbell_dumbbell'] }],
  ['recovery', { daily_life_intensity: 3, life_stress: 2, recovery_speed: 4, sleep_hours: 8 }],
  ['muscles', { muscle_groups_to_strengthen: ['quad'] }],
  ['injuries', { injury_notes: 'Existing injury', injury_areas: ['knee'] }],
  ['competition', { is_competing: true, competition_date: '2027-01-01', target_weight_class: 'IPF · 83 kg' }],
])('%s submits only its own fields and never any 1RM', (section, expected) => {
  const patch = profilePatch(profileSteps[section], { ...editedForm, injuryAreas: [...editedForm.injuryAreas], muscleGroupsToStrengthen: [...editedForm.muscleGroupsToStrengthen] }, section);
  expect(patch).toStrictEqual(expected);
  for (const field of ['squat_1rm_kg', 'bench_1rm_kg', 'deadlift_1rm_kg']) expect(patch).not.toHaveProperty(field);
});


test('profile rows preserve legacy meet text, separate the first note line, and pad weight', () => {
  const profile = OnboardingProfileSchema.parse({ ...Object.fromEntries(Object.keys(OnboardingProfileSchema.shape).map(key => [key, null])), upload_attachment_ids: [], user_id: '10000000-0000-4000-8000-000000000000',
    created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', height_cm: '178', weight_kg: '83.5',
    is_competing: true, competition_date: '2027-01-01', target_weight_class: '83kg', note_to_coach: 'First line\nSecond line' });
  expect(profileRowValues(profile)).toMatchObject({ basics: '178 cm · 83.50 kg', competition: '2027-01-01 · 83kg', note: 'First line' });
  expect(profileRowValues({ ...profile, competition_date: null }).competition).toBe(rowValue(null));
});


test('profile initials cover words, CJK, email and empty identity', () => {
  for (const [value, expected] of [['David Shi', 'DS'], ['student', 'S'], ['王小明', '王'], ['さくら', 'さ'], ['김 민수', '김'], ['student@example.test', 'S'], ['', ''], ['   ', '']]) {
    expect(profileInitials(value)).toBe(expected);
  }
});

test('profile identity falls back from supplied name to email to phone without reading login name', () => {
  expect(profileIdentity({ email: 'student@example.test', phone: 'placeholder' }, 'Student Name')).toBe('Student Name');
  expect(profileIdentity({ email: 'student@example.test', phone: 'placeholder' })).toBe('student@example.test');
  expect(profileIdentity({ email: ' ', phone: 'placeholder' })).toBe('placeholder');
  expect(profileIdentity(null)).toBe('');
});
test('coach identity requires an accepted binding and a nonblank name', () => {
  expect(profileCoachName(null)).toBe('');
  expect(profileCoachName({ status: 'pending', coach_display_name: 'Coach' })).toBe('');
  expect(profileCoachName({ status: 'accepted', coach_display_name: '  ' })).toBe('');
  expect(profileCoachName({ status: 'accepted', coach_display_name: 'Coach' })).toBe('Coach');
});
test('profile menu preserves filled legacy values and supplies every empty fallback', () => {
  setLocaleOverride('en');
  const profile = OnboardingProfileSchema.parse({ ...Object.fromEntries(Object.keys(OnboardingProfileSchema.shape).map(key => [key, null])), upload_attachment_ids: [], user_id: '10000000-0000-4000-8000-000000000000', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' });
  expect(profileMenuValues(profile)).toEqual({ about: '—', health: 'No injuries', competition: '—', note: '—', settings: '' });
  expect(profileMenuValues({ ...profile, height_cm: '178', weight_kg: '83.5', injury_areas: ['knee'], is_competing: true, competition_date: '2026-11-01', target_weight_class: 'IPF · 83 kg', note_to_coach: ' Goal ' })).toEqual({ about: '178 cm · 83.50 kg', health: '1 injury', competition: '2026-11-01 · IPF · 83 kg', note: 'Added', settings: '' });
  expect(profileMenuValues({ ...profile, height_cm: '178', note_to_coach: '  ' }).about).toBe('178 cm');
  expect(profileMenuValues({ ...profile, weight_kg: '83.5' }).about).toBe('83.50 kg');
  expect(profileMenuValues({ ...profile, injury_areas: ['other'] }).health).toBe('Other injury');
  expect(profileMenuValues({ ...profile, injury_areas: ['knee', 'shoulder'] }).health).toBe('2 injuries');
});


test.each(['en', 'zh'] as const)('home uses shorter empty injury copy only in %s', locale => {
  setLocaleOverride(locale);
  const profile = OnboardingProfileSchema.parse({ ...Object.fromEntries(Object.keys(OnboardingProfileSchema.shape).map(key => [key, null])), upload_attachment_ids: [], user_id: '10000000-0000-4000-8000-000000000000', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' });
  expect(profileMenuValues(profile).health).toBe(locale === 'en' ? 'No injuries' : '无伤病');
  expect(injuryChips(null)).toEqual([t('student.myProfileV3Presentation.copy007')]);
  expect(injurySummary(null)).toBe(t('student.myProfileV3Presentation.copy007'));
});

test.each(['+0 000 000 0000', '123456', '☎ +0', '😀', ''])('nonletter identity %s has no initials', identity => {
  expect(profileInitials(identity)).toBe('');
});
