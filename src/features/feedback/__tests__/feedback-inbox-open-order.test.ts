import { expect, test, jest } from '@jest/globals';
import { FeedbackPlaybackSession } from '../playback-session';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
test('read then signed URL opens playback before a slow marker endpoint', async () => {
  const events: string[] = [];
  const read = deferred<void>();
  const url = deferred<string>();
  const markers = deferred<{ kind: 'hidden' }>();
  const session = new FeedbackPlaybackSession({ markRead: () => { events.push('read'); return read.promise; }, url: () => { events.push('url'); return url.promise; }, markers: () => { events.push('markers'); return markers.promise; } });
  session.subscribe(() => { if (session.getSnapshot().playbackItem && !events.includes('open')) events.push('open'); });
  const opening = session.open('feedback', 'video');
  expect(events).toEqual(['read']);
  read.resolve();
  await Promise.resolve();
  expect(events).toEqual(['read', 'url']);
  url.resolve('https://video');
  await Promise.resolve();
  expect(events).toEqual(['read', 'url', 'open', 'markers']);
  expect(session.getSnapshot().playbackItem).toMatchObject({ id: 'video', markers: null });
  markers.resolve({ kind: 'hidden' });
  await opening;
});
test('short-link failure stays inline and never opens or requests markers', async () => {
  const markers = jest.fn(async () => ({ kind: 'hidden' as const }));
  const session = new FeedbackPlaybackSession({ markRead: async () => {}, url: async () => { throw new Error('expired'); }, markers });
  await session.open('feedback', 'video');
  expect(session.getSnapshot()).toMatchObject({ playbackItem: null, errorFeedbackId: 'feedback', resolvingFeedbackId: null });
  expect(markers).not.toHaveBeenCalled();
});
test('closing during URL resolution cannot resurrect a player', async () => {
  const url = deferred<string>();
  const session = new FeedbackPlaybackSession({ markRead: async () => {}, url: () => url.promise, markers: async () => ({ kind: 'hidden' }) });
  const opening = session.open('f', 'a');
  await Promise.resolve();
  session.close();
  url.resolve('https://a');
  await opening;
  expect(session.getSnapshot().playbackItem).toBeNull();
});
test('late marker response from an earlier playback cannot fill the next one, even with the same video id', async () => {
  const first = deferred<{ kind: 'failed' }>();
  let calls = 0;
  const session = new FeedbackPlaybackSession({ markRead: async () => {}, url: async () => 'https://video', markers: () => ++calls === 1 ? first.promise : Promise.resolve({ kind: 'loaded', markers: [] }) });
  const opening = session.open('f', 'a');
  await Promise.resolve(); await Promise.resolve();
  session.close();
  await session.open('f', 'a');
  first.resolve({ kind: 'failed' });
  await opening;
  expect(session.getSnapshot().playbackItem).toMatchObject({ markers: [], markersFailed: false });
});
