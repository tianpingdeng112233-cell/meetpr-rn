import { describe, expect, test } from '@jest/globals';

import type { PlanDetail, SetLog } from '@/api/domains';
import type { E1RMSample, LiftFamily } from '@/domain/e1rm';

import {
  buildGrowthCurves,
  buildGrowthStats,
  buildHistoryWeeks,
  buildVolumeIntensitySeries,
  historyWeekNumber,
} from '../model';
import type { GrowthCurve } from '../types';

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
      trainingDays: 2,
      trainingWeeks: 2,
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
