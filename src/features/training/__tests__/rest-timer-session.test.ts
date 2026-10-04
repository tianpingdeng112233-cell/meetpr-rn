import { expect, jest, test } from '@jest/globals';
import { RestTimerSession } from '../rest-timer-session';

function setup() {
  let now = 1_000;
  const native = { show: jest.fn(), hide: jest.fn(), consumeState: jest.fn((): { endAtEpochMs: number | null; skipped: boolean } => ({ endAtEpochMs: null, skipped: false })) };
  const session = new RestTimerSession(native, () => now);
  return { session, native, at: (time: number) => { now = time; } };
}

test('running rest publishes its wall-clock end only on entering background', () => {
  const { session, native, at } = setup();
  session.start(120);
  expect(session.remainingSeconds()).toBe(120);
  expect(native.show).not.toHaveBeenCalled();
  at(31_000);
  session.setActive(false, true);
  expect(native.show).toHaveBeenCalledWith(121_000, 1_000, '');
  expect(session.remainingSeconds()).toBe(90);
});

test('adjustments clamp remaining rest to zero and fifteen minutes and replace background notification', () => {
  const { session, native, at } = setup();
  session.start(120);
  session.setActive(false, true);
  at(31_000);
  session.adjust(-30);
  expect(session.remainingSeconds()).toBe(60);
  expect(native.show).toHaveBeenLastCalledWith(91_000, 1_000, '');
  session.adjust(900);
  expect(session.remainingSeconds()).toBe(900);
  expect(native.show).toHaveBeenLastCalledWith(931_000, 1_000, '');
  session.adjust(-930);
  expect(session.remainingSeconds()).toBe(0);
  expect(native.hide).toHaveBeenCalledTimes(1);
});

test.each([
  ['unchanged', null, false, 90],
  ['extended', 151_000, false, 120],
  ['skipped', null, true, 0],
] satisfies [string, number | null, boolean, number][])('foreground consumes %s native state before hiding notifications', (_, endAtEpochMs, skipped, remaining) => {
  const { session, native, at } = setup();
  session.start(120);
  session.setActive(false, true);
  native.consumeState.mockReturnValue({ endAtEpochMs, skipped });
  at(31_000);
  session.setActive(true, true);
  expect(session.remainingSeconds()).toBe(remaining);
  expect(session.isClosed()).toBe(skipped);
  expect(native.hide).toHaveBeenCalledTimes(1);
  expect(native.consumeState.mock.invocationCallOrder[0]).toBeLessThan(native.hide.mock.invocationCallOrder[0]);
});

test('pause, skip and expiry never publish a non-running rest', () => {
  const { session, native, at } = setup();
  session.setActive(false, true);
  expect(native.show).not.toHaveBeenCalled();
  session.start(120);
  session.setPaused(true);
  native.show.mockClear();
  session.setActive(false, true);
  expect(native.show).not.toHaveBeenCalled();
  session.setPaused(false);
  expect(native.show).toHaveBeenCalledWith(121_000, 1_000, '');
  session.close();
  expect(session.isClosed()).toBe(true);
  native.show.mockClear();
  session.setActive(false, true);
  expect(native.show).not.toHaveBeenCalled();
  session.start(120);
  at(121_000);
  native.hide.mockClear();
  expect(session.tick()).toBe(false); // native owns background expiry
  expect(native.hide).not.toHaveBeenCalled();
  session.setActive(true, true);
  expect(session.tick()).toBe(true);
  expect(session.tick()).toBe(false);
  expect(session.remainingSeconds()).toBe(0);
});

test('denied notification permission leaves every native operation untouched', () => {
  const { session, native, at } = setup();
  session.start(120);
  session.setActive(false, false);
  session.adjust(30);
  session.setPaused(true);
  session.setPaused(false);
  session.setActive(true, false);
  at(200_000);
  expect(session.tick()).toBe(true);
  session.close();
  expect(native.show).not.toHaveBeenCalled();
  expect(native.consumeState).not.toHaveBeenCalled();
  expect(native.hide).not.toHaveBeenCalled();
});

test('repeated non-active events cannot overwrite a native extension', () => {
  const { session, native } = setup();
  session.start(120);
  session.setActive(false, true);
  session.setActive(false, true);
  expect(native.show).toHaveBeenCalledTimes(1);
});


test('background progress keeps the original start across foreground time adjustments', () => {
  const { session, native, at } = setup();
  session.start(120);
  at(31_000);
  session.setActive(false, true);
  expect(native.show).toHaveBeenLastCalledWith(121_000, 1_000, '');
  session.setActive(true, true);
  session.adjust(30);
  session.adjust(-10);
  at(41_000);
  session.setActive(false, true);
  expect(native.show).toHaveBeenLastCalledWith(141_000, 1_000, '');
});
