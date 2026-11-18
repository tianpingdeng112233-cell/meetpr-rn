import { usePlanHandoff, currentPlanSummary, usePlan } from '@/api/domains/plans';
import AsyncStorage from '@/demo/storage';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { STORAGE_KEYS } from '@/features/training/constants';
import { clampRestSeconds, defaultRestPreference, type RestTimerPreference } from './rest-timer';
import { defaultReminderSettings, type ReminderSettings } from './training-reminder';
const AccessoryRestSchema = z.number().optional().catch(undefined);
const LegacyRestSchema = z.discriminatedUnion('mode', [z.object({ mode: z.literal('automatic'), accessory: AccessoryRestSchema }), z.object({ mode: z.literal('custom'), low: z.number(), mid: z.number(), high: z.number(), accessory: AccessoryRestSchema })]);
const ReminderSchema = z.object({ enabled: z.boolean(), weekdays: z.array(z.number().int().min(1).max(7)), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) });
const restKey = (id: string) => `meetpr.rest-timer.v3.${id}`;
const RestSchema = z.object({ main: z.number().transform(clampRestSeconds), accessory: z.number().transform(clampRestSeconds), vibration: z.boolean(), sound: z.boolean() });
const reminderKey = (id: string) => `meetpr.training-reminder.v1.${id}`;
async function read<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try { const result = schema.safeParse(JSON.parse(raw)); return result.success ? result.data : null; } catch { return null; }
}
export async function readRestPreference(id: string): Promise<RestTimerPreference> {
  const saved = await read(restKey(id), RestSchema);
  if (saved) return saved;
  const old = await read(`meetpr.rest-timer.v2.${id}`, LegacyRestSchema);
  const legacy = old ? null : await read(STORAGE_KEYS.restPreference(id), z.number().min(30).max(600));
  const migrated = {
    ...defaultRestPreference,
    main: old?.mode === 'custom' ? clampRestSeconds(old.mid) : legacy === null ? 180 : clampRestSeconds(legacy),
    accessory: old?.accessory === undefined ? 60 : clampRestSeconds(old.accessory),
  };
  await writeRestPreference(id, migrated);
  return migrated;
}
export const writeRestPreference = (id: string, value: RestTimerPreference) => AsyncStorage.setItem(restKey(id), JSON.stringify(RestSchema.parse(value)));
export const readReminderPreference = (id: string) => read(reminderKey(id), ReminderSchema);
export const writeReminderPreference = (id: string, value: ReminderSettings) => AsyncStorage.setItem(reminderKey(id), JSON.stringify(ReminderSchema.parse(value)));
export const preferenceKeys = { rest: (id: string) => ['rest-preference', id] as const, reminder: (id: string) => ['reminder-preference', id] as const };
export function useRestPreference(id: string) {
  return useQuery({ queryKey: preferenceKeys.rest(id), queryFn: () => readRestPreference(id), enabled: Boolean(id) });
}
export function useReminderPreference(id: string, trainingDays?: readonly string[] | null) {
  const query = useQuery({ queryKey: preferenceKeys.reminder(id), queryFn: () => readReminderPreference(id), enabled: Boolean(id) });
  const unsaved = query.isSuccess && query.data === null;
  const plans = usePlanHandoff(unsaved ? id : '');
  const selected = currentPlanSummary(plans.data);
  const plan = usePlan(unsaved ? selected?.id ?? '' : '');
  return {
    ...query,
    isPending: query.isPending || (unsaved && (plans.isPending || Boolean(selected && plan.isPending))),
    isError: query.isError || (unsaved && (plans.isError || Boolean(selected && plan.isError))),
    refetch: async () => { await Promise.all([query.refetch(), ...(unsaved ? [plans.refetch(), ...(selected ? [plan.refetch()] : [])] : [])]); },
    settings: defaultReminderSettings(trainingDays, selected ? plan.data : null, query.data),
  };
}
