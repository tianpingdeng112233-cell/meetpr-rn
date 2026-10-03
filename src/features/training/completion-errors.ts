import { ApiError } from '@/api/client';
import { t } from '@/i18n';
export function completionError(error: unknown, undo: boolean): string {
  if (error instanceof ApiError) {
    if (error.code === 'UNDO_WINDOW_PASSED')
      return t('student.progression.undoWindowPassed');
    if (error.code === 'NOT_LATEST_COMPLETION')
      return t('student.progression.notLatestCompletion');
  }
  return t(
    undo
      ? 'student.todayWorkoutViewModel.copy002'
      : 'student.todayWorkoutViewModel.copy001',
  );
}
