export type YDomain = readonly [number, number];
export type ChartPosition = { x: number; y: number };
export type E1RMChartLineInterpolation = 'curve' | 'step';

export const symbolRadius = (area: number): number => Math.sqrt(area / Math.PI);

function curveCommands(points: readonly ChartPosition[]): string[] {
  const slopes = points.slice(1).map((end, index) => {
    const start = points[index];
    return end.x === start.x ? 0 : (end.y - start.y) / (end.x - start.x);
  });
  // Harmonic-mean Hermite tangents stay monotone between samples. A change
  // of direction has a horizontal tangent; equal dates become vertical lines.
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0] ?? 0;
    if (index === points.length - 1) return slopes[index - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  });
  return points.slice(1).map((end, index) => {
    const start = points[index];
    const third = (end.x - start.x) / 3;
    if (third === 0) return `L ${end.x} ${end.y}`;
    return `C ${start.x + third} ${start.y + third * tangents[index]} ${end.x - third} ${end.y - third * tangents[index + 1]} ${end.x} ${end.y}`;
  });
}

export function monotonePath(points: readonly ChartPosition[]): string {
  if (!points.length) return '';
  return [`M ${points[0].x} ${points[0].y}`, ...curveCommands(points)].join(' ');
}

/** Separate paths allow each segment to take its endpoint's provenance style. */
export function lineSegments(points: readonly ChartPosition[], interpolation: E1RMChartLineInterpolation): string[] {
  const commands = interpolation === 'curve' ? curveCommands(points) : points.slice(1).map((end) => `H ${end.x} V ${end.y}`);
  return commands.map((command, index) => `M ${points[index].x} ${points[index].y} ${command}`);
}

export function xTicks(dates: readonly Date[], desiredCount = 4): Date[] {
  const times = [...new Set(dates.map((date) => date.getTime()))].sort((a, b) => a - b);
  const count = Math.min(times.length, Math.max(0, Math.floor(desiredCount)));
  return Array.from({ length: count }, (_, index) => new Date(times[count === 1 ? 0 : Math.round(index * (times.length - 1) / (count - 1))]));
}

export function yDomain(values: readonly number[]): YDomain {
  if (!values.length) return [0, 100];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 5);
  return [min - pad, max + pad];
}

/** Prefer 3–4 evenly spaced integer ticks; never extend the measured domain. */
export function yTicks([min, max]: YDomain): number[] {
  const target = Math.max(1, (max - min) / 3);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const steps = [...new Set([0.1, 1, 10].flatMap((scale) =>
    [1, 2, 3, 4, 5, 10].map((factor) => Math.max(1, Math.round(factor * magnitude * scale))),
  ))];
  const score = (step: number) => {
    const count = Math.floor(max / step) - Math.ceil(min / step) + 1;
    return Math.max(3 - count, count - 4, 0) * 100 + Math.abs(step - target) / target;
  };
  const step = steps.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
  const first = Math.ceil(min / step) * step;
  return Array.from({ length: Math.max(0, Math.floor((max - first) / step) + 1) }, (_, index) => first + index * step);
}
