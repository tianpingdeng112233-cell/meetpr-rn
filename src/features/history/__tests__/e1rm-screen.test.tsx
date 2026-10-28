import { expect, test, jest } from '@jest/globals';
import { act } from 'react-test-renderer';
import { render, renderer, texts, buttons, button, seedPoints, mockNavigate, textOf } from '../test-support/progress-screen';
import { onboardingRepository, type OnboardingProfile } from '@/api/domains';
import { t } from '@/i18n';
import { Text } from 'react-native';
import { StatTile } from '@/design';
import { trainingE1RMRepository } from '@/features/training/storage';
import { formatKg } from '@/features/dashboard/model';
import { GrowthTotalCard } from '../GrowthTotalCard';
import { E1RMScreen } from '../E1RMScreen';
import { GrowthE1RMChart } from '../GrowthE1RMChart';
import { GrowthSourceSheet } from '../GrowthSourceSheet';
import { LIFT_FAMILIES, LIFT_PRESENTATION, buildGrowthCurves, buildGrowthStats } from '../model';

test('defaults to Total with comparisons and no source interaction; shared ranges survive all segment switches', async () => {
  seedPoints();
  await render(<E1RMScreen />);
  expect(button('Total').props.accessibilityState.selected).toBe(true);
  expect(texts()).toContain(t('student.trainingHistoryView.copy014'));
  expect(texts()).toContain(t('student.trainingHistoryView.copy015'));
  expect(texts()).toContain(t('student.trainingHistoryView.copy016'));
  expect(texts()).not.toContain(t('student.e1rmSourceHint'));
  expect(renderer.root.findByType(GrowthE1RMChart).props.onSelect).toBeUndefined();
  expect(buttons().filter(node => node.props.testID?.startsWith('growth-point-'))).toHaveLength(0);
  act(() => button(t('student.growthE1Rmcard.copy001', ['Total', '30 days'])).props.onPress());
  for (const family of LIFT_FAMILIES) {
    act(() => button(family === 'bench' ? 'Bench' : LIFT_PRESENTATION[family].name).props.onPress());
    expect(button(t('student.growthE1Rmcard.copy001', [LIFT_PRESENTATION[family].name, '90 days']))).toBeDefined();
    expect(texts()).not.toContain(t('student.trainingHistoryView.copy015'));
    expect(texts()).not.toContain(t('student.trainingHistoryView.copy016'));
    expect(texts()).toContain(t('student.e1rmSourceHint'));
    act(() => buttons().find(node => node.props.testID === `growth-point-${family}-1`)!.props.onPress());
    expect(renderer.root.findByType(GrowthSourceSheet).props.detail.point.id).toBe(`${family}-1`);
    expect(texts()).toContain(t('student.e1rmSourceTitle'));
    act(() => renderer.root.findByType(GrowthSourceSheet).props.onClose());
  }
  const name = LIFT_PRESENTATION.deadlift.name;
  for (const range of ['90 days', 'All history', '30 days']) {
    const capsule = button(t('student.growthE1Rmcard.copy001', [name, range]));
    expect(capsule).toBeDefined();
    act(() => capsule.props.onPress());
  }
  act(() => renderer.unmount());
  await render(<E1RMScreen />);
  expect(button('Total').props.accessibilityState.selected).toBe(true);
});

test('missing Total names missing lifts; all three zero-data segments offer Today', async () => {
  await render(<E1RMScreen />);
  expect(texts()).toContain(t('student.progressMenu.totalEmpty'));
  expect(texts()).toContain(t('student.progressMenu.missing', ['Squat, Bench press, Deadlift']));
  for (const family of LIFT_FAMILIES) {
    act(() => button(family === 'bench' ? 'Bench' : LIFT_PRESENTATION[family].name).props.onPress());
    expect(texts()).toContain(t('student.growthEmptyStates.copy006'));
    const today = button(t('student.growthEmptyStates.copy009'));
    expect(today).toBeDefined();
    act(() => today.props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith('/(student)/today');
  }
});

test.each([1, 2])('lift forming-progress state retains %s recorded points', async count => {
  seedPoints(count);
  await render(<E1RMScreen />);
  for (const family of LIFT_FAMILIES) {
    act(() => button(family === 'bench' ? 'Bench' : LIFT_PRESENTATION[family].name).props.onPress());
    expect(texts().some(text => text.includes(`${count}/3`))).toBe(true);
    expect(renderer.root.findAllByType(GrowthE1RMChart)).toHaveLength(0);
  }
});

test('old lift points show range-sparse state and reappear when range is extended', async () => {
  seedPoints(3, LIFT_FAMILIES, true);
  await render(<E1RMScreen />);
  expect(texts()).toContain(t('student.growthScreenPresentation.copy004').replace('{window}', '30 days'));
  for (const family of LIFT_FAMILIES) {
    act(() => button(family === 'bench' ? 'Bench' : LIFT_PRESENTATION[family].name).props.onPress());
    expect(texts()).toContain(t('student.growthScreenPresentation.copy004').replace('{window}', '30 days'));
  }
  act(() => button(t('student.growthE1Rmcard.copy001', ['Deadlift', '30 days'])).props.onPress());
  expect(renderer.root.findAllByType(GrowthE1RMChart)).toHaveLength(1);
});


test('Total alone shows the legacy breakthrough comparison when estimates exceed training 1RM', async () => {
  seedPoints();
  const profile: OnboardingProfile = {
    user_id: 'student', unit_preference: 'kg', gender: null, birth_date: null,
    height_cm: null, weight_kg: null, training_years: null, squat_stance: null,
    deadlift_style: null, bench_grip: null, squat_1rm_kg: '100', bench_1rm_kg: '100', deadlift_1rm_kg: '100',
    training_days: null, gym_tier: null, equipment_overrides: null, daily_life_intensity: null,
    life_stress: null, recovery_speed: null, sleep_hours: null, muscle_groups_to_strengthen: null,
    injury_notes: null, injury_areas: null, is_competing: null, competition_date: null,
    target_weight_class: null, note_to_coach: null, completed_at: null,
    created_at: '2026-01-01', updated_at: '2026-01-01', upload_attachment_ids: [],
  };
  jest.mocked(onboardingRepository.get).mockResolvedValue(profile);
  await render(<E1RMScreen />);
  expect(texts()).toContain(t('student.trainingHistoryView.copy017', [160]));
  act(() => button('Squat').props.onPress());
  expect(texts()).not.toContain(t('student.trainingHistoryView.copy017', [160]));
});


test.each([false, true])('Total headline matches stats and comparison across ranges, including declining=%s', async declining => {
  const points = seedPoints().map((point, index) => declining ? { ...point, e1RMKg: [150, 130, 140][index % 3] } : point);
  jest.mocked(trainingE1RMRepository.historySnapshot).mockResolvedValue({ points, revision: 0 });
  const curves = buildGrowthCurves([], new Map(LIFT_FAMILIES.map(family => [family, family])), new Date(), points);
  const stats = buildGrowthStats([], curves);
  expect(stats.sbdTotalKg).toBe(declining ? 450 : 480);
  await render(<E1RMScreen />);
  for (const range of ['30 days', '90 days', 'All history']) {
    const cardTexts = renderer.root.findByType(GrowthTotalCard).findAllByType(Text).map(textOf);
    expect(cardTexts).toContain(stats.sbdTotalKg!.toFixed(1));
    const comparison = renderer.root.findAllByType(StatTile).find(tile => tile.props.label === t('student.trainingHistoryView.copy015'))!;
    expect(comparison.props.value).toBe(formatKg(stats.sbdTotalKg!));
    expect(Number(comparison.props.value)).toBe(Number(stats.sbdTotalKg!.toFixed(1)));
    const lastPoint = renderer.root.findByType(GrowthE1RMChart).props.samples.at(-1).valueKg;
    expect(lastPoint).toBe(declining ? 420 : 480);
    if (declining) expect(lastPoint).not.toBe(stats.sbdTotalKg);
    act(() => button(t('student.growthE1Rmcard.copy001', ['Total', range])).props.onPress());
  }
});

test('Total headline and comparison both show a dash when lift headlines are incomplete', async () => {
  seedPoints(3, ['squat', 'bench']);
  await render(<E1RMScreen />);
  expect(renderer.root.findByType(GrowthTotalCard).findAllByType(Text).map(textOf)).toContain('—');
  expect(renderer.root.findAllByType(StatTile).find(tile => tile.props.label === t('student.trainingHistoryView.copy015'))!.props.value).toBe('—');
});
