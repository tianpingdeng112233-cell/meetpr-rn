import type { TextStyle } from 'react-native';

import { fontNames } from './fonts';

/** DesignSystem v3, iOS release/1.0 @ 202e95db. */
export const palette = {
  // ChatFullScreenImage uses Color.black in both themes.
  chatImageBackground: { light: '#000000', dark: '#000000' },
  coachRequestBorder: { light: 'rgba(217,119,6,0.35)', dark: 'rgba(245,166,35,0.35)' },
  coachNoPlanBorder: { light: 'rgba(217,119,6,0.4)', dark: 'rgba(245,166,35,0.4)' },
  coachAcceptedBorder: { light: 'rgba(21,128,61,0.3)', dark: 'rgba(94,158,120,0.3)' },
  coachMissedFill: { light: 'rgba(229,72,77,0.16)', dark: 'rgba(229,72,77,0.16)' },
  videoStageFill: { light: '#1B2534', dark: '#1B2534' },
  videoStageBorder: { light: '#2A3646', dark: '#2A3646' },
  goldCTA: { light: '#B45309', dark: '#FFB800' },
  gold500: { light: '#D97706', dark: '#F5A623' },
  gold400: { light: '#F59E0B', dark: '#FBBF3E' },
  gold300: { light: '#FFD470', dark: '#FFD470' },
  gold200: { light: '#FEF3C7', dark: '#FFE28E' },
  goldText: { light: '#9A4A06', dark: '#F5A623' },
  gold700: { light: '#B8791A', dark: '#B8791A' },
  gold800: { light: '#9A6413', dark: '#9A6413' },
  gold900: { light: '#7A4E0E', dark: '#7A4E0E' },
  goldMuted: { light: '#B8935A', dark: '#B8935A' },
  goldGradientStart: { light: '#D97706', dark: '#E08F0F' },
  goldGradientEnd: { light: '#F5B93C', dark: '#FFC93C' },
  holdTrack: { light: '#17120A', dark: '#17120A' },
  goldBarDeep: { light: '#A9731C', dark: '#A9731C' },
  bgBase: { light: '#F5F6F8', dark: '#0A0A0C' },
  bgInset: { light: '#FAFAFB', dark: '#101014' },
  bgStack: { light: '#EEF0F3', dark: '#121217' },
  bgDeep: { light: '#EDEEF1', dark: '#050506' },
  surfaceCard: { light: '#FFFFFF', dark: '#141416' },
  surfaceElevated: { light: '#FFFFFF', dark: '#161618' },
  surfaceKey: { light: '#F3F4F6', dark: '#1C1C20' },
  surfaceRaised: { light: '#EEF0F3', dark: '#232327' },
  surfaceFocus: { light: '#0F0F12', dark: '#0F0F12' },
  reviewHeroTop: { light: '#F7F0E4', dark: '#17120A' },
  borderHairline: { light: '#E9EBEE', dark: '#17171A' },
  borderSubtle: { light: '#E5E7EB', dark: '#1E1E22' },
  borderDefault: { light: '#E5E7EB', dark: '#262629' },
  borderStrong: { light: '#D1D5DB', dark: '#2E2E32' },
  textPrimary: { light: '#111827', dark: '#EDEDED' },
  textSecondary: { light: '#4B5563', dark: '#C8C8CC' },
  textTertiary: { light: '#5C6371', dark: '#A1A1A6' },
  textMuted: { light: '#5C6371', dark: '#8A8A90' },
  textFaint: { light: '#5C6371', dark: '#8A8A90' },
  textDim: { light: '#5C6371', dark: '#8A8A90' },
  textDisabled: { light: '#9CA3AF', dark: '#55555C' },
  textGhost: { light: '#D1D5DB', dark: '#3E3E44' },
  coachNoteText: { light: '#4B5563', dark: '#C4C4C8' },
  success: { light: '#15803D', dark: '#5E9E78' },
  successSoft: { light: '#15803D', dark: '#9FC7AE' },
  danger: { light: '#E5484D', dark: '#E5484D' },
  dangerMuted: { light: '#A33B40', dark: '#C88888' },
  dangerFill: { light: '#C0343A', dark: '#C0343A' },
  chartLine: { light: '#9AA4B0', dark: '#DCE3EA' },
  inkOnGold: { light: '#FFFFFF', dark: '#141414' },
  ctaBackground: { light: '#111827', dark: '#FFB800' },
  ctaText: { light: '#FFFFFF', dark: '#141414' },
  ctaFill: { light: '#111827', dark: '#111827' },
  inkOnCTAFill: { light: '#FFFFFF', dark: '#FFFFFF' },
  desk1: { light: '#E9E9EE', dark: '#1A1A1E' },
  desk2: { light: '#D2D2D9', dark: '#050506' },
  ctaTopHighlight: { light: '#FFFFFF', dark: '#FFFFFF' },
  ctaBottomShade: { light: '#000000', dark: '#783C00' },
  bezel: { light: '#1C1C1E', dark: '#1C1C1E' },
  bezelEdge: { light: '#2A2A2D', dark: '#2A2A2D' },
  goldSoft: { light: 'rgba(217,119,6,0.14)', dark: 'rgba(245,166,35,0.14)' },
  medalStatTile: { light: 'rgba(255,255,255,0.55)', dark: 'rgba(0,0,0,0.35)' },
  successTint: { light: 'rgba(21,128,61,0.14)', dark: 'rgba(94,158,120,0.14)' },
  dangerSoft: { light: 'rgba(229,72,77,0.14)', dark: 'rgba(229,72,77,0.14)' },
  cardShadow: { light: 'rgba(17,24,39,0.06)', dark: 'rgba(17,24,39,0)' },
  modalShadow: { light: 'rgba(0,0,0,0.5)', dark: 'rgba(0,0,0,0.5)' },
  chatPlanBadgeFill: { light: 'rgba(230,190,85,0.14)', dark: 'rgba(230,190,85,0.14)' },
  goldRGB: { light: '#D97706', dark: '#F5A623' },
  accent: { light: '#D97706', dark: '#F5A623' },
  textHeading: { light: '#111827', dark: '#EDEDED' },
  textBody: { light: '#4B5563', dark: '#C8C8CC' },
  successRGB: { light: '#15803D', dark: '#5E9E78' },
  dangerRGB: { light: '#E5484D', dark: '#E5484D' },
  unread: { light: '#C0343A', dark: '#C0343A' },
} as const;

/** @deprecated Archived pre-v3 values. New consumers must use palette semantics. */
export const legacyPalette = {
  light: {
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
  },
  dark: {
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
  },
} as const;


export type Scheme = 'light' | 'dark';
export type Colors = { [K in keyof typeof palette | keyof typeof legacyPalette.light]: string };

export function resolveColors(scheme: Scheme): Colors {
  // New semantics win the shared borderStrong name; archived values stay intact above.
  return {
    ...legacyPalette[scheme],
    ...Object.fromEntries(Object.entries(palette).map(([name, value]) => [name, value[scheme]])),
  } as Colors;
}

/** Light snapshot for transitional static StyleSheet styles only. Prefer useColors in components. */
export const colors = resolveColors('light');

export const font = {
  display(size: number, weight: keyof typeof fontNames.display = 'extraBold'): TextStyle {
    return { fontFamily: fontNames.display[weight], fontSize: size };
  },
  body(size: number, weight: keyof typeof fontNames.body = 'regular'): TextStyle {
    return { fontFamily: fontNames.body[weight], fontSize: size };
  },
  mono(size: number, weight: keyof typeof fontNames.mono = 'regular'): TextStyle {
    return { fontFamily: fontNames.mono[weight], fontSize: size, fontVariant: ['tabular-nums'] };
  },
};

export const typography = {
  displayHero: font.display(54),
  title1: font.display(34),
  title2: font.display(28),
  headline: font.display(20),
  body: font.body(17),
  bodyEmphasis: font.body(17, 'semibold'),
  footnote: font.body(13),
  caption: font.body(11, 'medium'),
  monoLabel: { ...font.mono(12, 'semibold'), letterSpacing: 0.6 },
  displayNumeral: { ...font.display(54), fontVariant: ['tabular-nums'] },
  displayUnit: { ...font.mono(24, 'bold'), letterSpacing: 0.8 },
} satisfies Record<string, TextStyle>;

export const fontMetrics = {
  size8: 8,
  size9: 9,
  size10: 10,
  size11: 11,
  size12: 12,
  size13: 13,
  size14: 14,
  size15: 15,
  size16: 16,
  size17: 17,
  size18: 18,
  size19: 19,
  size20: 20,
  size21: 21,
  size22: 22,
  size23: 23,
  size24: 24,
  size26: 26,
  size27: 27,
  size28: 28,
  size30: 30,
  size32: 32,
  size34: 34,
  size36: 36,
  size38: 38,
  size40: 40,
  size44: 44,
  size46: 46,
  size48: 48,
  size50: 50,
  size54: 54,
  size64: 64,
} as const;

export const spacing = {
  zero: 0, point1: 1, point2: 2, point3: 3, point5: 5, point6: 6, point7: 7, point9: 9, point10: 10, point11: 11, point13: 13, point14: 14, point15: 15, point18: 18, point22: 22, point26: 26, point28: 28, point30: 30, point32: 32, point40: 40, size46: 46, point52: 52, point56: 56,
  space1: 4, space2: 8, space3: 12, space4: 16, space5: 20, space6: 24,
  xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
  pageHorizontal: 20, compactPageHorizontal: 16, cardHorizontal: 16,
  minimumHitTarget: 44, completionControlHeight: 58,
} as const;

export const radius = {
  micro: 4, inset: 10, control: 12, card: 16, modal: 20, chip: 12, pill: 999,
  sm: 12, md: 10, lg: 12, xl: 16,
} as const;

export const motion = {
  curve: [0.32, 0.72, 0, 1] as const, fast: 200, base: 240, slow: 280,
} as const;

export const theme = { colors, typography, spacing, radius, motion } as const;
