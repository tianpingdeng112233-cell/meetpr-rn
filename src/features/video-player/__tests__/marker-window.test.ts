import { expect, test } from '@jest/globals';
import { markerAtTime } from '../marker-window';

const first = { id: 'a', timeMs: 1000, note: 'First' };
const next = { id: 'b', timeMs: 2500, note: 'Next' };

test('opens at the marker and closes at exactly 2400 ms', () => {
  expect(markerAtTime([first], 999)).toBeNull();
  expect(markerAtTime([first], 1000)).toBe(first);
  expect(markerAtTime([first], 3399)).toBe(first);
  expect(markerAtTime([first], 3400)).toBeNull();
});
test('the newest overlapping marker wins regardless of wire order', () => {
  expect(markerAtTime([next, first], 2499)).toBe(first);
  expect(markerAtTime([next, first], 2500)).toBe(next);
});
test('a paused playback clock keeps the same cue and an empty list has none', () => {
  expect(markerAtTime([], 2000)).toBeNull();
  for (let poll = 0; poll < 3; poll++) expect(markerAtTime([first], 2000)).toBe(first);
});
