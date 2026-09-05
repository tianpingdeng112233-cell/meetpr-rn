import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { makeTodoItems } from '../todo-list';
import { setLocaleOverride } from '@/i18n';
beforeAll(() => setLocaleOverride('en'));
afterAll(() => setLocaleOverride());
const now = new Date(2026, 8, 9, 12);
const input = { now, videos: [{ id: 'v', uploadedAt: now }], conversations: [{ id: 'c', displayName: 'Amy', unreadCount: 3 }, { id: 'd', displayName: 'Ben', unreadCount: 2 }], rows: [{ student: { id: 's', displayName: 'Sam', status: 'active' }, lastActiveAt: null, trainingDays: [], triageSignals: [{ kind: 'notTrained' as const, daysMissed: 2 }] }], applications: [{ id: 'a', displayName: 'Alex', submittedAt: now }] };
test('todo concatenates video, unread message total, missed student, application', () => {
  const items = makeTodoItems(input);
  expect(items.map(item => item.kind)).toEqual(['videos', 'messages', 'studentChat', 'applications']);
  expect(items[1]).toMatchObject({ title: '5 unread student messages', subtitle: 'Amy · Ben' });
  expect(items[3]).toMatchObject({ title: 'Alex applied to join', subtitle: 'Waiting 1 minute' });
});
test('multiple applications use the earliest waiting duration', () => {
  const applications = [...input.applications, { id: 'b', displayName: 'Bea', submittedAt: new Date(2026, 8, 9, 10, 15) }];
  expect(makeTodoItems({ ...input, applications })[3]).toMatchObject({ title: '2 new student applications', subtitle: 'Earliest: Waiting 1 hr 45 min' });
});
