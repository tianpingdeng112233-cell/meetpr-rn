import { afterEach, expect, test } from '@jest/globals';
import type { ChatSetRef } from '@/api/domains/chat';
import { setLocaleOverride } from '@/i18n';
import { buildCandidates, SetRefPickerPresentation, canonicalFirstLine, canonicalBody, displayFirstLine, normalizeSetRef, setRefBodyAllowed, ChatSetCardPresentation } from '../set-ref';
import { day, set } from '@/domain/plan/test-fixtures';
import type { SetLog } from '@/api/domains/sets';
import { synthesizeDrafts } from '@/features/training/drafts';
import { EMPTY_VIDEO_UPLOAD } from '@/features/training/video-upload/model';

const id = '10000000-0000-4000-8000-000000000000';
const logged: ChatSetRef = { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '100', reps: 5, rpe: '8', dayDate: '2026-09-05', setLogId: id };
afterEach(() => setLocaleOverride(null));
test('canonical wire lines match the frozen iOS Chinese literals', () => {
  expect(canonicalFirstLine(logged)).toBe('[训练分享] Squat 第2组/3 100kg×5 @RPE8 (2026-09-05)');
  expect(canonicalFirstLine({ ...logged, source: 'planned', repsMax: 8 })).toBe('[训练计划] Squat 第2组/3 计划 100kg×5-8 @RPE8 (2026-09-05)');
  expect(canonicalFirstLine({ ...logged, weightKg: null, rpe: null, setTotal: null })).toBe('[训练分享] Squat 第2组 -kg×5 (2026-09-05)');
});

test('body preserves the optional note and display uses the active locale', () => {
  expect(canonicalBody(logged, '')).toBe(canonicalFirstLine(logged));
  expect(canonicalBody(logged, '  Why?\nNext')).toBe('[训练分享] Squat 第2组/3 100kg×5 @RPE8 (2026-09-05)\n  Why?\nNext');
  setLocaleOverride('en');
  expect(displayFirstLine(logged)).toBe('[Training share] Squat Set 2 of 3 100kg×5 @RPE8 (2026-09-05)');
  setLocaleOverride('zh');
  expect(displayFirstLine(logged)).toBe('[训练分享] Squat 第2组/3 100kg×5 @RPE8 (2026-09-05)');
});
test('normalization validates snapshots and removes only allowed decimal trailing zeros', () => {
  expect(normalizeSetRef({ ...logged, weightKg: '100.00', rpe: '8.0' })).toEqual(logged);
  for (const invalid of [{ setNumber: 0 }, { setTotal: 1 }, { dayDate: '2026-02-30' }, { dayDate: '2026-9-05' }, { weightKg: '0100' }, { weightKg: '100.000' }, { rpe: '8.2' }, { repsMax: 5 }, { reps: -1 }]) {
    expect(() => normalizeSetRef({ ...logged, ...invalid })).toThrow();
  }
});
test('body limit counts UTF-16 code units', () => {
  expect(setRefBodyAllowed('😀'.repeat(2000))).toBe(true);
  expect(setRefBodyAllowed('😀'.repeat(2000) + 'a')).toBe(false);
});
test('card notes distinguish absent, explicitly empty, and nonempty; mismatches fall back to text', () => {
  const message = { kind: 'text' as const, set_ref: logged, body: canonicalFirstLine(logged) };
  expect(ChatSetCardPresentation(message)?.note).toBeNull();
  expect(ChatSetCardPresentation({ ...message, body: message.body + '\n' })?.note).toBe('');
  expect(ChatSetCardPresentation({ ...message, body: message.body + '\nWhy?\nAgain' })?.note).toBe('Why?\nAgain');
  expect(ChatSetCardPresentation({ ...message, body: '[Wrong] Squat (2026-09-05)\nWhy?' })).toBeNull();
});

test('candidates order recent logs before unrecorded prescriptions and preserve upload identity', () => {
  const exercise = { id: 'exercise', exercise_id: 'squat', plan_day_id: 'day', sort_order: 0, is_main_lift: true, notes: null,
    sets: [set({ id, set_number: 1 }), set({ id: id2, set_number: 2 }), set({ id: id3, set_number: 3 })] };
  const planDay = day('day', { exercises: [exercise] });
  const makeLog = (logId: string, index: number, hour: number): SetLog => ({ id: logId, student_id: 'student', plan_exercise_id: exercise.id, exercise_id: 'squat', set_index: index, weight_kg: '100.00', reps: 5, rpe: '8.0', completed: true, failed: false, assumed: false, adhoc: false, logged_date: '2026-09-05', logged_at: `2026-09-05T${hour}:00:00Z` });
  const drafts = synthesizeDrafts(planDay, [makeLog(id, 0, 10), makeLog(id2, 1, 11)]);
  const candidates = buildCandidates({ planDay, drafts, dayDate: '2026-09-05', exerciseNames: new Map([['squat', 'Squat']]), videos: {
    a: { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', setLogId: id, attachmentId: id3 },
    b: { ...EMPTY_VIDEO_UPLOAD, status: 'pending', setLogId: id2, createdAt: 20 },
  } });
  expect(candidates.map(c => c.id)).toEqual([id2, id, id3]);
  expect(candidates.map(c => c.source.setTotal)).toEqual([3, 3, 3]);
  expect(candidates[0].video).toMatchObject({ state: 'uploading', recordKey: 'b', createdAt: 20 });
  expect(candidates[1].video).toMatchObject({ state: 'ready', videoId: id3 });
  expect(candidates[2]).toMatchObject({ source: { source: 'planned', planSetId: id3, weightKg: '0' } });
  const extra = { ...drafts[0], setIndex: 4, sourceLog: makeLog(id, 4, 12) };
  expect(buildCandidates({ planDay, drafts: [extra], dayDate: '2026-09-05', exerciseNames: new Map(), videos: { a: { ...EMPTY_VIDEO_UPLOAD, status: 'failed', setLogId: id } } })[0]).toMatchObject({ source: { setNumber: 5, setTotal: null }, video: { state: 'failed' } });
});

const id2 = '20000000-0000-4000-8000-000000000000';
const id3 = '30000000-0000-4000-8000-000000000000';
test('picker defaults to requested log or first row, and guards confirmation without a selection', () => {
  const picker = new SetRefPickerPresentation();
  expect(picker.proceed()).toBe(false);
  picker.load([{ id, source: logged }, { id: id2, source: logged }], id2);
  expect(picker.selectedCandidate?.id).toBe(id2);
  picker.select('missing'); expect(picker.selectedCandidate?.id).toBe(id2);
  picker.select(id); expect(picker.proceed()).toBe(true); expect(picker.page).toBe('confirmation');
  picker.showSelection(); expect(picker.page).toBe('selection');
  picker.load([{ id, source: logged }], 'missing'); expect(picker.selectedCandidate?.id).toBe(id);
});

test('planned candidates use prescription set numbers and preserve legacy zero RPE', () => {
  const exercise = { id: 'exercise', exercise_id: 'squat', plan_day_id: 'day', sort_order: 0, is_main_lift: true, notes: null,
    sets: [set({ id, set_number: 2, intensity_mode: 'rpe', target_value: '0.0' }), set({ id: id2, set_number: 3 })] };
  const candidates = buildCandidates({ planDay: day('day', { exercises: [exercise] }), drafts: [], dayDate: '2026-09-05', exerciseNames: new Map(), videos: {} });
  // Set 3 is invalid with only two prescribed sets; do not relabel it as Set 2.
  expect(candidates).toHaveLength(1);
  expect(candidates[0].source).toMatchObject({ setNumber: 2, setTotal: 2, rpe: '0.0' });
});
