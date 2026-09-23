import { afterEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, Modal } from 'react-native';
import { t } from '@/i18n';
import { RestTimerSettingsScreen } from '../RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '../TrainingReminderSettingsScreen';
import { NumberWheel } from '@/features/onboarding/controls';
import { readRestPreference } from '../storage';
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: async () => ({ granted: true }), setNotificationHandler: jest.fn() }));
let renderer: ReactTestRenderer;
const client = new QueryClient();
afterEach(async () => { act(() => renderer?.unmount()); client.clear(); await AsyncStorage.clear(); });
test('manual rest keeps automatic reference rules visible and persists a selected duration', async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><RestTimerSettingsScreen studentId="student" initial={{ mode: 'automatic' }} onClose={() => {}} /></QueryClientProvider>); });
  const press = async (label: string) => { await act(async () => { renderer.root.findAll(node => node.props.accessibilityRole === 'button' && (node.props.accessibilityLabel === label || node.findAllByType(Text).some(text => text.props.children === label)))[0].props.onPress(); }); };
  await press(t('student.studentRestTimerSettings.copy003'));
  expect(renderer.root.findAllByType(Text).map(n => n.props.children)).toContain(t('student.restTimerSettingsView.copy002'));
  await press(t('student.restTimerSettingsView.copy005'));
  await press('2:15');
  expect(await readRestPreference('student')).toEqual({ mode: 'custom', low: 135, mid: 180, high: 240 });
});

test('reminder time editor opens from the time row and Android Back closes the page', async () => {
  const close = jest.fn();
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TrainingReminderSettingsScreen studentId="student" initial={{ enabled: true, weekdays: [2, 4, 6], hour: 20, minute: 0 }} onClose={close} /></QueryClientProvider>); });
  expect(renderer.root.findAllByType(NumberWheel)).toHaveLength(0);
  await act(async () => { renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === t('student.trainingReminderSettingsView.copy005'))[0].props.onPress(); });
  expect(renderer.root.findAllByType(NumberWheel)).toHaveLength(2);
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(close).toHaveBeenCalledTimes(1);
});
