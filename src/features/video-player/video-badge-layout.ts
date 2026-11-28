import type { VideoBadgeForm } from './badge-presentation';

export const cueLineUnits = 24;
export const cuePaddingUnits = 9;
export const cueGapUnits = 8;
export const cuePreviewLines = 3;

/** Pass player bounds in dp for playback, oriented render dimensions in px for export. */
export function videoBadgeLayout(width: number, height: number, form: VideoBadgeForm, fontScale = 1) {
  const scale = Math.max(0, Math.min(width, height * 9 / 16)) / 540;
  const left = 44 * scale;
  if (form === 'export') return { scale, left, bottom: 214 * scale };
  const maxCue = (2 * cuePaddingUnits + cuePreviewLines * cueLineUnits * fontScale) * scale;
  return { scale, left, bottom: Math.max(150 * scale, 44 + maxCue + cueGapUnits * scale) };
}

/** Anchor both gaps to the full measured controls, including wrapped text and large fonts. */
export function playbackCueLayout(geometry: ReturnType<typeof videoBadgeLayout>, cueHeight: number, railHeight: number, fontScale: number) {
  const { scale, bottom } = geometry;
  const preview = (2 * cuePaddingUnits + cuePreviewLines * cueLineUnits * fontScale) * scale;
  const trackPadding = Math.max(0, Math.min(72 * scale - railHeight / 2, bottom - 18 * scale - preview - railHeight));
  const cueBottom = trackPadding + railHeight + 8 * scale;
  return { trackPadding, cueBottom, badgeBottom: Math.max(bottom, cueBottom + Math.max(cueHeight, preview) + 10 * scale) };
}
