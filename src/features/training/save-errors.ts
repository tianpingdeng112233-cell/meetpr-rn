import { ApiError } from '@/api/client';

export const GYM_DAY_SAVE_ERROR =
  '训练日已切换,本组无法保存。你的输入仍保留在本页,请刷新训练页后重新记录。';

export function saveErrorCopy(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return '登录已过期,请重新登录';
  }
  if (
    error instanceof ApiError &&
    (error.code === 'SETS_PLAN_EXERCISE_NOT_PUBLISHED' ||
      error.code === 'PLAN_NOT_FOUND')
  ) {
    return '训练计划已更新,请刷新训练页后重新记录。你的输入仍保留在本页。';
  }
  if (
    error instanceof ApiError &&
    (error.kind === 'server' || (error.status ?? 0) >= 500)
  ) {
    return `服务器暂时无法保存(${error.code ?? error.status ?? 500}),请稍后重试。你的输入仍保留在本页。`;
  }
  return '记录没有保存,请重试。你的输入仍保留在本页。';
}
