import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { day, set } from '@/domain/plan/test-fixtures';
import type { ExecutionDay } from '@/domain/coach/detail-week';
import type { SetLog } from '@/api/domains/sets';
import { setLocaleOverride, t } from '@/i18n';
import { CoachDayDetailView } from '../CoachDayDetailView';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(); });
const log = (id: string, index: number, added = false): SetLog => ({ id, student_id: 'student', plan_exercise_id: added ? null : 'squat', exercise_id: added ? 'curl' : 'squat', plan_day_id: added ? 'd4' : null, set_index: index, weight_kg: '100', reps: 5, rpe: '8', completed: true, failed: false, assumed: false, adhoc: added, logged_date: '2026-09-07', logged_at: '2026-09-07T12:00:00Z' });
const execution: ExecutionDay = { date: new Date(2026, 8, 10), planDay: day('d4', { exercises: [{ id: 'squat', exercise_id: 'squat', plan_day_id: 'd4', is_main_lift: true, notes: null, sort_order: 0, sets: [set(), set()] }] }), logs: [log('extra', 2), log('first', 0), log('curl1', 1, true), log('curl0', 0, true)] };
function renderDay(value = execution) { act(() => { renderer = create(<CoachDayDetailView day={value} planDays={[execution.planDay!]} exerciseName={id => id} onClose={() => {}} />); }); }
function texts() { return renderer.root.findAllByType(Text).map(node => node.props.children); }

test.each(['en', 'zh'] as const)('day detail shows a separate muted student-added divider and read-only exercise card (%s)', locale => {
  setLocaleOverride(locale);
  renderDay();
  const divider = locale === 'en' ? 'Added by student' : '学员自加';
  const subtitle = locale === 'en' ? 'Added by student · not in plan · 2 sets logged' : '学员自加 · 不在计划里 · 记录了 2 组';
  expect(texts()).toContain(t('coach.execution.loggedSetsFraction %lld %lld', [1, 2]));
  expect(texts()).toContain(subtitle);
  expect(texts().filter(text => text === divider)).toHaveLength(1);
  expect(texts().indexOf('#1')).toBeLessThan(texts().indexOf(divider));
  expect(texts().indexOf(divider)).toBeLessThan(texts().indexOf('#3'));
  expect(texts().indexOf('#3')).toBeLessThan(texts().indexOf('curl'));
  const rows = renderer.root.findAllByType(View).filter(node => node.props.accessible && node.findAllByType(Text).some(text => /^#\d+$/.test(String(text.props.children))));
  expect(rows).toHaveLength(4);
  expect(rows.map(node => StyleSheet.flatten(node.props.style))).toEqual(Array(4).fill(StyleSheet.flatten(rows[0].props.style)));
  expect(rows.every(node => !node.findAllByType(Text).some(text => text.props.children === divider))).toBe(true);
  const label = renderer.root.findAllByType(Text).find(node => node.props.children === divider)!;
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontSize: 12, color: '#5C6371' });
  expect(renderer.root.findAllByProps({ accessibilityRole: 'button' }).every(node => node.findAllByType(Text).some(text => text.props.children === t('coach.detail.back')))).toBe(true);
});


test('refreshing the day removes deleted student-added records and preserves ordinary cards', () => {
  renderDay();
  const ordinary = { ...execution, logs: [log('first', 0)] };
  act(() => renderer.update(<CoachDayDetailView day={ordinary} planDays={[execution.planDay!]} exerciseName={id => id} onClose={() => {}} />));
  expect(texts()).toContain('squat');
  expect(texts()).toContain(t('coach.execution.loggedSetsFraction %lld %lld', [1, 2]));
  expect(texts()).toContain('#1');
  expect(texts()).not.toContain('curl');
  expect(texts()).not.toContain('#3');
  expect(texts()).not.toContain('Added by student');
});

test('free-log and empty rest-day branches keep their existing presentation', () => {
  renderDay({ ...execution, planDay: null, logs: [log('free', 0, true)] });
  expect(texts()).toContain(t('coach.execution.freeLog'));
  expect(texts()).toContain('#1');
  expect(texts()).not.toContain('curl');
  act(() => renderer.update(<CoachDayDetailView day={{ ...execution, planDay: null, logs: [] }} planDays={[]} exerciseName={id => id} onClose={() => {}} />));
  expect(texts()).toContain(t('coach.execution.restDay'));
});

test('day header displays its plan day code and individual settlement status', () => {
  const earlier = day('earlier', { exercises: [{ ...execution.planDay!.exercises[0], id: 'earlier-squat', plan_day_id: 'earlier' }], day_of_week: 1 });
  const later = { ...execution.planDay!, day_of_week: 4, completed_at: '2026-09-07T12:00:00Z' };
  const days = [earlier, later];
  act(() => { renderer = create(<CoachDayDetailView day={{ ...execution, planDay: later }} planDays={days} exerciseName={id => id} onClose={() => {}} />); });
  expect(texts()).toContain(`W1D2 · ${t('coach.detail.completed')}`);
  act(() => renderer.update(<CoachDayDetailView day={{ ...execution, planDay: earlier }} planDays={days} exerciseName={id => id} onClose={() => {}} />));
  expect(texts()).toContain(`W1D1 · ${t('coach.detail.notStarted')}`);
});
