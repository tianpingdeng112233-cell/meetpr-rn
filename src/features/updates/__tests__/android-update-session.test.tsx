import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { setLocaleOverride } from '@/i18n';
import { AndroidUpdateSession } from '../AndroidUpdateSession';

jest.mock('expo-application', () => ({ applicationId: 'com.meetpr.app', nativeBuildVersion: '2' }));
jest.mock('@/config/build-track', () => ({ BUILD_TRACK: 'china' }));
const release = { schemaVersion: 1, packageName: 'com.meetpr.app', versionCode: 10, versionName: '0.1.1', releaseNotes: '改进教练邀请流程', downloadUrl: 'https://dl.meetpr.cn/android/releases/10/meetpr-cn.apk' };
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
const originalFetch = global.fetch;
const originalAppState = AppState.currentState;
let tree: ReactTestRenderer;
let alert: jest.SpiedFunction<typeof Alert.alert>;
beforeEach(() => {
  jest.clearAllMocks();
  setLocaleOverride('zh');
  jest.replaceProperty(Platform, 'OS', 'android');
  AppState.currentState = 'active';
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(release));
});
afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); setLocaleOverride(null); global.fetch = originalFetch; AppState.currentState = originalAppState; });

test('startup shows release notes and only opens the download after the user chooses it', async () => {
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
  expect(alert).toHaveBeenCalledWith('发现新版本 0.1.1', expect.stringContaining('改进教练邀请流程'), expect.any(Array), { cancelable: true });
  expect(Linking.openURL).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2]!;
  await act(async () => { buttons.find(button => button.text === '下载更新')!.onPress!(); });
  expect(Linking.openURL).toHaveBeenCalledWith(release.downloadUrl);
});

test('privacy/bootstrap readiness gates the check and rerendering does not reoffer a dismissed alert', async () => {
  await act(async () => { tree = create(<AndroidUpdateSession enabled={false} />); });
  expect(global.fetch).not.toHaveBeenCalled();
  await act(async () => { tree.update(<AndroidUpdateSession enabled />); });
  expect(alert).toHaveBeenCalledTimes(1);
  expect(alert.mock.calls[0][2]).toContainEqual({ text: '稍后再说', style: 'cancel' });
  await act(async () => { tree.update(<AndroidUpdateSession enabled />); });
  expect(alert).toHaveBeenCalledTimes(1);
});

test('a response while backgrounded waits for foreground and is offered only once', async () => {
  AppState.currentState = 'background';
  const listener = jest.spyOn(AppState, 'addEventListener');
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
  expect(alert).not.toHaveBeenCalled();
  await act(async () => { listener.mock.calls[0][1]('active'); });
  expect(alert).toHaveBeenCalledTimes(1);
  await act(async () => { listener.mock.calls[0][1]('background'); listener.mock.calls[0][1]('active'); });
  expect(alert).toHaveBeenCalledTimes(1);
});

test('unmount aborts the request and prevents late prompts', async () => {
  let respond!: (value: Response) => void;
  global.fetch = jest.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { respond = resolve; }));
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
  act(() => tree.unmount());
  const signal = jest.mocked(global.fetch).mock.calls[0][1]?.signal;
  expect(signal?.aborted).toBe(true);
  await act(async () => { respond(response(release)); });
  expect(alert).not.toHaveBeenCalled();
});

test('a download-open failure gives a retry without an unhandled rejection', async () => {
  jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('no browser'));
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
  await act(async () => { alert.mock.calls[0][2]![1].onPress!(); });
  expect(alert.mock.calls[1][0]).toBe('暂时无法打开下载链接');
  await act(async () => { alert.mock.calls[1][2]![1].onPress!(); });
  expect(Linking.openURL).toHaveBeenCalledTimes(2);
});

test('Traditional update prompts use generated release notes and Taiwan UI copy', async () => {
  setLocaleOverride('zh-Hant');
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response({ ...release, releaseNotesZhHant: '改善教練邀請流程' }));
  await act(async () => { tree = create(<AndroidUpdateSession enabled />); });
  expect(alert.mock.calls[0][0]).toBe('發現新版本 0.1.1');
  expect(alert.mock.calls[0][1]).toContain('改善教練邀請流程');
  expect(alert.mock.calls[0][1]).not.toContain('改进教练邀请流程');
  expect(alert.mock.calls[0][2]).toContainEqual(expect.objectContaining({ text: '下載更新' }));
});
