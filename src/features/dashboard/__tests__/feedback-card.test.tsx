import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/design/tokens';
import type { DashboardFeedbackItem } from '../model';
import { setLocaleOverride, t } from '@/i18n';
import { FeedbackCard } from '../FeedbackCard';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));

const items: DashboardFeedbackItem[] = [
  { id: 'old-unread', text: 'Keep your chest up.', posted_at: '2026-09-01T12:00:00Z', read_at: null },
  { id: 'new-read', text: 'Good session.', posted_at: '2026-09-04T12:00:00Z', read_at: '2026-09-04T13:00:00Z' },
  { id: 'new-unread', text: 'Drive through your feet.', posted_at: '2026-09-03T12:00:00Z', read_at: null },
].map(item => ({ ...item, coach_id: 'coach', student_id: 'student', day_date: null, plan_exercise_id: null, video_id: null }));
let renderer: ReactTestRenderer;
const onOpenItem = jest.fn();
const onPress = jest.fn();
beforeEach(() => {
  setLocaleOverride('en');
  jest.clearAllMocks();
});
afterEach(() => {
  act(() => renderer?.unmount());
  setLocaleOverride(null);
});
async function renderCard(feedback = items) {
  await act(async () => {
    renderer = create(<FeedbackCard coachName="Coach" items={feedback} pending={feedback.filter(item => item.read_at === null).length}
      now={new Date('2026-09-05T12:00:00Z')} onPress={onPress} onOpenItem={onOpenItem} />);
  });
}
function copy() {
  return renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));
}
function buttons() {
  return renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.parent?.props.accessibilityRole !== 'button');
}

test('collapsed card previews the latest unread feedback and offers all items', async () => {
  await renderCard();
  expect(copy()).toEqual(expect.arrayContaining([
    t('student.dashboardFeedbackCard.copy001', [3]),
    t('student.dashboardFeedbackCard.copy004', [2]),
    'Drive through your feet.',
  ]));
  expect(copy()).not.toContain('Good session.');
  expect(buttons()).toHaveLength(1);
  expect(buttons()[0].props.accessibilityLabel)
    .toBe(t('student.dashboardFeedbackCard.copy002', [3]));
});

test('card expands into newest-first rows with View and unread dots, then the header collapses it', async () => {
  await renderCard();
  await act(async () => buttons()[0].props.onPress());
  expect(copy()).toContain(t('student.dashboardFeedbackCard.copy005'));
  expect(copy().filter(text => text === t('student.dashboardFeedbackCard.copy006'))).toHaveLength(3);
  const rows = buttons().slice(1);
  expect(rows.map(row => row.findAllByType(Text).at(-1)?.props.children))
    .toEqual(['Good session.', 'Drive through your feet.', 'Keep your chest up.']);
  const dots = rows.map(row => row.findAll(node => {
    const style = StyleSheet.flatten(node.props.style);
    return typeof node.type === 'string' && style?.width === 6 && style?.height === 6 && style?.backgroundColor === colors.gold500;
  }).length);
  expect(dots).toEqual([0, 1, 1]);
  expect(copy().some(text => text.includes('Coach ·'))).toBe(false);
  await act(async () => buttons()[0].props.onPress());
  expect(copy()).toContain(t('student.dashboardFeedbackCard.copy001', [3]));
  expect(copy()).not.toContain(t('student.dashboardFeedbackCard.copy005'));
  expect(onPress).not.toHaveBeenCalled();
  expect(onOpenItem).not.toHaveBeenCalled();
});

test('opening a row passes that exact item to the detail callback', async () => {
  await renderCard();
  await act(async () => buttons()[0].props.onPress());
  await act(async () => buttons()[2].props.onPress());
  expect(onOpenItem).toHaveBeenCalledWith(items[2]);
  expect(onOpenItem.mock.calls[0][0]).toBe(items[2]);
  expect(onPress).not.toHaveBeenCalled();
});

test('expanded rows show the associated exercise and display set number', async () => {
  await renderCard([{ ...items[0], video_id: 'video', video: { exercise_name: 'Competition squat', set_index: 1 } }, items[1]]);
  await act(async () => buttons()[0].props.onPress());
  expect(copy()).toEqual(expect.arrayContaining(['Competition squat · Set 2', 'Training feedback']));
});

test('all-read feedback previews the newest item without an unread badge', async () => {
  await renderCard(items.map(item => ({ ...item, read_at: '2026-09-05T12:00:00Z' })));
  expect(copy()).toContain('Good session.');
  expect(copy().some(text => text.includes('unread'))).toBe(false);
});

test('empty feedback preserves the existing placeholder and has no buttons', async () => {
  await renderCard([]);
  expect(copy()).toContain(t('student.dashboardFeedbackCard.copy007'));
  expect(buttons()).toHaveLength(0);
});

test('an expanded card returning to empty shows only the existing empty state', async () => {
  await renderCard();
  await act(async () => buttons()[0].props.onPress());
  await act(async () => renderer.update(<FeedbackCard coachName="Coach" items={[]} pending={0}
    now={new Date('2026-09-05T12:00:00Z')} onPress={onPress} onOpenItem={onOpenItem} />));
  expect(copy()).toContain(t('student.dashboardFeedbackCard.copy007'));
  expect(copy()).not.toContain(t('student.dashboardFeedbackCard.copy005'));
  expect(buttons()).toHaveLength(0);
});
