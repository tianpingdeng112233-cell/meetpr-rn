import { expect, jest, test } from '@jest/globals';
import type { SetLogUpsertRequest, SetLogUpsertResponse } from '@/api/domains/sets';
import { createSetSender } from '../sender';
import type { PendingSet } from '../queue';

const entry: PendingSet = { id: 1, stableSetId: 'set', dayId: 'day', exerciseId: 'squat', loggedDate: '2026-11-05', remove: false, status: 'pending', attempts: 0, retryAt: 0,
  request: { plan_exercise_id: 'deleted', set_index: 0, weight_kg: '80', reps: 5, rpe: '8', actual_rir: null, completed: true, failed: false },
  log: { id: 'local:set', student_id: 'alice', plan_exercise_id: 'deleted', plan_day_id: 'day', exercise_id: 'squat', set_index: 0, weight_kg: '80', reps: 5, rpe: '8', completed: true, failed: false, adhoc: false, assumed: false, logged_date: '2026-11-05', logged_at: '2026-11-05T12:00:00Z' } };

test('confirmed missing prescription converts to student-added and persists its identity before sending', async () => {
  const missing = { status: 400, code: 'SETS_PLAN_EXERCISE_NOT_PUBLISHED' };
  const upsert = jest.fn<(request: SetLogUpsertRequest) => Promise<SetLogUpsertResponse>>().mockRejectedValueOnce(missing).mockResolvedValue({ id: 'server', logged_at: entry.log.logged_at });
  const replace = jest.fn(async (_request: SetLogUpsertRequest) => {});
  const send = createSetSender({ upsert, remove: jest.fn(async () => {}), missingExercise: async () => true, nextAddedIndex: async () => 2 });
  await send(entry, replace);
  expect(replace).toHaveBeenCalledWith({ exercise_id: 'squat', plan_day_id: 'day', logged_date: '2026-11-05', set_index: 2, weight_kg: '80', reps: 5, rpe: '8', actual_rir: null, completed: true, failed: false });
  expect(upsert.mock.calls[1][0]).toEqual(replace.mock.calls[0][0]);
  expect(replace.mock.invocationCallOrder[0]).toBeLessThan(upsert.mock.invocationCallOrder[1]);
});

test('ambiguous unavailable plan is retained as failed rather than rewriting unrelated data', async () => {
  const missing = { status: 400, code: 'SETS_PLAN_EXERCISE_NOT_PUBLISHED' };
  const upsert = jest.fn<(request: SetLogUpsertRequest) => Promise<SetLogUpsertResponse>>().mockRejectedValue(missing);
  const send = createSetSender({ upsert, remove: jest.fn(async () => {}), missingExercise: async () => false, nextAddedIndex: async () => 0 });
  await expect(send(entry, jest.fn(async () => {}))).rejects.toBe(missing); expect(upsert).toHaveBeenCalledTimes(1);
});
