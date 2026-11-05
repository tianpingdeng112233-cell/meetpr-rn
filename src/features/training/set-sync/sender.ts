import type { SetLogUpsertRequest, SetLogUpsertResponse } from '@/api/domains/sets';
import type { PendingSet, SetSender } from './queue';

type SenderDependencies = {
  upsert(request: SetLogUpsertRequest): Promise<SetLogUpsertResponse>;
  remove(id: string): Promise<void>;
  missingExercise(entry: PendingSet): Promise<boolean>;
  nextAddedIndex(entry: PendingSet): Promise<number>;
};
export function createSetSender(deps: SenderDependencies): SetSender {
  return async (entry, replaceRequest) => {
    if (entry.remove) return deps.remove(entry.log.id);
    const request = entry.request!;
    try { return await deps.upsert(request); }
    catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'SETS_PLAN_EXERCISE_NOT_PUBLISHED') ||
        !('plan_exercise_id' in request) || !await deps.missingExercise(entry)) throw error;
      const { plan_exercise_id: _removed, ...fields } = request;
      const added: SetLogUpsertRequest = { ...fields, exercise_id: entry.exerciseId, plan_day_id: entry.dayId,
        logged_date: entry.loggedDate, set_index: await deps.nextAddedIndex(entry) };
      // The new idempotency key must survive a crash or a lost HTTP response.
      await replaceRequest(added);
      return deps.upsert(added);
    }
  };
}
