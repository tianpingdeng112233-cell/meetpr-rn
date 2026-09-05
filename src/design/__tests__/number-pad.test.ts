import { expect, test } from '@jest/globals';
import { append, snapped } from '../number-pad';

test('limits decimal entry and digit counts while replacing a leading zero', () => {
  expect(append('', '.', 'weight')).toBe('');
  expect(append('1', '.', 'reps')).toBe('1');
  expect(append('1', '.', 'weight')).toBe('1.');
  expect(append('1.2', '.', 'weight')).toBe('1.2');
  expect(append('1234', '.', 'weight')).toBe('1234.');
  expect(append('12345', '.', 'weight')).toBe('12345');
  expect(append('1234.', '5', 'weight')).toBe('1234.5');
  expect(append('1234.5', '6', 'weight')).toBe('1234.5');
  expect(append('123', '4', 'reps')).toBe('123');
  expect(append('0', '7', 'weight')).toBe('7');
  expect(append('0', '0', 'reps')).toBe('0');
  expect(append('0.', '5', 'weight')).toBe('0.5');
});


test('confirmation snaps weights to quarters and clamps each field', () => {
  expect(snapped(175.3, 'weight', 20)).toBe(175.25);
  expect(snapped(10, 'weight', 20)).toBe(20);
  expect(snapped(10, 'weight', 0)).toBe(10);
  expect(snapped(600, 'weight')).toBe(500);
  expect(snapped(0, 'reps')).toBe(1);
  expect(snapped(150, 'reps')).toBe(100);
  expect(snapped(6.5, 'reps')).toBe(7);
});
