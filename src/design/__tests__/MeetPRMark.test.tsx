import { afterEach, expect, jest, test } from '@jest/globals';
import { Children, isValidElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Svg, { Text as SvgText, TSpan } from 'react-native-svg';
import { MeetPRMark } from '../MeetPRMark';
import { colors, font } from '../tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test.each([
  { usage: 'header', props: { testID: 'dashboard-mark' }, width: 97, height: 24, stroke: colors.textPrimary, fill: colors.bgBase },
  { usage: 'login', props: { fontSize: 15 }, width: 90.9375, height: 22.5, stroke: colors.textPrimary, fill: colors.bgBase },
  { usage: 'badge', props: { fontSize: 16 * 16 / 24, strokeColor: '#abcdef', fillColor: '#123456', accessibilityLabel: 'MEETPR' }, width: 64.6666666667, height: 16, stroke: '#abcdef', fill: '#123456' },
])('$usage uses the canonical whole-string wordmark and supplied colors', ({ props, width, height, stroke, fill }) => {
  act(() => { renderer = create(<MeetPRMark {...props} />); });
  const layers = renderer.root.findAllByType(SvgText);
  expect(layers).toHaveLength(2);
  for (const layer of layers) {
    expect(layer.props.letterSpacing).toBe(0);
    expect(layer.props.children).toBe('MEETPR');
    // Inspect authored children: react-native-svg internally wraps plain text in a TSpan.
    expect(Children.toArray(layer.props.children).filter(child => isValidElement(child) && child.type === TSpan)).toHaveLength(0);
    expect(layer.props).toMatchObject({ x: 3, y: 18, fontSize: 16, fontWeight: '900', fontFamily: font.display(16, 'black').fontFamily });
  }
  expect(layers[0].props).toMatchObject({ stroke, fill: stroke, strokeWidth: 5.12, strokeLinejoin: 'round' });
  expect(layers[1].props.fill).toBe(fill);
  const svg = renderer.root.findByType(Svg);
  expect(svg.props.viewBox).toBe('0 0 97 24');
  expect(svg.props.width).toBeCloseTo(width);
  expect(svg.props.height).toBeCloseTo(height);
  expect(svg.props.testID).toBe(props.testID);
  expect(svg.props.accessibilityLabel).toBe(props.accessibilityLabel);
});
