import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readEffortChoices, writeEffortChoice } from '../effort-preferences';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
beforeEach(async () => { await AsyncStorage.clear(); });

test('remembered types survive reload, isolate accounts and variations, and keep the latest choice', async () => {
  await writeEffortChoice('student-a', 'squat', 'rir');
  await writeEffortChoice('student-a', 'bench', 'rpe');
  expect(await readEffortChoices('student-a', ['squat', 'bench', 'pause-squat'])).toEqual({ squat: 'rir', bench: 'rpe' });
  expect(await readEffortChoices('student-b', ['squat'])).toEqual({});
  await writeEffortChoice('student-a', 'squat', 'rpe');
  expect(await readEffortChoices('student-a', ['squat'])).toEqual({ squat: 'rpe' });
});
