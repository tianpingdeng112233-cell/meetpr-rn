import { test, expect, jest } from '@jest/globals';
import { act } from 'react-test-renderer';
import { ScrollView } from 'react-native';
import { render, renderer, button, texts, seedPoints } from '../test-support/progress-screen';
import { plansRepository } from '@/api/domains/plans';
import { trainingE1RMRepository } from '@/features/training/storage';
import { day, plan, set } from '@/domain/plan/test-fixtures';
import { RPETableScreen } from '../RPETableScreen';

test('defaults to the most frequent planned competition lift and switches all four segments', async () => {
  const p = plan([day('d', { exercises: ['deadlift', 'deadlift', 'squat'].map((family, index) => ({ id: String(index), plan_day_id: 'd', exercise_id: family, is_main_lift: false, sort_order: index, notes: null, sets: [set()] })) })]);
  jest.spyOn(plansRepository, 'handoff').mockResolvedValue({ current_plan_id: p.id, plans: [{ ...p, handoff_status: 'current', completed_training_days: 0, total_training_days: 1 }] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(p);
  const points = seedPoints();
  jest.spyOn(trainingE1RMRepository, 'fetchHistories').mockResolvedValue(new Map(['squat', 'bench', 'deadlift'].map(family => [family, points.filter(point => point.exerciseId === family)])));
  await render(<RPETableScreen />);
  expect(button('Deadlift').props.accessibilityState.selected).toBe(true);
  expect(texts()).toContain('210');
  for (const label of ['Squat', 'Bench', 'Deadlift', '%']) {
    act(() => button(label).props.onPress());
    expect(button(label).props.accessibilityState.selected).toBe(true);
  }
  expect(texts()).toContain('100%');
  const horizontal = renderer.root.findAllByType(ScrollView).find(node => node.props.horizontal)!;
  expect(horizontal.findAllByProps({ testID: 'rpe-table-reps' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID: 'rpe-table-reps' }).length).toBeGreaterThan(0);
});

test('without a plan or estimates defaults to squat and percentages', async () => {
  jest.spyOn(plansRepository, 'handoff').mockResolvedValue({ current_plan_id: null, plans: [] });
  jest.spyOn(trainingE1RMRepository, 'fetchHistories').mockResolvedValue(new Map());
  await render(<RPETableScreen />);
  expect(button('Squat').props.accessibilityState.selected).toBe(true);
  expect(texts()).toContain('100%');
});
