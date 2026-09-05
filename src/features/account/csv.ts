import type { SetLog } from '@/api/domains/sets';
import { dateText } from '@/features/onboarding/model';
export const CSV_HEADER = 'date,exercise,exercise_en,set_index,weight_kg,reps,rpe,completed,failed,adhoc';
export function csvField(value: string): string {
  return /[,"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
export function csvFileName(now = new Date()): string {
  return `meetpr-training-log-${dateText(now).replaceAll('-', '')}.csv`;
}
export function trainingLogCSV(logs: readonly SetLog[], names: ReadonlyMap<string, { name: string; name_en: string | null }>): string {
  const rows = [...logs].sort((a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at)).map((log) => {
    const exercise = names.get(log.exercise_id);
    return [dateText(new Date(log.logged_at)), exercise?.name ?? log.exercise_id, exercise?.name_en ?? '', String(log.set_index), log.weight_kg, String(log.reps), log.rpe ?? '', String(log.completed), String(log.failed), String(log.adhoc)].map(csvField).join(',');
  });
  return [CSV_HEADER, ...rows].join('\n');
}
