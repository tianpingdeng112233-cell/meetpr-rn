import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { onboardingRepository, type OnboardingProfile } from '@/api/domains/onboarding';
import { setLocaleOverride, t } from '@/i18n';
import { GENDER_LABELS, UNIT_LABELS } from '@/features/onboarding/catalog';
import { ProfileEditor } from '../ProfileEditor';
import type { ProfileSection } from '../model';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'));

const meetDate = `${new Date().getFullYear() + 1}-01-01`;
const initialProfile: OnboardingProfile = {
  user_id: '10000000-0000-4000-8000-000000000000', unit_preference: 'kg', gender: 'male',
  birth_date: '2000-01-01', height_cm: '180', weight_kg: '80', training_years: 3,
  squat_stance: 'high_bar', deadlift_style: 'conventional', bench_grip: 'standard',
  squat_1rm_kg: '200', bench_1rm_kg: '150', deadlift_1rm_kg: '250',
  training_days: ['mon', 'wed'], gym_tier: 'commercial', equipment_overrides: null,
  daily_life_intensity: 3, life_stress: 2, recovery_speed: 4, sleep_hours: 8,
  muscle_groups_to_strengthen: null, injury_notes: 'Existing injury', injury_areas: ['knee'],
  is_competing: true, competition_date: meetDate, target_weight_class: '83', note_to_coach: 'Existing note',
  completed_at: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', upload_attachment_ids: [],
};
let renderer: ReactTestRenderer;
let client: QueryClient;
let storedProfile: OnboardingProfile;
const onClose = jest.fn();

beforeEach(() => {
  setLocaleOverride('en');
  onClose.mockClear();
  storedProfile = { ...initialProfile };
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  jest.spyOn(onboardingRepository, 'upsert').mockImplementation(async (patch) => {
    storedProfile = { ...storedProfile, ...patch };
    return storedProfile;
  });
});
afterEach(() => {
  act(() => renderer?.unmount());
  client.clear();
  setLocaleOverride(null);
  jest.restoreAllMocks();
});
const mount = async (section: ProfileSection) => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><ProfileEditor section={section} profile={storedProfile} onClose={onClose} /></QueryClientProvider>); });
};
const press = async (label: string | number) => {
  const button = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node =>
    node.findAllByType(Text).some(text => text.props.children === label));
  expect(button).toBeDefined();
  await act(async () => { button!.props.onPress(); });
};
const input = (placeholder: string) => renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === placeholder)!;
const save = () => press(t('student.profileCardsSection.copy013'));
const reopen = async (section: ProfileSection) => { act(() => renderer.unmount()); await mount(section); };
const lastPatch = () => jest.mocked(onboardingRepository.upsert).mock.calls.at(-1)?.[0];

test('basics editor uses the iOS Basic information title', async () => {
  await mount('basics');
  expect(renderer.root.findAllByType(Text).find(node => node.props.accessibilityRole === 'header')?.props.children).toBe('Basic information');
});

test('competition editor uses the iOS Meet / notes title', async () => {
  await mount('competition');
  expect(renderer.root.findAllByType(Text).find(node => node.props.accessibilityRole === 'header')?.props.children).toBe('Meet / notes');
});

test('basics saves units, gender and birthday, preserves metric measurements and reopens the saved values', async () => {
  await mount('basics');
  await press(UNIT_LABELS.lb);
  expect(input('70').props.value).toBe('70.9');
  expect(input('183').props.value).toBe('176.4');
  await press(GENDER_LABELS.female);
  await press(1995);
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'female', birth_date: '1995-01-01', height_cm: '180', weight_kg: '80' });
  expect(onClose).toHaveBeenCalledTimes(1);
  await reopen('basics');
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'female', birth_date: '1995-01-01', height_cm: '180', weight_kg: '80' });
});

test('switching units after metric edits initializes imperial text from the current measurements', async () => {
  await mount('basics');
  await press(UNIT_LABELS.lb);
  await press(UNIT_LABELS.kg);
  act(() => input('178').props.onChangeText('190'));
  act(() => input('83').props.onChangeText('90'));
  await press(UNIT_LABELS.lb);
  expect(input('70').props.value).toBe('74.8');
  expect(input('183').props.value).toBe('198.4');
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'male', birth_date: '2000-01-01', height_cm: '190', weight_kg: '90' });
});

test('basics requires the same gender selection as onboarding before saving', async () => {
  storedProfile.gender = null;
  await mount('basics');
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  await press(GENDER_LABELS.other);
  await save();
  expect(lastPatch()).toEqual(expect.objectContaining({ gender: 'other' }));
});

test.each([true, false])('meet notes save multiline input and rehydrate when competing is %s', async (isCompeting) => {
  storedProfile.is_competing = isCompeting;
  storedProfile.competition_date = isCompeting ? meetDate : null;
  await mount('competition');
  const notes = input(t('student.step7ExtrasSection.copy010'));
  expect(notes).toBeDefined();
  expect(notes.props.multiline).toBe(true);
  act(() => notes.props.onChangeText('Meet goal\nKeep it steady'));
  await save();
  expect(lastPatch()).toEqual({ is_competing: isCompeting, competition_date: isCompeting ? meetDate : null, target_weight_class: '83', note_to_coach: 'Meet goal\nKeep it steady' });
  await reopen('competition');
  expect(input(t('student.step7ExtrasSection.copy010')).props.value).toBe('Meet goal\nKeep it steady');
});

test('a failed save retains edited notes and allows retry', async () => {
  jest.mocked(onboardingRepository.upsert).mockRejectedValueOnce(new Error('Offline'));
  await mount('competition');
  const notes = input(t('student.step7ExtrasSection.copy010'));
  expect(notes).toBeDefined();
  act(() => notes.props.onChangeText('Keep this\nafter failure'));
  await save();
  expect(onClose).not.toHaveBeenCalled();
  expect(input(t('student.step7ExtrasSection.copy010')).props.value).toBe('Keep this\nafter failure');
  await save();
  expect(lastPatch()).toEqual(expect.objectContaining({ note_to_coach: 'Keep this\nafter failure' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('cancelling edited notes does not write', async () => {
  await mount('competition');
  const notes = input(t('student.step7ExtrasSection.copy010'));
  expect(notes).toBeDefined();
  act(() => notes.props.onChangeText('Discard this'));
  await press(t('student.accountSecuritySheets.copy013'));
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});
