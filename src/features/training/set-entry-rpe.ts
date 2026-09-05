/** Geometry and gesture contract mirrored from iOS SetEntryRPE. */
export function snap(value: number): number {
  return Math.min(10, Math.max(5, Math.round(value * 2) / 2));
}

export function index(value: number): number {
  return Math.round((snap(value) - 5) * 2);
}

export function cellWidth(width: number, spacing: number): number {
  return (width - 10 * spacing) / 11;
}

export function centerX(index: number, width: number, spacing: number): number {
  const cell = cellWidth(width, spacing);
  return cell > 0 ? cell / 2 + index * (cell + spacing) : 0;
}

export function valueAtX(x: number, width: number, spacing: number): number {
  const cell = cellWidth(width, spacing);
  if (width <= 0 || cell <= 0) return 5;
  return 5 + Math.min(10, Math.max(0, Math.round((x - cell / 2) / (cell + spacing)))) * 0.5;
}

export type ScrubIntent = 'idle' | 'scrub' | 'scroll';

export function intent(dx: number, dy: number, threshold = 6): ScrubIntent {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return 'idle';
  return Math.abs(dx) >= Math.abs(dy) ? 'scrub' : 'scroll';
}

export function lockedIntent(current: ScrubIntent, dx: number, dy: number): ScrubIntent {
  return current === 'idle' ? intent(dx, dy) : current;
}

export function commitsOnRelease(intent: ScrubIntent): boolean {
  return intent === 'idle';
}

export function barHeight(value: number, selected: number): number {
  return Math.abs(value - snap(selected)) < 0.01 ? 32 : Number.isInteger(value) ? 22 : 13;
}

export function isLit(value: number, selected: number): boolean {
  return value <= snap(selected) + 0.01;
}
