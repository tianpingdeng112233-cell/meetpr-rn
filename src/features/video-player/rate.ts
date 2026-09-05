export const rates = [0.5, 1, 1.5, 2] as const;
export function rateText(rate: number): string {
  return `${rates.some(value => value === rate) ? rate : 1}x`;
}
export function workbenchRateText(rate: number): string {
  return rateText(rate).replace('x', '×');
}
export function cycleRate(rate: number): number {
  const index = rates.findIndex(value => value === rate);
  return rates[((index < 0 ? 1 : index) + 1) % rates.length];
}
