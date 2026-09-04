import { expect, test } from '@jest/globals';
import { isValidEmail, isValidPassword, isValidResetCode } from '../validation';
test.each([
  ['a@b', false], ['a@b.co', true], [' a@b.co ', true], ['a@@b.co', false],
  ['@b.co', false], ['a@.co', false], ['a@b..co', false], ['a@b.', false],
  ['a b@c.co', false], [`${'a'.repeat(316)}@b.co`, false],
])('email %s is valid: %s', (value, valid) => { expect(isValidEmail(value)).toBe(valid); });
test.each([
  ['12345678', true], ['1234567', false], ['a'.repeat(72), true], ['a'.repeat(73), false],
  ['界'.repeat(24), true], ['界'.repeat(24) + 'a', false], ['😀'.repeat(18), true], ['😀'.repeat(18) + 'a', false],
])('password boundary %#', (value, valid) => { expect(isValidPassword(value)).toBe(valid); });
test.each([['123456', true], ['12345', false], ['1234567', false], ['１２３４５６', false], ['12345a', false], ['12345\n', false]])('reset code %s', (value, valid) => { expect(isValidResetCode(value)).toBe(valid); });
