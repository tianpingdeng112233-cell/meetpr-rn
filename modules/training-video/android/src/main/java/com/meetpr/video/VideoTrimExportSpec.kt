package com.meetpr.video

/** Upload target, expressed in display coordinates after the source rotation is applied. */
internal data class VideoTrimExportSpec(
  val displayWidth: Int,
  val displayHeight: Int,
  val videoBitrate: Int,
  val videoMime: String = "video/avc",
  val audioMime: String?,
  val audioBitrate: Int?,
  val toneMapToSdr: Boolean,
)

internal fun videoTrimExportSpec(source: VideoTrimInfo): VideoTrimExportSpec {
  require(source.width >= 2 && source.height >= 2) { "Invalid video source" }
  val scale = minOf(1.0, 1280.0 / maxOf(source.displayWidth, source.displayHeight))
  // Round down to encoder-compatible even edges; never enlarge the source.
  fun even(value: Int) = maxOf(2, (value * scale).toInt() / 2 * 2)
  return VideoTrimExportSpec(
    displayWidth = even(source.displayWidth),
    displayHeight = even(source.displayHeight),
    videoBitrate = minOf(2_750_000.0, source.videoBitrate?.takeIf { it.isFinite() && it > 0 } ?: 2_750_000.0).toInt().coerceAtLeast(1),
    audioMime = if (source.audioTrackCount > 0) "audio/mp4a-latm" else null,
    // Leave headroom for AAC encoders whose measured average exceeds the requested rate.
    audioBitrate = if (source.audioTrackCount > 0) 96_000 else null,
    toneMapToSdr = source.isHdr,
  )
}

/** Mirrors passthrough.ts. Unknown rates must never be assumed eligible. */
internal fun trimOutputIsPassthrough(info: VideoTrimInfo): Boolean =
  info.videoMime == "video/avc" && info.width in 1..1280 && info.height in 1..1280 &&
    info.videoBitrate?.let { it.isFinite() && it > 0 && it <= 3_500_000 } == true &&
    (info.audioTrackCount == 0 || (info.audioMime == "audio/mp4a-latm" &&
      info.audioBitrate?.let { it.isFinite() && it > 0 && it <= 128_000 } == true))

internal fun canCopyTrimSource(source: VideoTrimInfo, startMs: Long, endMs: Long): Boolean =
  startMs == 0L && endMs == source.durationMs && source.durationMs > 0 &&
    source.videoTrackCount == 1 && !source.isHdr && trimOutputIsPassthrough(source)
