import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Circle } from 'react-native-svg';
import { resetSessionForTests, useSessionStore } from '@/api/session';
import { useOnboardingProfile } from '@/api/domains/onboarding';
import { BodyWeightScreen } from '@/features/history/BodyWeightScreen';
import { MeetWeightStrip } from '@/features/training/MeetWeightStrip';
import { NumberPad } from '@/design/NumberPad';
import { localDay } from '@/domain/coach/detail-week';
import { setLocaleOverride, t } from '@/i18n';
import { resetDemoBackend } from '../backend';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => (jest.requireActual('react-native-safe-area-context/jest/mock') as { default: unknown }).default);
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn(), back: jest.fn() }) }));
const originalFetch = global.fetch;
const originalFlag = process.env.EXPO_PUBLIC_DEMO_MODE;
let renderer: ReactTestRenderer;
let client: QueryClient;
function WeightSurfaces() {
  const studentId = useSessionStore(state => state.user?.id ?? '');
  const profile = useOnboardingProfile(studentId);
  return <><MeetWeightStrip studentId={studentId} profile={profile.data} today={localDay(new Date())} /><BodyWeightScreen /></>;
}
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); };
const texts = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
beforeEach(async () => {
  process.env.EXPO_PUBLIC_DEMO_MODE = '1';
  setLocaleOverride('zh');
  resetDemoBackend(localDay(new Date()));
  resetSessionForTests();
  const storage = new Map<string, string>();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
  global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network forbidden'));
  await useSessionStore.getState().loginWithEmail({ email: 'any@example.test', password: '' });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
});
afterEach(() => {
  act(() => renderer?.unmount());
  client.clear();
  resetSessionForTests();
  global.fetch = originalFetch;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE; else process.env.EXPO_PUBLIC_DEMO_MODE = originalFlag;
  setLocaleOverride(null);
});

test('108-3 demo weight page loads its curve and a strip entry updates both surfaces without a load error', async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><WeightSurfaces /></QueryClientProvider>); });
  await settle();
  expect(renderer.root.findAllByType(Circle)).toHaveLength(10);
  expect(texts()).toContain('83.50 kg');
  expect(texts()).not.toContain('加载失败');
  const strip = () => renderer.root.findByType(MeetWeightStrip);
  const record = strip().findAll(node => node.props.onPress && node.props.accessibilityLabel === t('student.weightStrip.log'))[0];
  await act(async () => record.props.onPress());
  await act(async () => renderer.root.findByType(NumberPad).props.onChangeText('84.1'));
  await act(async () => renderer.root.findByType(NumberPad).props.onCommit(84.1));
  await settle();
  expect(renderer.root.findAllByType(NumberPad)).toHaveLength(0);
  expect(strip().findAllByType(Text).map(node => node.props.children)).toContain('84.1');
  expect(texts()).toContain('84.10 kg');
  expect(renderer.root.findAllByType(Circle)).toHaveLength(11);
  expect(texts()).not.toContain('加载失败');
  expect(global.fetch).not.toHaveBeenCalled();
});
