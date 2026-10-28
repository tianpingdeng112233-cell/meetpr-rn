import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { AndroidUpdateSession } from '../AndroidUpdateSession';
import { checkForAndroidUpdate } from '../android-update';
import { setLocaleOverride } from '@/i18n';

jest.mock('expo-application', () => ({ applicationId: 'com.meetpr.app', nativeBuildVersion: '4' }));
jest.mock('@/config/build-track', () => ({ BUILD_TRACK: 'china' }));
jest.mock('../android-update', () => ({
  ...jest.requireActual<typeof import('../android-update')>('../android-update'),
  checkForAndroidUpdate: jest.fn(),
}));

const check = jest.mocked(checkForAndroidUpdate);
const release = { schemaVersion: 1, packageName: 'com.meetpr.app', versionCode: 10, versionName: '0.1.1', releaseNotes: 'Update', downloadUrl: 'https://dl.meetpr.cn/android/releases/10/meetpr-cn.apk' } as const;
const originalState = AppState.currentState;
const removeListener = jest.fn();
let tree: ReactTestRenderer;
let changeState: (state: AppStateStatus) => void;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-25T00:00:00Z'));
  check.mockReset().mockResolvedValue(null);
  removeListener.mockClear();
  setLocaleOverride('en');
  jest.replaceProperty(Platform, 'OS', 'android');
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    changeState = listener;
    return { remove: removeListener };
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
  setLocaleOverride(null);
  AppState.currentState = originalState;
});

test.each(['Not now', 'Download update'])('after choosing %s only a higher versionCode is offered again', async choice => {
  check.mockResolvedValue(release);
  await mount();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.mocked(Alert.alert).mock.calls[0][2]!.find(button => button.text === choice)!.onPress?.();
  });
  await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
  await resume();
  expect(check).toHaveBeenCalledTimes(2);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  check.mockResolvedValue({ ...release, versionCode: 11, versionName: '0.1.2', downloadUrl: 'https://dl.meetpr.cn/android/releases/11/meetpr-cn.apk' });
  await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
  await resume();
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  expect(jest.mocked(Alert.alert).mock.calls[1][0]).toBe('New version 0.1.2 available');
  check.mockResolvedValue({ ...release, versionCode: 9 });
  await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
  await resume();
  expect(Alert.alert).toHaveBeenCalledTimes(2);
});
async function mount() {
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
}
async function resume() {
  await act(async () => { changeState('background'); changeState('active'); });
}

test('cold startup checks once and foreground checks resume only after more than six hours', async () => {
  await mount();
  expect(check).toHaveBeenCalledTimes(1);
  await act(async () => { tree.update(<AndroidUpdateSession enabled />); });
  await resume();
  expect(check).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
  await resume();
  expect(check).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  await act(async () => { changeState('active'); });
  expect(check).toHaveBeenCalledTimes(1);
  await resume();
  expect(check).toHaveBeenCalledTimes(2);
  await resume();
  expect(check).toHaveBeenCalledTimes(2);
});

test.each(['failed result', 'rejection'])('a later %s does not postpone retry on the next foreground', async failure => {
  await mount();
  if (failure === 'rejection') check.mockRejectedValueOnce(new Error('offline'));
  else check.mockResolvedValueOnce(undefined);
  await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
  await resume();
  expect(check).toHaveBeenCalledTimes(2);
  check.mockResolvedValue(release);
  await resume();
  expect(check).toHaveBeenCalledTimes(3);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});

test('foreground transitions do not overlap a pending check and a late result waits until active', async () => {
  let finish!: (value: typeof release) => void;
  check.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await resume();
  expect(check).toHaveBeenCalledTimes(1);
  await act(async () => { changeState('background'); finish(release); });
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { changeState('active'); });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(check).toHaveBeenCalledTimes(1);
});

test('disabled readiness gates foreground checks and iOS never checks', async () => {
  await mount();
  const listener = changeState;
  await act(async () => { tree.update(<AndroidUpdateSession enabled={false} />); });
  expect(removeListener).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(7 * 60 * 60 * 1000);
  await act(async () => { listener('background'); listener('active'); });
  expect(check).toHaveBeenCalledTimes(1);
  jest.replaceProperty(Platform, 'OS', 'ios');
  await act(async () => { tree.update(<AndroidUpdateSession enabled />); });
  expect(check).toHaveBeenCalledTimes(1);
});
