/** One side of a 20 kg bar, after optional 2.5 kg competition collars. */
export function plateBreakdown(totalKg: number, hasCollar: boolean): number[] {
  const total = Math.round(Math.min(500, Math.max(20, totalKg)) * 4) / 4;
  let remaining = Math.max(0, (total - 20) / 2 - (hasCollar ? 2.5 : 0));
  const plates: number[] = [];
  for (const size of [25, 20, 15, 10, 5, 2.5, 1.25]) {
    while (remaining >= size) {
      plates.push(size);
      remaining -= size;
    }
  }
  return plates;
}

export function breakdownText(plates: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const plate of plates) counts.set(plate, (counts.get(plate) ?? 0) + 1);
  return [...counts].map(([size, count]) => `${Number(size.toFixed(2))}kg × ${count}`).join(' · ');
}

export function seDimensions(kg: number): { width: number; height: number } {
  const dimensions: Record<number, [number, number]> = {
    25: [11, 135], 20: [8, 135], 15: [8, 120], 10: [8, 98],
    5: [8, 68], 2.5: [6, 57], 1.25: [5, 48],
  };
  const [width, height] = dimensions[kg];
  return { width, height };
}
