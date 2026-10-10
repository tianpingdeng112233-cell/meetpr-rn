import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, Modal, Platform, Switch, AppState, type AppStateStatus } from 'react-native';
import { t } from '@/i18n';
import { RestTimerSettingsScreen } from '../RestTimerSettingsScreen';
import { TrainingReminderSettingsScreen } from '../TrainingReminderSettingsScreen';
import { NumberWheel } from '@/features/onboarding/controls';
import * as Notifications from 'expo-notifications';
import { useSessionStore } from '@/api/session';
import { readReminderPreference, readRestPreference } from '../storage';
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn() }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn<() => Promise<{ granted: boolean }>>().mockResolvedValue({ granted: true }),
  getAllScheduledNotificationsAsync: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  cancelScheduledNotificationAsync: jest.fn(), scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn(), deleteNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));
const canScheduleExactAlarms = jest.fn<() => Promise<boolean>>();
const openSettings = jest.fn<() => Promise<void>>();
let changeAppState: (state: AppStateStatus) => void;
beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  canScheduleExactAlarms.mockReset().mockResolvedValue(false);
  openSettings.mockReset().mockResolvedValue(undefined);
  jest.spyOn(jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core'), 'requireOptionalNativeModule')
    .mockReturnValue({ canScheduleExactAlarms, openSettings });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    changeAppState = callback;
    return { remove: jest.fn() };
  });
  useSessionStore.setState({ user: { id: 'student', role: 'self_train_student', phone: null, created_at: '2026-10-02T00:00:00Z' } });
});
let renderer: ReactTestRenderer;
const client = new QueryClient();
afterEach(async () => { act(() => renderer?.unmount()); client.clear(); await AsyncStorage.clear(); jest.restoreAllMocks(); useSessionStore.setState({ user: null }); });
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


const reminder = { enabled: false, weekdays: [2, 4, 6], hour: 20, minute: 0 };
const reminderText = () => renderer.root.findAllByType(Text).map(node => node.props.children);
async function renderReminder(enabled = false) {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><TrainingReminderSettingsScreen studentId="student" initial={{ ...reminder, enabled }} onClose={() => {}} /></QueryClientProvider>); });
}
test('enabling without exact alarm authorization keeps weekly reminders and explains possible delays', async () => {
  await renderReminder();
  await act(async () => { renderer.root.findByType(Switch).props.onValueChange(true); });
  expect(renderer.root.findByType(Switch).props.value).toBe(true);
  expect(await readReminderPreference('student')).toEqual({ ...reminder, enabled: true });
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  expect(reminderText()).toContain('Reminders may be delayed. Allow alarms and reminders in system settings for on-time alerts.');
});

test('the exact alarm settings entry opens the native authorization page', async () => {
  await renderReminder();
  await act(async () => { renderer.root.findByType(Switch).props.onValueChange(true); });
  await act(async () => {
    renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Allow alarms and reminders')[0].props.onPress();
  });
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test('returning with exact authorization granted reschedules once and clears the delay guidance', async () => {
  await renderReminder();
  await act(async () => { renderer.root.findByType(Switch).props.onValueChange(true); });
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  canScheduleExactAlarms.mockResolvedValue(true);
  await act(async () => { changeAppState('background'); changeAppState('active'); });
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  expect(reminderText()).not.toContain('Reminders may be delayed. Allow alarms and reminders in system settings for on-time alerts.');
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  await act(async () => { changeAppState('active'); });
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});


test('declining exact access keeps reminders enabled and delay guidance visible after returning', async () => {
  await renderReminder();
  await act(async () => { renderer.root.findByType(Switch).props.onValueChange(true); });
  await act(async () => {
    renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Allow alarms and reminders')[0].props.onPress();
  });
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  await act(async () => { changeAppState('background'); changeAppState('active'); });
  expect(renderer.root.findByType(Switch).props.value).toBe(true);
  expect(await readReminderPreference('student')).toEqual({ ...reminder, enabled: true });
  expect(reminderText()).toContain('Reminders may be delayed. Allow alarms and reminders in system settings for on-time alerts.');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('revoking previously granted exact access rebuilds weekly reminders and shows the delay guidance', async () => {
  canScheduleExactAlarms.mockResolvedValue(true);
  await renderReminder(true);
  expect(reminderText()).not.toContain('Reminders may be delayed. Allow alarms and reminders in system settings for on-time alerts.');
  canScheduleExactAlarms.mockResolvedValue(false);
  await act(async () => { changeAppState('active'); });
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  expect(renderer.root.findByType(Switch).props.value).toBe(true);
  expect(reminderText()).toContain('Reminders may be delayed. Allow alarms and reminders in system settings for on-time alerts.');
});
test('disabled reminders are not scheduled when exact access changes', async () => {
  await renderReminder();
  canScheduleExactAlarms.mockResolvedValue(true);
  await act(async () => { changeAppState('active'); });
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('an unavailable authorization page leaves reminders usable and reports the error', async () => {
  openSettings.mockRejectedValue(new Error('no activity'));
  await renderReminder(true);
  await act(async () => {
    renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Allow alarms and reminders')[0].props.onPress();
  });
  expect(renderer.root.findByType(Switch).props.value).toBe(true);
  expect(reminderText()).toContain(t('student.trainingReminderSettingsView.copy008'));
});
test('an authorization query that finishes after logout cannot restore reminders', async () => {
  await renderReminder(true);
  let finish!: (granted: boolean) => void;
  canScheduleExactAlarms.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { changeAppState('active'); });
  await act(async () => { await useSessionStore.getState().logout(); finish(true); });
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('accessory rest upgrades old preferences without changing main-lift durations and stays adjustable in both modes', async () => {
  await act(async () => { renderer = create(<QueryClientProvider client={client}><RestTimerSettingsScreen studentId="student" initial={{ mode: 'custom', low: 135, mid: 195, high: 255 }} onClose={() => {}} /></QueryClientProvider>); });
  const copy = () => renderer.root.findAllByType(Text).map(n => n.props.children);
  const button = (label: string) => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && (node.props.accessibilityLabel === label || node.findAllByType(Text).some(text => text.props.children === label)))[0];
  expect(copy()).toContain('Accessory exercises');
  expect(copy()).toContain('Main lifts and variations');
  expect(copy()).toContain('1:00');
  await act(async () => button('15 seconds more').props.onPress());
  expect(await readRestPreference('student')).toEqual({ mode: 'custom', low: 135, mid: 195, high: 255, accessory: 75 });
  await act(async () => button(t('student.studentRestTimerSettings.copy001')).props.onPress());
  expect(await readRestPreference('student')).toEqual({ mode: 'automatic', accessory: 75 });
  for (let i = 0; i < 3; i++) await act(async () => button('15 seconds less').props.onPress());
  expect(copy()).toContain('0:30');
  expect(button('15 seconds less').props.disabled).toBe(true);
  for (let i = 0; i < 18; i++) await act(async () => button('15 seconds more').props.onPress());
  expect(copy()).toContain('5:00');
  expect(button('15 seconds more').props.disabled).toBe(true);
  await act(async () => button(t('student.studentRestTimerSettings.copy003')).props.onPress());
  expect(await readRestPreference('student')).toMatchObject({ mode: 'custom', accessory: 300 });
});
