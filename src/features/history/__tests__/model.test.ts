import { describe, expect, test } from '@jest/globals';

import type { PlanDetail, SetLog } from '@/api/domains';
import type { E1RMSample, LiftFamily } from '@/domain/e1rm';

import {
  progressRowValues,
  buildTotalSeries,
  totalSnapshot,
  buildGrowthCurves,
  buildGrowthStats,
  buildHistoryWeeks,
  buildVolumeIntensitySeries,
  historyWeekNumber,
  historyStats,
  growthSnapshot,
  e1rmCardState,
  chartBuckets,
} from '../model';
import type { GrowthCurve } from '../types';
import { day as makeDay, plan as makePlan, set as makeSet } from '@/domain/plan/test-fixtures';

function log(
  id: string,
  date: string,
  exerciseId: string,
  overrides: Partial<SetLog> = {},
): SetLog {
  return {
    id,
    student_id: 'student',
    plan_exercise_id: 'plan-exercise',
    exercise_id: exerciseId,
    set_index: 0,
    weight_kg: '100',
    reps: 1,
    rpe: null,
    completed: true,
    failed: false,
    assumed: false,
    adhoc: false,
    logged_date: date,
    logged_at: `${date}T12:00:00.000Z`,
    ...overrides,
  };
}

function curve(family: LiftFamily, value: number | null): GrowthCurve {
  const point: E1RMSample | null =
    value === null
      ? null
      : {
          sampleId: family,
          date: new Date('2026-07-01T12:00:00.000Z'),
          valueKg: value,
          winnerPointId: family,
          winnerOrigin: 'logged',
          winnerConfidence: 'normal',
        };
  return {
    family,
    name: family === 'squat' ? '深蹲' : family === 'bench' ? '卧推' : '硬拉',
    series: {
      smoothed: point ? [point] : [],
      rawEligible: point ? [point] : [],
      records: point ? [point] : [],
      best: point,
      last: point,
      currentKg: value,
    },
    point,
    periodLabel: '90 天',
    trajectory: point ? [point] : [],
    lowConfidence: [],
  };
}

describe('growth summary statistics', () => {
  const baseLogs = [
    log('one', '2026-07-01', 'squat'),
    log('two', '2026-07-01', 'bench'),
    log('three', '2026-07-08', 'deadlift'),
    log('assumed', '2026-07-09', 'squat', { assumed: true }),
    log('incomplete', '2026-07-10', 'squat', { completed: false }),
  ];

  test('counts distinct completed non-assumed days and weeks', () => {
    const curves = {
      squat: curve('squat', 100),
      bench: curve('bench', 80),
      deadlift: curve('deadlift', 120),
    };
    expect(buildGrowthStats(baseLogs, curves)).toEqual({
      trainingSessionCount: 2,
      trainingWeekCount: 2,
      totalVolumeKg: 300,
      unlocksTrends: false,
      trainingTotalKg: null,
      sbdTotalKg: 300,
    });
  });

  test('shows no SBD total until all three families have a record', () => {
    const curves = {
      squat: curve('squat', 100),
      bench: curve('bench', null),
      deadlift: curve('deadlift', 120),
    };
    expect(buildGrowthStats(baseLogs, curves).sbdTotalKg).toBeNull();
  });
});

describe('plan-relative week buckets', () => {
  test('a set backfilled on another date remains visible on that actual day', () => {
    const plan = makePlan([makeDay('day', { exercises: [{ id: 'plan-exercise', plan_day_id: 'day', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [makeSet()] }] })]);
    const recorded = log('backfill', '2026-09-09', 'squat');
    const actualDay = buildHistoryWeeks([plan], [recorded], new Map(), '2026-09-21').flatMap(week => week.days).find(day => day.date === '2026-09-09');
    expect(actualDay?.exercises.flatMap(exercise => exercise.logs).map(log => log.id)).toEqual(['backfill']);
    expect(actualDay?.done).toBe(1);
  });
  test.each(['2026-09-05', '2026-09-21'])('keeps pre-start recordings visible when today is %s', today => {
    const plan = { ...makePlan([makeDay('day', { exercises: [{ id: 'plan-exercise', plan_day_id: 'day', exercise_id: 'squat', is_main_lift: true, sort_order: 0, notes: null, sets: [makeSet()] }] })]), start_date: '2026-09-07' };
    const recorded = log('early', '2026-09-05', 'squat');
    const days = buildHistoryWeeks([plan], [recorded], new Map(), today).flatMap(week => week.days);
    expect(days.find(day => day.date === '2026-09-05')?.exercises.flatMap(exercise => exercise.logs).map(log => log.id)).toEqual(['early']);
    expect(days.every(day => day.date <= today)).toBe(true);
    expect(days.find(day => day.date === '2026-09-07')?.exercises.length ?? 0).toBe(today < plan.start_date ? 0 : 1);
  });
  test('uses elapsed whole seven-day windows from startDate', () => {
    expect(historyWeekNumber('2026-07-01', '2026-07-01')).toBe(1);
    expect(historyWeekNumber('2026-07-01', '2026-07-07')).toBe(1);
    expect(historyWeekNumber('2026-07-01', '2026-07-08')).toBe(2);
    expect(historyWeekNumber('2026-07-01', '2026-07-15')).toBe(3);
  });

  test('groups plan days into matching numbered weeks', () => {
    const plan = {
      id: 'plan',
      coach_id: 'coach',
      trainee_id: 'student',
      name: '力量周期',
      start_date: '2026-07-01',
      end_date: '2026-07-14',
      plan_weeks: 2,
      source: 'coach',
      source_template_id: null,
      status: 'published',
      kind: 'regular',
      created_at: '2026-06-20T00:00:00.000Z',
      updated_at: '2026-06-20T00:00:00.000Z',
      total_shift_days: 0,
      latest_shift_created_at: null,
      days: [
        {
          id: 'day-1',
          plan_id: 'plan',
          day_of_week: 1,
          week_number: 1,
          sort_order: 1,
          shifted_to_date: null,
          exercises: [],
        },
        {
          id: 'day-2',
          plan_id: 'plan',
          day_of_week: 1,
          week_number: 2,
          sort_order: 1,
          shifted_to_date: null,
          exercises: [],
        },
      ],
    } satisfies PlanDetail;
    const weeks = buildHistoryWeeks([plan], [], new Map(), '2026-07-14');
    expect(weeks.map((week) => week.weekNumber)).toEqual([2, 1]);
    expect(weeks[0].startDate).toBe('2026-07-08');
  });
});

describe('volume and intensity transformation', () => {
  test('sums volume, averages recorded RPE, excludes assumed/incomplete, and normalizes', () => {
    const series = buildVolumeIntensitySeries([
      log('one', '2026-07-01', 'squat', { weight_kg: '100', reps: 5, rpe: '8' }),
      log('two', '2026-07-02', 'squat', { weight_kg: '80', reps: 5, rpe: '9' }),
      log('assumed', '2026-07-03', 'squat', { weight_kg: '999', reps: 9, assumed: true }),
      log('incomplete', '2026-07-04', 'squat', { weight_kg: '999', reps: 9, completed: false }),
    ]);
    expect(series.points).toHaveLength(1);
    expect(series.points[0].volumeKg).toBe(900);
    expect(series.points[0].averageRPE).toBe(8.5);
    expect(series.scale).toBe(1035);
    expect(series.points[0].rpePlotValue).toBeCloseTo(879.75);
  });
});

describe('growth e1RM projection', () => {
  test('uses the Dashboard record trajectory and displayPoint, not the 28-day smoothed tail', () => {
    const familyMap = new Map<string, LiftFamily>([['squat', 'squat']]);
    const curves = buildGrowthCurves(
      [
        log('first', '2026-05-01', 'squat', { weight_kg: '100' }),
        log('record', '2026-05-02', 'squat', { weight_kg: '106' }),
        log('later-lower', '2026-07-01', 'squat', { weight_kg: '103' }),
      ],
      familyMap,
      new Date('2026-07-02T12:00:00.000Z'),
    );
    expect(curves.squat.point?.valueKg).toBeCloseTo(109.53, 1);
    expect(curves.squat.series.currentKg).toBeCloseTo(106.43, 1);
    expect(curves.squat.trajectory.at(-1)?.valueKg).toBe(
      curves.squat.point?.valueKg,
    );
  });
});


describe('v2 growth presentation', () => {
  test('historyStats deduplicates local logged-at days and ISO weeks, excluding assumed and unfinished sets', () => {
    const logs = [
      log('a', '2025-12-20', 'squat', { logged_at: new Date(2025, 11, 29, 12).toISOString(), reps: 5 }),
      log('b', '2025-12-21', 'bench', { logged_at: new Date(2025, 11, 29, 18).toISOString(), weight_kg: '80', reps: 5 }),
      log('c', '2025-12-22', 'squat', { logged_at: new Date(2026, 0, 2, 12).toISOString() }),
      log('d', '2026-01-05', 'squat'),
      log('assumed', '2026-01-12', 'squat', { assumed: true }),
      log('unfinished', '2026-01-19', 'squat', { completed: false }),
    ];
    expect(historyStats(logs)).toEqual({ trainingSessionCount: 3, trainingWeekCount: 2, totalVolumeKg: 1100, unlocksTrends: true });
    expect(historyStats(logs.slice(0, 3)).unlocksTrends).toBe(false);
    expect(historyStats([])).toEqual({ trainingSessionCount: 0, trainingWeekCount: 0, totalVolumeKg: 0, unlocksTrends: false });
  });

  test.each([
    [0, 0, 0, null, 'zero'],
    [1, 1, 1, 0, 'formingProgress'],
    [2, 2, 2, 10, 'formingProgress'],
    [3, 2, 2, 10, 'formingWindowSparse'],
    [3, 3, 3, 0, 'formingWindowSparse'],
    [3, 3, 3, 10, 'chart'],
    [5, 2, 3, 10, 'formingWindowSparse'],
  ] as [number, number, number, number | null, string][])('e1rmCardState total %s, window %s, main line %s, range %s yields %s', (total, window, mainLine, range, expected) => {
    expect(e1rmCardState({ familyTotalDataPointCount: total, windowDataPointCount: window, windowMainLinePointCount: mainLine, windowMainLineValueRangeKg: range })).toBe(expected);
  });

  test('chartBuckets retains only the latest six recorded ISO weeks and recalculates the scale', () => {
    const logs = ['2025-12-01', '2025-12-08', '2025-12-15', '2025-12-22', '2025-12-29', '2026-01-05', '2026-01-12'].map((date, i) => log(String(i), date, 'squat', { weight_kg: i === 0 ? '9999' : '100' }));
    expect(chartBuckets(logs).points.map(point => point.key)).toEqual(['2025-12-08', '2025-12-15', '2025-12-22', '2025-12-29', '2026-01-05', '2026-01-12']);
    expect(chartBuckets(logs).scale).toBeCloseTo(115);
  });
});

test('daily-best ties prefer trusted points then the latest record, keeping low-confidence days off the main line', () => {
  const fixture = curve('squat', 100);
  const sample = (id: string, hour: number, value: number, confidence: 'normal' | 'low' = 'normal'): E1RMSample => ({ sampleId: id, winnerPointId: id, winnerOrigin: 'logged', winnerConfidence: confidence, date: new Date(2026, 7, 1, hour), valueKg: value });
  const raw = [sample('low', 10, 100, 'low'), sample('trusted', 11, 100), sample('latest', 12, 100)];
  const snapshot = growthSnapshot({ ...fixture, series: { ...fixture.series, rawEligible: raw } }, 'all');
  expect(snapshot.eligibleDataPointCount).toBe(1);
  expect(snapshot.samples.map(point => point.sampleId)).toEqual(['latest']);
});

test('daily-best chart uses declining window values and the smoothed winner as headline, independently of old records', () => {
  const fixture = curve('squat', 999);
  const raw = [150, 130, 140].map((valueKg, index): E1RMSample => ({ sampleId: String(index), winnerPointId: String(index), winnerOrigin: 'logged', winnerConfidence: 'normal', date: new Date(2026, 7, index + 1, 12), valueKg }));
  const snapshot = growthSnapshot({ ...fixture, series: { ...fixture.series, rawEligible: raw, smoothed: [{ ...raw[2], valueKg: 150, winnerPointId: '0' }] } }, '30', new Date(2026, 7, 4, 12));
  expect(snapshot.state).toBe('chart');
  expect(snapshot.currentKg).toBe(150);
  expect(snapshot.deltaKg).toBe(-10);
  expect(snapshot.chartCurrentPoint?.valueKg).toBe(140);
  expect(snapshot.latestRecordDate).toEqual(raw[0].date);
});


describe('Progress Total carried-forward series', () => {
  test('waits for all lifts, carries previous values, merges same-day updates and excludes low confidence', () => {
    const curves = { squat: curve('squat', 100), bench: curve('bench', 80), deadlift: curve('deadlift', null) };
    expect(buildTotalSeries(curves)).toEqual([]);
    expect(totalSnapshot(curves, 'all').missing).toEqual(['deadlift']);
    expect(totalSnapshot(curves, 'all').state).toBe('missing');
    const sample = (family: LiftFamily, day: number, valueKg: number, hour = 12): E1RMSample => ({ ...curve(family, valueKg).point!, date: new Date(2026, 6, day, hour) });
    curves.squat.series = { ...curves.squat.series, rawEligible: [sample('squat', 1, 100), sample('squat', 3, 110), sample('squat', 4, 115)] };
    curves.bench.series = { ...curves.bench.series, rawEligible: [sample('bench', 2, 80), sample('bench', 4, 85, 18)] };
    curves.deadlift.series = { ...curves.deadlift.series, rawEligible: [sample('deadlift', 2, 120)] };
    curves.deadlift.series = { ...curves.deadlift.series, rawEligible: [...curves.deadlift.series.rawEligible, { ...sample('deadlift', 5, 999), winnerConfidence: 'low' }] };
    expect(buildTotalSeries(curves).map(p => [p.date.getDate(), p.valueKg])).toEqual([[2, 300], [3, 310], [4, 320]]);
    expect(totalSnapshot(curves, 'all')).toMatchObject({ deltaKg: 20, state: 'chart', missing: [] });
  });
});


test('Total windows use the existing 28-day cutoff and reject sparse or flat lines', () => {
  const curves = { squat: curve('squat', 100), bench: curve('bench', 80), deadlift: curve('deadlift', 120) };
  const point = curves.squat.point!;
  curves.squat.series = { ...curves.squat.series, rawEligible: [0, 1, 2].map(index => ({ ...point, date: new Date(2026, 6, index + 1, 12), valueKg: 100 })) };
  expect(totalSnapshot(curves, 'all').state).toBe('sparse');
  curves.squat.series = { ...curves.squat.series, rawEligible: curves.squat.series.rawEligible.map((p, index) => ({ ...p, valueKg: 100 - index * 5 })) };
  expect(totalSnapshot(curves, 'all')).toMatchObject({ state: 'chart', deltaKg: -10 });
  expect(totalSnapshot(curves, '30', new Date(2026, 6, 30, 12))).toMatchObject({ state: 'sparse', deltaKg: -5 });
  expect(totalSnapshot(curves, '90', new Date(2026, 6, 30, 12)).state).toBe('chart');
  expect(totalSnapshot(curves, '30', new Date(2026, 9, 1))).toMatchObject({ state: 'sparse', deltaKg: null, samples: [] });
});


test('Progress row values cover totals, singular/plural sessions, unread/read/empty feedback and the latest RPE', () => {
  const stats = buildGrowthStats([], { squat: curve('squat', 100), bench: curve('bench', 80), deadlift: curve('deadlift', 120) });
  const volumeIntensity = buildVolumeIntensitySeries([log('rpe', '2026-07-01', 'squat', { rpe: '7.75' })]);
  const feedback = [{ read_at: null }, { read_at: '2026-07-01' }];
  expect(progressRowValues({ stats, volumeIntensity, feedback })).toEqual({ e1rm: 'Total 300 kg', history: '—', feedback: '1 new', feedbackEmphasized: true, intensity: '—' });
  expect(progressRowValues({ stats: { ...stats, trainingSessionCount: 1, unlocksTrends: true }, volumeIntensity, feedback: [{ read_at: 'read' }] })).toMatchObject({ history: '1 session', feedback: '1', feedbackEmphasized: false, intensity: 'RPE 7.8' });
  volumeIntensity.points.push({ ...volumeIntensity.points[0], averageRPE: null });
  expect(progressRowValues({ stats: { ...stats, sbdTotalKg: null, trainingSessionCount: 42, unlocksTrends: true }, volumeIntensity, feedback: [] })).toMatchObject({ e1rm: '—', history: '42 sessions', feedback: '—', intensity: '—' });
  expect(progressRowValues({ stats: { ...stats, unlocksTrends: true }, volumeIntensity: { scale: 0, points: [] }, feedback: [] }).intensity).toBe('—');
});

test('real growth curves preserve every Total update and sum the latest all-history main-line points', () => {
  const families = ['squat', 'bench', 'deadlift'] as const;
  const points = families.flatMap(family => [
    ['2026-05-01', 200], ['2026-10-01', 100], ['2026-10-02', 110], ['2026-10-03', 120],
  ].map(([date, value], index) => ({
    id: `${family}-${index}`, studentId: 'student', exerciseId: family, setLogId: `${family}-${index}`,
    computedAt: new Date(`${date}T12:00:00Z`), e1RMKg: Number(value),
    sourceWeightKg: Number(value), sourceReps: 1, sourceRPE: 10,
    origin: 'logged' as const, confidence: 'normal' as const,
  })));
  const curves = buildGrowthCurves([], new Map(families.map(family => [family, family])), new Date('2026-10-09T12:00:00Z'), points);
  const now = new Date('2026-10-09T12:00:00Z');
  const total = buildTotalSeries(curves, now);
  expect(total.map(point => [point.date.toISOString().slice(0, 10), point.valueKg])).toEqual([
    ['2026-05-01', 600], ['2026-10-01', 300], ['2026-10-02', 330], ['2026-10-03', 360],
  ]);
  expect(total.at(-1)?.valueKg).toBe(families.reduce((sum, family) => sum + growthSnapshot(curves[family], 'all', now).samples.at(-1)!.valueKg, 0));
});
