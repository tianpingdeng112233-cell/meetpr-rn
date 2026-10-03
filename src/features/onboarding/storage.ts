import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { GYM_TIERS, INJURY_AREAS, MUSCLE_GROUPS, UNIT_PREFERENCES } from './catalog';
import type { InviteStash, OnboardingDraft } from './model';

const draftKey = (studentId: string) => `meetpr.onboarding.draft.v1.${studentId}`;
const stashKey = (studentId: string) => `meetpr.bind.invite-stash.v1.${studentId}`;

const OnboardingFormSchema = z.object({
  unitPreference: z.enum(UNIT_PREFERENCES).nullable(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  birthDate: z.string(),
  heightCm: z.string(),
  weightKg: z.string(),
  trainingYears: z.number(),
  squatStance: z.enum(['high_bar', 'low_bar']).nullable(),
  deadliftStyle: z.enum(['conventional', 'sumo', 'both']).nullable(),
  benchGrip: z.enum(['narrow', 'standard', 'wide']).nullable(),
  squat1RMKg: z.string(),
  bench1RMKg: z.string(),
  deadlift1RMKg: z.string(),
  trainingDays: z.array(z.number()),
  gymTier: z.enum(GYM_TIERS).nullable(),
  equipmentOverrides: z.array(z.string()),
  dailyLifeIntensity: z.number().nullable(),
  lifeStress: z.number().nullable(),
  recoverySpeed: z.number().nullable(),
  sleepHours: z.number().nullable(),
  muscleGroupsToStrengthen: z.array(z.enum(MUSCLE_GROUPS)),
  injuryNotes: z.string(),
  injuryAreas: z.array(z.enum(INJURY_AREAS)),
  isCompeting: z.boolean().nullable(),
  competitionDate: z.string(),
  targetWeightClass: z.string(),
  noteToCoach: z.string(),
});

const OnboardingDraftSchema: z.ZodType<OnboardingDraft> = z.object({
  form: OnboardingFormSchema,
  savedAt: z.string(),
});

const InviteStashSchema: z.ZodType<InviteStash> = z.object({
  code: z.string(),
  displayName: z.string(),
  savedAt: z.string(),
});

function parseObject<T>(raw: string | null, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export const onboardingDraftStorage = {
  read: async (studentId: string): Promise<OnboardingDraft | null> =>
    parseObject(await AsyncStorage.getItem(draftKey(studentId)), OnboardingDraftSchema),
  write: async (studentId: string, draft: OnboardingDraft): Promise<void> =>
    AsyncStorage.setItem(draftKey(studentId), JSON.stringify(draft)),
  clear: async (studentId: string): Promise<void> =>
    AsyncStorage.removeItem(draftKey(studentId)),
};

export const inviteStashStorage = {
  read: async (studentId: string): Promise<InviteStash | null> =>
    parseObject(await AsyncStorage.getItem(stashKey(studentId)), InviteStashSchema),
  write: async (studentId: string, stash: InviteStash): Promise<void> =>
    AsyncStorage.setItem(stashKey(studentId), JSON.stringify(stash)),
  clear: async (studentId: string): Promise<void> =>
    AsyncStorage.removeItem(stashKey(studentId)),
};
