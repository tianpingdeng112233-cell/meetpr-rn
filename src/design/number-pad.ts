export type NumberPadField = 'weight' | 'reps' | 'rpe' | 'rir';

/** Inline accessory entry has no barbell floor or plate increments. */
export function appendAccessory(text: string, ch: string, field: NumberPadField): string {
  if (ch === '.') return (field === 'weight' || field === 'rpe') && text.length > 0 && !text.includes('.') ? text + ch : text;
  if (!/^\d$/.test(ch) || text.split('.')[1]?.length === 1) return text;
  const limit = field === 'rir' ? 1 : field === 'weight' ? 5 : 3;
  if (text.replace(/\D/g, '').length >= limit) return text;
  return text === '0' ? ch : text + ch;
}

/** null is an explicit clear; undefined is invalid and cannot be committed. */
export function accessoryValue(text: string, field: NumberPadField): number | null | undefined {
  if (text === '') return null;
  if (!/^\d+(\.\d?)?$/.test(text)) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  if (field === 'weight') return value;
  if (field === 'rpe') return value >= 5 && value <= 10 && Number.isInteger(value * 2) ? value : undefined;
  return Number.isInteger(value) && !text.includes('.') && value >= (field === 'rir' ? 0 : 1) && value <= (field === 'rir' ? 9 : 99) ? value : undefined;
}

export function append(text: string, ch: string, field: NumberPadField): string {
  if (ch === '.') {
    return field !== 'reps' && field !== 'rir' && text.length > 0 && !text.includes('.') && text.length <= 4
      ? text + ch : text;
  }
  if (!/^\d$/.test(ch) || text.replace(/\D/g, '').length >= (field === 'rir' ? 1 : field === 'weight' ? 5 : field === 'rpe' ? 2 : 3)) return text;
  return text === '0' ? ch : text + ch;
}

export function snapped(raw: number, field: NumberPadField, minimumWeight = 20): number {
  if (field === 'rir') return Math.min(9, Math.max(0, Math.round(raw)));
  if (field === 'rpe') return Math.round(Math.min(10, Math.max(5, raw)) * 2) / 2;
  return field === 'weight'
    ? Math.round(Math.min(500, Math.max(minimumWeight, raw)) * 4) / 4
    : Math.min(100, Math.max(1, Math.round(raw)));
}
