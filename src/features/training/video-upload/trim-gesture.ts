export type TrimDrag = {
  touchStartPageX: number;
  handleStartSeconds: number;
  secondsPerPoint: number;
};

/** Calibrate at touch down, preserving the finger's offset from the handle center. */
export function trimSecondsAtTouch(pageX: number, drag: TrimDrag): number {
  return drag.handleStartSeconds + (pageX - drag.touchStartPageX) * drag.secondsPerPoint;
}

export function playheadSecondsAtTouch(pageX: number, drag: TrimDrag, duration: number): number {
  return Math.max(0, Math.min(duration, trimSecondsAtTouch(pageX, drag)));
}

export function trimTimeText(seconds: number): string {
  const hundredths = Math.round(Math.max(0, seconds) * 100);
  return `${String(Math.floor(hundredths / 6000)).padStart(2, '0')}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
}
