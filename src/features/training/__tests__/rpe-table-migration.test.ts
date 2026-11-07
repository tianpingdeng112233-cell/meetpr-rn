import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { E1RMHistoryPoint } from '@/domain/e1rm';
import { STORAGE_KEYS } from '../constants';
import { AsyncStorageE1RMRepository } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const legacyPoint: E1RMHistoryPoint = {
  id: 'legacy', studentId: 'student', exerciseId: 'squat', setLogId: 'missing-log',
  computedAt: new Date('2026-09-14T12:00:00Z'), e1RMKg: 100 / 0.78,
  sourceWeightKg: 100, sourceReps: 5, sourceRPE: 8, confidence: 'normal', origin: 'logged',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('the first training history read recalibrates before returning and writes once across concurrent reads and reopening', async () => {
  const seed = {
    points: [legacyPoint, { ...legacyPoint, id: 'imported', setLogId: 'imported', origin: 'imported' as const,
      confidence: 'low' as const, sourceCoachRPE: 9 },
      { ...legacyPoint, id: 'invalid', setLogId: 'invalid', sourceReps: 0 }],
    prs: [null, legacyPoint.computedAt].map((acknowledgedAt, index) => ({
      id: `pr-${index}`, studentId: 'student', exerciseId: 'squat', pointId: 'legacy',
      breakthroughE1RMKg: legacyPoint.e1RMKg, previousMaxE1RMKg: 100,
      occurredAt: legacyPoint.computedAt, acknowledgedAt,
    })),
    weightBaselines: { student: { squat: 100 } },
  };
  await AsyncStorage.setItem(STORAGE_KEYS.e1rm, JSON.stringify(seed));
  jest.clearAllMocks();
  const histories = await Promise.all(Array.from({ length: 3 }, () =>
    new AsyncStorageE1RMRepository().fetchHistory('student', 'squat')));
  for (const history of histories) {
    expect(history.map(point => point.e1RMKg)).toEqual([100 / 0.811, 100 / 0.837, legacyPoint.e1RMKg]);
  }
  const raw = (await AsyncStorage.getItem(STORAGE_KEYS.e1rm))!;
  const stored = JSON.parse(raw);
  expect(stored.rpeTableVersions).toEqual({ student: 'e1rm-extended-rpe-table-v1' });
  expect(JSON.stringify(stored.prs)).toBe(JSON.stringify(seed.prs));
  expect(JSON.stringify(stored.weightBaselines)).toBe(JSON.stringify(seed.weightBaselines));
  const withoutEstimate = ({ e1RMKg: _estimate, ...point }: E1RMHistoryPoint) => point;
  expect(JSON.stringify(stored.points.map(withoutEstimate))).toBe(JSON.stringify(seed.points.map(withoutEstimate)));
  expect(await new AsyncStorageE1RMRepository().fetchHistory('student', 'squat')).toEqual(histories[0]);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.e1rm)).toBe(raw);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
});

test('recalculation preserves estimates for missing RPE, including imported baselines, and RPE below 6', async () => {
  const points: E1RMHistoryPoint[] = [
    { ...legacyPoint, sourceRPE: null },
    { ...legacyPoint, id: 'baseline', setLogId: 'baseline', origin: 'imported',
      sourceRPE: null, sourceWeightKg: 70, sourceReps: 1, e1RMKg: 70 },
    { ...legacyPoint, id: 'low', setLogId: 'low', sourceRPE: 5.5 },
    { ...legacyPoint, id: 'coach-low', setLogId: 'coach-low', sourceCoachRPE: 5.5 },
  ];
  const repository = new AsyncStorageE1RMRepository();
  await repository.replaceHistory('student', points);
  expect(await repository.fetchHistory('student', 'squat')).toEqual(points);
});


test('migration uses effective RPE boundaries, preserves invalid estimates and leaves other students untouched until read', async () => {
  const points: E1RMHistoryPoint[] = [legacyPoint,
    { ...legacyPoint, id: 'lower', setLogId: 'lower', sourceRPE: 6 },
    { ...legacyPoint, id: 'upper', setLogId: 'upper', sourceRPE: 10 },
    { ...legacyPoint, id: 'null-coach', setLogId: 'null-coach', sourceCoachRPE: null },
    { ...legacyPoint, id: 'coach', setLogId: 'coach', sourceRPE: null, sourceCoachRPE: 8 },
    { ...legacyPoint, id: 'invalid', setLogId: 'invalid', sourceCoachRPE: 10.5 },
    { ...legacyPoint, id: 'zero-coach', setLogId: 'zero-coach', sourceCoachRPE: 0 },
    { ...legacyPoint, id: 'other', setLogId: 'other', studentId: 'other' },
  ];
  await AsyncStorage.setItem(STORAGE_KEYS.e1rm, JSON.stringify({ points, prs: [] }));
  const repository = new AsyncStorageE1RMRepository();
  const snapshot = await repository.historySnapshot('student');
  expect(snapshot.points.map(point => point.e1RMKg)).toEqual([
    100 / 0.811, 100 / 0.762, 100 / 0.863, 100 / 0.811, 100 / 0.811, legacyPoint.e1RMKg, legacyPoint.e1RMKg,
  ]);
  const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.e1rm))!);
  expect(stored.points.at(-1).e1RMKg).toBe(legacyPoint.e1RMKg);
  expect(stored.rpeTableVersions).toEqual({ student: 'e1rm-extended-rpe-table-v1' });
  expect(await repository.fetchHistory('other', 'squat')).toEqual([{ ...points.at(-1), e1RMKg: 100 / 0.811 }]);
  // Once marked, later points remain authoritative even if their estimate differs from the formula.
  await repository.recordPoint({ ...legacyPoint, id: 'later', setLogId: 'later', e1RMKg: 222 });
  expect((await new AsyncStorageE1RMRepository().historySnapshot('student')).points.at(-1)?.e1RMKg).toBe(222);
});

test.each(['before commit', 'after commit'] as const)(
  'interruption %s retries safely without exposing old training estimates', async interruption => {
    const raw = JSON.stringify({ points: [legacyPoint], prs: [] });
    await AsyncStorage.setItem(STORAGE_KEYS.e1rm, raw);
    const setItem = jest.mocked(AsyncStorage.setItem);
    const persist = setItem.getMockImplementation()!;
    jest.clearAllMocks();
    setItem.mockImplementationOnce(async (key, value) => {
      if (interruption === 'after commit') await persist(key, value);
      throw new Error('process stopped');
    });
    await expect(new AsyncStorageE1RMRepository().fetchHistory('student', 'squat')).rejects.toThrow('process stopped');
    if (interruption === 'before commit') expect(await AsyncStorage.getItem(STORAGE_KEYS.e1rm)).toBe(raw);
    expect(await new AsyncStorageE1RMRepository().fetchHistory('student', 'squat'))
      .toEqual([{ ...legacyPoint, e1RMKg: 100 / 0.811 }]);
    expect(setItem).toHaveBeenCalledTimes(interruption === 'before commit' ? 2 : 1);
  },
);

test.each(['read first', 'record first'] as const)(
  'migration and a concurrent recording preserve both points (%s)', async order => {
    await AsyncStorage.setItem(STORAGE_KEYS.e1rm, JSON.stringify({ points: [legacyPoint], prs: [] }));
    const repository = new AsyncStorageE1RMRepository();
    const newPoint = { ...legacyPoint, id: 'new', setLogId: 'new', sourceWeightKg: 110, e1RMKg: 110 / 0.811 };
    const read = () => repository.fetchHistory('student', 'squat');
    const record = () => new AsyncStorageE1RMRepository().recordPoint(newPoint);
    const operations = order === 'read first' ? [read(), record()] : [record(), read()];
    await Promise.all(operations);
    expect(await repository.fetchHistory('student', 'squat')).toEqual([
      { ...legacyPoint, e1RMKg: 100 / 0.811 }, newPoint,
    ]);
  },
);

test.each(['fetchHistories', 'maxBefore'] as const)('%s also migrates before its first return', async method => {
  await AsyncStorage.setItem(STORAGE_KEYS.e1rm, JSON.stringify({ points: [legacyPoint], prs: [] }));
  const repository = new AsyncStorageE1RMRepository();
  if (method === 'fetchHistories') {
    expect((await repository.fetchHistories('student', ['squat'])).get('squat'))
      .toEqual([{ ...legacyPoint, e1RMKg: 100 / 0.811 }]);
  } else {
    expect(await repository.maxBefore('student', 'squat', new Date('2026-09-15'))).toBe(100 / 0.811);
  }
});
