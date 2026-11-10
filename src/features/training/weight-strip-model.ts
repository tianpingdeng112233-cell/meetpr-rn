import type { BodyWeightRecord } from '@/api/domains/body-weights';

export function weightStripModel({ meet, todayRecord, settingOn, today }: {
  meet: { date: string; name: string } | null;
  todayRecord: BodyWeightRecord | null;
  settingOn: boolean;
  today: string;
}) {
  // Date-only values are local calendar dates; UTC arithmetic avoids DST's 23/25-hour days.
  const days = meet ? Math.round((Date.parse(`${meet.date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) : -1;
  const weight = todayRecord?.recorded_on === today ? Number(todayRecord.weight_kg).toFixed(1) : null;
  if (meet && Number.isFinite(days) && days >= 0) return { kind: 'meet-weight' as const, days, name: meet.name, weight };
  return settingOn ? { kind: 'weight' as const, weight } : { kind: 'hidden' as const };
}
