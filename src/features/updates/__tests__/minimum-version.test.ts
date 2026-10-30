import { afterEach, expect, jest, test } from '@jest/globals';
import { API_BASE_URL } from '@/api/client';
import { checkMinimumAndroidVersion } from '../minimum-version';

const originalFetch = global.fetch;
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test.each([[0, null], [9, null], [10, null], [11, 11], [100, 100]])('min_build %s is compared numerically with installed versionCode 10', async (min_build, expected) => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response({ min_build }));
  expect(await checkMinimumAndroidVersion('10')).toBe(expected);
  expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/app/min-version?platform=android`, expect.objectContaining({ method: 'GET' }));
});

test.each(['network', 'http', 'json', 'invalid'] as const)('%s failure never blocks', async failure => {
  global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => {
    if (failure === 'network') throw Error('Offline');
    if (failure === 'json') return { ok: true, json: async () => { throw Error('Invalid JSON'); } } as unknown as Response;
    return response({ min_build: failure === 'invalid' ? '100' : 100 }, failure !== 'http');
  });
  expect(await checkMinimumAndroidVersion('10')).toBeNull();
});

test('a hung transport releases startup at 8s and ignores late results', async () => {
  jest.useFakeTimers();
  let respond!: (value: Response) => void;
  global.fetch = jest.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { respond = resolve; }));
  const check = checkMinimumAndroidVersion('10');
  await jest.advanceTimersByTimeAsync(8000);
  expect(await check).toBeNull();
  respond(response({ min_build: 100 }));
});

test.each([null, '', '1.2', 'invalid'])('unknown native build %s fails open', async build => {
  global.fetch = jest.fn<typeof fetch>();
  expect(await checkMinimumAndroidVersion(build)).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});
