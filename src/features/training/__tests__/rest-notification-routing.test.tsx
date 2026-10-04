import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RestTimerNotificationSession } from '../RestTimerNotificationSession';

const mockNavigate = jest.fn();
const mockState = { bootstrapped: false, status: 'authenticated', user: { role: 'coached_student' } };
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('@/api/session', () => ({ useSessionStore: (select: (state: typeof mockState) => unknown) => select(mockState) }));
let listener: () => void;
let pending = true;
const native = {
  consumeOpenRequest: jest.fn(() => { const result = pending; pending = false; return result; }),
  addListener: jest.fn((_: string, callback: () => void) => { listener = callback; return { remove: jest.fn() }; }),
};
let tree: ReactTestRenderer;
afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); });
test('cold and warm notification taps open training only after student bootstrap and are consumed once', async () => {
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule').mockReturnValue(native);
  await act(async () => { tree = create(<RestTimerNotificationSession />); });
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(native.consumeOpenRequest).not.toHaveBeenCalled();
  mockState.bootstrapped = true;
  await act(async () => tree.update(<RestTimerNotificationSession />));
  expect(mockNavigate).toHaveBeenCalledWith('/(student)/training');
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  act(() => listener());
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  pending = true;
  act(() => listener());
  expect(mockNavigate).toHaveBeenCalledTimes(2);
});
