import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SetLog } from '@/api/domains';
import { E1RMRecorder, type E1RMHistoryPoint } from '@/domain/e1rm';
import { STORAGE_KEYS } from '@/features/training/constants';
import { AsyncStorageE1RMRepository } from '@/features/training/storage';
import { importedBaselineFixture } from '../fixtures/imported-baseline';
import { loadGrowthHistory } from '../history-points';
import { buildGrowthCurves, growthSnapshot } from '../model';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const families = new Map([['squat', 'squat' as const]]);
const now = new Date('2026-09-27T12:00:00Z');
const logs: SetLog[] = [100, 104, 108].map((weight, index) => ({
  id: `set-${index}`, student_id: 'student', exercise_id: 'squat', plan_exercise_id: null,
  set_index: 0, weight_kg: String(weight), reps: 1, rpe: '10', coach_rpe: null,
  completed: true, failed: false, assumed: false, adhoc: false,
  logged_date: `2026-09-${20 + index}`, logged_at: `2026-09-${20 + index}T12:00:00Z`,
}));
const imported: E1RMHistoryPoint = {
  id: 'imported', studentId: 'student', exerciseId: 'squat', setLogId: 'assumed',
  computedAt: new Date('2026-09-01T12:00:00Z'), e1RMKg: 70,
  sourceWeightKg: 70, sourceReps: 1, sourceRPE: null, confidence: 'normal', origin: 'imported',
};
const oldPoints: E1RMHistoryPoint[] = [imported, ...logs.map(log => ({
  ...imported, id: `point-${log.id}`, setLogId: log.id, computedAt: new Date(log.logged_at),
  e1RMKg: Number(log.weight_kg), sourceWeightKg: Number(log.weight_kg), sourceRPE: 10,
  confidence: 'low' as const, origin: 'logged' as const,
}))];

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('opening Progress repairs an imported baseline trap without changing stored estimates or identities', async () => {
  const repository = new AsyncStorageE1RMRepository();
  await repository.replaceHistory('student', oldPoints);
  const saved = await loadGrowthHistory(repository, 'student', logs, families);
  expect(saved).toEqual(oldPoints.map(point => ({ ...point, confidence: 'normal' })));
  const snapshot = growthSnapshot(buildGrowthCurves(logs, families, now, saved).squat, '90', now);
  expect(snapshot.state).toBe('chart');
  expect(snapshot.currentKg).toBe(108);
  const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
  await loadGrowthHistory(new AsyncStorageE1RMRepository(), 'student', logs, families);
  expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes);
});

test('a failed atomic write leaves every stored point intact and the next opening retries', async () => {
  const repository = new AsyncStorageE1RMRepository();
  await repository.replaceHistory('student', oldPoints);
  const before = await AsyncStorage.getItem(STORAGE_KEYS.e1rm);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  const firstScreen = await loadGrowthHistory(repository, 'student', logs, families);
  expect(firstScreen).toEqual(oldPoints);
  expect(growthSnapshot(buildGrowthCurves(logs, families, now, firstScreen).squat, '90', now).state)
    .toBe('formingWindowSparse');
  expect(await repository.fetchHistory('student', 'squat')).toEqual(oldPoints);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.e1rm)).toBe(before);
  const retried = await loadGrowthHistory(new AsyncStorageE1RMRepository(), 'student', logs, families);
  expect(retried.filter(point => point.origin === 'logged').map(point => point.confidence))
    .toEqual(['normal', 'normal', 'normal']);
});

test('a concurrent import review rejects the repair and survives the next retry', async () => {
  const repository = new AsyncStorageE1RMRepository();
  // Two imports leave one trusted anchor after a concurrent review of the other.
  const secondImport = { ...imported, id: 'second-import', setLogId: 'second-assumed' };
  await repository.replaceHistory('student', [...oldPoints, secondImport]);
  const original = repository.replaceHistoryIfUnchanged.bind(repository);
  repository.replaceHistoryIfUnchanged = async (...args) => {
    await new AsyncStorageE1RMRepository().updatePointConfidence('student', new Set([imported.id]), 'low');
    repository.replaceHistoryIfUnchanged = original;
    return original(...args);
  };
  const skipped = await loadGrowthHistory(repository, 'student', logs, families);
  expect(skipped.filter(point => point.origin === 'logged').every(point => point.confidence === 'low')).toBe(true);
  const retried = await loadGrowthHistory(repository, 'student', logs, families);
  expect(retried.find(point => point.id === imported.id)?.confidence).toBe('low');
  expect(retried.filter(point => point.origin === 'logged').every(point => point.confidence === 'normal')).toBe(true);
});

test('repair preserves reviewed imports, retired exercises, orphan points, other students and acknowledged PRs', async () => {
  const repository = new AsyncStorageE1RMRepository();
  const retained: E1RMHistoryPoint[] = [
    { ...imported, id: 'reviewed', setLogId: 'reviewed-set', e1RMKg: 500, confidence: 'low' },
    { ...oldPoints[1], id: 'retired', setLogId: 'retired-set', exerciseId: 'retired-bench' },
    { ...oldPoints[1], id: 'orphan', setLogId: 'orphan-set' },
    { ...oldPoints[1], id: 'another', setLogId: 'another-set', studentId: 'another-student' },
  ];
  for (const point of [...oldPoints, ...retained]) await repository.recordPoint(point);
  await repository.recordPR({ id: 'pr', studentId: 'student', exerciseId: 'squat', pointId: oldPoints[1].id,
    breakthroughE1RMKg: 100, previousMaxE1RMKg: 70, occurredAt: now, acknowledgedAt: now });
  const repaired = await loadGrowthHistory(repository, 'student', logs, families);
  expect(repaired).toEqual(expect.arrayContaining(retained.filter(point => point.studentId === 'student')));
  expect(await repository.fetchHistory('another-student', 'squat')).toEqual([retained[3]]);
  // The acknowledged event must survive on disk, even though the UI hides it.
  const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.e1rm))!);
  expect(stored.prs).toHaveLength(1);
  expect(stored.prs[0]).toMatchObject({ id: 'pr', acknowledgedAt: now.toISOString() });
  const reopened = new AsyncStorageE1RMRepository();
  expect(await reopened.fetchHistory('student', 'retired-bench')).toEqual([retained[1]]);
  expect(await reopened.unacknowledgedPRs('student')).toEqual([]);
});

test.each(['not-json', '{"points":null,"prs":[]}', '{"points":[],"prs":null}'])(
  'an unreadable store shows a read-only server curve and remains byte-for-byte unchanged (%s)', async raw => {
    await AsyncStorage.setItem(STORAGE_KEYS.e1rm, raw);
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    const repository = new AsyncStorageE1RMRepository();
    const foreignLog = { ...logs[0], id: 'foreign', student_id: 'another-student', weight_kg: '999' };
    const saved = await loadGrowthHistory(repository, 'student', [...logs, foreignLog], families);
    expect(saved.map(point => point.studentId)).toEqual(['student', 'student', 'student']);
    const screen = growthSnapshot(buildGrowthCurves(logs, families, now, saved).squat, '30', now);
    expect(screen.state).toBe('chart');
    expect(screen.currentKg).toBe(108);
    await expect(new E1RMRecorder(repository).record({ studentId: 'student', exerciseId: 'squat',
      setLogId: 'today', family: 'squat', weightKg: 110, reps: 1, rpe: 10,
      completed: true, failed: false })).resolves.toBeNull();
    await expect(loadGrowthHistory(repository, 'student', logs, families)).resolves.toEqual(saved);
    expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.e1rm)).toBe(raw);
  },
);

test('the unchanged iOS real-case fixture restores all 31 measured confidences and the same Progress snapshot', async () => {
  const fixture = importedBaselineFixture();
  const repository = new AsyncStorageE1RMRepository();
  await repository.replaceHistory(fixture.studentId, fixture.oldPoints);
  const before = growthSnapshot(buildGrowthCurves(fixture.logs, fixture.families, fixture.now, fixture.oldPoints).deadlift, '90', fixture.now);
  expect(before.state).toBe('formingWindowSparse');
  expect(before.currentKg).toBeCloseTo(151.6666666667, 8);
  // Opening the upgraded repository must repair before constructing its first snapshot.
  const saved = await loadGrowthHistory(new AsyncStorageE1RMRepository(), fixture.studentId, fixture.logs, fixture.families);
  expect(fixture.logs).toHaveLength(38);
  expect(saved).toHaveLength(36);
  expect(saved.filter(point => point.origin === 'imported')).toEqual(fixture.oldPoints.slice(0, 5));
  expect(saved.map(point => point.id)).toEqual(fixture.oldPoints.map(point => point.id));
  expect(saved.filter(point => point.origin === 'logged').map(point => point.confidence))
    .toEqual(Array(31).fill('normal'));
  const snapshot = growthSnapshot(buildGrowthCurves(fixture.logs, fixture.families, fixture.now, saved).deadlift, '90', fixture.now);
  expect(snapshot.state).toBe('chart');
  expect(snapshot.samples).toHaveLength(8);
  expect(snapshot.currentKg).toBeCloseTo(221.4285714286, 8);
  const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
  const reopened = await loadGrowthHistory(new AsyncStorageE1RMRepository(), fixture.studentId, fixture.logs, fixture.families);
  expect(reopened).toEqual(saved);
  expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes);
});

test('new-device real history remains a measured baseline for a subsequent jump above 20 percent', async () => {
  const repository = new AsyncStorageE1RMRepository();
  await loadGrowthHistory(repository, 'student', logs, families);
  const recorder = new E1RMRecorder(repository, { now: () => now, idFactory: () => 'today-point' });
  await recorder.record({ studentId: 'student', exerciseId: 'squat', setLogId: 'today', family: 'squat',
    weightKg: 140, reps: 1, rpe: 10, completed: true, failed: false });
  const points = await repository.fetchHistory('student', 'squat');
  expect(points.map(point => [point.origin, point.confidence])).toEqual([
    ['logged', 'normal'], ['logged', 'normal'], ['logged', 'normal'], ['logged', 'low'],
  ]);
  expect(growthSnapshot(buildGrowthCurves(logs, families, now, points).squat, '30', now).currentKg).toBe(108);
});

test.each<[number, E1RMHistoryPoint['confidence']]>([[110, 'normal'], [140, 'low']])(
  'legacy Progress imports become measured baselines and classify a later %s kg set like iOS',
  async (weight, confidence) => {
    const repository = new AsyncStorageE1RMRepository();
    // Old Progress backfilled real logs under imported-* IDs before the live set.
    const legacy = oldPoints.slice(1).map(point => ({
      ...point, id: `imported-${point.setLogId}`, origin: 'imported' as const, confidence: 'normal' as const,
    }));
    const today: SetLog = { ...logs[0], id: 'today', weight_kg: String(weight),
      logged_at: now.toISOString(), logged_date: '2026-09-27' };
    const live: E1RMHistoryPoint = { ...oldPoints[1], id: 'live', setLogId: today.id,
      computedAt: now, e1RMKg: weight, sourceWeightKg: weight, confidence: 'low' };
    const assumedLog: SetLog = { ...logs[0], id: imported.setLogId, assumed: true };
    const otherLift = { ...oldPoints[1], id: 'bench-point', setLogId: 'bench-set', exerciseId: 'bench' };
    const before = [imported, ...legacy, live, otherLift];
    await repository.replaceHistory('student', before);
    await repository.recordPR({ id: 'legacy-pr', studentId: 'student', exerciseId: 'squat',
      pointId: legacy[0].id, breakthroughE1RMKg: 100, previousMaxE1RMKg: 70,
      occurredAt: now, acknowledgedAt: now });
    const rawBefore = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.e1rm))!);
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    const inputLogs = [...logs, today, assumedLog];
    const saved = await loadGrowthHistory(repository, 'student', inputLogs, families);
    expect(saved).toEqual([imported, ...legacy.map(point => ({ ...point, origin: 'logged' })),
      { ...live, confidence }, otherLift]);
    const screen = growthSnapshot(buildGrowthCurves(inputLogs, families, now, saved).squat, '30', now);
    expect(screen.state).toBe('chart');
    expect(screen.currentKg).toBe(weight === 110 ? 110 : 108);
    const rawAfter = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.e1rm))!);
    expect(rawAfter.prs).toEqual(rawBefore.prs);
    expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes + 1);
    expect(await loadGrowthHistory(new AsyncStorageE1RMRepository(), 'student', inputLogs, families)).toEqual(saved);
    expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes + 1);
  },
);

test('legacy origins and trapped confidence are repaired together for the unchanged iOS fixture', async () => {
  const fixture = importedBaselineFixture();
  const legacy = fixture.oldPoints.map(point => point.origin === 'logged'
    ? { ...point, id: `imported-${point.setLogId}`, origin: 'imported' as const } : point);
  const repository = new AsyncStorageE1RMRepository();
  await repository.replaceHistory(fixture.studentId, legacy);
  const saved = await loadGrowthHistory(repository, fixture.studentId, fixture.logs, fixture.families);
  expect(saved).toEqual(legacy.map((point, index) => index < 5 ? point
    : { ...point, origin: 'logged', confidence: 'normal' }));
  const screen = growthSnapshot(buildGrowthCurves(fixture.logs, fixture.families, fixture.now, saved).deadlift, '90', fixture.now);
  expect(screen.state).toBe('chart');
  expect(screen.samples).toHaveLength(8);
  expect(screen.currentKg).toBeCloseTo(221.4285714286, 8);
});

test.each(['write failure', 'concurrent review'] as const)(
  'legacy origin migration is atomic across %s and retries after reopening', async interruption => {
    const repository = new AsyncStorageE1RMRepository();
    const legacy = oldPoints.map(point => ({ ...point, origin: 'imported' as const }));
    await repository.replaceHistory('student', legacy);
    let expected = legacy;
    let raw = await AsyncStorage.getItem(STORAGE_KEYS.e1rm);
    if (interruption === 'write failure') {
      jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    } else {
      const replace = repository.replaceHistoryIfUnchanged.bind(repository);
      repository.replaceHistoryIfUnchanged = async (...args) => {
        await new AsyncStorageE1RMRepository().updatePointConfidence('student', new Set([imported.id]), 'low');
        raw = await AsyncStorage.getItem(STORAGE_KEYS.e1rm);
        return replace(...args);
      };
      expected = legacy.map(point => point.id === imported.id ? { ...point, confidence: 'low' } : point);
    }
    expect(await loadGrowthHistory(repository, 'student', logs, families)).toEqual(expected);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.e1rm)).toBe(raw);
    const retried = await loadGrowthHistory(new AsyncStorageE1RMRepository(), 'student', logs, families);
    expect(retried).toEqual(expected.map(point => point.id === imported.id ? point
      : { ...point, origin: 'logged', confidence: 'normal' }));
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    await loadGrowthHistory(new AsyncStorageE1RMRepository(), 'student', logs, families);
    expect(jest.mocked(AsyncStorage.setItem).mock.calls).toHaveLength(writes);
  },
);
