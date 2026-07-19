import {
  buildE1RMSeries,
  type E1RMRecorder,
  type E1RMRecorderInput,
  type E1RMRepository,
  type PRBreakthroughEvent,
} from '@/domain/e1rm';

import type { ExerciseMetadataResolver } from './exercise-metadata';

export type LiveE1RMResult = {
  currentKg: number | null;
  pr: PRBreakthroughEvent | null;
  refreshed: boolean;
};

export async function recordTrainingSetE1RM({
  input,
  recorder,
  repository,
  resolveExerciseMetadata,
}: {
  input: Omit<E1RMRecorderInput, 'family'>;
  recorder: Pick<E1RMRecorder, 'record'>;
  repository: Pick<E1RMRepository, 'fetchHistory'>;
  resolveExerciseMetadata: ExerciseMetadataResolver;
}): Promise<LiveE1RMResult> {
  const metadata = resolveExerciseMetadata(input.exerciseId);
  if (metadata === null) {
    return { currentKg: null, pr: null, refreshed: false };
  }

  const pr = await recorder.record({ ...input, family: metadata.rawFamily });
  try {
    const history = await repository.fetchHistory(
      input.studentId,
      input.exerciseId,
    );
    return {
      currentKg: buildE1RMSeries(history, metadata.competitionFamily).currentKg,
      pr,
      refreshed: true,
    };
  } catch {
    return { currentKg: null, pr, refreshed: false };
  }
}
