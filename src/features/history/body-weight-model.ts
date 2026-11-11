import type { BodyWeightRecord } from '@/api/domains/body-weights';
import { addDays, localDay } from '@/domain/coach/detail-week';
import { formatBodyWeightKg } from '@/domain/profile/body-weight';
import type { GrowthTimeRange } from './model';

export function bodyWeightPresentation(records: readonly BodyWeightRecord[], range: GrowthTimeRange, now = new Date()) {
  const ascending = [...records].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
  const cutoff = range === 'all' ? '' : localDay(addDays(now, -Number(range)));
  const points = ascending.filter(record => record.recorded_on >= cutoff);
  const latest = ascending.at(-1);
  const delta = points.length > 1 ? Number(points.at(-1)!.weight_kg) - Number(points[0].weight_kg) : null;
  return {
    current: latest ? formatBodyWeightKg(latest.weight_kg) : '—',
    points,
    records: [...ascending].reverse(),
    delta: delta === null ? null : `${delta < 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}`,
    hasToday: ascending.some(record => record.recorded_on === localDay(now)),
    state: !ascending.length ? 'empty' : !points.length ? 'range-empty' : points.length === 1 ? 'single' : 'chart',
  } as const;
}

export function bodyWeightRowValue(records: readonly BodyWeightRecord[] | undefined): string {
  const latest = records?.reduce<BodyWeightRecord | undefined>((previous, record) =>
    !previous || record.recorded_on > previous.recorded_on ? record : previous, undefined);
  return latest ? `${formatBodyWeightKg(latest.weight_kg)} kg` : '—';
}
