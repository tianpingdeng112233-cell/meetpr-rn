import { afterEach, describe, expect, test } from '@jest/globals';

import { ApiError } from '@/api/client';
import { setLocaleOverride } from '@/i18n';

import { saveErrorCopy } from '../save-errors';

describe('set save error mapping', () => {
  afterEach(() => setLocaleOverride(null));

  test.each(['zh', 'en'] as const)('maps all four canonical branches in %s', (locale) => {
    setLocaleOverride(locale);
    expect(
      saveErrorCopy(new ApiError('backend', 'expired', { status: 401 })),
    ).toBe(locale === 'zh' ? '登录已过期，请重新登录' : 'Your session has expired. Sign in again');
    expect(
      saveErrorCopy(
        new ApiError('backend', 'changed', {
          status: 400,
          code: 'SETS_PLAN_EXERCISE_NOT_PUBLISHED',
        }),
      ),
    ).toBe(locale === 'zh' ? '训练计划已更新，请刷新训练页后重新记录。你的输入仍保留在本页。' : 'The training plan was updated. Refresh the training screen before logging again. Your entries remain on this page.');
    expect(
      saveErrorCopy(new ApiError('server', 'down', { status: 503 })),
    ).toBe(locale === 'zh' ? '服务器暂时无法保存（503），请稍后重试。你的输入仍保留在本页。' : 'The server could not save (503). Try again later. Your entries remain on this page.');
    expect(saveErrorCopy(new Error('offline'))).toBe(
      locale === 'zh' ? '记录没有保存，请重试。你的输入仍保留在本页。' : 'The log was not saved. Try again. Your entries remain on this page.',
    );
  });
});
