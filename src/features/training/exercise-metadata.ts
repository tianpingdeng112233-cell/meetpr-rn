import { useCallback, useMemo } from 'react';

import {
  buildExerciseIndex,
  useExerciseCatalog,
  type Exercise,
} from '@/api/domains/exercises';
import {
  useOnboarding,
  type OnboardingProfile,
} from '@/api/domains/onboarding';
import {
  resolveCompetitionLiftFamily,
  type CompetitionStance,
  type DeadliftStyle,
  type LiftFamily,
  type OnboardingLiftProfile,
  type SquatStance,
} from '@/domain/e1rm';

export type ExerciseMetadata = {
  name: string;
  rawFamily: LiftFamily | null;
  competitionFamily: LiftFamily | null;
};

export type ExerciseMetadataResolver = (
  exerciseId: string,
) => ExerciseMetadata | null;

export const UNRESOLVED_EXERCISE_TITLE = '锻炼';

export function exerciseTitle(metadata: ExerciseMetadata | null): string {
  return metadata?.name ?? UNRESOLVED_EXERCISE_TITLE;
}

function squatStance(value: string | null): SquatStance | null {
  return value === 'low_bar' || value === 'high_bar' ? value : null;
}

function deadliftStyle(value: string | null): DeadliftStyle | null {
  return value === 'conventional' || value === 'sumo' || value === 'both'
    ? value
    : null;
}

function liftProfile(
  onboarding: OnboardingProfile | null | undefined,
): OnboardingLiftProfile | null {
  if (!onboarding) return null;
  return {
    squatStance: squatStance(onboarding.squat_stance),
    deadliftStyle: deadliftStyle(onboarding.deadlift_style),
  };
}

export function createExerciseMetadataResolver(
  exercises: readonly Exercise[] | undefined,
  onboarding: OnboardingProfile | null | undefined,
): ExerciseMetadataResolver {
  if (!exercises) {
    return () => null;
  }

  const index = buildExerciseIndex(exercises);
  const profile = liftProfile(onboarding);
  return (exerciseId) => {
    const exercise = index.get(exerciseId);
    if (!exercise) return null;
    return {
      name: exercise.name,
      rawFamily: exercise.main_lift_family,
      competitionFamily: resolveCompetitionLiftFamily(
        {
          mainLiftFamily: exercise.main_lift_family,
          competitionStance: narrowCompetitionStance(exercise.competition_stance),
          isCompetitionLift: exercise.is_competition_lift,
        },
        profile,
      ),
    };
  };
}

const KNOWN_COMPETITION_STANCES: readonly CompetitionStance[] = [
  'low_bar',
  'high_bar',
  'conventional',
  'sumo',
];

// The catalog schema is deliberately permissive (an unknown stance string must
// not break catalog parsing); narrow here so the resolver only ever sees known
// stances and treats anything else as unresolved.
function narrowCompetitionStance(value: string | null): CompetitionStance | null {
  return value !== null &&
    (KNOWN_COMPETITION_STANCES as readonly string[]).includes(value)
    ? (value as CompetitionStance)
    : null;
}

export function useExerciseMetadataResolver(
  studentId: string,
): ExerciseMetadataResolver {
  const catalog = useExerciseCatalog(Boolean(studentId));
  const onboarding = useOnboarding(studentId);
  const resolver = useMemo(
    () =>
      createExerciseMetadataResolver(
        catalog.isSuccess ? catalog.data.exercises : undefined,
        onboarding.data,
      ),
    [catalog.data, catalog.isSuccess, onboarding.data],
  );
  return useCallback(
    (exerciseId: string) => resolver(exerciseId),
    [resolver],
  );
}
