import { afterEach, expect, jest, test } from '@jest/globals';
const original = process.env.EXPO_PUBLIC_BUILD_TRACK;
afterEach(() => { if (original === undefined) delete process.env.EXPO_PUBLIC_BUILD_TRACK; else process.env.EXPO_PUBLIC_BUILD_TRACK = original; jest.resetModules(); });
test.each([[undefined, 'global', 'https://api.meetpr.app'], ['china', 'china', 'http://121.40.160.241:3000']])('track %s', (env, track, url) => {
  if (env === undefined) delete process.env.EXPO_PUBLIC_BUILD_TRACK; else process.env.EXPO_PUBLIC_BUILD_TRACK = env;
  jest.resetModules();
  const config = jest.requireActual<typeof import('../build-track')>('../build-track');
  expect(config.BUILD_TRACK).toBe(track);
  expect(config.DEFAULT_API_BASE_URL).toBe(url);
});
