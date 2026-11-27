// Cold-start splash timeline (spec 099). Mirrors render(t) in
// specs/099-launch-animation/reference/splash.html; lengths are in the
// design's 1080-wide canvas units, times in seconds.

export const SPLASH_ENTRANCE = 1.2;
export const SPLASH_EXIT = 0.3;
export const SPLASH_LOADER_START = 13 / 30;
// Waiting past the entrance: the pill fades out at the right end, then repeats
// a left-to-right pass. It never travels back.
export const SPLASH_LOOP_FADE_OUT = 0.2;
export const SPLASH_LOOP_PERIOD = 1.1;

const LOGO_ENTER = 19 / 30;
const GLOW_RAMP = 0.7;
const TAGLINE_START = 7 / 30;
const TAGLINE_END = 25 / 30;
const LOADER_FADE = 8 / 30;
const LOOP_FADE_OUT_START = 0.8;
const SWEEP = SPLASH_ENTRANCE - SPLASH_LOADER_START;

export type SplashPhase = 'playing' | 'loading' | 'exiting' | 'removed';

export function resolveSplashPhase(input: {
  animationFinished: boolean;
  firstScreenReady: boolean;
  reduceMotion: boolean;
  exitFinished: boolean;
}): SplashPhase {
  if (input.exitFinished) return 'removed';
  // Reduce Motion skips the entrance and starts from the last frame.
  if (!input.animationFinished && !input.reduceMotion) return 'playing';
  return input.firstScreenReady ? 'exiting' : 'loading';
}

export type SplashFrame = {
  warmTopAlpha: number;
  warmBottomAlpha: number;
  glowAlpha: number;
  glowScale: number;
  logoOpacity: number;
  logoOffsetY: number;
  logoScale: number;
  taglineOpacity: number;
  taglineOffsetY: number;
  trackAlpha: number;
  pillOpacity: number;
  /** 0 = pill at the left end of the track, 1 = at the right end. */
  pillProgress: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (p1: number, p2: number, t: number) =>
    ((1 - 3 * p2 + 3 * p1) * t + (3 * p2 - 6 * p1)) * t * t + 3 * p1 * t;
  const slope = (p1: number, p2: number, t: number) =>
    (3 * (1 - 3 * p2 + 3 * p1) * t + 2 * (3 * p2 - 6 * p1)) * t + 3 * p1;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i += 1) {
      const error = at(x1, x2, t) - x;
      const derivative = slope(x1, x2, t);
      if (Math.abs(error) < 1e-6 || Math.abs(derivative) < 1e-6) break;
      t -= error / derivative;
    }
    return at(y1, y2, clamp01(t));
  };
}

const easeLogo = cubicBezier(0.22, 0.61, 0.24, 1);
const easeOutQuad = cubicBezier(0.25, 0.46, 0.45, 0.94);
const easeOutCubic = cubicBezier(0.215, 0.61, 0.355, 1);

/** One repeat pass of the loader; `cycle` runs 0…SPLASH_LOOP_PERIOD. */
export function splashLoopPill(cycle: number) {
  const fadeIn = smooth(clamp01(cycle / LOADER_FADE));
  const fadeOut = 1 - smooth(clamp01((cycle - LOOP_FADE_OUT_START) / SPLASH_LOOP_FADE_OUT));
  return { opacity: Math.min(fadeIn, fadeOut), progress: smooth(clamp01(cycle / SWEEP)) };
}

function pillAt(t: number) {
  if (t <= SPLASH_ENTRANCE) {
    return {
      opacity: smooth(clamp01((t - SPLASH_LOADER_START) / LOADER_FADE)),
      progress: smooth(clamp01((t - SPLASH_LOADER_START) / SWEEP)),
    };
  }
  const held = t - SPLASH_ENTRANCE;
  if (held < SPLASH_LOOP_FADE_OUT) return { opacity: 1 - smooth(held / SPLASH_LOOP_FADE_OUT), progress: 1 };
  return splashLoopPill((held - SPLASH_LOOP_FADE_OUT) % SPLASH_LOOP_PERIOD);
}

export function splashFrame(time: number): SplashFrame {
  const t = Math.max(0, time);
  const glow = easeOutQuad(clamp01(t / GLOW_RAMP));
  const warm = clamp01(t / ((SPLASH_ENTRANCE * 35) / 36));
  const enter = easeLogo(clamp01(t / LOGO_ENTER));
  const tagline = easeOutCubic(clamp01((t - TAGLINE_START) / (TAGLINE_END - TAGLINE_START)));
  const pill = pillAt(t);
  return {
    warmTopAlpha: 0.1 + 0.05 * warm,
    warmBottomAlpha: 0.18 + 0.14 * warm,
    glowAlpha: 0.13 * glow,
    glowScale: 0.97 + 0.06 * glow,
    logoOpacity: enter,
    logoOffsetY: lerp(18, 0, enter),
    logoScale: lerp(0.968, 1, enter),
    taglineOpacity: tagline,
    taglineOffsetY: (1 - tagline) * 14,
    trackAlpha: 0.085 * smooth(clamp01((t - SPLASH_LOADER_START) / LOADER_FADE)),
    pillOpacity: pill.opacity,
    pillProgress: pill.progress,
  };
}
