import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Text, TextInput } from 'react-native';
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

test('competition editor uses the approved Meet title', async () => {
  await mount('competition');
  expect(renderer.root.findAllByType(Text).find(node => node.props.accessibilityRole === 'header')?.props.children).toBe('Meet');
});

test('basics saves units, gender and birthday, preserves metric measurements and reopens the saved values', async () => {
  await mount('basics');
  await press(UNIT_LABELS.lb);
  expect(input('70').props.value).toBe('70.9');
  expect(input('183').props.value).toBe('176.37');
  await press(GENDER_LABELS.female);
  await press(1995);
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'female', birth_date: '1995-01-01', height_cm: '180', weight_kg: '80.00' });
  expect(onClose).toHaveBeenCalledTimes(1);
  await reopen('basics');
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'female', birth_date: '1995-01-01', height_cm: '180', weight_kg: '80.00' });
});

test('switching units after metric edits initializes imperial text from the current measurements', async () => {
  await mount('basics');
  await press(UNIT_LABELS.lb);
  await press(UNIT_LABELS.kg);
  act(() => input('178').props.onChangeText('190'));
  act(() => input('83').props.onChangeText('90'));
  await press(UNIT_LABELS.lb);
  expect(input('70').props.value).toBe('74.8');
  expect(input('183').props.value).toBe('198.42');
  await save();
  expect(lastPatch()).toEqual({ unit_preference: 'lb', gender: 'male', birth_date: '2000-01-01', height_cm: '190', weight_kg: '90.00' });
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

test.each([true, false])('note editor saves multiline input and rehydrate when competing is %s', async (isCompeting) => {
  storedProfile.is_competing = isCompeting;
  storedProfile.competition_date = isCompeting ? meetDate : null;
  await mount('note');
  const notes = input(t('student.step7ExtrasSection.copy010'));
  expect(notes).toBeDefined();
  expect(notes.props.multiline).toBe(true);
  act(() => notes.props.onChangeText('Meet goal\nKeep it steady'));
  await save();
  expect(lastPatch()).toEqual({ note_to_coach: 'Meet goal\nKeep it steady' });
  await reopen('note');
  expect(input(t('student.step7ExtrasSection.copy010')).props.value).toBe('Meet goal\nKeep it steady');
});

test('a failed save retains edited notes and allows retry', async () => {
  jest.mocked(onboardingRepository.upsert).mockRejectedValueOnce(new Error('Offline'));
  await mount('note');
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
  await mount('note');
  const notes = input(t('student.step7ExtrasSection.copy010'));
  expect(notes).toBeDefined();
  act(() => notes.props.onChangeText('Discard this'));
  await press(t('student.accountSecuritySheets.copy013'));
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each(['kg', 'lb'] as const)('weight editor has one input, filters two decimals, and saves only weight in %s', async (unit) => {
  storedProfile.unit_preference = unit;
  storedProfile.gender = null;
  await mount('weight');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
  const field = () => renderer.root.findByType(TextInput);
  act(() => field().props.onChangeText(unit === 'kg' ? '83.256' : '183.256'));
  expect(field().props.value).toBe(unit === 'kg' ? '83.25' : '183.25');
  await save();
  expect(lastPatch()).toEqual({ weight_kg: unit === 'kg' ? '83.25' : '83.12' });
  await reopen('weight');
  expect(field().props.value).toBe(unit === 'kg' ? '83.25' : '183.25');
  await save();
  expect(lastPatch()).toEqual({ weight_kg: unit === 'kg' ? '83.25' : '83.12' });
});

test.each(['', '0', '500'])('weight editor blocks invalid kg input %j', async (value) => {
  await mount('weight');
  act(() => renderer.root.findByType(TextInput).props.onChangeText(value));
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(renderer.root.findAll(node => node.props.error === true).length).toBeGreaterThan(0);
});


test('Meet preserves legacy text on cancel and validates federation and class before saving only its three fields', async () => {
  await mount('competition');
  expect(renderer.root.findAllByType(Text).some(node => node.props.accessibilityLabel === 'Previously entered: 83')).toBe(true);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(renderer.root.findAll(node => node.props.error === true).length).toBeGreaterThan(0);
  await press('IPF');
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  await press('83 kg');
  await press('WP');
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  await press('85 kg');
  await save();
  expect(lastPatch()).toEqual({ is_competing: true, competition_date: meetDate, target_weight_class: 'WP · 85 kg' });
  expect(storedProfile.note_to_coach).toBe('Existing note');
});

test('cancelling legacy Meet or its removal confirmation does not write; confirmed removal clears only meet fields', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  await mount('competition');
  await press(t('student.accountSecuritySheets.copy013'));
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  await reopen('competition');
  await press('Remove meet');
  expect(alert).toHaveBeenCalledWith('Remove this meet?', undefined, expect.any(Array));
  const buttons = alert.mock.calls.at(-1)![2]!;
  await act(async () => { buttons.find(button => button.style === 'cancel')?.onPress?.(); });
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  await act(async () => { await buttons.find(button => button.text === 'Remove')!.onPress!(); });
  expect(lastPatch()).toEqual({ is_competing: false, competition_date: null, target_weight_class: null });
  expect(storedProfile.note_to_coach).toBe('Existing note');
});


test.each(['en', 'zh'] as const)('Meet explains missing federation or weight class in %s', async (locale) => {
  setLocaleOverride(locale);
  await mount('competition');
  const hint = locale === 'en' ? 'Choose a federation and weight class' : '请选择赛事方和体重级别';
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(hint);
  await press('IPF');
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType(Text).map(node => node.props.children)).toContain(hint);
});


test.each(['en', 'zh'] as const)('Meet keeps the existing hint when only the date is invalid in %s', async (locale) => {
  setLocaleOverride(locale);
  storedProfile.competition_date = `${new Date().getFullYear() + 1}-02-30`;
  storedProfile.target_weight_class = 'IPF · 83 kg';
  await mount('competition');
  await save();
  expect(onboardingRepository.upsert).not.toHaveBeenCalled();
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children);
  expect(copy).toContain(locale === 'en' ? 'Failed to save. Try again' : '保存失败,请重试');
  expect(copy).not.toContain(locale === 'en' ? 'Choose a federation and weight class' : '请选择赛事方和体重级别');
});

test.each(['injuries', 'basics', 'background', 'competition', 'note', 'weight'] as const)('%s editor shows the coach notice only for injuries above Save', async section => {
  await mount(section);
  const copy = renderer.root.findAllByType(Text).map(node => node.props.children);
  const notice = copy.indexOf('Your coach will be notified of changes');
  if (section === 'injuries') {
    expect(notice).toBeGreaterThanOrEqual(0);
    expect(notice).toBeLessThan(copy.indexOf(t('student.profileCardsSection.copy013')));
  } else expect(notice).toBe(-1);
});
