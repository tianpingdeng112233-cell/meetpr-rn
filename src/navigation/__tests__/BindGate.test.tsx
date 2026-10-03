import { t } from '@/i18n';

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Text, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '@/api/client';
import { bindRepository, onboardingRepository, type OnboardingProfile } from '@/api/domains';
import { inviteStashStorage } from '@/features/onboarding/storage';

import { BindGate } from '../BindGate';

jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
jest.mock('@react-native-community/netinfo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-community/netinfo/jest/netinfo-mock');
});

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';
const completedProfile: OnboardingProfile = {
  user_id: STUDENT_ID, unit_preference: 'kg', gender: 'male', birth_date: '1990-01-02',
  height_cm: '180', weight_kg: '90', training_years: 3, squat_stance: 'high_bar',
  deadlift_style: 'conventional', bench_grip: null, squat_1rm_kg: '180', bench_1rm_kg: '120',
  deadlift_1rm_kg: '220', training_days: ['mon', 'wed', 'fri'], gym_tier: 'home_with_rack',
  equipment_overrides: ['barbell_dumbbell'], daily_life_intensity: 2, life_stress: 3,
  recovery_speed: 4, sleep_hours: 3, muscle_groups_to_strengthen: null, injury_notes: null,
  injury_areas: null, is_competing: false, competition_date: null, target_weight_class: null,
  note_to_coach: null, completed_at: '2026-09-04T10:00:00Z', created_at: '2026-09-04T10:00:00Z',
  updated_at: '2026-09-04T10:00:00Z', upload_attachment_ids: [],
};
const stash = { code: 'XK7MPQ2RVT', displayName: '小明', savedAt: '2026-09-04T10:00:00Z' };
let renderer: ReactTestRenderer;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(bindRepository, 'mine').mockResolvedValue({ bind_request: null });
  jest.spyOn(onboardingRepository, 'get').mockResolvedValue(null);
  jest.spyOn(onboardingRepository, 'upsert').mockResolvedValue(completedProfile);
});
afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

function press(label: string) {
  const button = renderer.root.findAll((node) => typeof node.props.onPress === 'function').find((node) =>
    node.findAllByType(Text).some((text) => text.props.children === label),
  );
  expect(button).toBeDefined();
  button!.props.onPress();
}

async function renderGate() {
  await act(async () => { renderer = create(<BindGate studentId={STUDENT_ID}><Text>tabs</Text></BindGate>); });
}

test('needsOnboarding opens immediately and save-and-exit allows continuing from the interstitial', async () => {
  await inviteStashStorage.write(STUDENT_ID, stash);
  await renderGate();
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await act(async () => press(t('student.onboardingWizardView.copy011')));
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  await act(async () => press(t('student.onboardingWizardView.copy003')));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
});

test('submitting a code for an incomplete profile opens onboarding immediately', async () => {
  await renderGate();
  act(() => {
    renderer.root.findByProps({ placeholder: 'XXXXXXXXXX' }).props.onChangeText(stash.code);
    renderer.root.findByProps({ placeholder: t('student.enterCodeView.copy002') }).props.onChangeText(stash.displayName);
  });
  await act(async () => press(t('student.bindEnterCodeSubviews.copy005')));
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
});

test('invalid stashed invite returns to an empty code field with the stashed name', async () => {
  jest.spyOn(onboardingRepository, 'get').mockResolvedValue(completedProfile);
  jest.spyOn(bindRepository, 'create').mockRejectedValue(new ApiError('backend', 'INVITE_CODE_INVALID', { code: 'INVITE_CODE_INVALID' }));
  await inviteStashStorage.write(STUDENT_ID, stash);
  await renderGate();
  expect(renderer.root.findByProps({ placeholder: 'XXXXXXXXXX' }).props.value).toBe('');
  expect(renderer.root.findByProps({ placeholder: t('student.enterCodeView.copy002') }).props.value).toBe(stash.displayName);
  expect(await inviteStashStorage.read(STUDENT_ID)).toBeNull();
  expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
});

test.each([
  ['invalid invite', new ApiError('backend', 'INVITE_CODE_INVALID', { code: 'INVITE_CODE_INVALID' })],
  ['network failure', new Error('offline')],
])('%s clears the submitted code while prefilling the submitted name', async (_kind, error) => {
  jest.spyOn(onboardingRepository, 'get').mockResolvedValue(completedProfile);
  jest.spyOn(bindRepository, 'create').mockRejectedValue(error);
  await renderGate();
  act(() => {
    renderer.root.findAllByType(TextInput)[0].props.onChangeText(stash.code);
    renderer.root.findAllByType(TextInput)[1].props.onChangeText(` ${stash.displayName} `);
  });
  await act(async () => press(t('student.bindEnterCodeSubviews.copy005')));
  expect(renderer.root.findByProps({ placeholder: 'XXXXXXXXXX' }).props.value).toBe('');
  expect(renderer.root.findByProps({ placeholder: t('student.enterCodeView.copy002') }).props.value).toBe(stash.displayName);
});
