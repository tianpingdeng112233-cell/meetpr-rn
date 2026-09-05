import { StudentVideosResponseSchema } from '@/api/domains/videos';
import { expect, test } from '@jest/globals';
import { pendingVideos, daySections, shouldDismissStudentList } from '../pending-videos';

import { itemAfterSend, nextItem , SliceRequests } from '../queue-navigator';
const video = (id: string, plan_exercise_id: string | null, created_at = '2026-09-05T10:00:00Z', logged_at: string | null = null) => ({ id, plan_exercise_id, created_at, logged_at, set_log_id: null, size_bytes: 100 });
test('only linked, unanswered clips enter the queue; legacy exercise feedback excludes all its clips', () => {
  const items = pendingVideos({ studentID: 's', studentName: 'Sam', videos: [video('loose', null), video('answered', 'e'), video('legacy', 'old'), video('yes', 'e'), video('older', 'e', '2026-09-04T10:00:00Z')], feedback: [{ video_id: 'answered', plan_exercise_id: 'e' }, { video_id: null, plan_exercise_id: 'old' }], exerciseNames: { e: 'Squat' } });
  expect(items.map(item => item.id)).toEqual(['yes', 'older']);
  expect(items[0].exerciseName).toBe('Squat');
});
test('groups by local training day descending, newest upload first, and dismisses only when detail is closed', () => {
  const base = { studentID: 's', studentName: 'Sam', videos: [video('a', 'e'), video('b', 'e'), video('c', 'e')], feedback: [], exerciseNames: {} };
  const items = pendingVideos(base).map((item, index) => ({ ...item, dayDate: index === 2 ? '2026-09-05' : '2026-09-04', uploadedAt: `2026-09-05T${10 + index}:00:00Z` }));
  expect(daySections(items).map(section => [section.day, section.items.map(item => item.id)])).toEqual([['2026-09-05', ['c']], ['2026-09-04', ['b', 'a']]]);
  expect(shouldDismissStudentList(true, true)).toBe(false);
  expect(shouldDismissStudentList(true, false)).toBe(true);
  expect(shouldDismissStudentList(false, false)).toBe(false);
});
test('skip wraps; send follows the captured successor identity across a concurrent refresh', () => {
  const a = { id: 'a' }, b = { id: 'b' }, x = { id: 'x' };
  expect(nextItem('b', [a, b])).toEqual(a);
  expect(nextItem('missing', [a, b])).toBeNull();
  const successor = nextItem('a', [a, b])?.id;
  expect(itemAfterSend(successor, [x, b])).toEqual(b);
  expect(itemAfterSend(successor, [x])).toEqual(x);
  expect(itemAfterSend(null, [x])).toEqual(x);
  expect(itemAfterSend(successor, [])).toBeNull();
  expect(nextItem('a', [])).toBeNull();
});
test('slice requests reject old item results and superseded retries independently for each resource', () => {
  const requests = new SliceRequests();
  requests.select('a');
  const aURL = requests.begin('url');
  const aMarkers = requests.begin('markers');
  const retryURL = requests.begin('url');
  expect(requests.accepts(aURL)).toBe(false);
  expect(requests.accepts(retryURL)).toBe(true);
  expect(requests.accepts(aMarkers)).toBe(true);
  requests.select('b');
  expect(requests.accepts(aMarkers)).toBe(false);
  requests.select('a');
  expect(requests.accepts(retryURL)).toBe(false);
});

test('accepts the pinned iOS video wire shape without denormalized exercise or set fields', () => {
  const parsed = StudentVideosResponseSchema.safeParse({ videos: [{ id: '00000000-0000-4000-8000-000000000001', set_log_id: null, plan_exercise_id: '00000000-0000-4000-8000-000000000002', content_type: 'video/mp4', size_bytes: 100, filename: null, created_at: '2026-09-05T12:00:00Z', logged_at: null }] });
  expect(parsed.success).toBe(true);
});
