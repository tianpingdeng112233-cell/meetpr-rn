import { FeedbackPressable } from '@/design/FeedbackPressable';
import { useState } from 'react';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { setLocaleOverride, t } from '@/i18n';
import type { DashboardWeekDay } from '../types';
import { WeekCalendar } from '../WeekCalendar';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));

const cells: DashboardWeekDay[] = [1, 2, 3, 4].map((day) => ({
  day: {
    id: `day-${day}`, plan_id: 'plan', week_number: 2, day_of_week: day,
    sort_order: day, shifted_to_date: null, exercises: [],
    completed_at: day === 1 ? '2026-09-08T12:00:00Z' : null,
  },
  status: day === 1 ? 'done' : day === 2 ? 'current' : 'upcoming',
  date: `2026-09-${String(day + 7).padStart(2, '0')}`, lift: null, completion: day === 1 ? 1 : 0,
}));

let renderer: ReactTestRenderer;
beforeEach(() => setLocaleOverride('en'));
afterEach(() => {
  act(() => renderer?.unmount());
  setLocaleOverride(null);
});

test('currentWeek shows the week, current-week badge, progress and recommendation label', async () => {
  await act(async () => {
    renderer = create(<WeekCalendar headerStyle="currentWeek" weekNumber={2} cells={cells} selectedDayID="day-2" onSelect={jest.fn()} />);
  });
  const copy = renderer.root.findAllByType(Text).map((node) =>
    [node.props.children].flat().join(''));
  expect(copy).toEqual(expect.arrayContaining([
    'W2', t('student.dashboardWeekCalendar.copy013'), '1 / 4',
    t('student.dashboardWeekCalendar.copy014'),
  ]));
});

test('progress shows weekly progress and the same recommendation label', async () => {
  await act(async () => {
    renderer = create(<WeekCalendar headerStyle="progress" weekNumber={2} cells={cells} selectedDayID="day-2" onSelect={jest.fn()} />);
  });
  const copy = renderer.root.findAllByType(Text).map((node) =>
    [node.props.children].flat().join(''));
  expect(copy).toEqual(expect.arrayContaining([
    t('student.dashboardWeekCalendar.copy012'), '1 / 4',
    t('student.dashboardWeekCalendar.copy014'),
  ]));
  expect(copy).not.toContain(t('student.dashboardWeekCalendar.copy013'));
});

test.each(['progress', 'currentWeek'] as const)('%s renders nothing for an empty week', async (headerStyle) => {
  await act(async () => {
    renderer = create(<WeekCalendar headerStyle={headerStyle} weekNumber={2} cells={[]} selectedDayID={null} onSelect={jest.fn()} />);
  });
  expect(renderer.toJSON()).toBeNull();
});

test('week cells expose the same ordinal in visible and accessible labels', async () => {
  const sparse = cells.map((cell, index) => ({ ...cell, day: { ...cell.day, day_of_week: [2, 4, 6, 7][index] } }));
  await act(async () => { renderer = create(<WeekCalendar headerStyle="currentWeek" weekNumber={2} cells={sparse} selectedDayID="day-2" onSelect={jest.fn()} />); });
  const copy = renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
  expect(copy.filter(text => /^D\d+$/.test(text))).toEqual(['D1', 'D2', 'D3', 'D4']);
  expect(renderer.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'button').map(node => node.props.accessibilityLabel.split(' ')[0])).toEqual(['W2D1', 'W2D2', 'W2D3', 'W2D4']);
});


test('Today selection follows a tap while the current-session marker stays on its day', async () => {
  function Calendar() {
    const [selected, select] = useState('day-2');
    return <WeekCalendar todaySelection headerStyle="progress" weekNumber={2} cells={cells} selectedDayID={selected} onSelect={select} />;
  }
  await act(async () => { renderer = create(<Calendar />); });
  const buttons = () => renderer.root.findAllByType(FeedbackPressable);
  expect(buttons()[1].props.accessibilityState.selected).toBe(true);
  expect(buttons()[1].props.accessibilityValue).toEqual({ text: "Today's session" });
  await act(async () => buttons()[2].props.onPress());
  expect(buttons().map(node => node.props.accessibilityState.selected)).toEqual([false, false, true, false]);
  expect(buttons()[1].props.accessibilityValue).toEqual({ text: "Today's session" });
  expect(buttons()[2].props.accessibilityValue).toEqual({ text: 'Upcoming' });
  await act(async () => buttons()[0].props.onPress());
  expect(buttons()[0].props.accessibilityState.selected).toBe(true);
  expect(buttons()[0].props.accessibilityValue).toEqual({ text: 'Completed' });
});
