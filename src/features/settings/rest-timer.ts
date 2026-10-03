import { restDefaultSeconds } from '@/features/training/policy';
import { t } from '@/i18n';
export type RestTimerPreference = { mode: 'automatic' } | { mode: 'custom'; low: number; mid: number; high: number };
export const defaultCustomRest = { mode: 'custom', low: 120, mid: 180, high: 240 } as const;
export function clampRestSeconds(seconds: number): number {
  return Math.max(30, Math.min(600, Math.round((Number.isFinite(seconds) ? seconds : 180) / 15) * 15));
}
export function restSecondsForRPE(preference: RestTimerPreference, rpe: number | null): number {
  if (preference.mode === 'automatic') return restDefaultSeconds(rpe);
  return clampRestSeconds(rpe === null || !Number.isFinite(rpe) ? preference.mid : rpe < 7 ? preference.low : rpe < 9 ? preference.mid : preference.high);
}
export function durationText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function restSummary(preference: RestTimerPreference): string {
  return preference.mode === 'automatic' ? t('student.studentRestTimerSettings.copy002') : `${t('student.studentRestTimerSettings.copy003')} ${[preference.low, preference.mid, preference.high].map(durationText).join('/')}`;
}
