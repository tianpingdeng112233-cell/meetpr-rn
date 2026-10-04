import { expect, test } from '@jest/globals';
import { trimSecondsAtTouch, playheadSecondsAtTouch, trimTimeText } from '../trim-gesture';

test('absolute touch position keeps the grab offset without accumulating move events', () => {
  const drag = { touchStartPageX: 250, handleStartSeconds: 2, secondsPerPoint: 8 / 880 };
  expect(trimSecondsAtTouch(250, drag)).toBe(2);
  expect(trimSecondsAtTouch(470, drag)).toBe(4);
  expect(trimSecondsAtTouch(360, drag)).toBe(3);
  expect(trimSecondsAtTouch(140, drag)).toBe(1);
});

test('playhead touch covers the whole source and clamps at both ends', () => {
  const drag = { touchStartPageX: 100, handleStartSeconds: 0, secondsPerPoint: 8 / 400 };
  expect(playheadSecondsAtTouch(300, drag, 8)).toBe(4);
  expect(playheadSecondsAtTouch(50, drag, 8)).toBe(0);
  expect(playheadSecondsAtTouch(600, drag, 8)).toBe(8);
});

test.each([[0, '00:00.00'], [6.114, '00:06.11'], [75.5, '01:15.50']])('time bubble formats %s as %s', (seconds, expected) => {
  expect(trimTimeText(seconds)).toBe(expected);
});
