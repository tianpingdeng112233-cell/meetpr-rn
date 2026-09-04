import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, Text } from 'react-native';

import { ThemeProvider, useColors, useTheme } from '../theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function ThemeProbe() {
  const { appearance, setAppearance } = useTheme();
  const colors = useColors();
  return <Pressable testID="appearance-toggle" onPress={() => setAppearance('dark')}><Text>{appearance}:{colors.bgBase}</Text></Pressable>;
}

beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

test('ThemeProvider defaults to light appearance and light page colors', async () => {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>); });
  expect(renderer.root.findByType(Text).props.children.join('')).toBe('light:#F5F6F8');
  act(() => renderer.unmount());
});

test('setAppearance dark changes colors and persists meetpr.appearance', async () => {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<ThemeProvider><ThemeProbe /></ThemeProvider>); });
  await act(async () => { renderer.root.findByProps({ testID: 'appearance-toggle' }).props.onPress(); });
  expect(renderer.root.findByType(Text).props.children.join('')).toBe('dark:#0A0A0C');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('meetpr.appearance', 'dark');
  act(() => renderer.unmount());
});
