import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { E1RMHistoryPoint } from '@/domain/e1rm';
import { STORAGE_KEYS } from '../constants';
import {
  AsyncStorageE1RMRepository,
  readBoolean,
  readReview,
  writeBoolean,
  writeReview,
} from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

function point(id: string): E1RMHistoryPoint {
  return {
    id: `point-${id}`,
    studentId: 'student-1',
    exerciseId: 'exercise-1',
    setLogId: `set-${id}`,
    computedAt: new Date(`2026-07-${id.padStart(2, '0')}T08:00:00Z`),
    e1RMKg: 100 + Number(id),
    sourceWeightKg: 90,
    sourceReps: 5,
    sourceRPE: 8,
    confidence: 'normal',
    origin: 'logged',
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('per-student and per-day training persistence', () => {
  test('isolates reviews by student and date', async () => {
    const first = {
      completedAt: '2026-07-18T10:00:00Z',
      reflection: { goal: 'A', achieved: 'B', improve: 'C' },
    };
    const second = {
      completedAt: '2026-07-19T10:00:00Z',
      reflection: { goal: 'D', achieved: 'E', improve: 'F' },
    };
    await writeReview('student-1', '2026-07-18', first);
    await writeReview('student-1', '2026-07-19', second);

    expect(await readReview('student-1', '2026-07-18')).toEqual(first);
    expect(await readReview('student-1', '2026-07-19')).toEqual(second);
    expect(await readReview('student-2', '2026-07-19')).toBeNull();
  });

  test('isolates collar preference by student', async () => {
    await writeBoolean(STORAGE_KEYS.collar('student-1'), true);
    await writeBoolean(STORAGE_KEYS.collar('student-2'), false);
    expect(await readBoolean(STORAGE_KEYS.collar('student-1'))).toBe(true);
    expect(await readBoolean(STORAGE_KEYS.collar('student-2'))).toBe(false);
  });

  test('serializes E1RM read-modify-write persistence', async () => {
    let releaseFirst!: () => void;
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let markFirstWriteStarted!: () => void;
    const firstWriteStarted = new Promise<void>((resolve) => {
      markFirstWriteStarted = resolve;
    });
    let writeNumber = 0;
    const setItem = jest.mocked(AsyncStorage.setItem);
    const defaultSetItem = setItem.getMockImplementation();
    if (!defaultSetItem) throw new Error('AsyncStorage mock is unavailable');
    setItem.mockImplementation(async (key: string, value: string) => {
      writeNumber += 1;
      if (writeNumber === 1) {
        markFirstWriteStarted();
        await firstWriteGate;
      }
      await defaultSetItem(key, value);
    });
    const repository = new AsyncStorageE1RMRepository();
    const first = repository.recordPoint(point('1'));
    const second = repository.recordPoint(point('2'));

    await firstWriteStarted;
    expect(setItem).toHaveBeenCalledTimes(1);
    releaseFirst();
    await Promise.all([first, second]);

    const stored = JSON.parse(
      (await AsyncStorage.getItem(STORAGE_KEYS.e1rm)) ?? '{}',
    ) as { points: E1RMHistoryPoint[] };
    expect(stored.points.map((candidate) => candidate.setLogId)).toEqual([
      'set-1',
      'set-2',
    ]);
  });
});
