export type TrackMetadata = {
  codec: string | null;
  width: number;
  height: number;
  bitrate: number | null;
  /** null means no audio; undefined means unknown and must transcode. */
  audio?: { codec: string | null; bitrate: number | null } | null;
};
function within(value: number | null, cap: number): boolean {
  return value !== null && Number.isFinite(value) && value > 0 && value <= cap;
}
export function passthroughEligibility(
  meta: TrackMetadata,
): 'passthrough' | 'transcode' {
  const codec = meta.codec?.toLowerCase().replace(/[._ -]/g, '');
  const h264 =
    codec === 'h264' ||
    codec === 'avc' ||
    codec === 'video/avc' ||
    codec?.startsWith('avc1');
  const audio =
    meta.audio === null ||
    (meta.audio !== undefined &&
      ['aac', 'audio/mp4a-latm'].includes(
        meta.audio.codec?.toLowerCase() ?? '',
      ) &&
      within(meta.audio.bitrate, 128000));
  return h264 &&
    within(meta.width, 1280) &&
    within(meta.height, 1280) &&
    within(meta.bitrate, 3500000) &&
    audio
    ? 'passthrough'
    : 'transcode';
}
