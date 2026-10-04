export type TrimmedVideo = { uri: string; durationMs: number };
export type TrimOutcome = { type: 'saved'; video: TrimmedVideo } | { type: 'cancelled' | 'failed' };

/** One owner for the working copy, thumbnails and any export that loses completion. */
export class TrimSession {
  private finished = false;
  private deliveredUri: string | null = null;
  private readonly files = new Set<string>();

  constructor(private readonly effects: {
    remove: (uri: string) => unknown;
    cancelExport: () => void;
    onOutcome: (outcome: TrimOutcome) => void;
  }) {}

  get active() { return !this.finished; }

  own(uri: string) {
    if (this.finished) {
      if (uri !== this.deliveredUri) this.effects.remove(uri);
      return;
    }
    this.files.add(uri);
  }

  saved(video: TrimmedVideo) {
    if (this.finished) {
      if (video.uri !== this.deliveredUri) this.effects.remove(video.uri);
      return;
    }
    this.deliveredUri = video.uri;
    this.finish({ type: 'saved', video });
  }

  cancelled() { this.finish({ type: 'cancelled' }); }
  failed() { this.finish({ type: 'failed' }); }

  dispose() {
    if (this.finished) return;
    this.finish();
  }

  private finish(outcome?: TrimOutcome) {
    if (this.finished) return;
    this.finished = true;
    if (outcome?.type !== 'saved') this.effects.cancelExport();
    for (const uri of this.files) {
      if (uri !== this.deliveredUri) this.effects.remove(uri);
    }
    this.files.clear();
    if (outcome) this.effects.onOutcome(outcome);
  }
}
