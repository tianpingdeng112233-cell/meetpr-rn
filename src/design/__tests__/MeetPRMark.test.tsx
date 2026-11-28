import { afterEach, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Svg, { SvgXml } from 'react-native-svg';
import { MeetPRMark } from '../MeetPRMark';
import { ColorSchemeProvider } from '../theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test.each([
  { scheme: 'light', variant: 'auto', file: 'meetpr-wordmark-final.svg' },
  { scheme: 'dark', variant: 'auto', file: 'meetpr-wordmark-final-on-dark.svg' },
  { scheme: 'light', variant: 'onDark', file: 'meetpr-wordmark-final-on-dark.svg' },
  { scheme: 'dark', variant: 'onLight', file: 'meetpr-wordmark-final.svg' },
] as const)('$variant on $scheme renders $file byte-for-byte at header size', ({ scheme, variant, file }) => {
  act(() => {
    renderer = create(<ColorSchemeProvider scheme={scheme}>
      <MeetPRMark height={18} variant={variant} testID="brand" />
    </ColorSchemeProvider>);
  });
  const source = readFileSync(resolve(__dirname, '../../../docs/brand', file));
  expect(Buffer.from(renderer.root.findByType(SvgXml).props.xml)).toEqual(source);
  const svg = renderer.root.findByType(Svg);
  expect(svg.props).toMatchObject({ testID: 'brand', height: 18, viewBox: '0 0 2443 605' });
  expect(svg.props.width).toBeCloseTo(72.7, 1);
});
