import * as SecureStore from 'expo-secure-store';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { plansRepository } from '../plans';
import { onboardingRepository } from '../onboarding';
import { setsRepository } from '../sets';
import { resetSessionForTests } from '../../session';

jest.mock('expo-secure-store');

const STUDENT_ID = '10000000-0000-4000-8000-000000000000';
const PLAN_ID = '30000000-0000-4000-8000-000000000000';
const PLAN_EXERCISE_ID = '50000000-0000-4000-8000-000000000000';
const SET_ID = '70000000-0000-4000-8000-000000000000';
const BATCH_ID = '80000000-0000-4000-8000-000000000000';
const NOW = '2026-07-19T12:00:00Z';

function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function requestHeaders(init?: RequestInit): Record<string, string> {
  return init?.headers as Record<string, string>;
}

function requestBody(init?: RequestInit): unknown {
  return JSON.parse(init?.body as string) as unknown;
}

beforeEach(() => {
  resetSessionForTests();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) =>
    key === 'accessToken' ? 'access-token' : null,
  );
  globalThis.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('domain repositories through authenticatedRequest', () => {
  test('POSTs plan shift with no body and parses the snake_case response', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(201, {
        batch_id: BATCH_ID,
        shifted_days: [{ day_id: SET_ID, shifted_to_date: '2026-07-20' }],
        total_offset_days: 1,
      }),
    );

    await expect(plansRepository.shift(PLAN_ID)).resolves.toMatchObject({
      batch_id: BATCH_ID,
      total_offset_days: 1,
    });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain(`/plans/${PLAN_ID}/shift`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    expect(requestHeaders(init).authorization).toBe('Bearer access-token');
  });

  test('POSTs strict snake_case set-log body and parses its two-field response', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(201, { id: SET_ID, logged_at: NOW }),
    );

    await expect(
      setsRepository.upsert({
        plan_exercise_id: PLAN_EXERCISE_ID,
        logged_date: '2026-07-19',
        set_index: 0,
        weight_kg: '120.00',
        reps: 5,
        rpe: '8.5',
        completed: true,
      }),
    ).resolves.toEqual({ id: SET_ID, logged_at: NOW });

    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/sets/log');
    expect(init?.method).toBe('POST');
    expect(requestBody(init)).toEqual({
      plan_exercise_id: PLAN_EXERCISE_ID,
      logged_date: '2026-07-19',
      set_index: 0,
      weight_kg: '120.00',
      reps: 5,
      rpe: '8.5',
      completed: true,
      failed: false,
    });
  });

  test('GETs the dashboard e1RM range without overriding the plan scope default', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(mockResponse(200, { logs: [] }));

    await expect(
      setsRepository.range(STUDENT_ID, {
        from: '1970-01-01',
        to: '2026-07-19',
      }),
    ).resolves.toEqual({ logs: [] });

    const [url] = jest.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('from')).toBe('1970-01-01');
    expect(parsed.searchParams.get('to')).toBe('2026-07-19');
    expect(parsed.searchParams.has('scope')).toBe(false);
  });

  test('maps onboarding 404 to the null query empty state', async () => {
    jest.mocked(fetch).mockResolvedValueOnce(
      mockResponse(404, { error: 'ONBOARDING_NOT_FOUND' }),
    );

    await expect(onboardingRepository.get(STUDENT_ID)).resolves.toBeNull();
  });
});
