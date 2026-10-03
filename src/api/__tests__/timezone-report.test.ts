import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { resetSessionForTests, useSessionStore } from '../session';
import { timezoneStore } from '../timezone-store';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock') }));
const user = { id: '00000000-0000-4000-8000-000000000001', phone: null, email: 'a@b.co', role: 'coached_student', createdAt: '2026-09-04T12:00:00Z' };
const values = new Map<string, string>();
beforeEach(async () => {
  resetSessionForTests(); await AsyncStorage.clear(); values.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => values.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { values.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { values.delete(key); });
  jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Europe/London' } as Intl.ResolvedDateTimeFormatOptions);
  global.fetch = jest.fn<typeof fetch>(async (_url, init) => init?.method === 'PATCH'
    ? ({ ok: true, status: 204, text: async () => '' } as Response)
    : ({ ok: true, status: 200, text: async () => JSON.stringify({ user, accessToken: 'access', refreshToken: 'refresh' }) } as Response));
});
afterEach(() => { jest.restoreAllMocks(); });
const patches = () => jest.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
test('email login reports a changed device timezone exactly once', async () => {
  await timezoneStore.setLastReported(user.id, 'Asia/Shanghai');
  await useSessionStore.getState().loginWithEmail({ email: 'a@b.co', password: 'password' });
  expect(patches()).toHaveLength(1);
  expect(patches()[0]).toEqual([expect.stringMatching(/\/me\/timezone$/), expect.objectContaining({ body: '{"timezone":"Europe/London"}', headers: expect.objectContaining({ authorization: 'Bearer access' }) })]);
  expect(await timezoneStore.getLastReported(user.id)).toBe('Europe/London');
});
test('email login does not report the same timezone', async () => {
  await timezoneStore.setLastReported(user.id, 'Europe/London');
  await useSessionStore.getState().loginWithEmail({ email: 'a@b.co', password: 'password' });
  expect(patches()).toHaveLength(0);
});
test('timezone PATCH failure does not fail email login or mark it reported', async () => {
  jest.mocked(fetch).mockImplementation(async (_url, init) => {
    if (init?.method === 'PATCH') throw new TypeError('offline');
    return { ok: true, status: 200, text: async () => JSON.stringify({ user, accessToken: 'access', refreshToken: 'refresh' }) } as Response;
  });
  await expect(useSessionStore.getState().loginWithEmail({ email: 'a@b.co', password: 'password' })).resolves.toMatchObject({ id: user.id });
  expect(await timezoneStore.getLastReported(user.id)).toBeNull();
});
