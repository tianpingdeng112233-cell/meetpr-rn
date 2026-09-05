import type { FeedbackVideoMarker } from './types';

export type AnnotationFrame = FeedbackVideoMarker & { generation: number };
export class FeedbackVideoAnnotationSelection {
  private selected: AnnotationFrame | null = null;
  private generation = 0;
  constructor(private readonly effects: {
    pause: () => void;
    seek: (milliseconds: number) => void;
    changed: (frame: AnnotationFrame | null) => void;
    refresh: () => unknown;
  }) {}
  select(marker: FeedbackVideoMarker): AnnotationFrame | null {
    if (!marker.annotationURL) {
      this.effects.seek(marker.timeMs);
      return null;
    }
    this.effects.pause();
    this.effects.seek(marker.timeMs);
    this.selected = { ...marker, generation: ++this.generation };
    this.effects.changed(this.selected);
    return this.selected;
  }
  close() {
    this.selected = null;
    this.effects.changed(null);
  }
  loadFailed(frame: AnnotationFrame) {
    if (this.selected?.generation !== frame.generation) return;
    this.close();
    // Optional-surface failures never introduce a second error UI.
    try { void Promise.resolve(this.effects.refresh()).catch(() => {}); } catch {}
  }
}
