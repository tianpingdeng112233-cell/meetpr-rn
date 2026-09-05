import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { STORAGE_KEYS } from '@/features/training/constants';
import { clampRestSeconds, type RestTimerPreference } from './rest-timer';
import { defaultReminderSettings, type ReminderSettings } from './training-reminder';
const RestSchema = z.discriminatedUnion('mode', [z.object({ mode: z.literal('automatic') }), z.object({ mode: z.literal('custom'), low: z.number(), mid: z.number(), high: z.number() })]);
const ReminderSchema = z.object({ enabled: z.boolean(), weekdays: z.array(z.number().int().min(1).max(7)), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) });
const restKey = (id: string) => `meetpr.rest-timer.v2.${id}`;
const reminderKey = (id: string) => `meetpr.training-reminder.v1.${id}`;
async function read<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try { const result = schema.safeParse(JSON.parse(raw)); return result.success ? result.data : null; } catch { return null; }
}
export async function readRestPreference(id: string): Promise<RestTimerPreference> {
  const saved = await read(restKey(id), RestSchema);
  if (saved?.mode === 'custom') return { mode: 'custom', low: clampRestSeconds(saved.low), mid: clampRestSeconds(saved.mid), high: clampRestSeconds(saved.high) };
  if (saved) return saved;
  const legacy = await read(STORAGE_KEYS.restPreference(id), z.number().min(30).max(600));
  return legacy === null ? { mode: 'automatic' } : { mode: 'custom', low: clampRestSeconds(legacy), mid: clampRestSeconds(legacy), high: clampRestSeconds(legacy) };
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
  return { ...query, settings: query.data ?? defaultReminderSettings(trainingDays) };
}
