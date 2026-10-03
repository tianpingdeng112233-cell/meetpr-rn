import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { E1RMChart } from '@/design/E1RMChart';
import { Card } from '@/design/Card';
import { CoachExerciseStatsSchema } from '@/api/domains/coach';
import { t } from '@/i18n';
import { GrowthSection } from '../GrowthSection';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const stats = CoachExerciseStatsSchema.parse({
  one_rm: { squat: '150', bench: '100', deadlift: '200' },
  e1rm: { squat: { value: '120' }, bench: { value: '80' }, deadlift: { value: '160' } },
  e1rm_series: {
    squat: { points: [{ date: '2026-09-01', value: '120' }], trend: 'up' },
    bench: { points: [{ date: '2026-09-02', value: '80' }], trend: 'flat' },
    deadlift: { points: [{ date: '2026-09-03', value: '160' }], trend: 'down' },
  },
});

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test('each family card shows its real E1RMChart with local calendar dates', () => {
  act(() => { renderer = create(<GrowthSection stats={stats} />); });
  const charts = renderer.root.findAllByType(E1RMChart);
  expect(charts.map((chart) => chart.props.testID)).toEqual([
    'coach.growth.chart.squat', 'coach.growth.chart.bench', 'coach.growth.chart.deadlift',
  ]);
  expect(charts[0].props.points).toEqual([{ id: 'squat-2026-09-01', date: new Date(2026, 8, 1), e1RMKg: 120 }]);
  expect(charts.every((chart) => chart.props.height === 90 && chart.props.onSelect === undefined)).toBe(true);
});

test('a family without points retains its card but has no chart', () => {
  const sparse = { ...stats, e1rm_series: { ...stats.e1rm_series, bench: { points: [], trend: 'unknown' } } };
  act(() => { renderer = create(<GrowthSection stats={sparse} />); });
  expect(renderer.root.findAllByType(E1RMChart).map((chart) => chart.props.testID)).toEqual([
    'coach.growth.chart.squat', 'coach.growth.chart.deadlift',
  ]);
});

test('failed growth shows the localized error and an actionable primary retry', () => {
  const onRetry = jest.fn();
  act(() => { renderer = create(<GrowthSection state="failed" onRetry={onRetry} />); });
  const message = renderer.root.findAllByType(Text).find((node) => node.props.children === t('coach.growth.error.load'));
  expect(message).toBeDefined();
  expect(StyleSheet.flatten(message!.props.style)).toMatchObject({ fontSize: 15, fontFamily: 'IBMPlexSans_600SemiBold', color: '#5C6371', textAlign: 'center' });
  const retry = renderer.root.findByProps({ accessibilityRole: 'button' });
  expect(retry.props.accessibilityLabel).toBe(t('coach.detail.retry'));
  act(() => retry.props.onPress());
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(E1RMChart)).toHaveLength(0);
});

test('loading displays only a centered spinner at top 32, even with cached data', () => {
  act(() => { renderer = create(<GrowthSection state="loading" stats={stats} />); });
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  expect(StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style)).toMatchObject({ alignItems: 'center', paddingTop: 32 });
});

test('all families without points display the centered muted empty message at top 32', () => {
  act(() => { renderer = create(<GrowthSection stats={{ ...stats, e1rm_series: null }} />); });
  const message = renderer.root.findByType(Text);
  expect(message.props.children).toBe(t('coach.growth.empty'));
  expect(StyleSheet.flatten(message.props.style)).toMatchObject({ fontSize: 15, fontFamily: 'IBMPlexSans_600SemiBold', color: '#5C6371', textAlign: 'center' });
  expect(StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style)).toMatchObject({ alignItems: 'center', paddingTop: 32 });
});

test('family cards use fifteen point padding on both axes, overriding the shared Card defaults', () => {
  act(() => { renderer = create(<GrowthSection stats={stats} />); });
  const cards = renderer.root.findAllByType(Card).map((card) => StyleSheet.flatten(card.findAllByType(View)[0].props.style));
  expect(cards[0]).toMatchObject({ paddingVertical: 16, paddingHorizontal: 16 });
  expect(cards.slice(1)).toHaveLength(3);
  for (const card of cards.slice(1)) expect(card).toMatchObject({ paddingVertical: 15, paddingHorizontal: 15, gap: 6 });
});
