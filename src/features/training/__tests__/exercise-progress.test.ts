import { expect, test } from '@jest/globals';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { partitionExerciseProgress, setProgressSegments } from '../exercise-progress';

const planDay = day('day', { exercises: ['squat', 'bench', 'row'].map((id, sort_order) => ({
  id, exercise_id: id, plan_day_id: 'day', sort_order, is_main_lift: sort_order < 2, notes: null,
  sets: [set({ id: `${id}-1` }), set({ id: `${id}-2`, set_number: 2 })],
})) });
const drafts = synthesizeDrafts(planDay, []);
const groupsFor = (rows = drafts) => planDay.exercises.map(exercise => ({ exercise, drafts: rows.filter(draft => draft.exercise.id === exercise.id) }));

test('no results keeps the first exercise active and the rest in plan order', () => {
  const result = partitionExerciseProgress(groupsFor());
  expect(result.completed).toEqual([]);
  expect(result.active?.exercise.id).toBe('squat');
  expect(result.remaining.map(group => group.exercise.id)).toEqual(['bench', 'row']);
});

test.each([
  { name: 'halfway through the day', done: [0, 1], completed: ['squat'], active: 'bench', remaining: ['row'] },
  { name: 'jumping to the last exercise', done: [4, 5], completed: ['row'], active: 'squat', remaining: ['bench'] },
  { name: 'partially logged exercise', done: [0], completed: [], active: 'squat', remaining: ['bench', 'row'] },
  { name: 'all exercises finished', done: [0, 1, 2, 3, 4, 5], completed: ['squat', 'bench', 'row'], active: undefined, remaining: [] },
  { name: 'undo one result after finishing', done: [0, 2, 3, 4, 5], completed: ['bench', 'row'], active: 'squat', remaining: [] },
])('$name', ({ done, completed, active, remaining }) => {
  const result = partitionExerciseProgress(groupsFor(drafts.map((draft, index) => ({ ...draft, status: done.includes(index) ? 'complete' : 'pending' }))));
  expect(result.completed.map(group => group.exercise.id)).toEqual(completed);
  expect(result.active?.exercise.id).toBe(active);
  expect(result.remaining.map(group => group.exercise.id)).toEqual(remaining);
});

test('failed sets finish an exercise', () => {
  const rows = drafts.map((draft, index) => ({ ...draft, status: index < 2 ? 'failed' as const : draft.status }));
  expect(partitionExerciseProgress(groupsFor(rows)).completed.map(group => group.exercise.id)).toEqual(['squat']);
});

test('assumed sets keep an otherwise finished exercise active', () => {
  const rows = drafts.map((draft, index) => ({ ...draft, status: index < 2 ? 'complete' as const : draft.status }));
  const assumed = { id: 'log', plan_exercise_id: 'squat', exercise_id: 'squat', student_id: 'student', adhoc: false, set_index: 1, weight_kg: '80', reps: 5, rpe: null, completed: true, failed: false, assumed: true, logged_date: '2026-10-10', logged_at: '2026-10-10T12:00:00Z', notes: null };
  const result = partitionExerciseProgress(groupsFor(rows.map((draft, index) => index === 1 ? { ...draft, sourceLog: assumed } : draft)));
  expect(result.completed).toEqual([]);
  expect(result.active?.exercise.id).toBe('squat');
});


test('the first of three unrecorded sets is current', () => {
  expect(setProgressSegments([drafts[0], drafts[1], drafts[2]])).toEqual(['current', 'upcoming', 'upcoming']);
});

test.each([
  { statuses: ['complete', 'pending', 'pending'], expected: ['complete', 'current', 'upcoming'] },
  { statuses: ['complete', 'failed', 'pending'], expected: ['complete', 'failed', 'current'] },
  { statuses: ['complete', 'complete', 'complete'], expected: ['complete', 'complete', 'complete'] },
] as const)('set segments with $statuses', ({ statuses, expected }) => {
  expect(setProgressSegments(statuses.map((status, index) => ({ ...drafts[index], status })))).toEqual(expected);
});
