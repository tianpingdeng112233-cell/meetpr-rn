import type { TextStyle } from 'react-native';

/** V0.1 renders this dark palette directly; there is no runtime theme branch. */
export const darkColors = {
  brandRed: '#E5221E',
  brandRedPress: '#B81A17',
  brandRedSoft: 'rgba(229,34,30,0.12)',
  green: '#1FB358',
  greenSoft: 'rgba(31,179,88,0.14)',
  amber: '#E0A810',
  amberSoft: 'rgba(224,168,16,0.14)',
  bg: '#000000',
  surface1: '#0E0E0E',
  surface2: '#161616',
  surface3: '#1F1F1F',
  border: '#262626',
  borderStrong: '#3A3A3A',
  fgPrimary: '#FFFFFF',
  fgSecondary: '#B5B5B5',
  fgTertiary: '#737373',
  fgDisabled: 'rgba(255,255,255,0.35)',
} as const;

/** Archived iOS light values for a possible later theme; V0.1 must not render them. */
export const lightColors = {
  brandRed: '#E5221E',
  brandRedPress: '#B81A17',
  brandRedSoft: 'rgba(229,34,30,0.08)',
  green: '#1FB358',
  greenSoft: 'rgba(31,179,88,0.14)',
  amber: '#E0A810',
  amberSoft: 'rgba(224,168,16,0.14)',
  bg: '#FAFAFA',
  surface1: '#FFFFFF',
  surface2: '#F4F4F5',
  surface3: '#E9E9EB',
  border: '#E5E5E5',
  borderStrong: '#C9C9C9',
  fgPrimary: '#0A0A0A',
  fgSecondary: '#525252',
  fgTertiary: '#A3A3A3',
  fgDisabled: 'rgba(10,10,10,0.35)',
} as const;

export const colors = darkColors;

export const typography = {
  // iOS uses .leading(.tight) on the two display levels; exact pixel parity is
  // calibrated at the W3 side-by-side screenshot pass.
  displayHero: {
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 48,
  },
  title1: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 37,
  },
  title2: {
    fontSize: 28,
    fontWeight: '700',
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
  },
  bodyEmphasis: {
    fontSize: 17,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
  },
  monoLabel: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.96,
  },
  displayNumeral: {
    fontSize: 60,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  displayUnit: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.96,
  },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const motion = {
  curve: [0.32, 0.72, 0, 1] as const,
  fast: 200,
  base: 240,
  slow: 280,
} as const;

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  motion,
} as const;
