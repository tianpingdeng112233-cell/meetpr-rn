export type TrimDrag = {
  touchStartPageX: number;
  handleStartSeconds: number;
  secondsPerPoint: number;
};

/** Calibrate at touch down, preserving the finger's offset from the handle center. */
export function trimSecondsAtTouch(pageX: number, drag: TrimDrag): number {
  return drag.handleStartSeconds + (pageX - drag.touchStartPageX) * drag.secondsPerPoint;
}
