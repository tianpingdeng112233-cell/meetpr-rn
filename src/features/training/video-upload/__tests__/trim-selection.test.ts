import { expect, test } from '@jest/globals';
import { createTrimSelection, isTrimSelectionValid, moveTrimStart, moveTrimEnd } from '../trim-selection';

test('initial range keeps an 8 second clip and caps a long source at 120 seconds', () => {
  expect(createTrimSelection(8, 120)).toMatchObject({ startSeconds: 0, endSeconds: 8 });
  expect(createTrimSelection(180, 120)).toMatchObject({ startSeconds: 0, endSeconds: 120 });
});

test.each([0, NaN, Infinity, -1])('invalid source duration %s cannot be saved', duration => {
  const selection = createTrimSelection(duration, 120);
  expect(selection).toMatchObject({ sourceDurationSeconds: 0, startSeconds: 0, endSeconds: 0 });
  expect(isTrimSelectionValid(selection)).toBe(false);
  expect(moveTrimStart(selection, 5)).toEqual(selection);
  expect(moveTrimEnd(selection, 5)).toEqual(selection);
});

test('a source shorter than 0.1 seconds remains a valid whole clip like iOS', () => {
  const selection = moveTrimEnd(createTrimSelection(0.05, 120), 0);
  expect(selection).toMatchObject({ startSeconds: 0, endSeconds: 0.05 });
  expect(isTrimSelectionValid(selection)).toBe(true);
});

test('either handle pushes the opposite edge to keep the 120 second maximum', () => {
  const endMoved = moveTrimEnd(createTrimSelection(300, 120), 300);
  expect(endMoved).toMatchObject({ startSeconds: 180, endSeconds: 300 });
  expect(moveTrimStart(endMoved, 100)).toMatchObject({ startSeconds: 100, endSeconds: 220 });
});

test('dragging the end before the start pushes the start and clamps to the source', () => {
  const atTail = moveTrimStart(createTrimSelection(30, 120), 100);
  expect(atTail).toMatchObject({ startSeconds: 29.9, endSeconds: 30 });
  const result = moveTrimEnd(atTail, -100);
  expect(result.startSeconds).toBe(0);
  expect(result.endSeconds).toBeCloseTo(0.1);
});

test('dragging the start past the end pushes the end and preserves the 0.1 second minimum', () => {
  const result = moveTrimStart(createTrimSelection(300, 120), 200);
  expect(result.startSeconds).toBe(200);
  expect(result.endSeconds).toBe(200.1);
});
