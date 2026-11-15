package com.meetpr.video

internal enum class TrimHdrMode { SDR, OPEN_GL, MEDIA_CODEC, INTERPRET_AS_SDR }
internal enum class TrimFailure { AUDIO, HDR, OTHER }

internal data class VideoTrimAttempt(
  val number: Int,
  val hdrMode: TrimHdrMode,
  val retainAudio: Boolean,
)

/** A single monotonic sequence: changing HDR mode never restores a dropped audio track. */
internal fun nextVideoTrimAttempt(
  source: VideoTrimInfo,
  audioDecoderAvailable: Boolean,
  previous: VideoTrimAttempt? = null,
  failure: TrimFailure = TrimFailure.OTHER,
  cancelled: Boolean = false,
): VideoTrimAttempt? = if (cancelled || (previous?.number ?: 0) >= 5) {
  null
} else if (previous == null) {
  VideoTrimAttempt(1, if (source.isHdr) TrimHdrMode.OPEN_GL else TrimHdrMode.SDR, source.audioTrackCount > 0 && source.audioMime != null && audioDecoderAvailable)
} else if (failure == TrimFailure.AUDIO && previous.retainAudio) {
  previous.copy(number = previous.number + 1, retainAudio = false)
} else if (failure == TrimFailure.HDR) {
  when (previous.hdrMode) {
    TrimHdrMode.OPEN_GL -> previous.copy(number = previous.number + 1, hdrMode = TrimHdrMode.MEDIA_CODEC)
    TrimHdrMode.MEDIA_CODEC -> previous.copy(number = previous.number + 1, hdrMode = TrimHdrMode.INTERPRET_AS_SDR)
    else -> null
  }
} else null
