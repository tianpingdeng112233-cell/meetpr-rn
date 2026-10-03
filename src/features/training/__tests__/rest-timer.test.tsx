import { afterEach, beforeEach, expect, test, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, Vibration } from 'react-native';
import { setLocaleOverride, t } from '@/i18n';
import { RestTimer } from '../RestTimer';
import { writeBoolean } from '../storage';
import { STORAGE_KEYS } from '../constants';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let renderer: ReactTestRenderer;
beforeEach(async () => { jest.useFakeTimers(); setLocaleOverride('en'); await writeBoolean(STORAGE_KEYS.restExplanation('student'), true); });
afterEach(() => { act(() => renderer?.unmount()); jest.useRealTimers(); jest.restoreAllMocks(); setLocaleOverride(null); });

test('countdown uses the rest overlay Skip label and accessible remaining time', async () => {
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={jest.fn()} />); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(t('student.restTimerOverlay.copy001'));
  expect(renderer.root.findAllByProps({ accessibilityLabel: t('student.restTimerOverlay.copy002', ['2:00']) }).length).toBeGreaterThan(0);
});

test('countdown progress adjusts without transitions and Skip dismisses immediately', async () => {
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={onClose} />); });
  act(() => { jest.advanceTimersByTime(30_000); });
  expect(renderer.root.findAllByProps({ accessibilityRole: 'progressbar' })[0].props.accessibilityValue.now).toBe(0.75);
  act(() => { renderer.root.findAllByProps({ accessibilityLabel: '-30s' })[0].props.onPress(); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('1:00');
  act(() => { renderer.root.findAllByProps({ accessibilityLabel: '+30s' })[0].props.onPress(); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('1:30');
  act(() => { renderer.root.findAllByProps({ accessibilityLabel: t('student.restTimerOverlay.copy001') })[0].props.onPress(); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('expiry vibrates once, shows finished copy and dismisses after three seconds', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={1} studentId="student" onClose={onClose} />); });
  act(() => { jest.advanceTimersByTime(1_000); });
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(t('student.restTimerOverlay.copy003'));
  expect(vibrate).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(2_999); });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledTimes(1);
});

test('unmount cancels an expired timer’s pending dismissal', async () => {
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={1} studentId="student" onClose={onClose} />); });
  act(() => { jest.advanceTimersByTime(1_000); renderer.unmount(); });
  act(() => { jest.advanceTimersByTime(3_000); });
  expect(onClose).not.toHaveBeenCalled();
});
