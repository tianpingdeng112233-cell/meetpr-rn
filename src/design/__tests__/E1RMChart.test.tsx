import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { t, setLocaleOverride } from '@/i18n';
import { E1RMChart } from '../E1RMChart';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); });

test('coach charts draw horizontal grids, four translated dates, solid segments and unscaled circles', () => {
  setLocaleOverride('en');
  const points = Array.from({ length: 7 }, (_, index) => ({ id: String(index), date: new Date(2026, 8, index + 1), e1RMKg: 100 + index * 5 }));
  act(() => { renderer = create(<E1RMChart points={points} />); });
  const container = renderer.root.findByType(View);
  act(() => container.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
  expect(container.props.accessibilityLabel).toBe(t('designSystem.e1rm.chartLabel %@', [7]));
  expect(renderer.root.findByType(Svg).props.pointerEvents).toBe('none');
  const grids = renderer.root.findAllByType(Line);
  expect(grids.length).toBeGreaterThanOrEqual(3);
  expect(grids.length).toBeLessThanOrEqual(4);
  expect(grids.every((line) => line.props.y1 === line.props.y2 && line.props.strokeWidth === 1)).toBe(true);
  expect(renderer.root.findAllByType(SvgText).map((label) => label.props.children)).toEqual(expect.arrayContaining(['9/1', '9/3', '9/5', '9/7']));
  const segments = renderer.root.findAllByType(Path);
  expect(segments).toHaveLength(6);
  expect(segments.every((line) => line.props.d.includes('C') && line.props.strokeWidth === 1.2 && line.props.strokeOpacity === 0.8 && line.props.strokeDasharray === undefined)).toBe(true);
  expect(renderer.root.findAllByType(Circle)).toHaveLength(7);
  expect(renderer.root.findAllByType(Circle).every((circle) => Math.abs(circle.props.r - 3.385) < 0.001 && circle.props.opacity === 1)).toBe(true);
  act(() => container.props.onLayout({ nativeEvent: { layout: { width: 200 } } }));
  expect(renderer.root.findAllByType(Circle)[0].props.r).toBeCloseTo(3.385, 3);
});

test('a single sample uses singular accessibility, one local date label and no line', () => {
  setLocaleOverride('zh');
  act(() => { renderer = create(<E1RMChart points={[{ id: 'one', date: new Date(2026, 8, 5), e1RMKg: 100 }]} />); });
  const container = renderer.root.findByType(View);
  act(() => container.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
  expect(container.props.accessibilityLabel).toBe(t('designSystem.e1rm.chartLabelOne %@', [1]));
  expect(renderer.root.findAllByType(SvgText).map((label) => label.props.children)).toContain(t('designSystem.date.monthDay %@ %@', [9, 5]));
  expect(renderer.root.findAllByType(Path)).toHaveLength(0);
  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
});
