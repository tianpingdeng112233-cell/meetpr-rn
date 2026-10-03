export type UploadFailure = 'network' | 'deterministic' | 'unknown';
export type RetryState = {
  failureCount: number;
  firstFailureAt: number;
  lastFailureAt: number;
  failure: UploadFailure;
};
export type RetryDecision =
  | { kind: 'immediate' }
  | { kind: 'scheduled'; retryAt: number }
  | { kind: 'terminal' };
const DELAYS = [60_000, 120_000, 300_000, 600_000, 900_000];
export const UPLOAD_RETRY_WINDOW_MS = 30 * 60_000;
export function UploadRetryScheduler(
  input: RetryState & { now: number; networkRestored?: boolean },
): RetryDecision {
  const deadline = input.firstFailureAt + UPLOAD_RETRY_WINDOW_MS;
  if (
    input.failure === 'deterministic' ||
    input.failureCount > DELAYS.length ||
    input.now >= deadline
  )
    return { kind: 'terminal' };
  const retryAt = Math.min(
    deadline,
    input.lastFailureAt + DELAYS[Math.max(0, input.failureCount - 1)],
  );
  return input.networkRestored || input.now >= retryAt
    ? { kind: 'immediate' }
    : { kind: 'scheduled', retryAt };
}
