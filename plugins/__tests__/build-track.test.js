import { describe, expect, test } from '@jest/globals';
import { getAndroidBuildConfig } from '../build-track';

describe('Android build track', () => {
  test.each([
    ['china', 'com.meetpr.app', 3],
    ['global', 'com.meetpr.global', 1],
    [undefined, 'com.meetpr.global', 1],
    ['unexpected', 'com.meetpr.global', 1],
  ])('%s selects its own package and distribution versionCode', (track, packageName, versionCode) => {
    expect(getAndroidBuildConfig(track)).toEqual({ package: packageName, versionCode });
  });
});
