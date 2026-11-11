import * as SecureStore from 'expo-secure-store';
import { beforeEach, expect, jest, test } from '@jest/globals';
import { resetSessionForTests } from '../../session';
import { bodyWeightsRepository } from '../body-weights';

jest.mock('expo-secure-store');
const response = (status: number, body: unknown) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) }) as Response;
beforeEach(() => {
  resetSessionForTests();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => key === 'accessToken' ? 'access-token' : null);
  globalThis.fetch = jest.fn() as unknown as typeof fetch;
});

test('reads dated decimal records through the authenticated API and rejects malformed wire data', async () => {
  const records = [{ recorded_on: '2026-10-09', weight_kg: '83.00' }];
  jest.mocked(fetch).mockResolvedValueOnce(response(200, { records }));
  await expect(bodyWeightsRepository.list()).resolves.toEqual({ records });
  expect(jest.mocked(fetch).mock.calls[0][0]).toEqual(expect.stringContaining('/students/me/body-weights'));
  for (const record of [
    { recorded_on: '2026-02-30', weight_kg: '83.00' },
    { recorded_on: '2026-10-09', weight_kg: 83 },
    { recorded_on: '2026-10-09', weight_kg: '83.001' },
    { recorded_on: '2026-10-09', weight_kg: '500.00' },
  ]) {
    jest.mocked(fetch).mockResolvedValueOnce(response(200, { records: [record] }));
    await expect(bodyWeightsRepository.list()).rejects.toThrow();
  }
});

test('saves today at local midnight rather than the training-day boundary, preserving the server current value', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 8, 1, 30));
  try {
    const result = { record: { recorded_on: '2026-11-08', weight_kg: '83.25' }, current_weight_kg: '84.00' };
    jest.mocked(fetch).mockResolvedValueOnce(response(200, result));
    await expect(bodyWeightsRepository.saveToday('83.25')).resolves.toEqual(result);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/students/me/body-weights/2026-11-08'));
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ weight_kg: '83.25' });
  } finally { jest.useRealTimers(); }
});

const profile = {
  user_id: '10000000-0000-4000-8000-000000000000', unit_preference: 'kg', gender: null,
  birth_date: null, height_cm: null, weight_kg: '83.25', training_years: null,
  squat_stance: null, deadlift_style: null, bench_grip: null,
  squat_1rm_kg: null, bench_1rm_kg: null, deadlift_1rm_kg: null,
  training_days: null, gym_tier: null, equipment_overrides: null,
  daily_life_intensity: null, life_stress: null, recovery_speed: null, sleep_hours: null,
  muscle_groups_to_strengthen: null, injury_notes: null, injury_areas: null,
  is_competing: null, competition_date: null, target_weight_class: null, note_to_coach: null,
  completed_at: null, created_at: '2026-10-09T00:00:00Z', updated_at: '2026-10-09T00:00:00Z', upload_attachment_ids: [],
};
test('only a missing write endpoint falls back to the original profile save', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(response(404, { error: 'NOT_FOUND' })).mockResolvedValueOnce(response(200, profile));
  await expect(bodyWeightsRepository.saveToday('83.25')).resolves.toMatchObject({ current_weight_kg: '83.25', record: null });
  const [url, init] = jest.mocked(fetch).mock.calls[1];
  expect(url).toEqual(expect.stringContaining('/students/me/onboarding'));
  expect(init?.method).toBe('PUT');
  expect(JSON.parse(init?.body as string)).toEqual({ weight_kg: '83.25' });
  for (const status of [400, 403, 500]) {
    jest.mocked(fetch).mockClear().mockResolvedValueOnce(response(status, { error: 'BODY_WEIGHT_DATE_OUT_OF_RANGE' }));
    await expect(bodyWeightsRepository.saveToday('83.25')).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});

test('delete returns the remaining current weight, including null after the last record; never falls back on 404', async () => {
  for (const current of ['82.00', null]) {
    jest.mocked(fetch).mockResolvedValueOnce(response(200, { current_weight_kg: current }));
    await expect(bodyWeightsRepository.remove('2026-10-09')).resolves.toEqual({ current_weight_kg: current });
    const [url, init] = jest.mocked(fetch).mock.calls.at(-1)!;
    expect(url).toEqual(expect.stringContaining('/students/me/body-weights/2026-10-09'));
    expect(init?.method).toBe('DELETE');
  }
  jest.mocked(fetch).mockClear().mockResolvedValueOnce(response(404, { error: 'BODY_WEIGHT_NOT_FOUND' }));
  await expect(bodyWeightsRepository.remove('2026-10-09')).rejects.toMatchObject({ status: 404, code: 'BODY_WEIGHT_NOT_FOUND' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
