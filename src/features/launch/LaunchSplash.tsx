import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  resolveSplashPhase,
  SPLASH_ENTRANCE,
  SPLASH_EXIT,
  SPLASH_LOOP_FADE_OUT,
  SPLASH_LOOP_PERIOD,
  splashFrame,
  splashLoopPill,
  type SplashFrame,
} from './splash-timeline';

// Geometry in the design's 1080-wide canvas, measured from the screen centre.
const CANVAS_WIDTH = 1080;
const CANVAS_MIN_HEIGHT = 1400;
const LOGO_WIDTH = 832;
const LOGO_HEIGHT = (LOGO_WIDTH * 605) / 2443;
const LOGO_CENTER_Y = -78.2;
const TAGLINE_CENTER_Y = 99.05;
const TAGLINE_SIZE = 44;
const TAGLINE_LINE = 48.4;
const LOADER_CENTER_Y = 161.25;
const TRACK_WIDTH = 196;
const PILL_WIDTH = 57;
const BAR_HEIGHT = 4;
const GLOW_CENTER_Y = -76.8;
const GLOW_RADIUS_X = 604.8;
const GLOW_RADIUS_Y = 652.8;

// Light-only by design, in dark appearance too.
const PAPER = '#F5F6F8';
const INK = '#101726';
const EMBER = '#E6681E';
const WARM = '#E89656';
const WARM_TOP_MAX = 0.15;
const WARM_BOTTOM_MAX = 0.32;
const GLOW_MAX = 0.13;
const TRACK_MAX = 0.085;
// The system splash is flat paper; ease the gradient in instead of popping it.
const BACKDROP_IN = 0.15;

const SAMPLE = 1 / 60;
const sampleTimes = (end: number) =>
  Array.from({ length: Math.round(end / SAMPLE) + 1 }, (_, index) => Math.min(end, index * SAMPLE));
const ENTRANCE_TIMES = sampleTimes(SPLASH_ENTRANCE + SPLASH_LOOP_FADE_OUT);
const ENTRANCE_FRAMES = ENTRANCE_TIMES.map(splashFrame);
const LOOP_TIMES = sampleTimes(SPLASH_LOOP_PERIOD);
const LOOP_FRAMES = LOOP_TIMES.map(splashLoopPill);

const background = require('../../../assets/images/launch-splash-background.png');
const wordmark = require('../../../assets/images/launch-splash-wordmark.png');

type Props = {
  /** The first screen behind the splash is usable. */
  ready: boolean;
  /** Fired once, after the exit fade; the splash never comes back. */
  onGone: () => void;
};

export function LaunchSplash({ ready, onGone }: Props) {
  const { width, height } = useWindowDimensions();
  const unit = Math.min(width / CANVAS_WIDTH, height / CANVAS_MIN_HEIGHT);
  const [clock] = useState(() => new Animated.Value(0));
  const [loopClock] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [exitFinished, setExitFinished] = useState(false);
  const phase = resolveSplashPhase({ animationFinished, firstScreenReady: ready, reduceMotion, exitFinished });

  useEffect(() => {
    let cancelled = false;
    let entrance: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduced => {
      if (cancelled) return;
      if (reduced) {
        clock.setValue(SPLASH_ENTRANCE);
        setReduceMotion(true);
        return;
      }
      entrance = Animated.timing(clock, {
        toValue: SPLASH_ENTRANCE, duration: SPLASH_ENTRANCE * 1000, easing: Easing.linear, useNativeDriver: true,
      });
      entrance.start(({ finished }) => { if (finished) setAnimationFinished(true); });
    });
    return () => { cancelled = true; entrance?.stop(); };
  }, [clock]);

  useEffect(() => {
    if (phase !== 'loading') return;
    const fadeOut = Animated.timing(clock, {
      toValue: SPLASH_ENTRANCE + SPLASH_LOOP_FADE_OUT, duration: SPLASH_LOOP_FADE_OUT * 1000, easing: Easing.linear, useNativeDriver: true,
    });
    const loop = Animated.loop(Animated.timing(loopClock, {
      toValue: SPLASH_LOOP_PERIOD, duration: SPLASH_LOOP_PERIOD * 1000, easing: Easing.linear, useNativeDriver: true,
    }));
    fadeOut.start(({ finished }) => { if (finished) loop.start(); });
    return () => { fadeOut.stop(); loop.stop(); };
  }, [clock, loopClock, phase]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const fade = Animated.timing(exit, {
      toValue: 0, duration: SPLASH_EXIT * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    });
    fade.start(({ finished }) => { if (finished) setExitFinished(true); });
    return () => fade.stop();
  }, [exit, phase]);

  useEffect(() => { if (exitFinished) onGone(); }, [exitFinished, onGone]);

  const motion = useMemo(() => {
    const along = (pick: (frame: SplashFrame) => number) =>
      clock.interpolate({ inputRange: ENTRANCE_TIMES, outputRange: ENTRANCE_FRAMES.map(pick), extrapolate: 'clamp' });
    const travel = (TRACK_WIDTH - PILL_WIDTH) * unit;
    return {
      backdrop: clock.interpolate({ inputRange: [0, BACKDROP_IN], outputRange: [0, 1], extrapolate: 'clamp' }),
      warmTop: along(frame => frame.warmTopAlpha / WARM_TOP_MAX),
      warmBottom: along(frame => frame.warmBottomAlpha / WARM_BOTTOM_MAX),
      glowOpacity: along(frame => frame.glowAlpha / GLOW_MAX),
      glowScale: along(frame => frame.glowScale),
      logoOpacity: along(frame => frame.logoOpacity),
      logoTranslate: along(frame => frame.logoOffsetY * unit),
      logoScale: along(frame => frame.logoScale),
      taglineOpacity: along(frame => frame.taglineOpacity),
      taglineTranslate: along(frame => frame.taglineOffsetY * unit),
      trackOpacity: along(frame => frame.trackAlpha / TRACK_MAX),
      pillOpacity: along(frame => frame.pillOpacity),
      pillTranslate: along(frame => frame.pillProgress * travel),
      loopOpacity: loopClock.interpolate({ inputRange: LOOP_TIMES, outputRange: LOOP_FRAMES.map(frame => frame.opacity) }),
      loopTranslate: loopClock.interpolate({ inputRange: LOOP_TIMES, outputRange: LOOP_FRAMES.map(frame => frame.progress * travel) }),
    };
  }, [clock, loopClock, unit]);

  if (phase === 'removed') return null;

  const centerY = height / 2;
  const bar = { borderRadius: BAR_HEIGHT * unit, height: BAR_HEIGHT * unit };
  const pill = [styles.pill, bar, { boxShadow: `0 0 ${6 * unit}px rgba(230, 104, 30, 0.55)`, width: PILL_WIDTH * unit }];

  return (
    <Animated.View
      accessibilityLabel="MeetPR"
      accessible
      style={[StyleSheet.absoluteFill, styles.root, { opacity: exit }]}
      testID="launch-splash">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: motion.backdrop }]}>
        <Image resizeMode="cover" source={background} style={{ height, width }} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: motion.warmTop }]}>
          <Svg height={height} width={width}>
            <Defs>
              <LinearGradient id="warmTop" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor={WARM} stopOpacity={WARM_TOP_MAX} />
                <Stop offset="0.46" stopColor="#F7F1E9" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#warmTop)" height={height} width={width} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: motion.warmBottom }]}>
          <Svg height={height} width={width}>
            <Defs>
              <LinearGradient id="warmBottom" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={WARM_BOTTOM_MAX} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#warmBottom)" height={height} width={width} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={{
          height: 2 * GLOW_RADIUS_Y * unit,
          left: width / 2 - GLOW_RADIUS_X * unit,
          opacity: motion.glowOpacity,
          position: 'absolute',
          top: centerY + (GLOW_CENTER_Y - GLOW_RADIUS_Y) * unit,
          transform: [{ scale: motion.glowScale }],
          width: 2 * GLOW_RADIUS_X * unit,
        }}>
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient cx="50%" cy="50%" id="glow" rx="50%" ry="50%">
              <Stop offset="0" stopColor={EMBER} stopOpacity={GLOW_MAX} />
              <Stop offset="0.7" stopColor={EMBER} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" fill="url(#glow)" rx="50%" ry="50%" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={{
          height: LOGO_HEIGHT * unit,
          left: (width - LOGO_WIDTH * unit) / 2,
          opacity: motion.logoOpacity,
          position: 'absolute',
          top: centerY + (LOGO_CENTER_Y - LOGO_HEIGHT / 2) * unit,
          transform: [{ translateY: motion.logoTranslate }, { scale: motion.logoScale }],
          width: LOGO_WIDTH * unit,
        }}>
        <View style={{ filter: [{ dropShadow: { color: 'rgba(16, 23, 38, 0.12)', offsetX: 0, offsetY: 16 * unit, standardDeviation: 19 * unit } }] }}>
          <Image source={wordmark} style={{ height: LOGO_HEIGHT * unit, width: LOGO_WIDTH * unit }} />
        </View>
      </Animated.View>

      {/* Brand line stays in English in every locale (spec 099). */}
      <Animated.Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.tagline, {
          fontSize: TAGLINE_SIZE * unit,
          letterSpacing: -0.012 * TAGLINE_SIZE * unit,
          lineHeight: TAGLINE_LINE * unit,
          opacity: motion.taglineOpacity,
          top: centerY + (TAGLINE_CENTER_Y - TAGLINE_LINE / 2) * unit,
          transform: [{ translateY: motion.taglineTranslate }],
        }]}>
        Meet Every PR Together
      </Animated.Text>

      <View
        style={{
          height: BAR_HEIGHT * unit,
          left: (width - TRACK_WIDTH * unit) / 2,
          position: 'absolute',
          top: centerY + (LOADER_CENTER_Y - BAR_HEIGHT / 2) * unit,
          width: TRACK_WIDTH * unit,
        }}>
        <Animated.View style={[styles.track, bar, { opacity: motion.trackOpacity }]} />
        <Animated.View style={[pill, { opacity: motion.pillOpacity, transform: [{ translateX: motion.pillTranslate }] }]} />
        <Animated.View style={[pill, { opacity: motion.loopOpacity, transform: [{ translateX: motion.loopTranslate }] }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: EMBER, left: 0, position: 'absolute', top: 0 },
  root: { backgroundColor: PAPER, zIndex: 1000 },
  tagline: {
    color: INK,
    fontWeight: '700',
    includeFontPadding: false,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  track: { backgroundColor: `rgba(16, 23, 38, ${TRACK_MAX})`, width: '100%' },
});
