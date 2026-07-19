import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError } from '../client';
import { authenticatedRequest } from '../session';
import {
  DateTextSchema,
  DecimalStringSchema,
  TimestampSchema,
  UuidSchema,
} from './shared';

const OnboardingUpsertFieldsSchema = z.object({
  unit_preference: z.string().optional(),
  gender: z.string().optional(),
  /** Optional DATE-text column. */
  birth_date: DateTextSchema.optional(),
  /** Optional Decimal wire value; kept as a string. */
  height_cm: DecimalStringSchema.optional(),
  /** Optional Decimal wire value; kept as a string. */
  weight_kg: DecimalStringSchema.optional(),
  training_years: z.number().optional(),
  squat_stance: z.string().optional(),
  deadlift_style: z.string().optional(),
  bench_grip: z.string().nullish(),
  /** Optional Decimal wire value; kept as a string. */
  squat_1rm_kg: DecimalStringSchema.optional(),
  /** Optional Decimal wire value; kept as a string. */
  bench_1rm_kg: DecimalStringSchema.optional(),
  /** Optional Decimal wire value; kept as a string. */
  deadlift_1rm_kg: DecimalStringSchema.optional(),
  training_days: z.array(z.number().int()).nullish(),
  gym_tier: z.string().optional(),
  equipment_overrides: z.array(z.string()).nullish(),
  daily_life_intensity: z.number().int().optional(),
  life_stress: z.number().int().optional(),
  recovery_speed: z.number().int().optional(),
  sleep_hours: z.number().optional(),
  muscle_groups_to_strengthen: z.array(z.string()).nullish(),
  injury_notes: z.string().nullish(),
  injury_areas: z.array(z.string()).nullish(),
  is_competing: z.boolean().optional(),
  /** Optional DATE-text column. */
  competition_date: DateTextSchema.nullish(),
  target_weight_class: z.string().nullish(),
  note_to_coach: z.string().nullish(),
  upload_attachment_ids: z.array(UuidSchema).optional(),
});

export const OnboardingUpsertRequestSchema = OnboardingUpsertFieldsSchema.strict();

export const OnboardingProfileSchema = z.object({
  user_id: UuidSchema,
  unit_preference: z.string().nullable(),
  gender: z.string().nullable(),
  birth_date: DateTextSchema.nullable(),
  height_cm: DecimalStringSchema.nullable(),
  weight_kg: DecimalStringSchema.nullable(),
  training_years: z.number().nullable(),
  squat_stance: z.string().nullable(),
  deadlift_style: z.string().nullable(),
  bench_grip: z.string().nullable(),
  squat_1rm_kg: DecimalStringSchema.nullable(),
  bench_1rm_kg: DecimalStringSchema.nullable(),
  deadlift_1rm_kg: DecimalStringSchema.nullable(),
  training_days: z.array(z.number().int()).nullable(),
  gym_tier: z.string().nullable(),
  equipment_overrides: z.array(z.string()).nullable(),
  daily_life_intensity: z.number().int().nullable(),
  life_stress: z.number().int().nullable(),
  recovery_speed: z.number().int().nullable(),
  sleep_hours: z.number().nullable(),
  muscle_groups_to_strengthen: z.array(z.string()).nullable(),
  injury_notes: z.string().nullable(),
  injury_areas: z.array(z.string()).nullable(),
  is_competing: z.boolean().nullable(),
  competition_date: DateTextSchema.nullable(),
  target_weight_class: z.string().nullable(),
  note_to_coach: z.string().nullable(),
  completed_at: TimestampSchema.nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  upload_attachment_ids: z.array(UuidSchema),
});

export type OnboardingUpsertRequest = z.infer<
  typeof OnboardingUpsertRequestSchema
>;
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;

async function get(studentId: string): Promise<OnboardingProfile | null> {
  const id = UuidSchema.parse(studentId);
  try {
    return await authenticatedRequest(`/students/${id}/onboarding`, {
      schema: OnboardingProfileSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'ONBOARDING_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

async function upsert(
  input: OnboardingUpsertRequest,
): Promise<OnboardingProfile> {
  const body = OnboardingUpsertRequestSchema.parse(input);
  return authenticatedRequest('/students/me/onboarding', {
    method: 'PUT',
    body,
    schema: OnboardingProfileSchema,
  });
}

async function complete(): Promise<OnboardingProfile> {
  return authenticatedRequest('/students/me/onboarding/complete', {
    method: 'POST',
    schema: OnboardingProfileSchema,
  });
}

export const onboardingRepository = { complete, get, upsert };

export const onboardingKeys = {
  all: ['onboarding'] as const,
  profile: (studentId: string) => ['onboarding', studentId] as const,
};

export function useOnboardingProfile(studentId: string) {
  return useQuery({
    queryKey: onboardingKeys.profile(studentId),
    queryFn: () => onboardingRepository.get(studentId),
    enabled: Boolean(studentId),
  });
}

/** Backward-compatible name for call sites that predate the profile reader. */
export const useOnboarding = useOnboardingProfile;

export function useUpsertOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingRepository.upsert,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all }),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingRepository.complete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all }),
  });
}
