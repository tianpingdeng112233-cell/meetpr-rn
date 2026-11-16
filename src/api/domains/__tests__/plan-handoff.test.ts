import { beforeEach, test, expect, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticatedRequest } from '@/api/session';
import { selectDashboardPlan } from '@/features/history/summary-model';
import { plansRepository, currentPlanSummary, PlanHandoffSchema } from '../plans';
import consecutive from '../__fixtures__/plan-handoff/three-consecutive.json';
import abandoned from '../__fixtures__/plan-handoff/abandoned-tail.json';
import completed from '../__fixtures__/plan-handoff/all-completed.json';
import empty from '../__fixtures__/plan-handoff/no-plans.json';
import feedback from '../__fixtures__/plan-handoff/feedback.json';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/api/session', () => ({ authenticatedRequest: jest.fn(), useSessionStore: { getState: () => ({ user: null }) } }));
const studentId = feedback.plans[0].trainee_id;
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });
test('cold start uses the server current even when a later cycle was published', async () => {
  jest.mocked(authenticatedRequest).mockResolvedValue(feedback);
  const result = await plansRepository.handoff(studentId);
  expect(currentPlanSummary(result)?.id).toBe(feedback.current_plan_id);
  expect(result.plans[1].handoff_status).toBe('upcoming');
  expect(authenticatedRequest).toHaveBeenCalledWith(`/students/${studentId}/plan-handoff`, expect.anything());
});
test('404 before deployment falls back to the legacy list; a cached server decision wins offline', async () => {
  jest.mocked(authenticatedRequest).mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({ plans: feedback.plans });
  expect(currentPlanSummary(await plansRepository.handoff(studentId))?.id).toBe(feedback.plans[1].id);
  jest.mocked(authenticatedRequest).mockResolvedValueOnce(feedback);
  await plansRepository.handoff(studentId);
  jest.mocked(authenticatedRequest).mockRejectedValue(new Error('offline'));
  expect(currentPlanSummary(await plansRepository.handoff(studentId))?.id).toBe(feedback.current_plan_id);
});
test('dashboard selection takes the same authoritative current id', async () => {
  expect(selectDashboardPlan(PlanHandoffSchema.parse(feedback))?.id).toBe(feedback.current_plan_id);
});

test.each([
  ['feedback', feedback, '10000000-0000-4000-8000-000000000001'],
  ['three consecutive', consecutive, '10000000-0000-4000-8000-000000000001'],
  ['abandoned tail', abandoned, '10000000-0000-4000-8000-000000000002'],
  ['all completed', completed, '10000000-0000-4000-8000-000000000002'],
  ['no plans / no accepted binding', empty, null],
] satisfies [string, unknown, string | null][])('%s survives restart with the same server decision', async (_, fixture, expected) => {
  jest.mocked(authenticatedRequest).mockResolvedValueOnce(fixture);
  expect((await plansRepository.handoff(studentId)).current_plan_id).toBe(expected);
  jest.mocked(authenticatedRequest).mockRejectedValue(new Error('offline'));
  expect((await plansRepository.handoff(studentId)).current_plan_id).toBe(expected);
});

test('refresh, completion and undo follow the server without editing any fixture records', async () => {
  const before = JSON.stringify(feedback);
  const advanced = { ...feedback, current_plan_id: feedback.plans[1].id, plans: feedback.plans.map((p, i) => ({ ...p, handoff_status: i ? 'current' : 'past', completed_training_days: i ? 0 : 20 })) };
  jest.mocked(authenticatedRequest).mockResolvedValueOnce(feedback).mockResolvedValueOnce(advanced).mockResolvedValueOnce(advanced).mockResolvedValueOnce(feedback);
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push((await plansRepository.handoff(studentId)).current_plan_id);
  expect(ids).toEqual([feedback.plans[0].id, feedback.plans[1].id, feedback.plans[1].id, feedback.plans[0].id]);
  expect(JSON.stringify(feedback)).toBe(before);
});

test('a corrupt cache is ignored and full-list requests never share the filtered query key', async () => {
  await AsyncStorage.setItem(`plans.handoff.v1.${studentId}.${studentId}`, '{broken');
  jest.mocked(authenticatedRequest).mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({ plans: feedback.plans });
  expect((await plansRepository.handoff(studentId)).current_plan_id).toBe(feedback.plans[1].id);
  jest.mocked(authenticatedRequest).mockResolvedValueOnce({ plans: feedback.plans });
  await plansRepository.list(studentId, { includeAll: true });
  expect(authenticatedRequest).toHaveBeenLastCalledWith(`/students/${studentId}/plans?include_all=true`, expect.anything());
});
