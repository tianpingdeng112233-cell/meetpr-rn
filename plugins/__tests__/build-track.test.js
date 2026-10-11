import { describe, expect, test } from '@jest/globals';
import { getAndroidBuildConfig } from '../build-track';

describe('Android build track', () => {
  test.each([
    ['china', 'com.meetpr.app'],
    ['global', 'com.meetpr.global'],
    [undefined, 'com.meetpr.global'],
    ['unexpected', 'com.meetpr.global'],
  ])('%s selects its package and the first distribution versionCode', (track, packageName) => {
    expect(getAndroidBuildConfig(track)).toEqual({ package: packageName, versionCode: 1 });
  });
});
