import { beforeEach, afterEach, describe, expect, test } from '@jest/globals';

import { setLocaleOverride } from '@/i18n';
import type { Exercise } from '@/api/domains/exercises';
import type { OnboardingProfile } from '@/api/domains/onboarding';

import {
  createExerciseMetadataResolver,
  exerciseTitle,
} from '../exercise-metadata';

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    name: '高杠深蹲',
    name_en: 'High-bar squat',
    exercise_type: 'strength',
    main_lift_family: 'squat',
    is_competition_lift: false,
    competition_stance: 'high_bar',
    muscle_groups: ['quads'],
    equipment: ['barbell'],
    movement_pattern: 'squat',
    created_by_coach_id: null,
    created_at: '2026-07-19T08:00:00Z',
    ...overrides,
  };
}

describe('exercise metadata resolver seam', () => {
  test('returns unresolved metadata until the catalog contains the entry', () => {
    expect(createExerciseMetadataResolver(undefined, null)('missing')).toBeNull();
    expect(createExerciseMetadataResolver([], null)('missing')).toBeNull();
  });

  test('uses the exact unresolved-title fallback', () => {
    expect(exerciseTitle(null)).toBe('锻炼');
  });

  test('keeps raw family while resolving per-student competition family', () => {
    const highBarProfile = {
      squat_stance: 'high_bar',
      deadlift_style: null,
    } as OnboardingProfile;
    const lowBarProfile = {
      squat_stance: 'low_bar',
      deadlift_style: null,
    } as OnboardingProfile;

    expect(
      createExerciseMetadataResolver([exercise()], highBarProfile)(exercise().id),
    ).toEqual({
      name: '高杠深蹲',
      rawFamily: 'squat',
      competitionFamily: 'squat',
    });
    expect(
      createExerciseMetadataResolver([exercise()], lowBarProfile)(exercise().id),
    ).toEqual({
      name: '高杠深蹲',
      rawFamily: 'squat',
      competitionFamily: null,
    });
  });

  test('exposes the competition family for matching-stance grouping', () => {
    const metadata = createExerciseMetadataResolver(
      [
        exercise({
          name: '相扑硬拉',
          main_lift_family: 'deadlift',
          competition_stance: 'sumo',
        }),
      ],
      {
        squat_stance: null,
        deadlift_style: 'sumo',
      } as OnboardingProfile,
    )(exercise().id);

    expect(metadata).toMatchObject({
      rawFamily: 'deadlift',
      competitionFamily: 'deadlift',
    });
  });
});

// Existing copy assertions pin the original Chinese presentation.
beforeEach(() => setLocaleOverride('zh'));
afterEach(() => setLocaleOverride(null));

test('shows canonical English exercise names and falls back only when name_en is null', () => {
  setLocaleOverride('en');
  expect(createExerciseMetadataResolver([exercise()], null)(exercise().id)?.name).toBe('High-bar squat');
  expect(createExerciseMetadataResolver([exercise({ name_en: null })], null)(exercise().id)?.name).toBe('高杠深蹲');
  expect(exerciseTitle(null)).toBe('Workout');
});
