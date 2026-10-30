import type { SetLog } from '@/api/domains/sets';
import { decodePrescription } from '@/domain/plan/prescription';
import type { WorkoutSetDraft } from './model';

export type EffortKind = 'rpe' | 'rir';

export function effortKindFor(draft: WorkoutSetDraft, allowsRIR: boolean): EffortKind {
  if (draft.sourceLog?.actual_rir != null) return 'rir';
  if (draft.sourceLog) return 'rpe';
  return allowsRIR && decodePrescription(draft.planSet).intensity?.kind === 'rir' ? 'rir' : 'rpe';
}

export function effortFields(kind: EffortKind, text: string) {
  return { rpe: kind === 'rpe' && text.trim() ? String(Number(text)) : null,
    actual_rir: kind === 'rir' && text.trim() ? Number(text) : null };
}

export function recordedEffort(log: Pick<SetLog, 'rpe' | 'actual_rir'>): string {
  return log.actual_rir != null ? `RIR ${log.actual_rir}` : log.rpe != null ? `RPE ${Number(log.rpe)}` : '—';
}
