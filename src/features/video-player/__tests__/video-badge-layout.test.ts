import { expect, test } from '@jest/globals';
import { playbackCueLayout, videoBadgeLayout } from '../video-badge-layout';

test.each([
  [1080, 1920, 2, 88, 428, 300],
  [1920, 1080, 1.125, 49.5, 240.75, 168.75],
  [1080, 1440, 1.5, 66, 321, 225],
])('anchors the card to the %s × %s container', (width, height, scale, left, exportBottom, playbackBottom) => {
  expect(videoBadgeLayout(width, height, 'export')).toMatchObject({ scale, left, bottom: exportBottom });
  expect(videoBadgeLayout(width, height, 'playback')).toMatchObject({ scale, left, bottom: playbackBottom });
});

test('a short landscape player reserves a three-line cue and 44dp rail for playback only', () => {
  expect(videoBadgeLayout(760, 360, 'playback').bottom).toBe(80.75);
  expect(videoBadgeLayout(760, 360, 'export').bottom).toBe(80.25);
});

test.each([[360, 740, 26, 44], [760, 360, 96, 44], [540, 960, 170, 66]])(
  'wrapped cues fit between badge and rail at %s × %s', (w, h, measuredCue, railHeight) => {
    const g = videoBadgeLayout(w, h, 'playback');
    const footer = playbackCueLayout(g, measuredCue, railHeight, 1);
    expect(footer.cueBottom - footer.trackPadding - railHeight).toBeCloseTo(8 * g.scale);
    expect(footer.badgeBottom - footer.cueBottom - measuredCue).toBeGreaterThanOrEqual(10 * g.scale - 0.001);
  });
