import { describe, expect, test } from '@jest/globals';

import type { Exercise } from '@/api/domains/exercises';
import type { OnboardingProfile } from '@/api/domains/onboarding';
import {
  E1RMRecorder,
  InMemoryE1RMRepository,
  type E1RMRecorderInput,
} from '@/domain/e1rm';

import { recordTrainingSetE1RM } from '../e1rm-live';
import { createExerciseMetadataResolver } from '../exercise-metadata';

const SUMO_DEADLIFT_ID = '10000000-0000-4000-8000-000000000001';

const sumoDeadlift = {
  id: SUMO_DEADLIFT_ID,
  name: '相扑硬拉',
  name_en: 'Sumo deadlift',
  exercise_type: 'strength',
  main_lift_family: 'deadlift',
  is_competition_lift: false,
  competition_stance: 'sumo',
  muscle_groups: ['posterior_chain'],
  equipment: ['barbell'],
  movement_pattern: 'hinge',
  created_by_coach_id: null,
  created_at: '2026-07-19T08:00:00Z',
} satisfies Exercise;

function onboarding(deadliftStyle: 'conventional' | 'sumo'): OnboardingProfile {
  return {
    squat_stance: null,
    deadlift_style: deadliftStyle,
  } as OnboardingProfile;
}

describe('training recorder family wiring', () => {
  test('passes raw deadlift family for a sumo lift despite a conventional stance', async () => {
    const repository = new InMemoryE1RMRepository();
    const actualRecorder = new E1RMRecorder(repository);
    const received: E1RMRecorderInput[] = [];
    const recorder = {
      record: (input: E1RMRecorderInput) => {
        received.push(input);
        return actualRecorder.record(input);
      },
    };
    const resolveExerciseMetadata = createExerciseMetadataResolver(
      [sumoDeadlift],
      onboarding('conventional'),
    );

    const result = await recordTrainingSetE1RM({
      recorder,
      repository,
      resolveExerciseMetadata,
      input: {
        studentId: 'student-1',
        exerciseId: SUMO_DEADLIFT_ID,
        setLogId: 'set-1',
        weightKg: 180,
        reps: 6,
        rpe: 9,
        completed: true,
        failed: false,
      },
    });

    expect(resolveExerciseMetadata(SUMO_DEADLIFT_ID)).toMatchObject({
      rawFamily: 'deadlift',
      competitionFamily: null,
    });
    expect(received).toHaveLength(1);
    expect(received[0].family).toBe('deadlift');
    expect(result).toEqual({ currentKg: null, pr: null, refreshed: true });
    expect(
      await repository.fetchHistory('student-1', SUMO_DEADLIFT_ID),
    ).toEqual([]);
  });

  test('skips e1RM best effort when the catalog is unavailable', async () => {
    const repository = new InMemoryE1RMRepository();
    const received: E1RMRecorderInput[] = [];

    await expect(
      recordTrainingSetE1RM({
        recorder: {
          record: async (input) => {
            received.push(input);
            return null;
          },
        },
        repository,
        resolveExerciseMetadata: createExerciseMetadataResolver(undefined, null),
        input: {
          studentId: 'student-1',
          exerciseId: SUMO_DEADLIFT_ID,
          setLogId: 'already-saved-set',
          weightKg: 180,
          reps: 5,
          rpe: 9,
          completed: true,
          failed: false,
        },
      }),
    ).resolves.toEqual({ currentKg: null, pr: null, refreshed: false });
    expect(received).toEqual([]);
    expect(
      await repository.fetchHistory('student-1', SUMO_DEADLIFT_ID),
    ).toEqual([]);
  });

  test('re-reads history and returns a live e1RM after a completed eligible set', async () => {
    const repository = new InMemoryE1RMRepository();
    const recorder = new E1RMRecorder(repository);
    const result = await recordTrainingSetE1RM({
      recorder,
      repository,
      resolveExerciseMetadata: () => ({
        name: '卧推',
        rawFamily: 'bench',
        competitionFamily: 'bench',
      }),
      input: {
        studentId: 'student-1',
        exerciseId: 'bench-1',
        setLogId: 'set-1',
        weightKg: 100,
        reps: 5,
        rpe: 8,
        completed: true,
        failed: false,
      },
    });

    expect(result.currentKg).toBeCloseTo(128.205_128, 6);
    expect(result.refreshed).toBe(true);
  });
});
