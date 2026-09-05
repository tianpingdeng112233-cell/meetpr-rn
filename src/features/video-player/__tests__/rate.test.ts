import { expect, test } from '@jest/globals';
import { cycleRate, rateText, workbenchRateText } from '../rate';

test('speed cycles through four session rates and wraps; unknown rates start at index 1', () => {
  expect([0.5, 1, 1.5, 2, 3].map(cycleRate)).toEqual([1, 1.5, 2, 0.5, 1.5]);
  expect([0.5, 1, 1.5, 2, 3].map(rateText)).toEqual(['0.5x', '1x', '1.5x', '2x', '1x']);
  expect([0.5, 1, 1.5, 2, 3].map(workbenchRateText)).toEqual(['0.5×', '1×', '1.5×', '2×', '1×']);
});
