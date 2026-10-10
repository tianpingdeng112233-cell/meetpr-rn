import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { day, plan } from '@/domain/plan/test-fixtures';
import { trainingWeekStrip } from '@/domain/plan/week-strip';
import { setLocaleOverride } from '@/i18n';
import { TrainingWeekStrip } from '../TrainingWeekStrip';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let renderer: ReactTestRenderer;
beforeEach(() => setLocaleOverride('en'));
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });
const copy = () => renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join(''));

test('training cells show dates or Behind without D ordinals; rest cells expose only weekday and Rest', () => {
  const fixture = plan([
    day('done', { completed_at: '2026-09-07T12:00:00Z' }),
    day('behind', { day_of_week: 2 }),
    day('today', { day_of_week: 3 }),
    day('future', { day_of_week: 4 }),
  ]);
  act(() => { renderer = create(<TrainingWeekStrip plan={fixture} strip={trainingWeekStrip(fixture, null, '2026-09-09')} onSelect={jest.fn()} />); });
  expect(copy().filter(text => /^D\d+$/.test(text))).toEqual([]);
  expect(copy()).toEqual(expect.arrayContaining(['9/7', 'Behind', '9/9', '9/10', 'Rest']));
  expect(copy()).not.toEqual(expect.arrayContaining(['9/8']));
  for (const restDate of ['9/11', '9/12', '9/13']) expect(copy()).not.toContain(restDate);
  for (const label of ['W1D1, Mon 9/7', 'W1D2, Tue, behind schedule', 'W1D3, Wed 9/9', 'Fri, rest day']) {
    expect(renderer.root.findAllByProps({ accessibilityLabel: label }).length).toBeGreaterThan(0);
  }
});

test('the compact strip contains only calendar cells and fixed navigation, without week heading or dots', () => {
  const fixture = plan([day('first'), day('last', { week_number: 2 })]);
  const select = jest.fn();
  act(() => { renderer = create(<TrainingWeekStrip plan={fixture} strip={trainingWeekStrip(fixture, null, '2026-09-07')} onSelect={select} />); });
  expect(copy()).not.toContain('W1');
  expect(copy()).not.toContain('Current week');
  expect(renderer.root.findAllByProps({ importantForAccessibility: 'no-hide-descendants' })).toHaveLength(0);
  const previous = () => renderer.root.findAllByProps({ accessibilityLabel: 'Previous week' })[0];
  const next = () => renderer.root.findAllByProps({ accessibilityLabel: 'Next week' })[0];
  expect(previous().props.accessibilityState.disabled).toBe(true);
  expect(next().props.accessibilityState.disabled).toBe(false);
  act(() => next().props.onPress());
  expect(select).toHaveBeenLastCalledWith('last');
  act(() => { renderer.update(<TrainingWeekStrip plan={fixture} strip={trainingWeekStrip(fixture, 'last', '2026-09-07')} onSelect={select} />); });
  expect(previous().props.accessibilityState.disabled).toBe(false);
  expect(next().props.accessibilityState.disabled).toBe(true);
  act(() => previous().props.onPress());
  expect(select).toHaveBeenLastCalledWith('first');
});
