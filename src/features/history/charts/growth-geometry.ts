export type PlotPoint = { x: number; y: number };
export type GrowthValueDomain = { low: number; high: number };

/** All growth-chart geometry uses the iOS 320 × 118 mockup coordinates. */
export function growthValueDomain(values: readonly number[]): GrowthValueDomain {
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : minimum;
  const span = Math.max(maximum - minimum, 1);
  return { low: minimum - span * 0.35 - 1, high: maximum + span * 0.12 + 1 };
}

export type GrowthChartDateAxis = { start: Date; middle: Date; end: Date };

export function growthChartDateAxis(dates: readonly Date[]): GrowthChartDateAxis {
  const timestamps = dates.map(date => date.getTime());
  const start = timestamps.length ? Math.min(...timestamps) : 0;
  const last = timestamps.length ? Math.max(...timestamps) : 1000;
  const end = last === start ? start + 1000 : last;
  return { start: new Date(start), middle: new Date(start + (end - start) / 2), end: new Date(end) };
}

export function plotPoint(date: Date, valueKg: number, axis: GrowthChartDateAxis, domain: GrowthValueDomain): PlotPoint {
  const duration = Math.max(axis.end.getTime() - axis.start.getTime(), 1000);
  const fraction = Math.min(Math.max((date.getTime() - axis.start.getTime()) / duration, 0), 1);
  return { x: 46 + 254 * fraction, y: 84 - 64 * (valueKg - domain.low) / (domain.high - domain.low) };
}

export function currentPointLabel(point: PlotPoint): PlotPoint {
  return { x: Math.min(Math.max(point.x, 62), 286), y: Math.max(15, point.y - 8) };
}

export function formingTrendGeometry(width: number, height: number, recordedCount: number, threshold: number, currentKg: number | null) {
  const count = Math.max(1, threshold);
  const points = Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0 : index / (count - 1);
    return { x: width * (0.194 + progress * 0.718), y: height * (0.62 - progress * 0.4) };
  });
  const first = points[0], last = points[count - 1];
  const control1 = { x: first.x + (last.x - first.x) * 0.30, y: first.y - 4 };
  const control2 = { x: first.x + (last.x - first.x) * 0.68, y: last.y + 8 };
  const middleValue = currentKg === null ? null : Math.round(currentKg / 10) * 10;
  return {
    points, control1, control2,
    visibleCount: Math.min(Math.max(0, recordedCount), count),
    axisValues: middleValue === null ? null : [middleValue + 10, middleValue, middleValue - 10],
    axisX: width * 0.115,
    axisYs: [height * 0.10, height * 0.43, height * 0.76],
    dateY: height * 0.91,
    dateX: points[Math.min(Math.max(0, recordedCount - 1), count - 1)].x,
    axes: `M ${width * 0.144} ${height * 0.1} V ${height * 0.76} H ${width * 0.95}`,
    middle: `M ${width * 0.144} ${height * 0.43} H ${width * 0.95}`,
    ghost: `M ${first.x} ${first.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${last.x} ${last.y}`,
  };
}

export function linePath(points: readonly PlotPoint[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

export function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function dayMonth(date: Date | null): string {
  return date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}` : '—';
}

export function growthChartGeometry(
  samples: readonly { date: Date; valueKg: number }[],
  rawEligible: readonly { date: Date; valueKg: number; winnerOrigin: 'logged' | 'imported' }[],
  width = 320,
) {
  const all = [...samples, ...rawEligible];
  const domain = growthValueDomain(all.map(point => point.valueKg));
  const axis = growthChartDateAxis(all.map(point => point.date));
  const points = samples.map(point => plotPoint(point.date, point.valueKg, axis, domain));
  const line = linePath(points);
  const first = points[0], last = points.at(-1);
  const current = samples.at(-1);
  const position = last ? currentPointLabel(last) : null;
  const currentText = current ? monthDay(current.date) : '';
  return {
    axisFontSize: 9 * 320 / Math.max(width, 1),
    line,
    area: first && last ? `${line} L ${last.x} 84 L ${first.x} 84 Z` : '',
    raw: rawEligible.map(point => {
      const { x, y } = plotPoint(point.date, point.valueKg, axis, domain);
      return { origin: point.winnerOrigin, diamond: `M ${x} ${y - 3} L ${x + 3} ${y} L ${x} ${y + 3} L ${x - 3} ${y} Z` };
    }),
    current: last && position ? {
      ...last, guide: `M ${last.x} ${last.y} V 84`,
      label: { ...position, text: currentText, background: { x: position.x - (currentText.length * 6 + 4) / 2, y: position.y - 6.5, width: currentText.length * 6 + 4, height: 13 } },
    } : null,
    axes: 'M 46 18 V 84 H 304', middle: 'M 46 51 H 304',
    // The card specification uses integer truncation for these three labels.
    yLabels: [
      { x: 33, y: 20, text: String(Math.trunc(domain.high)) },
      { x: 33, y: 52, text: String(Math.trunc((domain.high + domain.low) / 2)) },
      { x: 33, y: 86, text: String(Math.trunc(domain.low)) },
    ],
    dates: [
      { x: 50, y: 98, text: monthDay(axis.start), anchor: 'start' as const },
      { x: 173, y: 98, text: monthDay(axis.middle), anchor: 'middle' as const },
      { x: 304, y: 98, text: monthDay(axis.end), anchor: 'end' as const },
    ],
  };
}

export const zeroGhostGeometry = {
  circle: { cx: 32, cy: 32, r: 30 },
  curve: 'M 15.36 40.96 C 25.6 37.12 37.12 26.88 48.64 19.84',
  point: { cx: 15.36, cy: 40.96, r: 4 },
} as const;
