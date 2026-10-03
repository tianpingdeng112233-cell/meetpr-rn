import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Text, Vibration } from 'react-native';
import { RewardMedalMotion } from '../TrainingRewardMotion';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let renderer: ReactTestRenderer;
afterEach(() => { if (renderer) act(() => renderer.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

test.each([false, true])('celebration emits success and stamp once with Reduce Motion = %s', async reduced => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {}).mockClear();
  await act(async () => { renderer = create(<RewardMedalMotion><Text>Completed</Text></RewardMedalMotion>); });
  act(() => { jest.advanceTimersByTime(1200); });
  expect(vibrate.mock.calls).toEqual([[[0, 15, 30, 25]], [40]]);
  await act(async () => { renderer.update(<RewardMedalMotion><Text>Completed again</Text></RewardMedalMotion>); });
  act(() => { jest.advanceTimersByTime(1200); });
  expect(vibrate).toHaveBeenCalledTimes(2);
});

test('leaving celebration before the stamp cancels its pending feedback', async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {}).mockClear();
  await act(async () => { renderer = create(<RewardMedalMotion><Text>Completed</Text></RewardMedalMotion>); });
  act(() => { renderer.unmount(); });
  act(() => { jest.advanceTimersByTime(1200); });
  expect(vibrate).toHaveBeenCalledTimes(1);
});
