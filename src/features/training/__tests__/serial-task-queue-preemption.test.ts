import { afterEach, expect, jest, test } from '@jest/globals';
import { SerialTaskQueue } from '../serial-task-queue';

afterEach(() => { jest.useRealTimers(); });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

test('user work starts at once while queued background work is still running', async () => {
  const queue = new SerialTaskQueue();
  const background = deferred<string>();
  const order: string[] = [];
  const first = queue.enqueue(async () => { order.push('background'); return background.promise; });
  await flush();
  const user = queue.runUserTask(async () => { order.push('user'); return 'used'; });
  await expect(user).resolves.toBe('used');
  expect(order).toEqual(['background', 'user']);
  background.resolve('done');
  await expect(first).resolves.toBe('done');
});

test('preemptible work yields to user work and is started again afterwards', async () => {
  const queue = new SerialTaskQueue();
  const runs: AbortSignal[] = [];
  const attempts = [deferred<string>(), deferred<string>()];
  const burn = queue.enqueuePreemptible(yielded => {
    const attempt = attempts[runs.length]!;
    runs.push(yielded);
    yielded.addEventListener('abort', () => attempt.reject(new Error('cancelled')), { once: true });
    return attempt.promise;
  });
  await flush();
  const trim = deferred<string>();
  const user = queue.runUserTask(() => trim.promise);
  await flush();
  expect(runs).toHaveLength(1);
  expect(runs[0]!.aborted).toBe(true);
  trim.resolve('trimmed');
  await expect(user).resolves.toBe('trimmed');
  await flush();
  expect(runs).toHaveLength(2);
  expect(runs[1]!.aborted).toBe(false);
  attempts[1]!.resolve('badged');
  await expect(burn).resolves.toBe('badged');
});

test('preemptible work does not start while user work is running', async () => {
  const queue = new SerialTaskQueue();
  const trim = deferred<void>();
  const user = queue.runUserTask(() => trim.promise);
  const started = jest.fn(async () => 'badged');
  const burn = queue.enqueuePreemptible(started);
  await flush();
  expect(started).not.toHaveBeenCalled();
  trim.resolve();
  await user;
  await expect(burn).resolves.toBe('badged');
});

test('a finished result is kept even if user work arrived at the last moment', async () => {
  const queue = new SerialTaskQueue();
  const attempt = deferred<string>();
  const operation = jest.fn((_yielded: AbortSignal) => attempt.promise);
  const burn = queue.enqueuePreemptible(operation);
  await flush();
  const user = queue.runUserTask(async () => 'used');
  attempt.resolve('badged');
  await user;
  await expect(burn).resolves.toBe('badged');
  expect(operation).toHaveBeenCalledTimes(1);
});

test('yielded work that never settles is abandoned, so the queue keeps moving', async () => {
  jest.useFakeTimers();
  const queue = new SerialTaskQueue();
  let calls = 0;
  const burn = queue.enqueuePreemptible(() => (++calls === 1 ? new Promise<string>(() => {}) : Promise.resolve('badged')), 5000);
  const later = queue.enqueue(async () => 'compressed');
  await flush();
  await queue.runUserTask(async () => 'used');
  await flush();
  expect(calls).toBe(1);
  jest.advanceTimersByTime(5000);
  await flush();
  await expect(burn).resolves.toBe('badged');
  await expect(later).resolves.toBe('compressed');
});

test('a real failure of preemptible work is reported, not retried', async () => {
  const queue = new SerialTaskQueue();
  const operation = jest.fn(async () => { throw new Error('encoder'); });
  await expect(queue.enqueuePreemptible(operation)).rejects.toThrow('encoder');
  expect(operation).toHaveBeenCalledTimes(1);
});
