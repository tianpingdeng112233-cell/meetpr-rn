import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Image, Linking, Platform, StyleSheet, Text } from 'react-native';
import { setLocaleOverride } from '@/i18n';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { MinimumVersionGate } from '../MinimumVersionGate';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-application', () => ({ nativeBuildVersion: '10', nativeApplicationVersion: '0.1.1' }));
const originalFetch = global.fetch;
const originalOS = Platform.OS;
let renderer: ReactTestRenderer;
beforeEach(() => { Platform.OS = 'android'; setLocaleOverride('zh'); });
afterEach(() => { act(() => renderer?.unmount()); global.fetch = originalFetch; Platform.OS = originalOS; setLocaleOverride(null); jest.restoreAllMocks(); jest.useRealTimers(); });
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
async function mount() {
  await act(async () => { renderer = create(<MinimumVersionGate><Text>Training</Text></MinimumVersionGate>); });
}

test('056 startup blocks all app content below the minimum and offers only the approved download', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => ({ min_build: 100 }) } as Response);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const back = jest.spyOn(BackHandler, 'addEventListener');
  await mount();
  expect(texts()).not.toContain('Training');
  expect(texts()).toContain('需要更新 MeetPR\n才能继续使用');
  expect(texts()).toContain('教练的计划用到了新内容（比如「自选重量」），这个版本显示不了。更新到最新版后，训练记录和计划都在，不会丢。');
  expect(texts()).toContain('当前版本');
  expect(texts()).toContain('0.1.1 (build 10)');
  expect(texts()).toContain('最低要求');
  expect(texts()).toContain('build 100');
  expect(StyleSheet.flatten(renderer.root.findByType(Image).props.style)).toMatchObject({ width: 72, height: 72, borderRadius: 18 });
  const actions = renderer.root.findAllByType(FeedbackPressable);
  expect(actions).toHaveLength(1);
  expect(actions[0].findByType(Text).props.children).toBe('下载新版');
  await act(async () => actions[0].props.onPress());
  expect(open).toHaveBeenCalledWith('https://dl.meetpr.cn');
  expect(back.mock.calls.find(([event]) => event === 'hardwareBackPress')?.[1]({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
});

test.each(['equal', 'unconfigured', 'network', 'timeout'])('056 %s allows the application to mount', async scenario => {
  jest.useFakeTimers();
  global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => {
    if (scenario === 'network') throw Error('Offline');
    if (scenario === 'timeout') return new Promise(() => {});
    return { ok: true, json: async () => ({ min_build: scenario === 'equal' ? 10 : 0 }) } as Response;
  });
  await mount();
  await act(async () => { await jest.advanceTimersByTimeAsync(8000); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(texts()).toContain('Training');
  expect(renderer.root.findAllByType(FeedbackPressable)).toHaveLength(0);
});

test('056 launch renders children immediately while the minimum-version request is unresolved', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  await mount();
  expect(texts()).toContain('Training');
  expect(texts()).not.toContain('需要更新 MeetPR\n才能继续使用');
  await act(async () => { await jest.advanceTimersByTimeAsync(7999); });
  expect(texts()).toContain('Training');
});

test('056 a delayed below-minimum response replaces the app and the block stays mounted', async () => {
  jest.useFakeTimers();
  let respond!: (value: Response) => void;
  global.fetch = jest.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { respond = resolve; }));
  await mount();
  expect(texts()).toContain('Training');
  await act(async () => { respond({ ok: true, json: async () => ({ min_build: 100 }) } as Response); });
  expect(texts()).not.toContain('Training');
  expect(texts()).toContain('需要更新 MeetPR\n才能继续使用');
  await act(async () => {
    await jest.advanceTimersByTimeAsync(8000);
    renderer.update(<MinimumVersionGate><Text>Other app content</Text></MinimumVersionGate>);
  });
  expect(texts()).not.toContain('Other app content');
  expect(texts()).toContain('需要更新 MeetPR\n才能继续使用');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
