import { test, expect } from '@jest/globals';
import { cycleOutlook, type OutlookInput } from '../cycle-outlook';
import { day, plan, set } from '../test-fixtures';
import type { SetLog } from '@/api/domains/sets';

const exercise = (id: string, dayId: string, kg: number) => ({ id, plan_day_id: dayId, exercise_id: 'squat', sort_order: 0, is_main_lift: false, notes: null, sets: [set({ id: `${id}-set`, plan_exercise_id: id, load_mode: 'fixed_weight', target_weight: String(kg) })] });
const input = (): OutlookInput => ({ plan: plan([day('first', { exercises: [exercise('a', 'first', 100)] }), day('best', { day_of_week: 2, exercises: [exercise('b', 'best', 120)] })], { plan_weeks: 3 }), resolveExercise: id => ({ competitionFamily: id === 'squat' ? 'squat' : null, name: id }), e1rmByExercise: {}, registeredOneRM: {}, logs: [], unit: 'kg', currentWeek: 1, copy: { approximate: '约', skipped: '没做', unscheduled: '未排', notTrained: '没练' } });
const log = (exerciseId: string, kg: number, reps = 5): SetLog => ({ id: exerciseId, student_id: 'student', plan_exercise_id: exerciseId, exercise_id: 'squat', plan_day_id: null, set_index: 0, weight_kg: String(kg), reps, rpe: null, completed: true, failed: false, assumed: false, adhoc: false, is_warmup: false, logged_date: '2026-09-07', logged_at: '2026-09-07T12:00:00Z' });

test('selects the highest scoring working set across days, ignores the plan flag and excludes warmups', () => {
  const i = input(); i.plan!.days[0].exercises[0].sets.push(set({ target_value: '300', set_type: 'warmup' }));
  const result = cycleOutlook(i);
  expect(result.visible).toBe(true);
  expect(result.rows[0].cells[0]).toMatchObject({ dayId: 'best', main: '120', done: false });
  expect(result.rows[0].cells[1]).toMatchObject({ state: 'unscheduled', dayId: null });
});
test('settled weeks select the actual winner and compare its own prescription for short reps', () => {
  const i = input(); i.plan!.days.forEach(d => { d.completed_at = '2026-09-07T12:00:00Z'; });
  i.logs = [log('a', 150, 3), log('b', 120), { ...log('a', 500), id: 'warmup', is_warmup: true }];
  expect(cycleOutlook(i).rows[0].cells[0]).toMatchObject({ dayId: 'first', main: '150', sub: '×3/5', short: true, done: true });
  i.logs = [];
  expect(cycleOutlook(i).rows[0].cells[0]).toMatchObject({ main: '没做', skipped: true, isTop: false });
});
test('preview ignores completion and logs and has no current week', () => {
  const i = input(); i.preview = true; i.plan!.days.forEach(d => { d.completed_at = '2026-09-07T12:00:00Z'; }); i.logs = [log('a', 150)];
  expect(cycleOutlook(i).rows[0].cells[0]).toMatchObject({ dayId: 'best', main: '120', done: false, isCurrent: false });
});
test('only published plans with competition working sets have an entry', () => {
  const i = input(); i.plan!.status = 'draft'; expect(cycleOutlook(i).visible).toBe(false);
  i.plan!.status = 'published'; i.resolveExercise = () => null; expect(cycleOutlook(i).visible).toBe(false);
});
test('uses range ceilings and existing percentage anchors, keeping top-set percentages unresolved', () => {
  const i = input(); i.plan!.days = [day('range', { exercises: [{ ...exercise('a', 'range', 0), sets: [set({ load_mode: 'weight_range', weight_low: '80', weight_high: '110' })] }] })];
  expect(cycleOutlook(i).rows[0].cells[0].main).toBe('110');
  i.plan!.days[0].exercises[0].sets = [set({ load_mode: 'pct', target_pct: '85', pct_anchor: 'e1rm' })];
  i.e1rmByExercise = { squat: 150 }; i.registeredOneRM = { squat: 120 };
  expect(cycleOutlook(i).rows[0].cells[0].main).toBe('127.5');
  i.plan!.days[0].exercises[0].sets[0].pct_anchor = 'top_set';
  expect(cycleOutlook(i).rows[0].cells[0].main).toBe('85%');
});

test('actual set indices follow sorted prescription positions even when set numbers have gaps', () => {
  const i = input(); i.plan!.days = [day('d', { completed_at: '2026-09-07T12:00:00Z', exercises: [{ ...exercise('a', 'd', 100), sets: [set({ set_number: 4, target_value: '120', target_reps: 3 }), set({ set_number: 2, target_value: '100', target_reps: 5 })] }] })];
  i.logs = [{ ...log('a', 120, 2), set_index: 1 }];
  expect(cycleOutlook(i).rows[0].cells[0].sub).toBe('×2/3');
});

test('weight range ceilings retain explicit RPE in the label and fixed-load score', () => {
  const i = input(); i.plan!.days = [day('range', { exercises: [{ ...exercise('a', 'range', 0), sets: [set({ load_mode: 'weight_range', weight_low: '140', weight_high: '150', target_rpe: '8' })] }] }), day('fixed', { week_number: 2, exercises: [{ ...exercise('b', 'fixed', 150), sets: [set({ load_mode: 'fixed_weight', target_weight: '150', target_rpe: '7' })] }] })];
  const cells = cycleOutlook(i).rows[0].cells;
  expect(cells[0]).toMatchObject({ main: '150', sub: '×5 @8', isTop: false });
  expect(cells[1].isTop).toBe(true);
});

test('actual reps within a prescribed interval are not marked short', () => {
  const i = input(); i.plan!.days = [day('d', { completed_at: '2026-09-07T12:00:00Z', exercises: [{ ...exercise('a', 'd', 100), sets: [set({ target_value: '100', target_reps: 3, target_reps_max: 5 })] }] })];
  i.logs = [log('a', 100, 3)];
  expect(cycleOutlook(i).rows[0].cells[0]).toMatchObject({ sub: '×3', short: false });
  i.logs = [log('a', 100, 2)];
  expect(cycleOutlook(i).rows[0].cells[0]).toMatchObject({ sub: '×2/3', short: true });
});

test('resolved percentage weeks never become fixed-weight M2 anchors for RPE-only weeks', () => {
  const i = input();
  i.plan!.days = [day('pct', { exercises: [{ ...exercise('a', 'pct', 0), sets: [set({ load_mode: 'pct', target_pct: '80' })] }] }), day('rpe', { week_number: 2, exercises: [{ ...exercise('b', 'rpe', 0), sets: [set({ load_mode: 'rpe', target_rpe: '8', target_reps: 3 })] }] })];
  i.registeredOneRM = { squat: 200 };
  const cells = cycleOutlook(i).rows[0].cells;
  expect(cells[0].main).toBe('160');
  expect(cells[1]).toMatchObject({ main: '3 @8', sub: 'RPE', ratio: 0.6, isTop: false });
});
