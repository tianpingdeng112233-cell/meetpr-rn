import { afterEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as Notifications from 'expo-notifications';
import { planKeys } from '@/api/domains/plans';
import { PlanNotificationSession } from '../PlanNotificationSession';
const mockNavigate = jest.fn();
const mockState = { bootstrapped: true, status: 'authenticated', user: { id: '10000000-0000-4000-8000-000000000000', role: 'coached_student' } };
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('@/api/session', () => ({ useSessionStore: Object.assign((selector: (state: typeof mockState) => unknown) => selector(mockState), { getState: () => mockState }) }));
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
}));
let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); jest.clearAllMocks(); });
test('native notification response invalidates list/detail and routes to the training tab', async () => {
  const client = new QueryClient(); const plan = '20000000-0000-4000-8000-000000000000';
  client.setQueryData(planKeys.list(mockState.user.id), []); client.setQueryData(planKeys.detail(plan), {});
  await act(async () => { tree = create(<QueryClientProvider client={client}><PlanNotificationSession /></QueryClientProvider>); });
  const response = { notification: { request: { identifier: 'shift', content: { data: { kind: 'plan_shifted', student_id: mockState.user.id, plan_id: plan } } } } } as unknown as Notifications.NotificationResponse;
  await act(async () => { jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0](response); });
  expect(client.getQueryState(planKeys.list(mockState.user.id))?.isInvalidated).toBe(true);
  expect(client.getQueryState(planKeys.detail(plan))?.isInvalidated).toBe(true);
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/training');
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
  client.clear();
});
