import { t } from '@/i18n';

import type {
  OnboardingProfile,
  OnboardingUpsertInput,
} from '@/api/domains/onboarding';
import { ApiError } from '@/api/client';
import { calculateE1RM } from '@/domain/e1rm';

import { INJURY_AREAS, MUSCLE_GROUPS, TRAINING_DAYS, type GymTier, type InjuryArea, type MuscleGroup } from './catalog';

export const ONBOARDING_STEP_COUNT = 7 as const;

export const getOnboardingStepTitles = () => [
  t('student.onboardingWizardView.copy004'),
  t('student.onboardingWizardView.copy005'),
  t('student.onboardingWizardView.copy006'),
  t('student.onboardingWizardView.copy007'),
  t('student.onboardingWizardView.copy008'),
  t('student.onboardingWizardView.copy009'),
  t('student.onboardingWizardView.copy010'),
] as const;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type OnboardingForm = {
  unitPreference: 'kg' | 'lb' | null;
  gender: 'male' | 'female' | 'other' | null;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  trainingYears: number;
  squatStance: 'high_bar' | 'low_bar' | null;
  deadliftStyle: 'conventional' | 'sumo' | 'both' | null;
  benchGrip: 'narrow' | 'standard' | 'wide' | null;
  squat1RMKg: string;
  bench1RMKg: string;
  deadlift1RMKg: string;
  trainingDays: number[];
  gymTier: GymTier | null;
  equipmentOverrides: string[];
  dailyLifeIntensity: number | null;
  lifeStress: number | null;
  recoverySpeed: number | null;
  sleepHours: number | null;
  muscleGroupsToStrengthen: MuscleGroup[];
  injuryNotes: string;
  injuryAreas: InjuryArea[];
  isCompeting: boolean | null;
  competitionDate: string;
  targetWeightClass: string;
  noteToCoach: string;
};

export type OnboardingDraft = {
  form: OnboardingForm;
  savedAt: string;
};

export type InviteStash = {
  code: string;
  displayName: string;
  savedAt: string;
};

export const STEP_FIELDS: Record<OnboardingStep, readonly (keyof OnboardingForm)[]> = {
  1: ['unitPreference', 'gender', 'birthDate', 'heightCm', 'weightKg'],
  2: ['trainingYears', 'squatStance', 'deadliftStyle', 'benchGrip'],
  3: ['squat1RMKg', 'bench1RMKg', 'deadlift1RMKg'],
  4: ['trainingDays', 'gymTier', 'equipmentOverrides'],
  5: ['dailyLifeIntensity', 'lifeStress', 'recoverySpeed', 'sleepHours'],
  6: ['muscleGroupsToStrengthen'],
  7: [
    'injuryNotes',
    'injuryAreas',
    'isCompeting',
    'competitionDate',
    'targetWeightClass',
    'noteToCoach',
  ],
};

const MISSING_FIELD_STEPS: Record<string, OnboardingStep> = {
  unit_preference: 1,
  gender: 1,
  birth_date: 1,
  height_cm: 1,
  weight_kg: 1,
  training_years: 2,
  squat_stance: 2,
  deadlift_style: 2,
  bench_grip: 2,
  squat_1rm_kg: 3,
  bench_1rm_kg: 3,
  deadlift_1rm_kg: 3,
  training_days: 4,
  gym_tier: 4,
  equipment_overrides: 4,
  daily_life_intensity: 5,
  life_stress: 5,
  recovery_speed: 5,
  sleep_hours: 5,
  muscle_groups_to_strengthen: 6,
  injury_notes: 7,
  injury_areas: 7,
  is_competing: 7,
  competition_date: 7,
  target_weight_class: 7,
  note_to_coach: 7,
};

const WIRE_TO_FORM: Record<string, keyof OnboardingForm> = {
  unit_preference: 'unitPreference',
  gender: 'gender',
  birth_date: 'birthDate',
  height_cm: 'heightCm',
  weight_kg: 'weightKg',
  training_years: 'trainingYears',
  squat_stance: 'squatStance',
  deadlift_style: 'deadliftStyle',
  bench_grip: 'benchGrip',
  squat_1rm_kg: 'squat1RMKg',
  bench_1rm_kg: 'bench1RMKg',
  deadlift_1rm_kg: 'deadlift1RMKg',
  training_days: 'trainingDays',
  gym_tier: 'gymTier',
  equipment_overrides: 'equipmentOverrides',
  daily_life_intensity: 'dailyLifeIntensity',
  life_stress: 'lifeStress',
  recovery_speed: 'recoverySpeed',
  sleep_hours: 'sleepHours',
  muscle_groups_to_strengthen: 'muscleGroupsToStrengthen',
  injury_notes: 'injuryNotes',
  injury_areas: 'injuryAreas',
  is_competing: 'isCompeting',
  competition_date: 'competitionDate',
  target_weight_class: 'targetWeightClass',
  note_to_coach: 'noteToCoach',
};

export function dateText(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function onboardingDateBounds(now = new Date()) {
  const today = dateText(now);
  const lastYear = now.getFullYear() + 10;
  const lastDay = Math.min(now.getDate(), new Date(lastYear, now.getMonth() + 1, 0).getDate());
  return {
    birth: { minDate: '1930-01-01', maxDate: today },
    competition: { minDate: today, maxDate: dateText(new Date(lastYear, now.getMonth(), lastDay)) },
  };
}

export function createEmptyOnboardingForm(now = new Date()): OnboardingForm {
  return {
    unitPreference: 'kg',
    gender: null,
    birthDate: '2000-01-01',
    heightCm: '',
    weightKg: '',
    trainingYears: 0,
    squatStance: null,
    deadliftStyle: null,
    benchGrip: null,
    squat1RMKg: '',
    bench1RMKg: '',
    deadlift1RMKg: '',
    trainingDays: [],
    gymTier: null,
    equipmentOverrides: [],
    dailyLifeIntensity: null,
    lifeStress: null,
    recoverySpeed: null,
    sleepHours: null,
    muscleGroupsToStrengthen: [],
    injuryNotes: '',
    injuryAreas: [],
    isCompeting: null,
    competitionDate: dateText(now),
    targetWeightClass: '',
    noteToCoach: '',
  };
}

export function formFromServer(
  profile: OnboardingProfile | null,
  now = new Date(),
): OnboardingForm {
  const empty = createEmptyOnboardingForm(now);
  if (!profile) return empty;
  return {
    ...empty,
    unitPreference: profile.unit_preference === 'kg' || profile.unit_preference === 'lb'
      ? profile.unit_preference : null,
    gender:
      profile.gender === 'male' || profile.gender === 'female' || profile.gender === 'other'
        ? profile.gender
        : null,
    birthDate: profile.birth_date ?? empty.birthDate,
    heightCm: profile.height_cm ?? '',
    weightKg: profile.weight_kg ?? '',
    trainingYears: profile.training_years ?? 0,
    squatStance:
      profile.squat_stance === 'high_bar' || profile.squat_stance === 'low_bar'
        ? profile.squat_stance
        : null,
    deadliftStyle:
      profile.deadlift_style === 'conventional' ||
      profile.deadlift_style === 'sumo' ||
      profile.deadlift_style === 'both'
        ? profile.deadlift_style
        : null,
    benchGrip:
      profile.bench_grip === 'narrow' ||
      profile.bench_grip === 'standard' ||
      profile.bench_grip === 'wide'
        ? profile.bench_grip
        : null,
    squat1RMKg: profile.squat_1rm_kg ?? '',
    bench1RMKg: profile.bench_1rm_kg ?? '',
    deadlift1RMKg: profile.deadlift_1rm_kg ?? '',
    trainingDays: (profile.training_days ?? []).map((day) => TRAINING_DAYS.findIndex((token) => token === day) + 1).filter((day) => day > 0),
    gymTier:
      profile.gym_tier === 'home_with_rack' ||
      profile.gym_tier === 'commercial' ||
      profile.gym_tier === 'professional'
        ? profile.gym_tier
        : null,
    equipmentOverrides: profile.equipment_overrides ?? [],
    dailyLifeIntensity: profile.daily_life_intensity,
    lifeStress: profile.life_stress,
    recoverySpeed: profile.recovery_speed,
    sleepHours: profile.sleep_hours,
    muscleGroupsToStrengthen: (profile.muscle_groups_to_strengthen ?? []).filter((token): token is MuscleGroup => MUSCLE_GROUPS.some((known) => known === token)),
    injuryNotes: profile.injury_notes ?? '',
    injuryAreas: (profile.injury_areas ?? []).filter((token): token is InjuryArea => INJURY_AREAS.some((known) => known === token)),
    isCompeting: profile.is_competing,
    competitionDate: profile.competition_date ?? empty.competitionDate,
    targetWeightClass: profile.target_weight_class ?? '',
    noteToCoach: profile.note_to_coach ?? '',
  };
}

/** Server is the base; a locally saved draft wins only inside the iOS 60s skew window. */
export function mergeServerAndDraft(
  profile: OnboardingProfile | null,
  draft: OnboardingDraft | null,
  now = new Date(),
): OnboardingForm {
  const server = formFromServer(profile, now);
  if (!draft) return server;
  const savedAt = Date.parse(draft.savedAt);
  const serverUpdatedAt = profile ? Date.parse(profile.updated_at) : Number.NEGATIVE_INFINITY;
  if (!Number.isFinite(savedAt) || savedAt <= serverUpdatedAt - 60_000) return server;
  return { ...server, ...draft.form };
}

function positive(value: string): boolean {
  const parsed = Number(value);
  return value.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;
}

export function invalidFieldsForStep(
  form: OnboardingForm,
  step: OnboardingStep,
): (keyof OnboardingForm)[] {
  const bounds = onboardingDateBounds();
  switch (step) {
    case 1:
      return [
        ...(form.unitPreference ? [] : (['unitPreference'] as const)),
        ...(form.gender ? [] : (['gender'] as const)),
        ...(form.birthDate >= bounds.birth.minDate && form.birthDate <= bounds.birth.maxDate ? [] : (['birthDate'] as const)),
        ...(positive(form.heightCm) ? [] : (['heightCm'] as const)),
        ...(positive(form.weightKg) ? [] : (['weightKg'] as const)),
      ];
    case 2:
      return [
        ...(Number.isFinite(form.trainingYears) ? [] : (['trainingYears'] as const)),
        ...(form.squatStance ? [] : (['squatStance'] as const)),
        ...(form.deadliftStyle ? [] : (['deadliftStyle'] as const)),
      ];
    case 3:
      return [
        ...(positive(form.squat1RMKg) ? [] : (['squat1RMKg'] as const)),
        ...(positive(form.bench1RMKg) ? [] : (['bench1RMKg'] as const)),
        ...(positive(form.deadlift1RMKg) ? [] : (['deadlift1RMKg'] as const)),
      ];
    case 4:
      return [
        ...(form.trainingDays.length >= 2 && form.trainingDays.length <= 6
          ? []
          : (['trainingDays'] as const)),
        ...(form.gymTier ? [] : (['gymTier'] as const)),
      ];
    case 5:
      return [
        ...(form.dailyLifeIntensity ? [] : (['dailyLifeIntensity'] as const)),
        ...(form.lifeStress ? [] : (['lifeStress'] as const)),
        ...(form.recoverySpeed ? [] : (['recoverySpeed'] as const)),
        ...(form.sleepHours ? [] : (['sleepHours'] as const)),
      ];
    case 6:
      return [];
    case 7:
      return [
        ...(form.isCompeting === null ? (['isCompeting'] as const) : []),
        ...(form.isCompeting && (form.competitionDate < bounds.competition.minDate || form.competitionDate > bounds.competition.maxDate)
          ? (['competitionDate'] as const)
          : []),
      ];
  }
}

export function canAdvance(form: OnboardingForm, step: OnboardingStep): boolean {
  return invalidFieldsForStep(form, step).length === 0;
}

export function resumeStep(form: OnboardingForm): OnboardingStep {
  for (let step = 1 as OnboardingStep; step <= ONBOARDING_STEP_COUNT; step += 1) {
    if (!canAdvance(form, step)) return step;
  }
  return 7;
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function assignStep(
  patch: OnboardingUpsertInput,
  form: OnboardingForm,
  step: OnboardingStep,
): void {
  if (step === 1) {
    if (form.unitPreference) patch.unit_preference = form.unitPreference;
    if (form.gender) patch.gender = form.gender;
    if (form.birthDate) patch.birth_date = form.birthDate;
    if (positive(form.heightCm)) patch.height_cm = form.heightCm;
    if (positive(form.weightKg)) patch.weight_kg = form.weightKg;
  }
  if (step === 2) {
    if (Number.isFinite(form.trainingYears)) patch.training_years = form.trainingYears;
    if (form.squatStance) patch.squat_stance = form.squatStance;
    if (form.deadliftStyle) patch.deadlift_style = form.deadliftStyle;
    patch.bench_grip = form.benchGrip;
  }
  if (step === 3) {
    if (positive(form.squat1RMKg)) patch.squat_1rm_kg = form.squat1RMKg;
    if (positive(form.bench1RMKg)) patch.bench_1rm_kg = form.bench1RMKg;
    if (positive(form.deadlift1RMKg)) patch.deadlift_1rm_kg = form.deadlift1RMKg;
  }
  if (step === 4) {
    if (form.trainingDays.length >= 2) patch.training_days = form.trainingDays.map((day) => TRAINING_DAYS[day - 1]);
    if (form.gymTier) patch.gym_tier = form.gymTier;
    patch.equipment_overrides = form.equipmentOverrides.length
      ? [...form.equipmentOverrides]
      : null;
  }
  if (step === 5) {
    if (form.dailyLifeIntensity) patch.daily_life_intensity = form.dailyLifeIntensity;
    if (form.lifeStress) patch.life_stress = form.lifeStress;
    if (form.recoverySpeed) patch.recovery_speed = form.recoverySpeed;
    if (form.sleepHours) patch.sleep_hours = form.sleepHours;
  }
  if (step === 6) {
    patch.muscle_groups_to_strengthen = form.muscleGroupsToStrengthen.length
      ? [...form.muscleGroupsToStrengthen]
      : null;
  }
  if (step === 7) {
    patch.injury_notes = trimmedOrNull(form.injuryNotes);
    patch.injury_areas = form.injuryAreas.length ? [...form.injuryAreas] : null;
    if (form.isCompeting !== null) patch.is_competing = form.isCompeting;
    patch.competition_date = form.isCompeting ? form.competitionDate || null : null;
    patch.target_weight_class = trimmedOrNull(form.targetWeightClass);
    patch.note_to_coach = trimmedOrNull(form.noteToCoach);
  }
}

export function onboardingPatchForStep(
  form: OnboardingForm,
  step: OnboardingStep,
): OnboardingUpsertInput {
  const patch: OnboardingUpsertInput = {};
  assignStep(patch, form, step);
  return patch;
}

export function fullOnboardingPatch(form: OnboardingForm): OnboardingUpsertInput {
  const patch: OnboardingUpsertInput = {};
  for (let step = 1 as OnboardingStep; step <= ONBOARDING_STEP_COUNT; step += 1) {
    assignStep(patch, form, step);
  }
  return patch;
}

export function earliestMissingStep(missingFields: readonly string[]): OnboardingStep {
  return missingFields.reduce<OnboardingStep>(
    (earliest, field) => Math.min(earliest, MISSING_FIELD_STEPS[field] ?? 7) as OnboardingStep,
    7,
  );
}

export function highlightedFormFields(
  missingFields: readonly string[],
): Set<keyof OnboardingForm> {
  return new Set(
    missingFields
      .map((field) => WIRE_TO_FORM[field])
      .filter((field): field is keyof OnboardingForm => Boolean(field)),
  );
}

export function completionValidationResult(error: unknown): {
  errorFields: Set<keyof OnboardingForm>;
  step: OnboardingStep;
} | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== 'ONBOARDING_INCOMPLETE' ||
    !error.envelope?.missing_fields
  ) {
    return null;
  }
  return {
    errorFields: highlightedFormFields(error.envelope.missing_fields),
    step: earliestMissingStep(error.envelope.missing_fields),
  };
}

export function estimateOneRepMax(
  weightKg: number,
  reps: number,
  rpe: number,
  conservative = false,
): number | null {
  if (!(weightKg > 0) || !(reps > 0) || rpe < 6 || rpe > 10) return null;
  const estimate = calculateE1RM(weightKg, reps, rpe);
  return estimate === null ? null : Math.round(estimate * (conservative ? 0.9 : 1) * 2) / 2;
}

const INVITE_ALPHABET = /^[A-HJ-NP-Z2-9]{10}$/;

export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export function isValidInviteCode(value: string): boolean {
  return INVITE_ALPHABET.test(normalizeInviteCode(value));
}

export function groupedInviteCode(value: string): string {
  const code = normalizeInviteCode(value);
  return [code.slice(0, 4), code.slice(4, 7), code.slice(7, 10)]
    .filter(Boolean)
    .join(' ');
}
