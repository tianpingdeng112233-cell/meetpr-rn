import { afterEach, beforeEach, expect, test } from '@jest/globals';
import { setLocaleOverride } from '@/i18n';
import { coachNoteParagraphs } from '../coach-notes';

beforeEach(() => setLocaleOverride('en'));
afterEach(() => setLocaleOverride(null));

test('only a set note produces the primary this-set paragraph', () => {
  expect(coachNoteParagraphs('  Stop at RPE 8.  ', null, 'Squat')).toEqual([
    { title: 'Coach note · this set', body: 'Stop at RPE 8.', isPrimary: true },
  ]);
});

test('only an exercise note is primary and includes its display name', () => {
  expect(coachNoteParagraphs(' \n ', ' Pause on the chest. ', 'Bench press')).toEqual([
    { title: 'Coach note · Bench press', body: 'Pause on the chest.', isPrimary: true },
  ]);
});

test('both notes keep the set first and the exercise secondary, including identical copy', () => {
  expect(coachNoteParagraphs('Pause.', 'Pause.', 'Squat')).toEqual([
    { title: 'Coach note · this set', body: 'Pause.', isPrimary: true },
    { title: 'Coach note · Squat', body: 'Pause.', isPrimary: false },
  ]);
});

test.each([[null, null], [undefined, undefined], ['', ''], [' \n\t ', '  ']])('missing or whitespace-only notes produce no block (%p, %p)', (setNote, exerciseNote) => {
  expect(coachNoteParagraphs(setNote, exerciseNote, 'Squat')).toEqual([]);
});

test('Chinese titles use the display name and keep the complete long note when the active set changes', () => {
  setLocaleOverride('zh');
  const longNote = 'Keep the movement controlled. '.repeat(8);
  expect(coachNoteParagraphs('First set.', longNote, '深蹲')).toEqual([
    { title: '教练备注 · 本组', body: 'First set.', isPrimary: true },
    { title: '教练备注 · 深蹲', body: longNote.trim(), isPrimary: false },
  ]);
  expect(coachNoteParagraphs('Next set.', longNote, '深蹲')).toEqual([
    { title: '教练备注 · 本组', body: 'Next set.', isPrimary: true },
    { title: '教练备注 · 深蹲', body: longNote.trim(), isPrimary: false },
  ]);
});
