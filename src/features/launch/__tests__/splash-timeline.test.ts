import { expect, test } from '@jest/globals';

import {
  resolveSplashPhase,
  SPLASH_ENTRANCE,
  SPLASH_LOADER_START,
  SPLASH_LOOP_FADE_OUT,
  SPLASH_LOOP_PERIOD,
  splashFrame,
  type SplashPhase,
} from '../splash-timeline';

// Spec 099 phase table: [animationFinished, firstScreenReady, reduceMotion, exitFinished] -> phase.
test.each([
  [false, false, false, false, 'playing'],
  // Ready early: the entrance still plays to the end.
  [false, true, false, false, 'playing'],
  [true, false, false, false, 'loading'],
  [true, true, false, false, 'exiting'],
  [true, true, false, true, 'removed'],
  // Reduce Motion skips the entrance.
  [false, false, true, false, 'loading'],
  [false, true, true, false, 'exiting'],
  [false, true, true, true, 'removed'],
] satisfies [boolean, boolean, boolean, boolean, SplashPhase][])(
  'phase(%s, %s, %s, %s) is %s',
  (animationFinished, firstScreenReady, reduceMotion, exitFinished, expected) => {
    expect(resolveSplashPhase({ animationFinished, firstScreenReady, reduceMotion, exitFinished })).toBe(expected);
  },
);

test('starts empty and is fully resolved by the end of the entrance', () => {
  const first = splashFrame(0);
  expect(first.logoOpacity).toBe(0);
  expect(first.taglineOpacity).toBe(0);
  expect(first.pillOpacity).toBe(0);
  expect(first.trackAlpha).toBe(0);
  expect(first.warmTopAlpha).toBeCloseTo(0.1, 9);
  expect(first.warmBottomAlpha).toBeCloseTo(0.18, 9);

  const last = splashFrame(SPLASH_ENTRANCE);
  expect(last.logoOpacity).toBeCloseTo(1, 6);
  expect(last.logoScale).toBeCloseTo(1, 6);
  expect(last.logoOffsetY).toBeCloseTo(0, 6);
  expect(last.taglineOpacity).toBeCloseTo(1, 6);
  expect(last.pillOpacity).toBeCloseTo(1, 6);
  expect(last.pillProgress).toBeCloseTo(1, 6);
  expect(last.trackAlpha).toBeCloseTo(0.085, 6);
});

test('key moments match the reference', () => {
  // Logo lands at frame 19 of 30; the slogan resolves at frame 25.
  expect(splashFrame(19 / 30).logoOpacity).toBeCloseTo(1, 6);
  expect(splashFrame(0.3).logoOpacity).toBeLessThan(1);
  expect(splashFrame(7 / 30).taglineOpacity).toBe(0);
  expect(splashFrame(25 / 30).taglineOpacity).toBeCloseTo(1, 6);
  // The loader shows up one frame after 0.4 s.
  expect(splashFrame(0.4).pillOpacity).toBe(0);
  expect(splashFrame(0.6).pillOpacity).toBeGreaterThan(0);
});

test('the loader only ever travels left to right', () => {
  let previous = splashFrame(SPLASH_LOADER_START);
  let sawRestart = false;
  for (let time = SPLASH_LOADER_START; time < 6; time += 1 / 120) {
    const frame = splashFrame(time);
    if (frame.pillProgress < previous.pillProgress - 1e-9) {
      sawRestart = true;
      // It may only jump back to the left end while invisible.
      expect(previous.pillOpacity).toBeLessThan(0.05);
      expect(frame.pillOpacity).toBeLessThan(0.05);
    }
    previous = frame;
  }
  expect(sawRestart).toBe(true);
});

test('the loader is visible in every repeat pass', () => {
  const held = SPLASH_ENTRANCE + SPLASH_LOOP_FADE_OUT;
  for (let cycle = 0; cycle < 3; cycle += 1) {
    expect(splashFrame(held + cycle * SPLASH_LOOP_PERIOD + 0.4).pillOpacity).toBeCloseTo(1, 6);
  }
});
