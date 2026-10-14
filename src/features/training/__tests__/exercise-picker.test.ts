import { expect, test } from '@jest/globals';
import { exerciseTags, filterStudentExercises } from '../exercise-picker';
import type { Exercise } from '@/api/domains/exercises';
const exercise = (patch: Partial<Exercise> = {}): Exercise => ({ id: 'curl', name: '哑铃弯举', name_en: 'Dumbbell curl', exercise_type: 'accessory', main_lift_family: null, is_competition_lift: false, competition_stance: null, muscle_groups: ['biceps'], equipment: null, movement_pattern: null, created_by_coach_id: null, created_at: '', ...patch });
test.each(['squat', 'bench', 'deadlift'] as const)('picker family %s includes main lifts and variations', family => {
  for (const exercise_type of ['main_lift', 'main_lift_variation']) expect(exerciseTags(exercise({ exercise_type, main_lift_family: family }))).toContain(family);
});
test.each([
  ['core', 'core'], ['chest', 'chest'], ['back', 'back'], ['shoulder', 'shoulders'], ['biceps', 'biceps'], ['triceps', 'triceps'], ['trap', 'traps'], ['traps', 'traps'], ['forearm', 'forearms'], ['quad', 'quads'], ['glute', 'glutes'], ['hamstring', 'hamstrings'], ['calf', 'calves'], ['adductor', 'adductors'], ['hip', 'hips'], ['grip', 'forearms'], ['hip_flexor', 'hips'], ['tibialis', 'calves'], ['mobility', 'other'], ['cardio', 'other'],
])('picker muscle %s maps to %s', (muscle, tag) => expect(exerciseTags(exercise({ muscle_groups: [muscle] }))).toEqual(['all', tag]));
test('picker combines bilingual search and one tag; multi-muscle and missing metadata remain predictable', () => {
  expect(exerciseTags(exercise({ muscle_groups: ['biceps', 'forearm'] }))).toEqual(['all', 'biceps', 'forearms']);
  expect(exerciseTags(exercise({ muscle_groups: null }))).toEqual(['all']);
  expect(filterStudentExercises([exercise()], 'biceps', '弯举')).toHaveLength(1);
  expect(filterStudentExercises([exercise()], 'all', 'DUMBBELL')).toHaveLength(1);
  expect(filterStudentExercises([exercise()], 'quads', 'curl')).toHaveLength(0);
});
