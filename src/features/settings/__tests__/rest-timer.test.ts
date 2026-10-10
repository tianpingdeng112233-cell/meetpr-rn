import AsyncStorage from '@react-native-async-storage/async-storage';
import { readRestPreference, writeRestPreference } from '../storage';
import { expect, test, jest } from '@jest/globals';
import { accessoryRestSeconds, ACCESSORY_REST_DEFAULT, clampRestSeconds, restSecondsForRPE } from '../rest-timer';
const custom = { mode: 'custom', low: 90, mid: 195, high: 300 } as const;
test.each([[6.5,90], [7,195], [8.5,195], [9,300], [10,300], [null,195]])('custom RPE %s yields %s seconds', (rpe, seconds) => {
  expect(restSecondsForRPE(custom, rpe)).toBe(seconds);
});
test.each([[null,180], [6,120], [7,180], [9,240]])('automatic RPE %s uses the v1 default table', (rpe, seconds) => {
  expect(restSecondsForRPE({ mode: 'automatic' }, rpe)).toBe(seconds);
});
test.each([[0,30], [601,600], [127,120], [128,135], [NaN,180]])('duration %s clamps and snaps to %s', (input, expected) => {
  expect(clampRestSeconds(input)).toBe(expected);
});


test.each<[number | undefined, number]>([
  [undefined, 60], [NaN, 60], [Infinity, 60], [-Infinity, 60],
  [-1, 30], [30, 30], [300, 300], [600, 300], [67, 60], [68, 75],
])('accessory preference %s defaults, clamps and snaps to %s independently of mode', (accessory, expected) => {
  expect(ACCESSORY_REST_DEFAULT).toBe(60);
  expect(accessoryRestSeconds({ mode: 'automatic', accessory })).toBe(expected);
  expect(accessoryRestSeconds({ ...custom, accessory })).toBe(expected);
  expect(restSecondsForRPE({ ...custom, accessory }, 9)).toBe(300);
  expect(restSecondsForRPE({ mode: 'automatic', accessory }, 9)).toBe(240);
});


jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

test('rest storage round-trips accessory for both modes and preserves legacy fields without migration', async () => {
  for (const preference of [{ mode: 'automatic' as const }, custom]) {
    await writeRestPreference('fixture', { ...preference, accessory: 90 });
    expect(await readRestPreference('fixture')).toEqual({ ...preference, accessory: 90 });
    await writeRestPreference('fixture', preference);
    const saved = await readRestPreference('fixture');
    expect(saved).toEqual(preference);
    expect(accessoryRestSeconds(saved)).toBe(60);
  }
  await AsyncStorage.setItem('meetpr.rest-timer.v2.fixture', JSON.stringify({ ...custom, accessory: null }));
  const malformed = await readRestPreference('fixture');
  expect(malformed).toMatchObject(custom);
  expect(accessoryRestSeconds(malformed)).toBe(60);
  await AsyncStorage.removeItem('meetpr.rest-timer.v2.fixture');
  await AsyncStorage.setItem('restTimer.preference.fixture', '150');
  expect(await readRestPreference('fixture')).toEqual({ mode: 'custom', low: 150, mid: 150, high: 150 });
  await AsyncStorage.clear();
});
