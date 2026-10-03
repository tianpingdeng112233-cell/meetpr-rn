import { expect, test } from '@jest/globals';
import { clampRestSeconds, restSecondsForRPE } from '../rest-timer';
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
