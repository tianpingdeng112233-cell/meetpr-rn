import { expect, test } from '@jest/globals';
import { append, appendAccessory, accessoryValue, snapped } from '../number-pad';

test('accessory entry preserves light weights and validates each field without barbell snapping', () => {
  expect(accessoryValue('0', 'weight')).toBe(0);
  expect(accessoryValue('7.5', 'weight')).toBe(7.5);
  expect(accessoryValue('7.3', 'weight')).toBe(7.3);
  expect(accessoryValue('1000', 'weight')).toBe(1000);
  expect(appendAccessory('7.5', '2', 'weight')).toBe('7.5');
  expect(accessoryValue('9.5', 'rpe')).toBe(9.5);
  expect(accessoryValue('10.5', 'rpe')).toBeUndefined();
  expect(accessoryValue('8.2', 'rpe')).toBeUndefined();
  expect(accessoryValue('4.5', 'rpe')).toBeUndefined();
  expect(accessoryValue('0', 'rir')).toBe(0);
  expect(accessoryValue('9', 'rir')).toBe(9);
  expect(appendAccessory('2', '.', 'rir')).toBe('2');
  expect(accessoryValue('2.5', 'rir')).toBeUndefined();
  expect(accessoryValue('1', 'reps')).toBe(1);
  expect(accessoryValue('99', 'reps')).toBe(99);
  expect(accessoryValue('100', 'reps')).toBeUndefined();
  expect(accessoryValue('0', 'reps')).toBeUndefined();
  expect(accessoryValue('101', 'reps')).toBeUndefined();
  expect(accessoryValue('', 'rpe')).toBeNull();
});

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

test('RPE input snaps half steps and stays inside the approved scale', () => {
  expect(snapped(8.2, 'rpe')).toBe(8);
  expect(snapped(8.3, 'rpe')).toBe(8.5);
  expect(snapped(1, 'rpe')).toBe(5);
  expect(snapped(12, 'rpe')).toBe(10);
  expect(append('8', '.', 'rpe')).toBe('8.');
  expect(append('8.5', '5', 'rpe')).toBe('8.5');
});
