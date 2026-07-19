import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  dashboardPlanSeenKey,
  hasSeenDashboardPlan,
  markDashboardPlanSeen,
  type DashboardPlanSignature,
} from '../plan-seen';

jest.mock('@react-native-async-storage/async-storage', () => {
  // Jest hoists this factory before the imported `jest` binding is initialized.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const STUDENT_ID = '10000000-0000-4000-8000-000000000005';
const signature: DashboardPlanSignature = {
  planId: '20000000-0000-4000-8000-000000000001',
  publishedAt: '2026-07-19T12:00:00Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Dashboard plan seen persistence', () => {
  test('roundtrips per student and invalidates on id or publish time changes', async () => {
    await expect(hasSeenDashboardPlan(STUDENT_ID, signature)).resolves.toBe(false);
    await markDashboardPlanSeen(STUDENT_ID, signature);
    await expect(hasSeenDashboardPlan(STUDENT_ID, signature)).resolves.toBe(true);
    await expect(
      hasSeenDashboardPlan(STUDENT_ID, {
        ...signature,
        planId: '20000000-0000-4000-8000-000000000002',
      }),
    ).resolves.toBe(false);
    await expect(
      hasSeenDashboardPlan(STUDENT_ID, {
        ...signature,
        publishedAt: '2026-07-20T12:00:00Z',
      }),
    ).resolves.toBe(false);

    expect(await AsyncStorage.getItem(dashboardPlanSeenKey(STUDENT_ID))).toBe(
      JSON.stringify(signature),
    );
    await expect(
      hasSeenDashboardPlan('10000000-0000-4000-8000-000000000006', signature),
    ).resolves.toBe(false);
  });
});
