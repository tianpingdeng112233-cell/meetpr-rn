import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ColorSchemeProvider, resolveColors } from '@/design/theme';
import { FeedbackPressable } from '@/design/FeedbackPressable';
import { t } from '@/i18n';
import { SetSyncCompletionControl } from '../SetSyncCompletionControl';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); });

test.each(['light', 'dark'] as const)('%s syncing text and spinner use the white training button foreground', async scheme => {
  await act(async () => { renderer = create(<ColorSchemeProvider scheme={scheme}><SetSyncCompletionControl state="syncing" onComplete={() => {}} /></ColorSchemeProvider>); });
  const label = renderer.root.findAllByType(Text).find(node => node.props.children === t('student.setSync.syncing'))!;
  expect(StyleSheet.flatten(label.props.style).color).toBe('#FFFFFF');
  expect(renderer.root.findByType(ActivityIndicator).props.color).toBe('#FFFFFF');
});

test.each([
  { scheme: 'light' as const, failure: '#C2410C', failureSoft: 'rgba(194,65,12,0.10)' },
  { scheme: 'dark' as const, failure: '#F0954A', failureSoft: 'rgba(240,149,74,0.14)' },
])('$scheme failure uses orange while the explanation and retry retain their normal colors', async ({ scheme, failure, failureSoft }) => {
  const retry = jest.fn();
  await act(async () => { renderer = create(<ColorSchemeProvider scheme={scheme}><SetSyncCompletionControl state="failed" onComplete={retry} /></ColorSchemeProvider>); });
  const colors = resolveColors(scheme);
  const text = (label: string) => renderer.root.findAllByType(Text).find(node => node.props.children === label)!;
  expect(StyleSheet.flatten(text(t('student.setSync.failedTitle')).props.style).color).toBe(failure);
  expect(renderer.root.findByType(MaterialCommunityIcons).props.color).toBe(failure);
  expect(renderer.root.findAllByType(View).some(node => StyleSheet.flatten(node.props.style)?.backgroundColor === failureSoft)).toBe(true);
  expect(StyleSheet.flatten(text(t('student.setSync.failedBody')).props.style).color).toBe(colors.textSecondary);
  const button = renderer.root.findByType(FeedbackPressable);
  expect(StyleSheet.flatten(button.props.style({ pressed: false })).backgroundColor).toBe(colors.ctaBackground);
  await act(async () => { button.props.onPress(); });
  expect(retry).toHaveBeenCalledTimes(1);
});
