import { test, expect } from '@jest/globals';
import { UploadRetryScheduler } from '../retry-scheduler';

test.each([
  [1, 60000],
  [2, 120000],
  [3, 300000],
  [4, 600000],
  [5, 900000],
])('network failure %i waits %i ms', (failureCount, delay) => {
  expect(
    UploadRetryScheduler({
      failureCount,
      firstFailureAt: 1000,
      lastFailureAt: 1000,
      now: 1000,
      failure: 'network',
    }),
  ).toEqual({ kind: 'scheduled', retryAt: 1000 + delay });
});
const base = {
  failureCount: 1,
  firstFailureAt: 0,
  lastFailureAt: 0,
  now: 0,
  failure: 'network' as const,
};
test('network restoration jumps the queue, but never extends the time box', () => {
  expect(UploadRetryScheduler({ ...base, networkRestored: true })).toEqual({
    kind: 'immediate',
  });
  expect(
    UploadRetryScheduler({ ...base, networkRestored: true, now: 1800000 }),
  ).toEqual({ kind: 'terminal' });
});
test('deterministic failures and exhausted rounds are terminal', () => {
  expect(UploadRetryScheduler({ ...base, failure: 'deterministic' })).toEqual({
    kind: 'terminal',
  });
  expect(UploadRetryScheduler({ ...base, failureCount: 6 })).toEqual({
    kind: 'terminal',
  });
});
test('restart waits only the remaining delay and caps it at the deadline', () => {
  expect(UploadRetryScheduler({ ...base, now: 30000 })).toEqual({
    kind: 'scheduled',
    retryAt: 60000,
  });
  expect(UploadRetryScheduler({ ...base, now: 60000 })).toEqual({
    kind: 'immediate',
  });
  expect(
    UploadRetryScheduler({
      ...base,
      failureCount: 5,
      lastFailureAt: 1200000,
      now: 1200000,
    }),
  ).toEqual({ kind: 'scheduled', retryAt: 1800000 });
});
test('unknown failures use network policy', () => {
  expect(UploadRetryScheduler({ ...base, failure: 'unknown' })).toEqual({
    kind: 'scheduled',
    retryAt: 60000,
  });
});
