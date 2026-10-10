export const POUNDS_PER_KG = 2.2046226218;

export function decimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

export function metricDisplay(value: string, factor: number): string {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(Math.round(number * factor * 10) / 10) : '';
}

export function metricStored(value: string | number, factor: number): string {
  const number = typeof value === 'number' ? value : Number(decimalInput(value));
  return Number.isFinite(number) && number > 0 ? String(Math.round((number / factor) * 10) / 10) : '';
}
