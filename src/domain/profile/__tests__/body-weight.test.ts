import { expect, test } from '@jest/globals';

import { bodyWeightInput, bodyWeightInputFromKg, bodyWeightKgFromInput, formatBodyWeightKg } from '../body-weight';

test.each([
  ['83.256', '83.25'], ['8a3..2', '83.2'], ['83.2.56', '83.25'],
  ['83', '83'], ['83.', '83.'], ['.25', '.25'], ['', ''], ['abc', ''],
])('filters body weight input %j to %j', (text, expected) => {
  expect(bodyWeightInput(text)).toBe(expected);
});

test.each<[string, 'kg' | 'lb', string]>([
  ['83', 'kg', '83.00'], ['83.', 'kg', '83.00'], ['83.25', 'kg', '83.25'],
  ['83.50', 'kg', '83.50'], ['.25', 'kg', '0.25'], ['183.25', 'lb', '83.12'],
  ['183.26', 'lb', '83.13'], ['0', 'kg', ''], ['', 'kg', ''], ['500', 'kg', ''],
  ['0', 'lb', ''], ['', 'lb', ''], ['1102.32', 'lb', ''], ['1102.31', 'lb', ''],
  ['0.01', 'lb', ''], ['499.99', 'kg', '499.99'], ['-1', 'kg', ''],
  ['Infinity', 'kg', ''], ['NaN', 'lb', ''], ['abc', 'kg', ''], [' ', 'kg', ''],
  ['0x53', 'kg', ''], ['8e1', 'kg', ''],
])('converts %j %s into storable kg %j', (text, unit, expected) => {
  expect(bodyWeightKgFromInput(text, unit)).toBe(expected);
});

test.each<[string | null | undefined, 'kg' | 'lb', string]>([
  ['83.00', 'kg', '83'], ['83.50', 'kg', '83.5'], ['83.25', 'kg', '83.25'],
  ['83.12', 'lb', '183.25'], ['83.13', 'lb', '183.27'], ['50', 'lb', '110.23'],
  [null, 'kg', ''], [undefined, 'lb', ''], ['', 'kg', ''], ['abc', 'lb', ''],
  ['0', 'kg', ''], ['-1', 'lb', ''], ['500', 'kg', ''], ['Infinity', 'lb', ''],
])('reads stored %j kg as %s input %j', (kg, unit, expected) => {
  expect(bodyWeightInputFromKg(kg, unit)).toBe(expected);
});

test.each([
  ['183.25', '83.12', '183.25'],
  ['183.26', '83.13', '183.27'],
])('keeps stored kg stable when %s lb is read back and saved', (lb, kg, readBack) => {
  const stored = bodyWeightKgFromInput(lb, 'lb');
  expect(stored).toBe(kg);
  const input = bodyWeightInputFromKg(stored, 'lb');
  expect(input).toBe(readBack);
  expect(bodyWeightKgFromInput(input, 'lb')).toBe(stored);
});

test.each([
  [83, '83.00'], [83.5, '83.50'], [83.256, '83.26'],
  ['83', '83.00'], ['83.5', '83.50'], ['83.256', '83.26'],
])('formats body weight %j as %s', (value, expected) => {
  expect(formatBodyWeightKg(value)).toBe(expected);
});
