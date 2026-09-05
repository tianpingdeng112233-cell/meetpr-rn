import { ApiError } from '@/api/client';
import { t } from '@/i18n';

export const GYM_DAY_SAVE_ERROR =
  /* TODO(i18n:missing) */ '训练日已切换,本组无法保存。你的输入仍保留在本页,请刷新训练页后重新记录。';

export function saveErrorCopy(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return t('student.todayWorkoutViewModelRecordingError.copy001');
  }
  if (
    error instanceof ApiError &&
    (error.code === 'SETS_PLAN_EXERCISE_NOT_PUBLISHED' ||
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
  return t('student.todayWorkoutViewModelRecordingError.copy004');
}
