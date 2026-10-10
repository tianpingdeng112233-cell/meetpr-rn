import { expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { t } from '@/i18n';
import { Eyebrow } from '@/design/Eyebrow';
import { MyProfileHeader } from '../MyProfileHeader';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

test('profile header keeps the title without its old subtitle or an Eyebrow', () => {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<MyProfileHeader />); });
  try {
    const texts = renderer.root.findAllByType(Text);
    const title = texts.findIndex((node) => node.props.children === t('student.myProfileView.copy016'));
    const subtitle = texts.findIndex((node) => node.props.children === t('student.myProfileView.copy017'));
    expect(title).toBeGreaterThanOrEqual(0);
    expect(subtitle).toBe(-1);
    expect(renderer.root.findAllByType(Eyebrow)).toHaveLength(0);
  } finally {
    act(() => renderer.unmount());
  }
});
