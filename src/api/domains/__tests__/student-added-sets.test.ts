import { expect, jest, test } from '@jest/globals';
import { ApiError } from '@/api/client';
import { authenticatedRequest } from '@/api/session';
import { SetLogSchema, AdhocSetLogRequestSchema, setsRepository } from '../sets';

jest.mock('@/api/session', () => ({ authenticatedRequest: jest.fn() }));
const id = '10000000-0000-4000-8000-000000000000';
const raw = { id, student_id: id, plan_exercise_id: null, exercise_id: id, set_index: 0, weight_kg: '12.5', reps: 12, rpe: null, completed: true, failed: false, assumed: false, adhoc: true, logged_date: '2026-10-14', logged_at: '2026-10-14T12:00:00Z' };
test('old responses default plan_day_id to null and new responses retain the training day', () => {
  expect(SetLogSchema.parse(raw).plan_day_id).toBeNull();
  expect(SetLogSchema.parse({ ...raw, plan_day_id: id }).plan_day_id).toBe(id);
  expect(AdhocSetLogRequestSchema.parse({ exercise_id: id, plan_day_id: id, logged_date: raw.logged_date, set_index: 0, weight_kg: '12.5', reps: 12, completed: true })).toMatchObject({ plan_day_id: id });
});
test('delete uses DELETE sets/id, accepts an already deleted row and propagates feedback conflicts', async () => {
  jest.mocked(authenticatedRequest).mockResolvedValueOnce(undefined);
  await setsRepository.remove(id);
  expect(authenticatedRequest).toHaveBeenLastCalledWith(`/sets/${id}`, { method: 'DELETE' });
  jest.mocked(authenticatedRequest).mockRejectedValueOnce(Object.assign(new ApiError('backend', 'Gone', { status: 404 }), { code: 'SET_NOT_FOUND' }));
  await expect(setsRepository.remove(id)).resolves.toBeUndefined();
  jest.mocked(authenticatedRequest).mockRejectedValueOnce(Object.assign(new ApiError('backend', 'Rated', { status: 409 }), { code: 'SET_HAS_COACH_FEEDBACK' }));
  await expect(setsRepository.remove(id)).rejects.toMatchObject({ code: 'SET_HAS_COACH_FEEDBACK' });
});
