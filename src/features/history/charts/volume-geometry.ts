/** iOS volume canvas coordinates are 320 × 172; RPE has its own scale. */
export function volumeScale(maximum: number) {
  const increment = maximum > 10000 ? 5000 : maximum > 2000 ? 1000 : 500;
  return { increment, volumeMax: Math.max(increment, Math.ceil(maximum / increment) * increment) };
}

export function compactVolume(value: number): string {
  if (value < 1000) return String(Math.round(value));
  const thousands = value / 1000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
}

export function rpeY(rpe: number): number {
  return 92 - (Math.min(Math.max(rpe, 5), 10) - 5) / 5 * 74;
}

export function volumeCenterX(index: number, count: number): number {
  return count === 1 ? 168 : 58 + index / (count - 1) * 220;
}

export function volumeDateLabel(startDate: string, index: number) {
  return { text: `${startDate.slice(8, 10)}/${startDate.slice(5, 7)}`, opacity: index % 2 === 0 ? 1 : 0 };
}

export function volumeBarPath(center: number, volume: number, volumeMax: number): string {
  const top = 146 - 128 * Math.min(Math.max(volume / volumeMax, 0), 1);
  // Match the Canvas quadratic top corners; the bottom corners stay square.
  return `M ${center - 5} 146 L ${center - 5} ${top + 4} Q ${center - 5} ${top} ${center - 1} ${top} L ${center + 1} ${top} Q ${center + 5} ${top} ${center + 5} ${top + 4} L ${center + 5} 146 Z`;
}

export function volumeChartGeometry(buckets: readonly {
  key: string; startDate: string; volumeKg: number; averageRPE: number | null;
}[], width = 320) {
  const { volumeMax } = volumeScale(Math.max(0, ...buckets.map(bucket => bucket.volumeKg)));
  const bars = buckets.map((bucket, index) => ({
    key: bucket.key,
    path: volumeBarPath(volumeCenterX(index, buckets.length), bucket.volumeKg, volumeMax),
  }));
  const rpePoints = buckets.flatMap((bucket, index) => bucket.averageRPE === null ? [] : [{
    key: bucket.key, x: volumeCenterX(index, buckets.length), y: rpeY(bucket.averageRPE),
  }]);
  return {
    axisFontSize: 9 * 320 / Math.max(width, 1),
    dateFontSize: 8 * 320 / Math.max(width, 1),
    bars, rpePoints,
    rpeLine: rpePoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
    dates: buckets.map((bucket, index) => ({ key: bucket.key, x: volumeCenterX(index, buckets.length), y: 162, ...volumeDateLabel(bucket.startDate, index) })),
    volumeLabels: [
      { x: 30, y: 21, text: compactVolume(volumeMax) },
      { x: 30, y: 85, text: compactVolume(volumeMax / 2) },
      { x: 30, y: 149, text: '0' },
    ],
    rpeLabels: [{ x: 309, y: 21, text: '10' }, { x: 309, y: 58, text: '7.5' }, { x: 309, y: 95, text: '5' }],
    grid: 'M 42 18 H 300 M 42 82 H 300', baseline: 'M 42 146 H 300',
  };
}
