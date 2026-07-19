import { expect, test } from '@jest/globals';

import { buildStepSparklinePath } from '../Sparkline';

test('record sparkline holds each plateau then jumps at the next record', () => {
  const geometry = buildStepSparklinePath([
    { x: 0, y: 100 },
    { x: 10, y: 110 },
    { x: 30, y: 120 },
  ]);

  expect(geometry.points).toHaveLength(3);
  expect(geometry.d).toMatch(/^M /);
  expect(geometry.d.match(/H /g)).toHaveLength(2);
  expect(geometry.d.match(/V /g)).toHaveLength(2);
});
