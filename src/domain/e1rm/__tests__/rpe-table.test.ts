import { test, expect } from '@jest/globals';
import { rpeTable } from '../rpe-table';
test('265 kg e1RM produces the canonical 12 by 9 table with 1 @8 = 242.5', () => {
  const table = rpeTable(265, 'kg');
  expect(table).toHaveLength(12); expect(table.every(row => row.length === 9)).toBe(true);
  expect(table[0][4]).toBe('242.5'); expect(table[11][8]).toBe('150');
});
test('missing e1RM uses percentages, including 1 @10 = 100%', () => {
  expect(rpeTable(null, 'kg')[0][0]).toBe('100%');
  expect(rpeTable(null, 'lb')[4][0]).toBe('86.3%');
});
test('lb converts the unrounded load then floors to 5 lb', () => {
  expect(rpeTable(265, 'lb')[0][4]).toBe('535');
  expect(rpeTable(265, 'lb')[0][0]).toBe('580');
});
