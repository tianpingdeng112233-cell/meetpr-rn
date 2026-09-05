import { expect, test } from '@jest/globals';
import { ChatMessageSchema } from '@/api/domains/chat';
const id = '10000000-0000-4000-8000-000000000000';
const envelope = { id, conversation_id: id, seq: 1, sender_id: id, kind: 'set_ref', body: 'Strong today', client_id: 'client', created_at: '2026-09-05T09:03:00Z' };
const reference = { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '100.5', reps: 5, rpe: '8.5', dayDate: '2026-09-05', setLogId: id };
test('set reference wire values retain decimal strings, while malformed cards do not reject the message page', () => {
  expect(ChatMessageSchema.parse({ ...envelope, set_ref: reference }).set_ref).toEqual(reference);
  for (const changes of [{ v: 2 }, { weightKg: 100 }, { rpe: '10.5' }, { dayDate: '2026-02-30' }, { setNumber: 4 }, { repsMax: 4 }, { setLogId: null }, { unknown: true }]) {
    expect(ChatMessageSchema.parse({ ...envelope, set_ref: { ...reference, ...changes } }).set_ref).toBeNull();
  }
});
