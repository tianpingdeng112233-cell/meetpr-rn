import { afterEach, expect, jest, test } from '@jest/globals';
import { useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useTrimPlayback } from '../useTrimPlayback';
let playback: ReturnType<typeof useTrimPlayback>;
let renderer: ReactTestRenderer;
const seek = jest.fn();
function Harness({ loop }: { loop: boolean }) {
  const value = useTrimPlayback(loop);
  useLayoutEffect(() => { playback = value; });
  return null;
}
function mount(loop = false) {
  act(() => { renderer = create(<Harness loop={loop} />); });
  playback.player.current = { seek } as never;
  act(() => { playback.initialize(8); playback.onLoad(); });
  seek.mockClear();
}
afterEach(() => { act(() => renderer?.unmount()); jest.useRealTimers(); });

test('scrubbing pauses playback and moves the playhead outside the selection without changing its bounds', () => {
  mount(true);
  act(() => playback.move('start', 2));
  act(() => playback.move('end', 6));
  act(() => playback.toggle());
  act(() => playback.scrub(7));
  expect(playback.playing).toBe(false);
  expect(playback.position).toBe(7);
  expect(playback.selection).toMatchObject({ startSeconds: 2, endSeconds: 6 });
  expect(seek).toHaveBeenLastCalledWith(7, 0);
});

test('drag seeks are throttled to the latest target and release seeks exactly without a late timer', () => {
  jest.useFakeTimers();
  mount();
  act(() => playback.scrub(1, false));
  act(() => playback.scrub(2, false));
  act(() => playback.scrub(3, false));
  expect(playback.position).toBe(3);
  expect(seek).toHaveBeenCalledTimes(1);
  expect(seek).toHaveBeenLastCalledWith(1, 0.1);
  act(() => jest.advanceTimersByTime(100));
  expect(seek).toHaveBeenCalledTimes(2);
  expect(seek).toHaveBeenLastCalledWith(3, 0.1);
  act(() => playback.scrub(4, false));
  act(() => playback.scrub(4.25));
  expect(seek).toHaveBeenLastCalledWith(4.25, 0);
  const count = seek.mock.calls.length;
  act(() => jest.advanceTimersByTime(100));
  expect(seek).toHaveBeenCalledTimes(count);
  act(() => playback.onSeek({ seekTime: 3 }));
  act(() => playback.onProgress({ currentTime: 7 }));
  expect(playback.position).toBe(4.25);
});

test.each([[4, 4], [7, 2]])('Play from playhead %s starts at %s for selection 2 to 6', (position, expected) => {
  mount();
  act(() => playback.move('start', 2));
  act(() => playback.move('end', 6));
  expect(playback.position).toBe(6);
  act(() => playback.scrub(position));
  act(() => playback.onSeek({ seekTime: position }));
  act(() => playback.toggle());
  expect(playback.position).toBe(expected);
  expect(seek).toHaveBeenLastCalledWith(expected, 0);
  expect(playback.playing).toBe(true);
});

test.each([false, true])('progress advances playhead and end rewinds with loop=%s', loop => {
  mount(loop);
  act(() => playback.move('start', 2));
  act(() => playback.move('end', 6));
  act(() => playback.scrub(4));
  act(() => playback.onSeek({ seekTime: 4 }));
  act(() => playback.toggle());
  act(() => playback.onProgress({ currentTime: 5 }));
  expect(playback.position).toBe(5);
  act(() => playback.onProgress({ currentTime: 6 }));
  expect(playback.position).toBe(2);
  expect(playback.playing).toBe(loop);
});

test('reset and unmount cancel queued drag seeks', () => {
  jest.useFakeTimers();
  mount();
  act(() => { playback.scrub(1, false); playback.scrub(2, false); playback.reset(); });
  act(() => jest.advanceTimersByTime(200));
  expect(seek).toHaveBeenCalledTimes(1);
  act(() => playback.initialize(8));
  act(() => { playback.scrub(3, false); playback.scrub(4, false); });
  act(() => renderer.unmount());
  act(() => jest.advanceTimersByTime(200));
  expect(seek).toHaveBeenCalledTimes(2);
});

test('paused progress cannot pull the released playhead away from its exact target', () => {
  mount();
  act(() => playback.scrub(4.25));
  act(() => playback.onSeek({ seekTime: 4.25 }));
  act(() => playback.onProgress({ currentTime: 3.9 }));
  expect(playback.position).toBe(4.25);
});
