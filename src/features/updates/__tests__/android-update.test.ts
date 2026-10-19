import { afterEach, expect, jest, test } from '@jest/globals';
import { checkForAndroidUpdate } from '../android-update';

const installed = { platform: 'android', track: 'china', applicationId: 'com.meetpr.app', buildVersion: '2' };
const release = { schemaVersion: 1, packageName: 'com.meetpr.app', versionCode: 10, versionName: '0.1.1', releaseNotes: '改进教练邀请流程', downloadUrl: 'https://dl.meetpr.cn/android/releases/10/meetpr-cn.apk' };
const response = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

test('a newer native build is offered even when numeric build codes have different lengths', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(release));
  await expect(checkForAndroidUpdate(installed)).resolves.toEqual(release);
});

test.each([2, 1])('build %s is not offered to an equal or newer installed build', async (versionCode) => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response({ ...release, versionCode, downloadUrl: `https://dl.meetpr.cn/android/releases/${versionCode}/meetpr-cn.apk` }));
  await expect(checkForAndroidUpdate(installed)).resolves.toBeNull();
});

test.each([
  { ...installed, track: 'global' },
  { ...installed, platform: 'ios' },
  { ...installed, applicationId: 'com.meetpr.global' },
  { ...installed, buildVersion: null },
  { ...installed, buildVersion: 'not-a-build' },
])('unsupported installed app does not contact the release host: %j', async (app) => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(release));
  await expect(checkForAndroidUpdate(app)).resolves.toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([
  { ...release, packageName: 'com.meetpr.global' },
  { ...release, schemaVersion: 2 },
  { ...release, versionCode: '10' },
  { ...release, releaseNotes: '' },
  { ...release, releaseNotes: 'x'.repeat(1201) },
  { ...release, downloadUrl: 'http://dl.meetpr.cn/android/releases/10/meetpr-cn.apk' },
  { ...release, downloadUrl: 'https://evil.example/meetpr.apk' },
  { ...release, downloadUrl: 'https://dl.meetpr.cn@evil.example/meetpr.apk' },
  { ...release, downloadUrl: 'https://dl.meetpr.cn/android/releases/9/meetpr-cn.apk' },
])('invalid or incompatible release metadata is ignored: %j', async (metadata) => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(response(metadata));
  await expect(checkForAndroidUpdate(installed)).resolves.toBeNull();
});

test.each(['network', 'http', 'json'])('%s failure leaves startup usable without an update prompt', async (failure) => {
  global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => {
    if (failure === 'network') throw new Error('offline');
    return { ok: failure !== 'http', json: async () => { if (failure === 'json') throw new Error('bad JSON'); return release; } } as Response;
  });
  await expect(checkForAndroidUpdate(installed)).resolves.toBeNull();
});

test('a stalled request times out and cannot offer an update after the deadline', async () => {
  jest.useFakeTimers();
  let respond!: (value: Response) => void;
  global.fetch = jest.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { respond = resolve; }));
  const result = checkForAndroidUpdate(installed);
  await jest.advanceTimersByTimeAsync(8000);
  await expect(result).resolves.toBeNull();
  respond(response(release));
});

test('an aborted startup does not offer an update even if the response arrives later', async () => {
  const controller = new AbortController();
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => { controller.abort(); return release; } } as Response);
  await expect(checkForAndroidUpdate(installed, controller.signal)).resolves.toBeNull();
});
