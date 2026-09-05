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
