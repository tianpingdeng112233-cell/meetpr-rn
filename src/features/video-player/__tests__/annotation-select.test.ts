import { expect, test, jest } from '@jest/globals';
import { FeedbackVideoAnnotationSelection } from '../annotation-select';
test('plain markers only seek; annotated markers pause, seek, then cover', () => {
  const events: unknown[] = [];
  const selection = new FeedbackVideoAnnotationSelection({ pause: () => events.push('pause'), seek: ms => events.push(ms), changed: marker => events.push(marker?.id ?? 'closed'), refresh: () => events.push('refresh') });
  selection.select({ id: 'plain', timeMs: 7000, note: '' });
  expect(events).toEqual([7000]);
  selection.select({ id: 'annotated', timeMs: 9000, note: '', annotationURL: 'https://image' });
  expect(events).toEqual([7000, 'pause', 9000, 'annotated']);
  selection.close();
  expect(events.at(-1)).toBe('closed');
});
test('image failure closes before exactly one refresh, and stale images cannot close a newer selection', () => {
  const events: string[] = [];
  const selection = new FeedbackVideoAnnotationSelection({ pause: jest.fn(), seek: jest.fn(), changed: marker => events.push(marker ? 'opened' : 'closed'), refresh: () => events.push('refresh') });
  const first = selection.select({ id: 'a', timeMs: 0, note: '', annotationURL: 'https://a' });
  const second = selection.select({ id: 'b', timeMs: 0, note: '', annotationURL: 'https://b' });
  selection.loadFailed(first!);
  expect(events).toEqual(['opened', 'opened']);
  selection.loadFailed(second!);
  selection.loadFailed(second!);
  expect(events).toEqual(['opened', 'opened', 'closed', 'refresh']);
});
