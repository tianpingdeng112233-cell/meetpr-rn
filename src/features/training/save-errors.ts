import { ApiError } from '@/api/client';
import { t, type TranslationKey } from '@/i18n';

export function saveErrorCopy(error: unknown): string {
  const addedErrors: Record<string, TranslationKey> = {
    SET_HAS_ATTACHMENT: 'student.added.hasVideo', SET_HAS_COACH_FEEDBACK: 'student.added.rated',
    SETS_ADHOC_DAY_CONFLICT: 'student.added.dayConflict', SET_NOT_STUDENT_ADDED: 'student.added.notAdded',
  };
  if (error instanceof ApiError && error.code && addedErrors[error.code]) return t(addedErrors[error.code]);
  if (error instanceof ApiError && error.status === 401) {
    return t('student.todayWorkoutViewModelRecordingError.copy001');
  }
  if (
    error instanceof ApiError &&
    (error.code === 'SETS_PLAN_EXERCISE_NOT_PUBLISHED' || String(error.code) === 'SETS_PLAN_DAY_NOT_PUBLISHED' ||
      error.code === 'PLAN_NOT_FOUND')
  ) {
    return t('student.todayWorkoutViewModelRecordingError.copy002');
  }
  if (
    error instanceof ApiError &&
    (error.kind === 'server' || (error.status ?? 0) >= 500)
  ) {
    return t('student.todayWorkoutViewModelRecordingError.copy003', [error.code ?? error.status ?? 500]);
  }
  if (error instanceof ApiError && error.kind === 'network') return t('student.setSaveRetry');
  return t('student.todayWorkoutViewModelRecordingError.copy004');
}
