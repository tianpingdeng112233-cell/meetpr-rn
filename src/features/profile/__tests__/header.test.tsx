import { expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { t } from '@/i18n';
import { Eyebrow } from '@/design/Eyebrow';
import { MyProfileHeader } from '../MyProfileHeader';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

test('profile header puts its subtitle after the title without an Eyebrow', () => {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<MyProfileHeader />); });
  try {
    const texts = renderer.root.findAllByType(Text);
    const title = texts.findIndex((node) => node.props.children === t('student.myProfileView.copy016'));
    const subtitle = texts.findIndex((node) => node.props.children === t('student.myProfileView.copy017'));
    expect(title).toBeGreaterThanOrEqual(0);
    expect(subtitle).toBeGreaterThan(title);
    expect(renderer.root.findAllByType(Eyebrow)).toHaveLength(0);
    expect(StyleSheet.flatten(texts[subtitle].props.style)).toMatchObject({ fontSize: 11, letterSpacing: 0.44, marginTop: -8 });
  } finally {
    act(() => renderer.unmount());
  }
});
