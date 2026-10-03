import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { ApiError } from '@/api/client';
import { OnboardingProfileSchema, OnboardingUpsertRequestSchema, type OnboardingProfile } from '@/api/domains/onboarding';
import { calculateE1RM } from '@/domain/e1rm';

import {
  completionValidationResult,
  createEmptyOnboardingForm,
  estimateOneRepMax,
  formFromServer,
  fullOnboardingPatch,
  groupedInviteCode,
  isValidInviteCode,
  invalidFieldsForStep,
  mergeServerAndDraft,
  normalizeInviteCode,
  onboardingPatchForStep,
  type OnboardingForm,
} from '../model';

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';

function serverProfile(overrides: Partial<OnboardingProfile> = {}): OnboardingProfile {
  return {
    user_id: STUDENT_ID,
    unit_preference: 'kg',
    gender: 'male',
    birth_date: '1990-01-02',
    height_cm: '180.0',
    weight_kg: '90.0',
    training_years: 3,
    squat_stance: 'high_bar',
    deadlift_style: 'conventional',
    bench_grip: null,
    squat_1rm_kg: '180.00',
    bench_1rm_kg: '120.00',
    deadlift_1rm_kg: '220.00',
    training_days: ['mon', 'wed', 'fri'],
    gym_tier: 'commercial',
    equipment_overrides: ['barbell_dumbbell'],
    daily_life_intensity: 2,
    life_stress: 3,
    recovery_speed: 4,
    sleep_hours: 3,
    muscle_groups_to_strengthen: ['back'],
    injury_notes: null,
    injury_areas: [],
    is_competing: false,
    competition_date: null,
    target_weight_class: null,
    note_to_coach: null,
    completed_at: null,
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
    upload_attachment_ids: [],
    ...overrides,
  };
}

function completeForm(): OnboardingForm {
  return {
    ...createEmptyOnboardingForm(new Date('2026-07-20T12:00:00Z')),
    gender: 'female',
    heightCm: '170',
    weightKg: '65',
    squatStance: 'low_bar',
    deadliftStyle: 'sumo',
    squat1RMKg: '140',
    bench1RMKg: '80',
    deadlift1RMKg: '170',
    trainingDays: [2, 4, 6],
    gymTier: 'professional',
    equipmentOverrides: ['squat_bench_rack'],
    dailyLifeIntensity: 3,
    lifeStress: 2,
    recoverySpeed: 4,
    sleepHours: 4,
    isCompeting: false,
  };
}

describe('server ⊕ local draft merge', () => {
  test('fresh local data wins over the server base', () => {
    const local = completeForm();
    local.heightCm = '171';
    expect(
      mergeServerAndDraft(serverProfile(), {
        form: local,
        savedAt: '2026-07-20T09:59:01Z',
      }).heightCm,
    ).toBe('171');
  });

  test('a draft outside the 60 second skew window cannot overwrite server data', () => {
    const local = completeForm();
    local.heightCm = '171';
    expect(
      mergeServerAndDraft(serverProfile(), {
        form: local,
        savedAt: '2026-07-20T09:59:00Z',
      }).heightCm,
    ).toBe('180.0');
  });
});

describe('per-step patch semantics', () => {
  test('1RM fields are structurally present only in step 3', () => {
    const form = completeForm();
    for (const step of [1, 2, 4, 5, 6, 7] as const) {
      expect(onboardingPatchForStep(form, step)).not.toHaveProperty('squat_1rm_kg');
      expect(onboardingPatchForStep(form, step)).not.toHaveProperty('bench_1rm_kg');
      expect(onboardingPatchForStep(form, step)).not.toHaveProperty('deadlift_1rm_kg');
    }
    expect(onboardingPatchForStep(form, 3)).toMatchObject({
      squat_1rm_kg: '140',
      bench_1rm_kg: '80',
      deadlift_1rm_kg: '170',
    });
  });

  test('step 4 omits an invalid training-day selection and empty text becomes null', () => {
    const form = completeForm();
    form.trainingDays = [1];
    form.noteToCoach = '   ';
    expect(onboardingPatchForStep(form, 4)).not.toHaveProperty('training_days');
    expect(onboardingPatchForStep(form, 7).note_to_coach).toBeNull();
  });
});

test('completion 422 highlights fields and jumps to the earliest missing step', () => {
  const result = completionValidationResult(
    new ApiError('backend', 'ONBOARDING_INCOMPLETE', {
      status: 422,
      code: 'ONBOARDING_INCOMPLETE',
      envelope: {
        error: 'ONBOARDING_INCOMPLETE',
        missing_fields: ['competition_date', 'squat_stance', 'bench_1rm_kg'],
      },
    }),
  );
  expect(result?.step).toBe(2);
  expect([...result!.errorFields]).toEqual([
    'competitionDate',
    'squatStance',
    'bench1RMKg',
  ]);
});

describe('invite-code formatting', () => {
  test('normalizes and groups a valid code', () => {
    expect(normalizeInviteCode('xk7m-pq2 rvt')).toBe('XK7MPQ2RVT');
    expect(groupedInviteCode('xk7mpq2rvt')).toBe('XK7M PQ2 RVT');
    expect(isValidInviteCode('XK7M PQ2 RVT')).toBe(true);
  });

  test.each(['IO01ABCD23', 'ABCDEFGHIJ', 'XK7MPQ2RV'])('rejects %s', (code) => {
    expect(isValidInviteCode(code)).toBe(false);
  });
});


describe('Appendix B wire values', () => {
  test('fullOnboardingPatch serializes a filled form with canonical tokens', () => {
    const form: OnboardingForm = {
      ...completeForm(),
      trainingDays: [1, 3, 5],
      gymTier: 'home_with_rack',
      equipmentOverrides: ['barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_20'],
      muscleGroupsToStrengthen: ['quad', 'hamstring', 'glute'],
      injuryAreas: ['shoulder', 'lower_back', 'knee'],
    };
    expect(fullOnboardingPatch(form)).toMatchObject({
      unit_preference: 'kg',
      gym_tier: 'home_with_rack',
      training_days: ['mon', 'wed', 'fri'],
      equipment_overrides: ['barbell_dumbbell', 'squat_bench_rack', 'pullup_bar', 'db_max_20'],
      muscle_groups_to_strengthen: ['quad', 'hamstring', 'glute'],
      injury_areas: ['shoulder', 'lower_back', 'knee'],
    });
  });

  test('formFromServer restores canonical tokens and numeric training days', () => {
    expect(formFromServer(serverProfile({
      gym_tier: 'home_with_rack',
      equipment_overrides: ['barbell_dumbbell', 'db_max_20'],
      muscle_groups_to_strengthen: ['quad', 'hamstring', 'glute'],
      injury_areas: ['shoulder', 'lower_back', 'knee'],
    }))).toMatchObject({
      unitPreference: 'kg',
      gymTier: 'home_with_rack',
      trainingDays: [1, 3, 5],
      equipmentOverrides: ['barbell_dumbbell', 'db_max_20'],
      muscleGroupsToStrengthen: ['quad', 'hamstring', 'glute'],
      injuryAreas: ['shoulder', 'lower_back', 'knee'],
    });
  });
});

test('estimateOneRepMax rounds the shared RTS engine result to 0.5 kg', () => {
  const raw = calculateE1RM(100, 5, 8);
  expect(raw).not.toBeNull();
  expect(estimateOneRepMax(100, 5, 8)).toBe(Math.round(raw! * 2) / 2);
});


test('canonical profile and full patch pass the tightened API schemas', () => {
  expect(OnboardingProfileSchema.safeParse(serverProfile()).success).toBe(true);
  expect(OnboardingUpsertRequestSchema.safeParse(fullOnboardingPatch(completeForm())).success).toBe(true);
});

test.each([
  { unit_preference: 'metric' },
  { unit_preference: 'imperial' },
  { gym_tier: 'home' },
  { gym_tier: 'powerlifting' },
  { training_days: [1, 3, 5] },
  { muscle_groups_to_strengthen: ['背'] },
  { injury_areas: ['腰'] },
])('API upsert rejects obsolete tokens: %j', (invalid) => {
  expect(OnboardingUpsertRequestSchema.safeParse(invalid).success).toBe(false);
});

test('lb and every weekday round-trip through the server mapping', () => {
  const form = formFromServer(serverProfile({
    unit_preference: 'lb', training_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  }));
  expect(form.unitPreference).toBe('lb');
  expect(form.trainingDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  // The UI permits up to six selected days; exercise both ends of the wire mapping.
  form.trainingDays = [2, 4, 6, 7];
  expect(fullOnboardingPatch(form)).toMatchObject({
    unit_preference: 'lb', training_days: ['tue', 'thu', 'sat', 'sun'],
  });
});

test('the conservative estimate applies 90% before rounding the shared engine result', () => {
  const raw = calculateE1RM(100, 5, 8);
  expect(raw).not.toBeNull();
  expect(estimateOneRepMax(100, 5, 8, true)).toBe(Math.round(raw! * 0.9 * 2) / 2);
});


afterEach(() => {
  jest.useRealTimers();
});

test('legacy equipment parses, survives form mapping and is written back verbatim (iOS parity)', () => {
  const equipment = ['heavy_dumbbells', 'barbell_dumbbell'];
  const profile = OnboardingProfileSchema.parse({ ...serverProfile(), equipment_overrides: equipment });
  const form = formFromServer(profile);
  expect(form.equipmentOverrides).toEqual(equipment);
  expect(OnboardingUpsertRequestSchema.safeParse({ equipment_overrides: equipment }).success).toBe(true);
  expect(OnboardingUpsertRequestSchema.safeParse(fullOnboardingPatch(form)).success).toBe(true);
});

test('unknown profile enums parse and map to unset form values', () => {
  const profile = OnboardingProfileSchema.parse({
    ...serverProfile(), unit_preference: 'metric', gender: 'legacy', gym_tier: 'home',
    squat_stance: 'legacy', deadlift_style: 'legacy', bench_grip: 'legacy',
    training_days: ['mon', 'legacy'], muscle_groups_to_strengthen: ['back', 'legacy'],
    injury_areas: ['knee', 'legacy'],
  });
  expect(formFromServer(profile)).toMatchObject({
    unitPreference: null, gender: null, gymTier: null, squatStance: null,
    deadliftStyle: null, benchGrip: null, trainingDays: [1],
    muscleGroupsToStrengthen: ['back'], injuryAreas: ['knee'],
  });
  expect(OnboardingProfileSchema.safeParse({ ...serverProfile(), training_days: [1] }).success).toBe(false);
});

test('tomorrow birthday and yesterday competition date are invalid in steps 1 and 7', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 4, 12));
  const form = { ...completeForm(), birthDate: '2026-09-05', isCompeting: true, competitionDate: '2026-09-03' };
  expect(invalidFieldsForStep(form, 1)).toEqual(['birthDate']);
  expect(invalidFieldsForStep(form, 7)).toEqual(['competitionDate']);
  expect(invalidFieldsForStep({ ...form, birthDate: '2026-09-04' }, 1)).toEqual([]);
  expect(invalidFieldsForStep({ ...form, competitionDate: '2026-09-04' }, 7)).toEqual([]);
  expect(invalidFieldsForStep({ ...form, birthDate: '1929-12-31' }, 1)).toEqual(['birthDate']);
  expect(invalidFieldsForStep({ ...form, competitionDate: '2036-09-05' }, 7)).toEqual(['competitionDate']);
});
