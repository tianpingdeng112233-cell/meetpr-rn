import { expect, test } from '@jest/globals';
import { rewardTiming, rollUpFrames, sparkGeometry } from '../training-reward-spec';

test('reward timing and roll-up frames match the approved native reward line', () => {
  expect(rewardTiming).toMatchObject({ bloom: 750, stamp: 520, spark: 800, stagger: 18, roll: 620, shimmer: 4500 });
  expect(rollUpFrames.progress).toEqual([0, 0.3, 0.62, 1]);
  expect(rollUpFrames.rotation).toEqual(['0deg', '-26deg', '-52deg', '-78deg']);
  expect(rollUpFrames.scale).toEqual([1, 0.82, 0.48, 0.06]);
});
test('the 18 sparks follow the source radius, size and stagger pattern', () => {
  expect(sparkGeometry(0)).toEqual({ angle: 0, radius: 66, size: 3, delay: 0 });
  expect(sparkGeometry(17)).toMatchObject({ radius: 90, size: 5, delay: 90 });
});
