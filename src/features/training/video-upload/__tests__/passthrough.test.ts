import { test, expect } from '@jest/globals';
import { passthroughEligibility } from '../passthrough';
const meta = {
  codec: 'h264',
  width: 720,
  height: 1280,
  bitrate: 3500000,
  audio: { codec: 'aac', bitrate: 128000 },
};
test.each([
  [meta, 'passthrough'],
  [{ ...meta, codec: 'avc1.640028' }, 'passthrough'],
  [{ ...meta, codec: 'hevc' }, 'transcode'],
  [{ ...meta, height: 1281 }, 'transcode'],
  [{ ...meta, bitrate: 3500001 }, 'transcode'],
  [{ ...meta, audio: null }, 'passthrough'],
  [{ ...meta, audio: { codec: 'aac', bitrate: 128001 } }, 'transcode'],
  [{ ...meta, audio: { codec: 'opus', bitrate: 96000 } }, 'transcode'],
  [{ ...meta, audio: undefined }, 'transcode'],
  [{ ...meta, bitrate: null }, 'transcode'],
  [{ ...meta, width: 0 }, 'transcode'],
  [{ ...meta, bitrate: NaN }, 'transcode'],
] satisfies [import('../passthrough').TrackMetadata, string][])(
  'track boundaries %#',
  (input, expected) => {
    expect(passthroughEligibility(input)).toBe(expected);
  },
);
