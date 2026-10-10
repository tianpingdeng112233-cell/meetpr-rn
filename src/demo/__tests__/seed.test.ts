import { expect, test } from '@jest/globals';
import { buildDemoSeed } from '../seed';
import { recommendedDate, currentWeekDays } from '@/domain/plan/sequence';
import { buildGrowthCurves, growthSnapshot, buildTotalSeries } from '@/features/history/model';
import type { LiftFamily } from '@/domain/e1rm';

const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-01-31', '2026-12-31'];
test.each(dates)('S2: %s has one untouched workout today in week four and rising history', today => {
  const seed = buildDemoSeed(today);
  const { plan, logs } = seed;
  expect(plan.plan_weeks).toBe(6);
  expect(plan.days).toHaveLength(24);
  expect(currentWeekDays(plan.days).map(day => day.week_number)).toEqual([4, 4, 4, 4]);
  const current = plan.days.filter(day => recommendedDate(plan, day) === today);
  expect(current).toHaveLength(1);
  expect(current[0].completed_at).toBeNull();
  expect(logs.filter(log => log.logged_date >= today)).toEqual([]);
  for (const day of plan.days) {
    const past = recommendedDate(plan, day) < today;
    expect(Boolean(day.completed_at)).toBe(past);
    for (const exercise of day.exercises) {
      const recorded = logs.filter(log => log.plan_exercise_id === exercise.id && log.completed);
      expect(recorded).toHaveLength(past ? exercise.sets.length : 0);
    }
  }
  expect(current[0].exercises[0].exercise_id).toBe(seed.exercises[0].id);
  expect(current[0].exercises[0].notes?.split('.').filter(Boolean)).toHaveLength(2);
  const accessories = current[0].exercises.filter(exercise => !exercise.is_main_lift);
  expect(accessories.some(exercise => exercise.notes)).toBe(true);
  expect(accessories.map(exercise => exercise.sets[0].load_mode)).toEqual(['fixed_weight', 'rpe', 'rir']);
  expect(accessories[2].sets.every(set => set.coach_note === '自重')).toBe(true);
  for (const exercise of accessories) {
    const lastWeek = plan.days.find(day => day.week_number === 3 && day.day_of_week === current[0].day_of_week)!;
    const previous = lastWeek.exercises.find(item => item.exercise_id === exercise.exercise_id)!;
    expect(logs.some(log => log.plan_exercise_id === previous.id)).toBe(true);
  }
  const families = new Map(seed.exercises.filter(e => e.is_competition_lift).map(e => [e.id, e.main_lift_family as LiftFamily]));
  const curves = buildGrowthCurves(logs, families, new Date(`${today}T12:00:00`));
  for (const family of ['squat', 'bench', 'deadlift'] as const) {
    const points = curves[family].series.rawEligible;
    expect(new Set(points.map(point => point.date.toISOString().slice(0, 10))).size).toBeGreaterThanOrEqual(6);
    const snapshot = growthSnapshot(curves[family], 'all', new Date(`${today}T12:00:00`));
    expect(snapshot.samples.length).toBeGreaterThanOrEqual(6);
    const curve = snapshot.samples;
    expect(curve.at(-1)!.valueKg).toBeGreaterThan(curve[0].valueKg);
    const changes = curve.slice(1).map((point, index) => point.valueKg - curve[index].valueKg);
    const pauses = changes.filter(change => change <= 0);
    expect(pauses.length).toBeGreaterThanOrEqual(1);
    expect(pauses.length).toBeLessThanOrEqual(2);
    for (let index = 1; index < curve.length; index++) {
      expect(curve[index].valueKg).toBeGreaterThanOrEqual(curve[index - 1].valueKg * 0.95);
    }
  }
  expect(buildTotalSeries(curves, new Date(`${today}T12:00:00`)).length).toBeGreaterThanOrEqual(6);
  const ids = [seed.user.id, seed.coach.id, plan.id, seed.binding.id, seed.conversation.id,
    ...seed.exercises.map(e => e.id), ...seed.feedback.map(f => f.id), ...seed.messages.map(m => m.id), ...logs.map(l => l.id),
    ...plan.days.flatMap(d => [d.id, ...d.exercises.flatMap(e => [e.id, ...e.sets.map(s => s.id)])])];
  expect(new Set(ids).size).toBe(ids.length);
  expect(buildDemoSeed(today)).toEqual(seed);
});

test('rework 1: recorded effort varies by session and set, including half steps within 6.5–9', () => {
  const seed = buildDemoSeed('2026-10-10');
  const rpes = seed.logs.map(log => Number(log.rpe));
  expect(new Set(rpes)).toEqual(new Set([6.5, 7, 7.5, 8, 8.5, 9]));
  for (const exercise of seed.exercises.filter(item => item.is_competition_lift)) {
    for (let setIndex = 0; setIndex < 3; setIndex++) {
      const values = seed.logs.filter(log => log.exercise_id === exercise.id && log.set_index === setIndex).map(log => log.rpe);
      expect(new Set(values).size).toBeGreaterThan(1);
    }
  }
});

test('rework 1: a few completed accessory sets fall one or two reps short of the prescription', () => {
  const seed = buildDemoSeed('2026-10-10');
  const accessories = seed.plan.days.flatMap(day => day.exercises).filter(exercise => !exercise.is_main_lift);
  const deficits = accessories.flatMap(exercise => seed.logs.filter(log => log.plan_exercise_id === exercise.id).map(log => {
    expect(log.completed).toBe(true);
    return exercise.sets[log.set_index].target_reps - log.reps;
  }));
  expect(new Set(deficits)).toEqual(new Set([0, 1, 2]));
  expect(deficits.filter(value => value > 0).length).toBeLessThan(deficits.length / 2);
});
