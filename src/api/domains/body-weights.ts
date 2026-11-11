import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localDay } from '@/domain/coach/detail-week';
import { z } from 'zod';
import { ApiError } from '../client';
import { onboardingKeys, onboardingRepository, type OnboardingProfile } from './onboarding';
import { authenticatedRequest } from '../session';

const WeightSchema = z.string().regex(/^\d+\.\d{2}$/).refine(value => Number(value) > 0 && Number(value) < 500);
const DateSchema = z.iso.date();
export const BodyWeightRecordSchema = z.object({ recorded_on: DateSchema, weight_kg: WeightSchema });
export const BodyWeightsSchema = z.object({ records: z.array(BodyWeightRecordSchema) });
export type BodyWeightRecord = z.infer<typeof BodyWeightRecordSchema>;

async function list() {
  return authenticatedRequest('/students/me/body-weights', { schema: BodyWeightsSchema });
}
const WriteResultSchema = z.object({ record: BodyWeightRecordSchema, current_weight_kg: WeightSchema });
async function saveToday(weightKg: string) {
  const date = localDay(new Date());
  const body = { weight_kg: WeightSchema.parse(weightKg) };
  try {
    return await authenticatedRequest(`/students/me/body-weights/${date}`, { method: 'PUT', body, schema: WriteResultSchema });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    const profile = await onboardingRepository.upsert(body);
    // No synthetic history: the old endpoint only guarantees a current profile value.
    return { record: null, current_weight_kg: profile.weight_kg };
  }
}
async function remove(date: string) {
  return authenticatedRequest(`/students/me/body-weights/${DateSchema.parse(date)}`, {
    method: 'DELETE', schema: z.object({ current_weight_kg: WeightSchema.nullable() }),
  });
}
export const bodyWeightsRepository = { list, saveToday, remove };

export const bodyWeightKeys = {
  list: (studentId: string) => ['body-weights', studentId] as const,
};
export function useBodyWeights(studentId: string) {
  return useQuery({
    queryKey: bodyWeightKeys.list(studentId), queryFn: bodyWeightsRepository.list, enabled: Boolean(studentId),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

export function useDeleteBodyWeight(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bodyWeightsRepository.remove,
    onSuccess: async (result, date) => {
      const recordsKey = bodyWeightKeys.list(studentId);
      const profileKey = onboardingKeys.profile(studentId);
      await Promise.all([client.cancelQueries({ queryKey: recordsKey }), client.cancelQueries({ queryKey: profileKey })]);
      client.setQueryData<z.infer<typeof BodyWeightsSchema>>(recordsKey, previous => previous && ({ records: previous.records.filter(record => record.recorded_on !== date) }));
      client.setQueryData<OnboardingProfile | null>(profileKey, previous => previous && ({ ...previous, weight_kg: result.current_weight_kg }));
      await Promise.all([client.invalidateQueries({ queryKey: recordsKey }), client.invalidateQueries({ queryKey: profileKey })]);
    },
  });
}

export function useSaveBodyWeight(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bodyWeightsRepository.saveToday,
    onSuccess: async (result) => {
      const recordsKey = bodyWeightKeys.list(studentId);
      const profileKey = onboardingKeys.profile(studentId);
      await Promise.all([client.cancelQueries({ queryKey: recordsKey }), client.cancelQueries({ queryKey: profileKey })]);
      const record = result.record;
      if (record) client.setQueryData<z.infer<typeof BodyWeightsSchema>>(recordsKey, previous => previous && ({
        records: [...previous.records.filter(item => item.recorded_on !== record.recorded_on), record].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on)),
      }));
      client.setQueryData<OnboardingProfile | null>(profileKey, previous => previous && ({ ...previous, weight_kg: result.current_weight_kg }));
      await Promise.all([client.invalidateQueries({ queryKey: recordsKey }), client.invalidateQueries({ queryKey: profileKey })]);
    },
  });
}
