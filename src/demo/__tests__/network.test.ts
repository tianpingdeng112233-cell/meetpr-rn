import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { configure, track, flushNow, resetAnalyticsForTests } from '@/analytics/client';
import { AnalyticsEvent } from '@/analytics/types';
import { chatRealtime } from '@/features/chat/realtime';
import { useSessionStore, resetSessionForTests } from '@/api/session';
import { demoId } from '../seed';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => () => {}) }));
jest.mock('expo-secure-store');
const originalFetch = global.fetch;
const originalSocket = global.WebSocket;
const originalFlag = process.env.EXPO_PUBLIC_DEMO_MODE;
beforeEach(() => {
  process.env.EXPO_PUBLIC_DEMO_MODE = '1';
  global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network forbidden'));
  global.WebSocket = jest.fn() as unknown as typeof WebSocket;
});
afterEach(() => {
  resetAnalyticsForTests(); resetSessionForTests();
  global.fetch = originalFetch; global.WebSocket = originalSocket;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE; else process.env.EXPO_PUBLIC_DEMO_MODE = originalFlag;
});
test('S1: analytics discards events and realtime stays disconnected without opening network transports', async () => {
  useSessionStore.setState({ status: 'authenticated', user: { id: demoId(1), phone: null, role: 'coached_student', created_at: '2026-01-01' } });
  const stop = chatRealtime.start();
  try {
    const config = await configure();
    await track(AnalyticsEvent.AppOpen);
    await flushNow();
    expect(config.enabled).toBe(false);
    expect(chatRealtime.state).toBe('disconnected');
    expect(chatRealtime.channel).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(global.WebSocket).not.toHaveBeenCalled();
  } finally { stop(); }
});
