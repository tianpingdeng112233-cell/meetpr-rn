export type NumberPadField = 'weight' | 'reps' | 'rpe';

export function append(text: string, ch: string, field: NumberPadField): string {
  if (ch === '.') {
    return field !== 'reps' && text.length > 0 && !text.includes('.') && text.length <= 4
      ? text + ch : text;
  }
  if (!/^\d$/.test(ch) || text.replace(/\D/g, '').length >= (field === 'weight' ? 5 : field === 'rpe' ? 2 : 3)) return text;
  return text === '0' ? ch : text + ch;
}

export function snapped(raw: number, field: NumberPadField, minimumWeight = 20): number {
  if (field === 'rpe') return Math.round(Math.min(10, Math.max(5, raw)) * 2) / 2;
  return field === 'weight'
    ? Math.round(Math.min(500, Math.max(minimumWeight, raw)) * 4) / 4
    : Math.min(100, Math.max(1, Math.round(raw)));
}
