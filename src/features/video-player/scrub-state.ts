import { seekTime } from './time';

type Schedule = (callback: () => void, delay: number) => (() => void) | void;
const defaultSchedule: Schedule = (callback, delay) => {
  const timer = setTimeout(callback, delay);
  return () => clearTimeout(timer);
};

/** Owns the gesture and its delayed seeks; cancel invalidates even queued callbacks. */
export class FeedbackVideoScrubState {
  private dragging = false;
  private seconds = 0;
  private generation = 0;
  private pending = false;
  private cancelTimer: (() => void) | void = undefined;

  constructor(
    private readonly seek: (seconds: number, commitsPosition: boolean) => void,
    private readonly schedule: Schedule = defaultSchedule,
  ) {}

  get isDragging() { return this.dragging; }
  get currentGeneration() { return this.generation; }
  displayedSeconds(currentSeconds: number): number {
    return this.dragging ? this.seconds : currentSeconds;
  }
  begin(seconds: number, duration: number) {
    this.cancel();
    this.dragging = true;
    this.move(seconds, duration);
  }
  move(seconds: number, duration: number) {
    if (!this.dragging) return;
    this.seconds = seekTime({ seconds }, duration);
    if (this.pending) return;
    this.pending = true;
    const generation = this.generation;
    this.cancelTimer = this.schedule(() => {
      if (generation !== this.generation || !this.dragging) return;
      this.pending = false;
      this.seek(this.seconds, false);
    }, 80);
  }
  finish(seconds: number, duration: number) {
    const position = seekTime({ seconds }, duration);
    this.cancel();
    this.seek(position, true);
  }
  cancel() {
    this.generation += 1;
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.pending = false;
    this.dragging = false;
  }
}
