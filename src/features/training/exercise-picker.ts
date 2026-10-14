import type { Exercise } from '@/api/domains/exercises';

export const studentExerciseTagRows = [
  ['all', 'squat', 'bench', 'deadlift', 'core', 'other'],
  ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'traps', 'forearms'],
  ['quads', 'glutes', 'hamstrings', 'calves', 'adductors', 'hips'],
] as const;
export type StudentExerciseTag = typeof studentExerciseTagRows[number][number];
const muscleTags: Readonly<Record<string, StudentExerciseTag>> = {
  core: 'core', core_and_lower_back: 'core', chest: 'chest', back: 'back', shoulder: 'shoulders', shoulders: 'shoulders',
  biceps: 'biceps', triceps: 'triceps', trap: 'traps', traps: 'traps', trapezius: 'traps', forearm: 'forearms', forearms: 'forearms', grip: 'forearms',
  quad: 'quads', quads: 'quads', quadriceps: 'quads', glute: 'glutes', glutes: 'glutes', hamstring: 'hamstrings', hamstrings: 'hamstrings',
  calf: 'calves', calves: 'calves', tibialis: 'calves', tibialis_anterior: 'calves', adductor: 'adductors', adductors: 'adductors',
  hip: 'hips', hips: 'hips', hip_flexor: 'hips', hip_flexors: 'hips', mobility: 'other', flexibility: 'other', cardio: 'other', other: 'other',
};
export function exerciseTags(exercise: Pick<Exercise, 'exercise_type' | 'main_lift_family' | 'muscle_groups'>): StudentExerciseTag[] {
  const tags = new Set<StudentExerciseTag>(['all']);
  if (exercise.main_lift_family && ['main_lift', 'main_lift_variation'].includes(exercise.exercise_type)) tags.add(exercise.main_lift_family);
  for (const muscle of exercise.muscle_groups ?? []) if (muscleTags[muscle]) tags.add(muscleTags[muscle]);
  return [...tags];
}
export function filterStudentExercises(exercises: readonly Exercise[], tag: StudentExerciseTag, search: string): Exercise[] {
  const query = search.trim().toLocaleLowerCase();
  return exercises.filter(exercise => exerciseTags(exercise).includes(tag) &&
    `${exercise.name} ${exercise.name_en ?? ''}`.toLocaleLowerCase().includes(query));
}
