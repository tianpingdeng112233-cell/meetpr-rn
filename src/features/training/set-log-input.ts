import type { PlanSet } from '@/api/domains/plans';
import { effectiveLoadMode } from '@/domain/plan/prescription';

export type SetLogInput = { weightText: string; repsText: string; rpeText: string; effortKind?: 'rpe' | 'rir' };
export type SetLogValidation = { writable: boolean; invalidFields: (keyof SetLogInput)[] };

/** Shared with QuickLogAttempt; preserve its Number-based parsing exactly. */
export function validateSetLogInput(input: SetLogInput): SetLogValidation {
  const invalidFields: (keyof SetLogInput)[] = [];
  if (!input.weightText.trim() || !Number.isFinite(Number(input.weightText)) || Number(input.weightText) < 0) {
    invalidFields.push('weightText');
  }
  if (!Number.isInteger(Number(input.repsText)) || Number(input.repsText) < 1 || Number(input.repsText) > 99) {
    invalidFields.push('repsText');
  }
  if (input.rpeText !== '' && (!Number.isFinite(Number(input.rpeText)) || Number(input.rpeText) < 0 || (input.effortKind === 'rir' ? !Number.isInteger(Number(input.rpeText)) || Number(input.rpeText) > 9 : Number(input.rpeText) > 10))) {
    invalidFields.push('rpeText');
  }
  return { writable: invalidFields.length === 0, invalidFields };
}


/** Blank bodyweight means no external load; every other mode still requires input. */
export function actualWeightText(weightText: string, planSet: PlanSet): string {
  return effectiveLoadMode(planSet) === 'bodyweight' && !weightText.trim() ? '0' : weightText;
}
