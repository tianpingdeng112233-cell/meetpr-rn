import { afterEach, beforeEach, expect, test, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Text, Vibration } from 'react-native';
import { setLocaleOverride, t } from '@/i18n';
import { RestTimer } from '../RestTimer';
import { writeBoolean } from '../storage';
import { STORAGE_KEYS } from '../constants';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockNative = {
  show: jest.fn(), hide: jest.fn(),
  isPermissionGranted: jest.fn(() => true),
  consumeState: jest.fn((): { endAtEpochMs: number | null; skipped: boolean } => ({ endAtEpochMs: null, skipped: false })),
};
let appStateChanged: (state: 'active' | 'background') => void;
let renderer: ReactTestRenderer;
beforeEach(async () => { jest.useFakeTimers(); AppState.currentState = 'active'; jest.clearAllMocks(); jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule').mockReturnValue(mockNative); mockNative.consumeState.mockReturnValue({ endAtEpochMs: null, skipped: false }); jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { appStateChanged = listener; return { remove: jest.fn() }; }); setLocaleOverride('en'); await writeBoolean(STORAGE_KEYS.restExplanation('student'), true); });
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


test('foreground remaining time follows the notification extension', async () => {
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={jest.fn()} />); });
  act(() => appStateChanged?.('background'));
  mockNative.consumeState.mockReturnValue({ endAtEpochMs: Date.now() + 150_000, skipped: false });
  act(() => appStateChanged?.('active'));
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('2:30');
  expect(mockNative.hide).toHaveBeenCalled();
});

test('notification Skip closes the overlay and calls onClose exactly once on foreground', async () => {
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={onClose} />); });
  act(() => appStateChanged('background'));
  mockNative.consumeState.mockReturnValue({ endAtEpochMs: null, skipped: true });
  act(() => { appStateChanged('active'); appStateChanged('active'); jest.advanceTimersByTime(5_000); });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(renderer.toJSON()).toBeNull();
});

test('background expiry preserves the native alarm and does not vibrate or dismiss from JS', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={1} studentId="student" onClose={onClose} />); });
  act(() => appStateChanged('background'));
  mockNative.hide.mockClear();
  act(() => jest.advanceTimersByTime(5_000));
  expect(mockNative.hide).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(vibrate).not.toHaveBeenCalled();
});

test('explanation and rest settings suppress background notifications until dismissed', async () => {
  await writeBoolean(STORAGE_KEYS.restExplanation('student'), false);
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={jest.fn()} />); });
  act(() => appStateChanged('background'));
  expect(mockNative.show).not.toHaveBeenCalled();
  act(() => appStateChanged('active'));
  act(() => renderer.root.findAllByProps({ label: t('student.restTimerExplanationView.copy005') })[0].props.onPress());
  act(() => appStateChanged('background'));
  expect(mockNative.show).toHaveBeenCalledTimes(1);
});

test('changing duration replaces the end and unmount cancels native notifications', async () => {
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} studentId="student" onClose={jest.fn()} />); });
  act(() => jest.advanceTimersByTime(30_000));
  await act(async () => renderer.update(<RestTimer durationSeconds={180} studentId="student" onClose={jest.fn()} />));
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain('3:00');
  act(() => appStateChanged('background'));
  expect(mockNative.show).toHaveBeenLastCalledWith(Date.now() + 180_000, Date.now(), '', expect.objectContaining({ title: 'Rest between sets', skip: 'Skip', add: '+30s' }));
  mockNative.hide.mockClear();
  act(() => renderer.unmount());
  expect(mockNative.hide).toHaveBeenCalledTimes(1);
});

test('returning after background expiry clears notifications without a second vibration', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  const onClose = jest.fn();
  await act(async () => { renderer = create(<RestTimer durationSeconds={1} studentId="student" onClose={onClose} />); });
  act(() => { appStateChanged('background'); jest.advanceTimersByTime(2_000); appStateChanged('active'); });
  expect(vibrate).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(t('student.restTimerOverlay.copy003'));
  act(() => jest.advanceTimersByTime(3_000));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each(['Competition Deadlift', undefined])('background notification receives the rest start and exercise body (%s)', async exerciseName => {
  const startedAt = Date.now();
  await act(async () => { renderer = create(<RestTimer durationSeconds={120} exerciseName={exerciseName} studentId="student" onClose={jest.fn()} />); });
  act(() => { jest.advanceTimersByTime(30_000); appStateChanged('background'); });
  expect(mockNative.show).toHaveBeenLastCalledWith(startedAt + 120_000, startedAt, exerciseName ?? '', expect.objectContaining({ title: 'Rest between sets' }));
});
