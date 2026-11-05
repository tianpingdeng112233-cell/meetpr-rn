import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { PlanDetailSchema, type PlanDetail } from '@/api/domains/plans';
import { SetLogSchema, type SetLog } from '@/api/domains/sets';
import { ExerciseSchema, type Exercise } from '@/api/domains/exercises';
import { OnboardingProfileSchema, type OnboardingProfile } from '@/api/domains/onboarding';
import { storageQueue } from './queue';

const profileSchema = OnboardingProfileSchema.pick({ unit_preference: true, squat_stance: true, deadlift_style: true, squat_1rm_kg: true, bench_1rm_kg: true, deadlift_1rm_kg: true }).partial();
const schema = z.object({ plan: PlanDetailSchema, logs: z.array(SetLogSchema), exercises: z.array(ExerciseSchema).default([]), profile: profileSchema.nullable().default(null) });
type WorkoutSnapshot = z.infer<typeof schema>;
const keyFor = (studentId: string) => `training.workout-snapshot.v1.${studentId}`;

/** Only a previously loaded workout is available offline, scoped to its owner. */
export function useWorkoutSnapshot(studentId: string) {
  const [state, setState] = useState<{ owner: string; snapshot: WorkoutSnapshot | null; ready: boolean }>({ owner: studentId, snapshot: null, ready: false });
  useEffect(() => {
    let cancelled = false;
    void readWorkoutSnapshot(studentId).then(snapshot => {
      if (!cancelled) setState({ owner: studentId, snapshot, ready: true });
    }).catch(() => { if (!cancelled) setState({ owner: studentId, snapshot: null, ready: true }); });
    return () => { cancelled = true; };
  }, [studentId]);
  return state.owner === studentId ? state : { owner: studentId, snapshot: null, ready: false };
}

export function readWorkoutSnapshot(studentId: string): Promise<WorkoutSnapshot | null> {
  const key = keyFor(studentId);
  return storageQueue(AsyncStorage, key).enqueue(async () => {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? schema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success && parsed.data.plan.trainee_id === studentId &&
      parsed.data.logs.every(log => log.student_id === studentId) ? parsed.data : null;
  });
}

export function saveWorkoutSnapshot(studentId: string, plan: PlanDetail | null, logs: readonly SetLog[] = [], exercises: readonly Exercise[] = [], profile?: OnboardingProfile | null) {
  if (plan && plan.trainee_id !== studentId) return Promise.resolve();
  const dayIds = new Set(plan?.days.map(day => day.id));
  const exerciseIds = new Set(plan?.days.flatMap(day => day.exercises.map(exercise => exercise.id)));
  const planLogs = logs.filter(log => log.student_id === studentId &&
    (log.plan_exercise_id ? exerciseIds.has(log.plan_exercise_id) : log.plan_day_id && dayIds.has(log.plan_day_id)));
  // Keep the loaded catalog: offline additions can reference any picker exercise.
  const snapshot = plan ? { plan, logs: planLogs, exercises, profile: profile ? profileSchema.parse(profile) : null } : null;
  const key = keyFor(studentId);
  return storageQueue(AsyncStorage, key).enqueue(() => AsyncStorage.setItem(key, JSON.stringify(snapshot)));
}
