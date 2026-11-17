export type RestTimerPreference = {
  main: number;
  accessory: number;
  vibration: boolean;
  sound: boolean;
};
export const defaultRestPreference: RestTimerPreference = {
  main: 180,
  accessory: 60,
  vibration: true,
  sound: true,
};
export function clampRestSeconds(seconds: number): number {
  return Math.max(
    30,
    Math.min(
      600,
      Math.round((Number.isFinite(seconds) ? seconds : 180) / 15) * 15,
    ),
  );
}
export function durationText(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
