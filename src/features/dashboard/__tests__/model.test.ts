import { beforeEach, afterEach, describe, expect, test } from '@jest/globals';

import { setLocaleOverride } from '@/i18n';
import { ApiError, type ApiErrorCode } from '@/api/client';
import {
  buildExerciseIndex,
  type Exercise,
  type PlanDetail,
  type PlanSummary,
  type SetLog,
} from '@/api/domains';
import type { E1RMSeries } from '@/domain/e1rm';

import {
  chineseMonthDay,
  chineseWeekday,
  dashboardCTA,
  dashboardE1RMRange,
  e1RMPeriodLabel,
  mondayOffset,
  planShiftErrorCopy,
  replayE1RMSeries,
  resolveDashboardLifts,
  shouldOfferPlanShift,
  unsupportedPlanShiftCopy,
} from '../model';
import type { DashboardWeekDay } from '../types';

function dashboardDay(status: DashboardWeekDay['status']): DashboardWeekDay {
  if (status === 'noPlan') {
    return {
      date: '2026-07-19',
      day: null,
      lift: null,
      completion: 0,
      status,
    };
  }
  return {
    date: '2026-07-19',
    day: {
      id: '10000000-0000-4000-8000-000000000001',
      plan_id: '10000000-0000-4000-8000-000000000002',
      day_of_week: 7,
      week_number: 2,
      sort_order: 3,
      shifted_to_date: null,
      exercises: [],
    },
    lift: {
      exerciseId: '10000000-0000-4000-8000-000000000003',
      family: 'squat',
      initial: 'S',
      name: '深蹲',
    },
    completion: status === 'complete' ? 1 : status === 'partial' ? 0.5 : 0,
    status,
  };
}

const plan = {
  id: '10000000-0000-4000-8000-000000000002',
  coach_id: '10000000-0000-4000-8000-000000000004',
  trainee_id: '10000000-0000-4000-8000-000000000005',
  name: '力量周期',
  start_date: '2026-07-13',
  end_date: '2026-08-09',
  plan_weeks: 4,
  source: 'coach',
  source_template_id: null,
  status: 'published',
  kind: 'regular',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  total_shift_days: 0,
  latest_shift_created_at: null,
} satisfies PlanSummary;

describe('Dashboard CTA', () => {
  test('matches all four release states', () => {
    expect(dashboardCTA(dashboardDay('complete'))).toEqual({
      interactive: true,
      label: '今日已完成 · 查看',
    });
    expect(dashboardCTA(dashboardDay('partial'))).toEqual({
      interactive: true,
      label: '继续 W2D3 · 深蹲',
    });
    expect(dashboardCTA(dashboardDay('notStarted'))).toEqual({
      interactive: true,
      label: '开始 W2D3 · 深蹲',
    });
    expect(dashboardCTA(dashboardDay('noPlan'))).toEqual({
      interactive: false,
      label: '今日休息',
    });
  });
});

describe('plan shift gate', () => {
  test('uses the UTC calendar boundary exactly', () => {
    const todayDay = dashboardDay('notStarted');
    expect(
      shouldOfferPlanShift({
        role: 'coached_student',
        plan,
        todayDay,
        todayLogs: [],
        now: new Date('2026-07-19T00:00:00.000Z'),
      }),
    ).toBe(true);
    expect(
      shouldOfferPlanShift({
        role: 'coached_student',
        plan,
        todayDay,
        todayLogs: [],
        now: new Date('2026-07-18T23:59:59.999Z'),
      }),
    ).toBe(false);
  });

  test('requires notStarted and no same-day log', () => {
    expect(
      shouldOfferPlanShift({
        role: 'coached_student',
        plan,
        todayDay: dashboardDay('partial'),
        todayLogs: [],
        now: new Date('2026-07-19T12:00:00Z'),
      }),
    ).toBe(false);
    expect(
      shouldOfferPlanShift({
        role: 'coached_student',
        plan,
        todayDay: dashboardDay('notStarted'),
        todayLogs: [{} as never],
        now: new Date('2026-07-19T12:00:00Z'),
      }),
    ).toBe(false);
  });
});

describe('plan shift copy', () => {
  const cases: [ApiErrorCode, string][] = [
    ['PLAN_NOT_ACTIVE', '当前计划未生效,暂时不能顺延'],
    ['SHIFT_ONLY_TODAY', '只能顺延今天的训练'],
    ['ALREADY_STARTED', '今天的训练已经开始,不能顺延或撤销'],
    ['NOT_PLAN_STUDENT', '只有计划所属学员可以顺延'],
    ['NO_ACTIVE_SHIFT', '当前没有可撤销的顺延'],
    ['UNDO_WINDOW_PASSED', '只能在顺延当天撤销,请联系教练调整计划'],
  ];

  test.each(cases)('maps %s to its exact message', (code, message) => {
    const operation = code.startsWith('NO_') || code.startsWith('UNDO_') ? 'undo' : 'shift';
    expect(
      planShiftErrorCopy(
        new ApiError('backend', code, { status: 409, code }),
        operation,
      ).message,
    ).toBe(message);
  });

  test('covers unsupported plus both network fallbacks', () => {
    expect(unsupportedPlanShiftCopy().message).toBe('当前计划暂不支持顺延');
    expect(
      planShiftErrorCopy(
        new ApiError('backend', 'AUTHORIZATION_FORBIDDEN', {
          status: 403,
          code: 'AUTHORIZATION_FORBIDDEN',
        }),
        'shift',
      ).message,
    ).toBe('当前计划暂不支持顺延');
    expect(planShiftErrorCopy(new Error('offline'), 'shift').message).toBe(
      '顺延失败,请检查网络后重试',
    );
    expect(planShiftErrorCopy(new Error('offline'), 'undo').message).toBe(
      '撤销顺延失败,请检查网络后重试',
    );
  });
});

describe('week grid calendar conversion', () => {
  test('converts iOS Sunday-based weekday to Monday-first offset', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(mondayOffset)).toEqual([
      6, 0, 1, 2, 3, 4, 5,
    ]);
  });
});

describe('e1RM period label', () => {
  const now = new Date('2026-07-29T12:00:00.000Z');
  function seriesAt(date: Date): E1RMSeries {
    const point = {
      sampleId: 'record-1',
      date,
      valueKg: 200,
      winnerPointId: 'point-1',
      winnerOrigin: 'logged' as const,
      winnerConfidence: 'normal' as const,
    };
    return {
      smoothed: [point],
      rawEligible: [point],
      records: [point],
      best: point,
      last: point,
      currentKg: 200,
    };
  }

  test('keeps an exactly 28-day-old record in the 90-day label', () => {
    expect(
      e1RMPeriodLabel(seriesAt(new Date('2026-07-01T12:00:00.000Z')), now),
    ).toBe('90 天');
  });

  test('switches to historical best one millisecond before the boundary', () => {
    expect(
      e1RMPeriodLabel(seriesAt(new Date('2026-07-01T11:59:59.999Z')), now),
    ).toBe('历史最佳');
  });
});

const BENCH_ID = '20000000-0000-4000-8000-000000000001';
const SQUAT_ID = '20000000-0000-4000-8000-000000000002';
const UNKNOWN_ID = '20000000-0000-4000-8000-000000000003';

function catalogExercise(
  id: string,
  family: Exercise['main_lift_family'],
): Exercise {
  return {
    id,
    name: family ?? '辅助动作',
    name_en: null,
    exercise_type: family ? 'main_lift' : 'accessory',
    main_lift_family: family,
    is_competition_lift: family !== null,
    competition_stance: null,
    muscle_groups: null,
    equipment: null,
    movement_pattern: null,
    created_by_coach_id: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function resolverPlan(): PlanDetail {
  const exercise = (id: string, dayId: string, sortOrder: number) => ({
    id: `40000000-0000-4000-8000-00000000000${sortOrder}`,
    plan_day_id: dayId,
    exercise_id: id,
    is_main_lift: true,
    sort_order: sortOrder,
    notes: null,
    sets: [],
  });
  const firstDayId = '30000000-0000-4000-8000-000000000001';
  const secondDayId = '30000000-0000-4000-8000-000000000002';
  return {
    ...plan,
    days: [
      {
        id: firstDayId,
        plan_id: plan.id,
        day_of_week: 1,
        week_number: 1,
        sort_order: 1,
        shifted_to_date: null,
        exercises: [exercise(BENCH_ID, firstDayId, 1)],
      },
      {
        id: secondDayId,
        plan_id: plan.id,
        day_of_week: 2,
        week_number: 1,
        sort_order: 2,
        shifted_to_date: null,
        exercises: [
          exercise(SQUAT_ID, secondDayId, 2),
          exercise(UNKNOWN_ID, secondDayId, 3),
        ],
      },
    ],
  };
}

describe('Dashboard competition lift resolution', () => {
  test('labels bench-before-squat plans from catalog metadata, never first appearance', () => {
    const exercises = [
      catalogExercise(BENCH_ID, 'bench'),
      catalogExercise(SQUAT_ID, 'squat'),
    ];
    const lifts = resolveDashboardLifts(
      resolverPlan(),
      buildExerciseIndex(exercises),
      null,
    );

    expect(lifts.get(BENCH_ID)).toMatchObject({ family: 'bench', initial: 'B' });
    expect(lifts.get(SQUAT_ID)).toMatchObject({ family: 'squat', initial: 'S' });
    expect(lifts.get(UNKNOWN_ID)).toBeNull();
  });
});

describe('Dashboard all-time e1RM replay', () => {
  const studentId = '10000000-0000-4000-8000-000000000005';
  function log(id: string, date: string, weight: string): SetLog {
    return {
      id,
      student_id: studentId,
      plan_exercise_id: null,
      exercise_id: SQUAT_ID,
      set_index: 0,
      weight_kg: weight,
      reps: 1,
      rpe: '10',
      completed: true,
      failed: false,
      assumed: false,
      adhoc: false,
      logged_date: date,
      logged_at: `${date}T12:00:00Z`,
    };
  }

  test('uses the iOS migration lower bound and omits the default plan scope', () => {
    const range = dashboardE1RMRange('2026-07-19');
    expect(range).toEqual({
      from: '1970-01-01',
      to: '2026-07-19',
    });
    expect(range).not.toHaveProperty('scope');
  });

  test('keeps a best log recorded before the current plan started', () => {
    const series = replayE1RMSeries(
      [
        log('50000000-0000-4000-8000-000000000001', '2025-01-01', '200'),
        log('50000000-0000-4000-8000-000000000002', '2026-07-15', '150'),
      ],
      new Map([[SQUAT_ID, 'squat']]),
      'squat',
    );
    expect(series.best?.valueKg).toBe(200);
  });
});

// Existing copy assertions pin the original Chinese presentation.
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));


test('formats calendar labels in the selected locale without moving the UTC date', () => {
  setLocaleOverride('en');
  expect(chineseMonthDay('2026-07-19')).toBe('Jul 19');
  expect(chineseWeekday('2026-07-19')).toBe('Sun');
  setLocaleOverride('zh');
  expect(chineseMonthDay('2026-07-19')).toBe('7月19日');
  expect(chineseWeekday('2026-07-19')).toBe('周日');
});
