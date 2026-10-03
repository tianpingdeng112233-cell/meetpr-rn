import { expect, test } from '@jest/globals';
import { initialSetPlayback, setPlaybackReducer } from '../set-playback';

test('set preview starts paused, toggles, scrubs and keeps progress and speed across expand and back', () => {
  let state = initialSetPlayback;
  expect(state).toMatchObject({ paused: true, position: 0, rate: 1, expanded: false });
  state = setPlaybackReducer(state, { type: 'loaded', duration: 60 });
  state = setPlaybackReducer(state, { type: 'toggle' });
  expect(state.paused).toBe(false);
  state = setPlaybackReducer(state, { type: 'seek', position: 24 });
  for (const rate of [2, 1.5, 1, 0.5]) {
    state = setPlaybackReducer(state, { type: 'rate', rate });
    expect(state.rate).toBe(rate);
  }
  state = setPlaybackReducer(state, { type: 'rate', rate: 3 });
  expect(state.rate).toBe(0.5);
  state = setPlaybackReducer(state, { type: 'expand' });
  expect(state.expanded).toBe(true);
  state = setPlaybackReducer(state, { type: 'back' });
  expect(state).toMatchObject({ expanded: false, position: 24, rate: 0.5, paused: false });
  expect(setPlaybackReducer(state, { type: 'back' })).toBe(state);
  state = setPlaybackReducer(state, { type: 'seek', position: 100 });
  expect(state.position).toBe(60);
  state = setPlaybackReducer(state, { type: 'ended' });
  expect(state.paused).toBe(true);
  state = setPlaybackReducer(state, { type: 'toggle' });
  expect(state).toMatchObject({ paused: false, position: 0 });
});

test('seeking ignores stale decoder progress until the requested position is restored', () => {
  let state = setPlaybackReducer(initialSetPlayback, { type: 'loaded', duration: 60 });
  state = setPlaybackReducer(state, { type: 'toggle' });
  state = setPlaybackReducer(state, { type: 'seek', position: 24 });
  state = setPlaybackReducer(state, { type: 'seeked', position: 24 });
  state = setPlaybackReducer(state, { type: 'seek', position: 24 });
  state = setPlaybackReducer(state, { type: 'reload' });
  state = setPlaybackReducer(state, { type: 'loaded', duration: 60 });
  state = setPlaybackReducer(state, { type: 'progress', position: 0 });
  expect(state).toMatchObject({ position: 24, restoring: true, paused: false });
  state = setPlaybackReducer(state, { type: 'seeked', position: 12 });
  expect(state.restoring).toBe(true);
  state = setPlaybackReducer(state, { type: 'seeked', position: 24 });
  state = setPlaybackReducer(state, { type: 'progress', position: 25 });
  expect(state).toMatchObject({ position: 25, restoring: false });
  state = setPlaybackReducer(state, { type: 'back' });
  expect(state).toMatchObject({ expanded: false, restoring: false });
  state = setPlaybackReducer(state, { type: 'expand' });
  state = setPlaybackReducer(state, { type: 'progress', position: 26 });
  expect(state).toMatchObject({ expanded: true, restoring: false, position: 26 });
});

test('a renewed playback source retains progress while its decoder reloads', () => {
  let state = setPlaybackReducer(initialSetPlayback, { type: 'loaded', duration: 60 });
  state = setPlaybackReducer(state, { type: 'progress', position: 15 });
  state = setPlaybackReducer(state, { type: 'reload' });
  state = setPlaybackReducer(state, { type: 'progress', position: 0 });
  expect(state).toMatchObject({ position: 15, restoring: true });
  state = setPlaybackReducer(state, { type: 'loaded', duration: 60 });
  state = setPlaybackReducer(state, { type: 'seeked', position: 15 });
  expect(state).toMatchObject({ position: 15, restoring: false });
});
