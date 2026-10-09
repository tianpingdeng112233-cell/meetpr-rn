import { expect, test } from '@jest/globals';
import { workoutCoachNotes } from '../coach-notes';

test('the exercise note is independent of the set note', () => {
  expect(workoutCoachNotes('Bodyweight', ' Pause on the chest. ')).toMatchObject({
    exerciseNote: 'Pause on the chest.',
  });
  expect(workoutCoachNotes('Bodyweight', null)).toMatchObject({ exerciseNote: null });
  expect(workoutCoachNotes(null, ' \n\t ')).toMatchObject({ exerciseNote: null });
});

test.each([
  [' Bodyweight ', 'Pause.', { exerciseNote: 'Pause.', setNote: 'Bodyweight' }],
  ['Bodyweight', null, { exerciseNote: null, setNote: 'Bodyweight' }],
  [null, 'Pause.', { exerciseNote: 'Pause.', setNote: null }],
  [' \n\t ', 'Pause.', { exerciseNote: 'Pause.', setNote: null }],
  [null, null, { exerciseNote: null, setNote: null }],
  [undefined, undefined, { exerciseNote: null, setNote: null }],
  ['', '', { exerciseNote: null, setNote: null }],
  [' \n\t ', '  ', { exerciseNote: null, setNote: null }],
  ['Pause.', 'Pause.', { exerciseNote: 'Pause.', setNote: 'Pause.' }],
])('set notes never fall back to exercise notes (%p, %p)', (setNote, exerciseNote, expected) => {
  expect(workoutCoachNotes(setNote, exerciseNote)).toEqual(expected);
});
