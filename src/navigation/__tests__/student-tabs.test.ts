import { expect, test } from '@jest/globals';
import { studentTabs } from '../student-tabs';

test('training is first and coach is second only for coached students', () => {
  expect(studentTabs('coached_student')).toEqual(['training', 'chat', 'growth', 'profile']);
  expect(studentTabs('self_train_student')).toEqual(['training', 'growth', 'profile']);
});
