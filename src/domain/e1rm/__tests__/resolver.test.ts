import { describe, expect, test } from '@jest/globals';

import { resolveCompetitionLiftFamily } from '..';
import type { CompetitionLiftExercise, OnboardingLiftProfile } from '..';

function exercise(
  overrides: Partial<CompetitionLiftExercise> = {},
): CompetitionLiftExercise {
  return {
    mainLiftFamily: 'squat',
    competitionStance: null,
    isCompetitionLift: true,
    ...overrides,
  };
}

describe('competition lift resolver', () => {
  test('rejects accessories and non-competition unscoped variations', () => {
    expect(
      resolveCompetitionLiftFamily(exercise({ mainLiftFamily: null }), null),
    ).toBeNull();
    expect(
      resolveCompetitionLiftFamily(exercise({ isCompetitionLift: false }), null),
    ).toBeNull();
    expect(resolveCompetitionLiftFamily(exercise(), null)).toBe('squat');
  });

  test('matches squat stance and falls back when onboarding stance is absent', () => {
    const lowBar = exercise({ competitionStance: 'low_bar', isCompetitionLift: false });
    expect(resolveCompetitionLiftFamily(lowBar, { squatStance: 'low_bar' })).toBe('squat');
    expect(resolveCompetitionLiftFamily(lowBar, { squatStance: 'high_bar' })).toBeNull();
    expect(resolveCompetitionLiftFamily(lowBar, {})).toBe('squat');
    expect(resolveCompetitionLiftFamily(lowBar, null)).toBe('squat');
  });

  test('matches each deadlift style and includes both', () => {
    const conventional = exercise({
      mainLiftFamily: 'deadlift',
      competitionStance: 'conventional',
    });
    const sumo = exercise({
      mainLiftFamily: 'deadlift',
      competitionStance: 'sumo',
    });

    expect(resolveCompetitionLiftFamily(conventional, { deadliftStyle: 'conventional' })).toBe(
      'deadlift',
    );
    expect(resolveCompetitionLiftFamily(conventional, { deadliftStyle: 'sumo' })).toBeNull();
    expect(resolveCompetitionLiftFamily(sumo, { deadliftStyle: 'sumo' })).toBe('deadlift');
    expect(resolveCompetitionLiftFamily(sumo, { deadliftStyle: 'conventional' })).toBeNull();
    expect(resolveCompetitionLiftFamily(conventional, { deadliftStyle: 'both' })).toBe(
      'deadlift',
    );
    expect(resolveCompetitionLiftFamily(sumo, { deadliftStyle: 'both' })).toBe('deadlift');
  });

  test('bench does not split by stance metadata', () => {
    const profile: OnboardingLiftProfile = {
      squatStance: 'high_bar',
      deadliftStyle: 'sumo',
    };
    expect(
      resolveCompetitionLiftFamily(
        exercise({ mainLiftFamily: 'bench', competitionStance: 'low_bar' }),
        profile,
      ),
    ).toBe('bench');
  });
});
