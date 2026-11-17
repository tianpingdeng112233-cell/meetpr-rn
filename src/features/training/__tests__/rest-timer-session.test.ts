import { expect, jest, test } from "@jest/globals";
import { RestRingIntroduction, RestTimerSession } from "../rest-timer-session";

function setup() {
  let now = 1_000;
  const native = {
    show: jest.fn(),
    hide: jest.fn(),
    alert: jest.fn(),
    consumeState: jest.fn(
      (): { endAtEpochMs: number | null; skipped: boolean } => ({
        endAtEpochMs: null,
        skipped: false,
      }),
    ),
  };
  const session = new RestTimerSession(native, () => now);
  return {
    session,
    native,
    at: (time: number) => {
      now = time;
    },
  };
}

test("manual start runs to done, then returns to idle after three seconds or a tap", () => {
  const { session, at } = setup();
  expect(session.snapshot().phase).toBe("idle");
  session.start(30, "Bench");
  expect(session.snapshot()).toMatchObject({
    phase: "running",
    remaining: 30,
    total: 30,
    body: "Bench",
  });
  at(31_000);
  session.tick();
  expect(session.snapshot().phase).toBe("done");
  at(34_000);
  session.tick();
  expect(session.snapshot().phase).toBe("idle");
  session.start(1);
  at(35_000);
  session.tick();
  session.close();
  expect(session.snapshot().phase).toBe("idle");
});

test("±15 clamps to 0/900, stop and finishing today cancel silently", () => {
  const { session, native, at } = setup();
  session.setActive(true, true);
  session.start(895);
  session.adjust(15);
  expect(session.remainingSeconds()).toBe(900);
  session.adjust(-15);
  expect(session.remainingSeconds()).toBe(885);
  session.start(10);
  session.adjust(-15);
  expect(session.remainingSeconds()).toBe(0);
  session.close();
  expect(session.snapshot().phase).toBe("idle");
  session.start(180);
  session.completeToday();
  at(200_000);
  expect(session.tick()).toEqual({ vibration: false, sound: false });
  expect(session.snapshot().phase).toBe("idle");
  expect(native.hide).toHaveBeenCalled();
});

test("last ten seconds vibrate once per second, then completion respects each switch", () => {
  for (const vibration of [false, true])
    for (const sound of [false, true]) {
      const { session, at } = setup();
      session.setAlerts({ vibration, sound });
      session.start(12);
      at(2_000);
      expect(session.tick()).toEqual({ vibration: false, sound: false });
      for (let second = 10; second >= 1; second--) {
        at((13 - second) * 1_000);
        expect(session.tick()).toEqual({ vibration, sound: false });
        expect(session.tick()).toEqual({ vibration: false, sound: false });
      }
      at(13_000);
      expect(session.tick()).toEqual({ vibration, sound });
      expect(session.tick()).toEqual({ vibration: false, sound: false });
    }
});

test("background owns expiry; foreground reconciles +15 without replaying alerts", () => {
  const { session, native, at } = setup();
  session.start(30, "Bench");
  session.setActive(false, true);
  expect(native.show).toHaveBeenCalledWith(31_000, "Bench", {
    vibration: true,
    sound: true,
  });
  session.setActive(false, true);
  expect(native.show).toHaveBeenCalledTimes(1);
  at(22_000);
  expect(session.tick()).toEqual({ vibration: false, sound: false });
  native.consumeState.mockReturnValue({ endAtEpochMs: 46_000, skipped: false });
  session.setActive(true, true);
  expect(session.remainingSeconds()).toBe(24);
  session.setActive(false, true);
  at(47_000);
  expect(session.tick()).toEqual({ vibration: false, sound: false });
  session.setActive(true, true);
  expect(session.tick()).toEqual({ vibration: false, sound: false });
});

test("skip from notification clears the timer and denied permission never publishes", () => {
  const { session, native, at } = setup();
  session.start(120);
  session.setActive(false, false);
  at(31_000);
  session.setActive(true, false);
  expect(session.remainingSeconds()).toBe(90);
  expect(native.show).not.toHaveBeenCalled();
  session.setActive(false, true);
  native.consumeState.mockReturnValue({ endAtEpochMs: null, skipped: true });
  session.setActive(true, true);
  expect(session.snapshot().phase).toBe("idle");
});

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
test("first settings and hint are separate durable per-student milestones, ignoring old explanation", async () => {
  const first = await RestRingIntroduction.load("first");
  expect(first.snapshot()).toEqual({ settings: true, hint: false });
  await first.dismissSettings();
  expect((await RestRingIntroduction.load("first")).snapshot()).toEqual({
    settings: false,
    hint: true,
  });
  await first.interact();
  expect((await RestRingIntroduction.load("first")).snapshot()).toEqual({
    settings: false,
    hint: false,
  });
  expect((await RestRingIntroduction.load("second")).snapshot()).toEqual({
    settings: true,
    hint: false,
  });
});
