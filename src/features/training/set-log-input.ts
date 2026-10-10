export type SetLogInput = { weightText: string; repsText: string; rpeText: string };
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
  if (input.rpeText !== '' && (!Number.isFinite(Number(input.rpeText)) || Number(input.rpeText) < 0 || Number(input.rpeText) > 10)) {
    invalidFields.push('rpeText');
  }
  return { writable: invalidFields.length === 0, invalidFields };
}
