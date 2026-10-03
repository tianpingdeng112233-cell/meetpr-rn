import type { PlanDay, PlanDetail, PlanSet } from '@/api/domains/plans';

export function day(id: string, overrides: Partial<PlanDay> = {}): PlanDay {
  return {
    id,
    plan_id: 'plan',
    week_number: 1,
    day_of_week: 1,
    sort_order: 0,
    shifted_to_date: null,
    completed_at: null,
    completion_source: null,
    exercises: [],
    ...overrides,
  };
}
export function plan(
  days: PlanDay[] = [],
  overrides: Partial<PlanDetail> = {},
): PlanDetail {
  return {
    id: 'plan',
    coach_id: null,
    trainee_id: 'student',
    name: 'Cycle',
    start_date: '2026-09-07',
    end_date: '2026-09-20',
    plan_weeks: 2,
    source: 'coach',
    source_template_id: null,
    status: 'published',
    kind: 'regular',
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
    published_at: '2026-09-02T12:00:00Z',
    anchor_weekday: null,
    total_shift_days: 0,
    latest_shift_created_at: null,
    days,
    ...overrides,
  };
}
export function set(overrides: Partial<PlanSet> = {}): PlanSet {
  return {
    id: 'set',
    plan_exercise_id: 'exercise',
    set_number: 1,
    target_reps: 5,
    target_reps_max: null,
    intensity_mode: 'weight',
    target_value: '0',
    set_type: 'working',
    rest_seconds: null,
    coach_note: null,
    created_at: '2026-09-01T12:00:00Z',
    ...overrides,
  };
}
