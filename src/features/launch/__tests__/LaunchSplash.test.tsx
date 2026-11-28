import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { AccessibilityInfo } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { LaunchSplash } from '../LaunchSplash';

const splashIn = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(node => node.props.testID === 'launch-splash' && typeof node.type === 'string');

async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('holds until the first screen is ready, then fades out once', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const onGone = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<LaunchSplash onGone={onGone} ready={false} />); });

  await advance(1300);
  // Entrance done, first screen still loading: the splash stays up.
  await advance(3000);
  expect(splashIn(renderer)).toHaveLength(1);
  expect(onGone).not.toHaveBeenCalled();

  await act(async () => { renderer.update(<LaunchSplash onGone={onGone} ready />); });
  await advance(400);
  expect(splashIn(renderer)).toHaveLength(0);
  expect(onGone).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('a ready first screen still waits for the entrance to finish', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const onGone = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<LaunchSplash onGone={onGone} ready />); });

  await advance(900);
  expect(splashIn(renderer)).toHaveLength(1);
  expect(onGone).not.toHaveBeenCalled();

  await advance(800);
  expect(splashIn(renderer)).toHaveLength(0);
  expect(onGone).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('reduce motion skips the entrance', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const onGone = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<LaunchSplash onGone={onGone} ready />); });

  await advance(400);
  expect(splashIn(renderer)).toHaveLength(0);
  expect(onGone).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
