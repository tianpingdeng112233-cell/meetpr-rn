import { describe, expect, test } from '@jest/globals';

import { ApiError } from '@/api/client';

import { saveErrorCopy } from '../save-errors';

describe('set save error mapping', () => {
  test('maps all four canonical branches', () => {
    expect(
      saveErrorCopy(new ApiError('backend', 'expired', { status: 401 })),
    ).toBe('登录已过期,请重新登录');
    expect(
      saveErrorCopy(
        new ApiError('backend', 'changed', {
          status: 400,
          code: 'SETS_PLAN_EXERCISE_NOT_PUBLISHED',
        }),
      ),
    ).toBe('训练计划已更新,请刷新训练页后重新记录。你的输入仍保留在本页。');
    expect(
      saveErrorCopy(new ApiError('server', 'down', { status: 503 })),
    ).toBe('服务器暂时无法保存(503),请稍后重试。你的输入仍保留在本页。');
    expect(saveErrorCopy(new Error('offline'))).toBe(
      '记录没有保存,请重试。你的输入仍保留在本页。',
    );
  });
});
