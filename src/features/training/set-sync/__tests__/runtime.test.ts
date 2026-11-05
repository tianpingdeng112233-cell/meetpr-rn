import { afterEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSessionStore } from '@/api/session';
import { setsRepository } from '@/api/domains/sets';
import { plansRepository } from '@/api/domains/plans';
import { accountSetSync } from '../runtime';
import { SetSyncQueue } from '../queue';
import { CompletionGate } from '../completion';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
const flush = async () => { for (let i = 0; i < 150; i++) await Promise.resolve(); };
afterEach(async () => { useSessionStore.setState({ user: null }); jest.restoreAllMocks(); await AsyncStorage.clear(); });
test('a restored completion intent proceeds when restored pending sets drain without another foreground event', async () => {
  const id = '10000000-0000-4000-8000-000000000000';
  const q = new SetSyncQueue(id, { storage: AsyncStorage, network: { isOnline: () => false, subscribe: () => () => {} }, send: async () => undefined });
  await q.ready; await q.enqueue({ stableSetId: 'set', dayId: 'day', exerciseId: 'squat', loggedDate: '2026-11-05', request: { plan_exercise_id: 'exercise', set_index: 0, weight_kg: '80', reps: 5, completed: true } }); q.dispose();
  const gate = new CompletionGate(id, AsyncStorage, async () => {}); await gate.arm('day'); await gate.release('day');
  let finish!: (result: { id: string; logged_at: string }) => void;
  jest.spyOn(setsRepository, 'upsert').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const complete = jest.spyOn(plansRepository, 'completeDay').mockResolvedValue({} as never);
  useSessionStore.setState({ user: { id, phone: '', role: 'coached_student', created_at: '2026-11-05T12:00:00Z' } });
  const restored = accountSetSync(id); await restored.queue.ready; await flush(); expect(complete).not.toHaveBeenCalled();
  finish({ id: 'server', logged_at: '2026-11-05T12:00:00Z' }); await flush();
  expect(complete).toHaveBeenCalledTimes(1); expect(restored.gate.pendingDays()).toEqual([]);
});
