import { expect, test } from '@jest/globals';
import { trimSecondsAtTouch } from '../trim-gesture';

test('absolute touch position keeps the grab offset without accumulating move events', () => {
  const drag = { touchStartPageX: 250, handleStartSeconds: 2, secondsPerPoint: 8 / 880 };
  expect(trimSecondsAtTouch(250, drag)).toBe(2);
  expect(trimSecondsAtTouch(470, drag)).toBe(4);
  expect(trimSecondsAtTouch(360, drag)).toBe(3);
  expect(trimSecondsAtTouch(140, drag)).toBe(1);
});
