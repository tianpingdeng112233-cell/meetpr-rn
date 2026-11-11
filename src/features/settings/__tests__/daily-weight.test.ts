import { expect, jest, test } from '@jest/globals';
import { readDailyWeight, writeDailyWeight } from '../daily-weight';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
test('daily weight defaults off and persists separately per account', async () => {
  expect(await readDailyWeight('first')).toBe(false);
  await writeDailyWeight('first', true);
  expect(await readDailyWeight('first')).toBe(true);
  expect(await readDailyWeight('second')).toBe(false);
  await writeDailyWeight('first', false);
  expect(await readDailyWeight('first')).toBe(false);
});
