import { describe, expect, test } from '@jest/globals';

import { StudentTodayRefreshThrottle } from '../refresh-throttle';
import { LoadGeneration } from '../load-generation';
import { SerialTaskQueue } from '../serial-task-queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('training async controls', () => {
  test('loadGeneration rejects a stale cross-day review result', async () => {
    const generations = new LoadGeneration();
    let visibleReview = '';
    const first = deferred();
    const second = deferred();

    const firstGeneration = generations.begin('review');
    const firstLoad = first.promise.then(() => {
      if (generations.isCurrent('review', firstGeneration)) {
        visibleReview = '2026-07-18';
      }
    });
    const secondGeneration = generations.begin('review');
    const secondLoad = second.promise.then(() => {
      if (generations.isCurrent('review', secondGeneration)) {
        visibleReview = '2026-07-19';
      }
    });

    second.resolve();
    await secondLoad;
    first.resolve();
    await firstLoad;
    expect(visibleReview).toBe('2026-07-19');
  });

  test('keeps independent load scopes from invalidating each other', () => {
    const generations = new LoadGeneration();
    const review = generations.begin('review');
    const e1rm = generations.begin('e1rm');
    expect(generations.isCurrent('review', review)).toBe(true);
    expect(generations.isCurrent('e1rm', e1rm)).toBe(true);
  });

  test('runs persistence operations serially even after a rejection', async () => {
    const queue = new SerialTaskQueue();
    const gate = deferred();
    const order: string[] = [];
    const first = queue.enqueue(async () => {
      order.push('first:start');
      await gate.promise;
      order.push('first:end');
      throw new Error('expected');
    });
    const second = queue.enqueue(async () => {
      order.push('second');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);
    gate.resolve();
    await expect(first).rejects.toThrow('expected');
    await second;
    expect(order).toEqual(['first:start', 'first:end', 'second']);
  });
});

test('returning within 25 seconds refreshes volatile state; the boundary triggers a full refresh', () => {
  const throttle = new StudentTodayRefreshThrottle();
  expect(throttle.refreshWhenReturning(0)).toBe('full');
  expect(throttle.refreshWhenReturning(24_999)).toBe('volatileOnly');
  expect(throttle.refreshWhenReturning(25_000)).toBe('full');
  throttle.recordFullRefresh(40_000);
  expect(throttle.refreshWhenReturning(64_999)).toBe('volatileOnly');
  expect(throttle.refreshWhenReturning(65_000)).toBe('full');
});
