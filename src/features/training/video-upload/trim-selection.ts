export type TrimSelection = {
  sourceDurationSeconds: number;
  maxDurationSeconds: number;
  startSeconds: number;
  endSeconds: number;
};

export function createTrimSelection(sourceDurationSeconds: number, maxDurationSeconds: number): TrimSelection {
  sourceDurationSeconds = Math.max(0, Number.isFinite(sourceDurationSeconds) ? sourceDurationSeconds : 0);
  maxDurationSeconds = Math.max(0, Number.isFinite(maxDurationSeconds) ? maxDurationSeconds : 0);
  return { sourceDurationSeconds, maxDurationSeconds, startSeconds: 0, endSeconds: Math.min(sourceDurationSeconds, maxDurationSeconds) };
}

export function isTrimSelectionValid(selection: TrimSelection): boolean {
  const duration = selection.endSeconds - selection.startSeconds;
  return duration > 0 && duration <= selection.maxDurationSeconds;
}

export function moveTrimStart(selection: TrimSelection, proposedSeconds: number): TrimSelection {
  if (selection.sourceDurationSeconds <= 0 || !Number.isFinite(proposedSeconds)) return selection;
  const result = { ...selection };
  const minimum = Math.min(0.1, result.sourceDurationSeconds);
  result.startSeconds = Math.min(Math.max(proposedSeconds, 0), Math.max(0, result.sourceDurationSeconds - minimum));
  if (result.endSeconds - result.startSeconds < minimum) {
    result.endSeconds = Math.min(result.sourceDurationSeconds, result.startSeconds + minimum);
    result.startSeconds = Math.min(result.startSeconds, Math.max(0, result.endSeconds - minimum));
  }
  if (result.endSeconds - result.startSeconds > result.maxDurationSeconds) {
    result.endSeconds = Math.min(result.sourceDurationSeconds, result.startSeconds + result.maxDurationSeconds);
  }
  return result;
}

export function moveTrimEnd(selection: TrimSelection, proposedSeconds: number): TrimSelection {
  if (selection.sourceDurationSeconds <= 0 || !Number.isFinite(proposedSeconds)) return selection;
  const result = { ...selection };
  const minimum = Math.min(0.1, result.sourceDurationSeconds);
  result.endSeconds = Math.min(Math.max(proposedSeconds, minimum), result.sourceDurationSeconds);
  if (result.endSeconds - result.startSeconds < minimum) {
    result.startSeconds = Math.max(0, result.endSeconds - minimum);
    result.endSeconds = Math.max(result.endSeconds, Math.min(result.sourceDurationSeconds, result.startSeconds + minimum));
  }
  if (result.endSeconds - result.startSeconds > result.maxDurationSeconds) {
    result.startSeconds = Math.max(0, result.endSeconds - result.maxDurationSeconds);
  }
  return result;
}
