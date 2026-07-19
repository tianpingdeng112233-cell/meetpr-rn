import type {
  CompetitionLiftExercise,
  LiftFamily,
  OnboardingLiftProfile,
} from './types';

/** Mirrors the backend/iOS per-student competition-lift decision matrix. */
export function resolveCompetitionLiftFamily(
  exercise: CompetitionLiftExercise,
  onboarding: OnboardingLiftProfile | null,
): LiftFamily | null {
  const family = exercise.mainLiftFamily;
  if (family === null) {
    return null;
  }
  if (exercise.competitionStance === null) {
    return exercise.isCompetitionLift ? family : null;
  }

  const stance =
    family === 'squat'
      ? onboarding?.squatStance
      : family === 'deadlift'
        ? onboarding?.deadliftStyle
        : null;
  if (stance === null || stance === undefined) {
    return family;
  }
  if (family === 'deadlift' && stance === 'both') {
    return family;
  }
  return exercise.competitionStance === stance ? family : null;
}
