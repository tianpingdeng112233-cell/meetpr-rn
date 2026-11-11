import { button, render, renderer, texts } from '../test-support/progress-screen';
import { beforeEach, expect, jest, test } from '@jest/globals';
import { act } from 'react-test-renderer';
import { Alert, Text, TextInput } from 'react-native';
import { onboardingRepository, useOnboardingProfile, type OnboardingProfile } from '@/api/domains/onboarding';
import { Circle } from 'react-native-svg';
import { bodyWeightsRepository } from '@/api/domains/body-weights';
import { addDays, localDay } from '@/domain/coach/detail-week';
import { ApiError } from '@/api/client';
import { BodyWeightScreen } from '../BodyWeightScreen';

const today = localDay(new Date());
const yesterday = localDay(addDays(new Date(), -1));
beforeEach(() => {
  jest.spyOn(bodyWeightsRepository, 'list').mockResolvedValue({ records: [
    { recorded_on: yesterday, weight_kg: '83.00' }, { recorded_on: today, weight_kg: '82.25' },
  ] });
});

test('weight page shows every curve point and reverse dated records, with today update action and three ranges', async () => {
  await render(<BodyWeightScreen />);
  expect(texts()).toEqual(expect.arrayContaining(['82.25', '30 days −0.75 kg', '83.00 kg', '82.25 kg', 'Records']));
  expect(button("Update today's weight")).toBeDefined();
  expect(renderer.root.findAllByType(Circle)).toHaveLength(2);
  expect(renderer.root.findAllByType(Circle).map(point => point.props.accessibilityLabel)).toEqual([`${yesterday}, 83.00 kg`, `${today}, 82.25 kg`]);
  const range = () => renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityHint?.includes('range'))!;
  await act(async () => range().props.onPress());
  expect(texts()).toContain('90 days');
  await act(async () => range().props.onPress());
  expect(texts()).toContain('All history');
});

function CurrentProfileWeight() {
  const { data } = useOnboardingProfile('student');
  return <Text>{data?.weight_kg ? `Profile: ${data.weight_kg}` : 'Profile: + Add'}</Text>;
}
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
test('cancel preserves a record; deleting the last record clears the curve, list and current profile weight', async () => {
  let records = [{ recorded_on: today, weight_kg: '82.25' }];
  let profile = { weight_kg: '82.25' } as OnboardingProfile;
  jest.mocked(bodyWeightsRepository.list).mockImplementation(async () => ({ records }));
  jest.mocked(onboardingRepository.get).mockImplementation(async () => profile);
  const remove = jest.spyOn(bodyWeightsRepository, 'remove').mockImplementation(async () => {
    records = [];
    profile = { ...profile, weight_kg: null };
    return { current_weight_kg: null };
  });
  const alert = jest.spyOn(Alert, 'alert');
  await render(<><BodyWeightScreen /><CurrentProfileWeight /></>);
  expect(texts()).toContain('Profile: 82.25');
  expect(texts()).toContain('Log on another day to see the trend');
  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
  const deleteButton = () => renderer.root.findAll(node => node.props.accessibilityRole === 'button', { deep: false }).find(node => node.props.accessibilityLabel?.startsWith('Delete record for'))!;
  act(() => deleteButton().props.onPress());
  expect(alert.mock.calls.at(-1)?.[0]).toBe('Delete this record? This cannot be undone.');
  act(() => alert.mock.calls.at(-1)?.[2]?.find(action => action.style === 'cancel')?.onPress?.());
  expect(remove).not.toHaveBeenCalled();
  act(() => deleteButton().props.onPress());
  await act(async () => { await alert.mock.calls.at(-1)?.[2]?.find(action => action.style === 'destructive')?.onPress?.(); });
  await settle();
  expect(texts()).toEqual(expect.arrayContaining(['No weight records yet', 'Profile: + Add']));
  expect(renderer.root.findAllByType(Circle)).toHaveLength(0);
  expect(texts()).not.toContain('82.25 kg');
  expect(button("Log today's weight")).toBeDefined();
});

test('missing endpoint displays failure and Retry, then recovers to the empty page', async () => {
  jest.mocked(bodyWeightsRepository.list).mockRejectedValueOnce(new ApiError('server', 'Missing endpoint', { status: 404 }));
  await render(<BodyWeightScreen />);
  expect(texts()).toContain('Failed to load');
  expect(button('Retry')).toBeDefined();
  expect(renderer.root.findAllByType(Circle)).toHaveLength(0);
  jest.mocked(bodyWeightsRepository.list).mockResolvedValue({ records: [] });
  await act(async () => { button('Retry').props.onPress(); });
  await settle();
  expect(texts()).toContain('No weight records yet');
  expect(button("Log today's weight")).toBeDefined();
});

test('the weight-page action uses the in-app decimal panel and updates one point and the profile after saving', async () => {
  let records = [{ recorded_on: today, weight_kg: '82.25' }];
  let profile = { user_id: 'student', unit_preference: 'kg', weight_kg: '82.25' } as OnboardingProfile;
  jest.mocked(bodyWeightsRepository.list).mockImplementation(async () => ({ records }));
  jest.mocked(onboardingRepository.get).mockImplementation(async () => profile);
  jest.spyOn(bodyWeightsRepository, 'saveToday').mockImplementation(async weight => {
    const record = { recorded_on: today, weight_kg: weight };
    records = [record];
    profile = { ...profile, weight_kg: weight };
    return { record, current_weight_kg: weight };
  });
  await render(<><BodyWeightScreen /><CurrentProfileWeight /></>);
  act(() => button("Update today's weight").props.onPress());
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  for (const key of ['8', '3', 'Decimal point', '5']) act(() => button(key).props.onPress());
  await act(async () => { button('Done').props.onPress(); });
  await settle();
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
  expect(texts()).toEqual(expect.arrayContaining(['83.50 kg', 'Profile: 83.50']));
});

test('deleting the latest record restores the previous current weight and keeps the older point', async () => {
  let records = [{ recorded_on: yesterday, weight_kg: '83.00' }, { recorded_on: today, weight_kg: '82.25' }];
  let profile = { weight_kg: '82.25' } as OnboardingProfile;
  jest.mocked(bodyWeightsRepository.list).mockImplementation(async () => ({ records }));
  jest.mocked(onboardingRepository.get).mockImplementation(async () => profile);
  jest.spyOn(bodyWeightsRepository, 'remove').mockImplementation(async () => {
    records = [records[0]];
    profile = { ...profile, weight_kg: '83.00' };
    return { current_weight_kg: '83.00' };
  });
  const alert = jest.spyOn(Alert, 'alert');
  await render(<><BodyWeightScreen /><CurrentProfileWeight /></>);
  const deletes = renderer.root.findAll(node => node.props.accessibilityRole === 'button', { deep: false }).filter(node => node.props.accessibilityLabel?.startsWith('Delete record for'));
  act(() => deletes[0].props.onPress());
  await act(async () => { await alert.mock.calls.at(-1)?.[2]?.find(action => action.style === 'destructive')?.onPress?.(); });
  await settle();
  expect(texts()).toEqual(expect.arrayContaining(['83.00', 'Profile: 83.00']));
  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
  expect(button("Log today's weight")).toBeDefined();
});

test('404 history still allows logging today through the repository fallback', async () => {
  jest.mocked(bodyWeightsRepository.list).mockRejectedValue(new ApiError('server', 'Not found', { status: 404 }));
  const save = jest.spyOn(bodyWeightsRepository, 'saveToday').mockResolvedValue({ record: null, current_weight_kg: '77.40' });
  await render(<BodyWeightScreen />);
  expect(texts()).toContain('Failed to load');
  act(() => button("Log today's weight").props.onPress());
  for (const key of ['7', '7', 'Decimal point', '4']) act(() => button(key).props.onPress());
  await act(async () => { button('Done').props.onPress(); });
  await settle();
  expect(save.mock.calls[0][0]).toBe('77.40');
});
