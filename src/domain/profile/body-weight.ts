export function bodyWeightInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const point = cleaned.indexOf('.');
  if (point < 0) return cleaned;
  return `${cleaned.slice(0, point)}.${cleaned.slice(point + 1).replace(/\./g, '').slice(0, 2)}`;
}

const POUNDS_PER_KG = 2.2046226218;

function decimalWeight(text: string): number {
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ? Number(text) : NaN;
}

export function bodyWeightKgFromInput(text: string, unit: 'kg' | 'lb'): string {
  const value = decimalWeight(text);
  const kg = unit === 'lb' ? value / POUNDS_PER_KG : value;
  if (!Number.isFinite(kg) || kg <= 0 || kg >= 500) return '';
  // Spec 085 requires two decimal places for both units at the storage boundary.
  const stored = kg.toFixed(2);
  return Number(stored) > 0 && Number(stored) < 500 ? stored : '';
}

export function bodyWeightInputFromKg(
  kg: string | null | undefined,
  unit: 'kg' | 'lb',
): string {
  const value = decimalWeight(kg ?? '');
  if (!Number.isFinite(value) || value <= 0 || value >= 500) return '';
  return unit === 'lb' ? String(Number((value * POUNDS_PER_KG).toFixed(2))) : String(value);
}

export function formatBodyWeightKg(value: string | number): string {
  return Number(value).toFixed(2);
}
