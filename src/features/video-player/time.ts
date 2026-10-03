export function timeText(seconds: number): string {
  const whole = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
export function seekTime(position: { seconds: number } | { milliseconds: number }, durationSeconds: number): number {
  const seconds = 'seconds' in position ? position.seconds : position.milliseconds / 1000;
  const duration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  return Number.isFinite(seconds) ? Math.min(Math.max(0, seconds), duration) : 0;
}
