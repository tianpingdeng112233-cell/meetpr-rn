import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput, Modal, StyleSheet } from 'react-native';
import { onboardingRepository, OnboardingProfileSchema, type OnboardingProfile } from '@/api/domains/onboarding';
import { bindRepository } from '@/api/domains/bind';
import { useSessionStore } from '@/api/session';
import { setLocaleOverride, t } from '@/i18n';
import { ProfileAboutScreen } from '../ProfileAboutScreen';
import { ProfileHealthScreen } from '../ProfileHealthScreen';
import { ProfileSettingsScreen } from '../ProfileSettingsScreen';
import { MyProfileScreen } from '../MyProfileScreen';
import { readinessRepository } from '@/api/domains/readiness';
import { ReadinessSheet } from '@/features/training/ReadinessSheet';
import { RestTimerSettingsScreen } from '@/features/settings/RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '@/features/settings/TrainingReminderSettingsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, resolveColors } from '@/design';
import { writeReminderPreference } from '@/features/settings/storage';
import { ProfileModal } from '../components';
import type { ReactNode } from 'react';
import { ProfileEditor } from '../ProfileEditor';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'));
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@/features/chat/open-coach-chat', () => ({ useOpenCoachChat: () => ({ totalUnread: 0, openCoachChat: jest.fn() }) }));
let renderer: ReactTestRenderer;
let client: QueryClient;
let profile: OnboardingProfile;
const studentId = '10000000-0000-4000-8000-000000000000';
beforeEach(async () => {
  await AsyncStorage.clear();
  await writeReminderPreference(studentId, { enabled: false, weekdays: [1], hour: 20, minute: 0 });
  setLocaleOverride('en');
  mockPush.mockClear();
  profile = OnboardingProfileSchema.parse({ ...Object.fromEntries(Object.keys(OnboardingProfileSchema.shape).map(key => [key, null])), upload_attachment_ids: [], user_id: studentId, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', height_cm: '178', weight_kg: '83.5', squat_1rm_kg: '302.5', bench_1rm_kg: '115', deadlift_1rm_kg: '225', injury_areas: ['knee'], note_to_coach: 'Goal' });
  useSessionStore.setState({ user: { id: studentId, email: 'student@example.test', phone: '', role: 'coached_student', created_at: profile.created_at } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  jest.spyOn(onboardingRepository, 'get').mockImplementation(async () => profile);
  jest.spyOn(readinessRepository, 'get').mockResolvedValue({ checkin: null });
  jest.spyOn(onboardingRepository, 'upsert').mockImplementation(async patch => { profile = { ...profile, ...patch }; return profile; });
  jest.spyOn(bindRepository, 'mine').mockResolvedValue({ bind_request: null });
});
afterEach(() => { act(() => renderer?.unmount()); client.clear(); jest.restoreAllMocks(); setLocaleOverride(null); useSessionStore.setState({ user: null }); });
async function mount(content: ReactNode) {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><ThemeProvider>{content}</ThemeProvider></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
}
const texts = () => renderer.root.findAllByType(Text).map(node => node.props.children);
async function press(label: string) {
  const node = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === label || node.findAllByType(Text).some(text => text.props.children === label));
  expect(node).toBeDefined();
  await act(async () => { node!.props.onPress(); });
}

test('About me preserves four ordered rows and opens each existing editor', async () => {
  await mount(<ProfileAboutScreen />);
  const titles = ['Basic information', 'Training background', 'Training environment', 'Muscles to improve'];
  expect(texts().filter(text => titles.includes(text))).toEqual(titles);
  expect(texts()).toContain('178 cm · 83.50 kg');
  for (const [index, section] of ['basics', 'background', 'environment', 'muscles'].entries()) {
    await press(titles[index]); expect(renderer.root.findByType(ProfileEditor).props.section).toBe(section);
    await press(t('student.accountSecuritySheets.copy013'));
    expect(renderer.root.findAllByType(ProfileEditor)).toHaveLength(0);
  }
});
test('saving basics updates About me and the mounted home through the shared cache', async () => {
  profile.gender = 'male'; profile.unit_preference = 'kg';
  await mount(<><MyProfileScreen /><ProfileAboutScreen /></>);
  await press('Basic information');
  const field = renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === '83')!;
  act(() => field.props.onChangeText('84'));
  await press(t('student.profileCardsSection.copy013'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(renderer.root.findAllByType(ProfileEditor)).toHaveLength(0);
  expect(texts().filter(text => text === '178 cm · 84.00 kg')).toHaveLength(2);
});
test.each(['today', 'onboarding', 'empty'])('Health uses %s recovery and opens the existing sheets', async mode => {
  if (mode === 'today') jest.mocked(readinessRepository.get).mockResolvedValue({ checkin: { sleep_quality: 4, mood: 3, stress: 2 } } as never);
  if (mode === 'onboarding') { profile.daily_life_intensity = 3; profile.life_stress = 2; profile.recovery_speed = 4; }
  await mount(<ProfileHealthScreen />);
  expect(texts().filter(text => ['Recovery assessment', 'Injury history'].includes(text))).toEqual(['Recovery assessment', 'Injury history']);
  expect(texts()).toContain(mode === 'today' ? 'Sleep 4/5 · Readiness 3/5 · Stress 2/5' : mode === 'empty' ? 'Not provided' : 'Medium Intensity · Low Stress · About 1 day Recovery');
  expect(texts()).not.toContain('Notify coach');
  await press('Recovery assessment'); expect(renderer.root.findAllByType(ReadinessSheet)).toHaveLength(1);
  act(() => renderer.root.findByType(ReadinessSheet).props.onSkip());
  await press('Injury history'); expect(renderer.root.findByType(ProfileEditor).props.section).toBe('injuries');
});
test('Settings switches appearance persistently and opens both existing preference screens', async () => {
  await mount(<ProfileSettingsScreen />);
  await press('Dark');
  expect(renderer.root.findAll(node => node.props.accessibilityState?.selected && typeof node.props.onPress === 'function').some(node => node.findAllByType(Text).some(text => text.props.children === 'Dark'))).toBe(true);
  expect(texts()).toContain('Automatic (by RPE)'); expect(texts()).toContain('Off');
  await press('Rest between sets'); expect(renderer.root.findAllByType(RestTimerSettingsScreen)).toHaveLength(1);
  act(() => renderer.root.findByType(RestTimerSettingsScreen).props.onClose());
  await press('Training reminders'); expect(renderer.root.findAllByType(TrainingReminderSettingsScreen)).toHaveLength(1);
  act(() => renderer.root.findByType(TrainingReminderSettingsScreen).props.onClose());
  act(() => renderer.unmount()); await mount(<ProfileSettingsScreen />);
  expect(renderer.root.findAll(node => node.props.accessibilityState?.selected && typeof node.props.onPress === 'function').some(node => node.findAllByType(Text).some(text => text.props.children === 'Dark'))).toBe(true);
});
test.each(['Change password', 'Export training data', 'Delete account'])('Settings opens the unchanged %s modal', async label => {
  await mount(<ProfileSettingsScreen />); await press(label);
  expect(renderer.root.findAllByType(ProfileModal)).toHaveLength(1);
  expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
});
test('Settings can sign out and clear cached data even when the profile request fails', async () => {
  jest.mocked(onboardingRepository.get).mockRejectedValue(new Error('offline'));
  const logout = jest.spyOn(useSessionStore.getState(), 'logout').mockResolvedValue(undefined);
  const clear = jest.spyOn(client, 'clear');
  await mount(<ProfileSettingsScreen />); await press('Sign out'); expect(clear).toHaveBeenCalled(); expect(logout).toHaveBeenCalledTimes(1);
});

test.each(['Rest between sets', 'Training reminders'])('%s storage failure retains the existing retry behavior', async label => {
  const getItem = jest.spyOn(AsyncStorage, 'getItem');
  const original = getItem.getMockImplementation()!;
  const prefix = label === 'Rest between sets' ? 'meetpr.rest-timer.v2.' : 'meetpr.training-reminder.v1.';
  getItem.mockImplementation((key, ...args) => key.startsWith(prefix) ? Promise.reject(new Error('offline')) : original(key, ...args));
  await mount(<ProfileSettingsScreen />);
  expect(texts()).toContain(t('student.myProfileView.copy002'));
  const before = getItem.mock.calls.filter(([key]) => key.startsWith(prefix)).length;
  getItem.mockImplementation(original);
  await press(label);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  expect(getItem.mock.calls.filter(([key]) => key.startsWith(prefix)).length).toBe(before + 1);
  expect(renderer.root.findAllByType(RestTimerSettingsScreen)).toHaveLength(0);
  expect(renderer.root.findAllByType(TrainingReminderSettingsScreen)).toHaveLength(0);
});
test.each([ProfileAboutScreen, ProfileHealthScreen])('secondary profile page renders load failure and retries before revealing editors', async Component => {
  jest.mocked(onboardingRepository.get).mockRejectedValueOnce(new Error('offline'));
  await mount(<Component />);
  expect(texts()).toContain(t('student.trainingHistoryView.copy022'));
  await press(t('student.trainingHistoryView.copy023'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy022'));
  await press(t('student.feedbackInboxView.copy005')); expect(mockBack).toHaveBeenCalled();
});


test.each<['en' | 'zh', 'light' | 'dark']>([['en', 'light'], ['en', 'dark'], ['zh', 'light'], ['zh', 'dark']])('identity keeps full decimal values, truncation and theme tokens in %s/%s', async (locale, appearance) => {
  setLocaleOverride(locale);
  await AsyncStorage.setItem('meetpr.appearance', appearance);
  const identity = 'a-very-long-student-identity@example.test';
  useSessionStore.setState(state => ({ user: { ...state.user!, email: identity } }));
  jest.mocked(bindRepository.mine).mockResolvedValue({ bind_request: { status: 'accepted', coach_display_name: 'A very long coach display name' } } as never);
  await mount(<MyProfileScreen />);
  const nodes = renderer.root.findAllByType(Text);
  const name = nodes.find(node => node.props.children === identity)!;
  const coach = nodes.find(node => node.props.children === t('student.rn.profile.coach', ['A very long coach display name']))!;
  expect(name.props.numberOfLines).toBe(1); expect(coach.props.numberOfLines).toBe(1);
  expect(StyleSheet.flatten(name.props.style).color).toBe(resolveColors(appearance).textPrimary);
  const squat = nodes.find(node => node.props.children === '302.5')!;
  expect(squat.props.numberOfLines).toBe(1); expect(squat.props.adjustsFontSizeToFit).toBe(true);
  expect(texts()).toContain(t('student.rn.profile.about'));
  expect(texts()).toContain(t('student.rn.profile.bench'));
});


test.each([
  { Component: ProfileAboutScreen, retained: '178 cm · 83.50 kg' },
  { Component: ProfileHealthScreen, retained: 'Knees injuries' },
  { Component: ProfileSettingsScreen, retained: 'Automatic (by RPE)' },
])('secondary $Component.name retains cached content and exposes retry after refresh failure', async ({ Component, retained }) => {
  await mount(<Component />);
  expect(texts()).toContain(retained);
  jest.mocked(onboardingRepository.get).mockRejectedValue(new Error('offline'));
  await act(async () => { await client.refetchQueries({ queryKey: ['onboarding'] }); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  expect(texts()).toContain(retained);
  expect(texts()).toContain(t('student.trainingHistoryView.copy022'));
  const attempts = jest.mocked(onboardingRepository.get).mock.calls.length;
  await press(t('student.trainingHistoryView.copy023'));
  expect(onboardingRepository.get).toHaveBeenCalledTimes(attempts + 1);
});
