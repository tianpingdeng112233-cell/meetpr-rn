package com.meetpr.video

import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.ExportException
import java.io.IOException

@UnstableApi
internal fun videoTrimFailureCategory(errorCode: Int, isVideo: Boolean?): TrimFailure = when (errorCode) {
  ExportException.ERROR_CODE_AUDIO_PROCESSING_FAILED -> TrimFailure.AUDIO
  ExportException.ERROR_CODE_VIDEO_FRAME_PROCESSING_FAILED -> TrimFailure.HDR
  ExportException.ERROR_CODE_DECODER_INIT_FAILED,
  ExportException.ERROR_CODE_DECODING_FAILED,
  ExportException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED,
  ExportException.ERROR_CODE_ENCODER_INIT_FAILED,
  ExportException.ERROR_CODE_ENCODING_FAILED,
  ExportException.ERROR_CODE_ENCODING_FORMAT_UNSUPPORTED -> when (isVideo) {
    false -> TrimFailure.AUDIO
    true -> TrimFailure.HDR
    null -> TrimFailure.OTHER
  }
  else -> TrimFailure.OTHER
}

/** No exception, URI, codec name or format string is accepted by this boundary. */
internal fun videoTrimFallbackCode(sourceHasAudio: Boolean, previous: VideoTrimAttempt?, next: VideoTrimAttempt): String? = when {
  sourceHasAudio && !next.retainAudio && previous == null -> "AUDIO_DROPPED_NO_DECODER"
  previous?.retainAudio == true && !next.retainAudio -> "AUDIO_DROPPED_PROCESSING"
  previous != null && previous.hdrMode != next.hdrMode -> when (next.hdrMode) {
    TrimHdrMode.MEDIA_CODEC -> "HDR_FALLBACK_MEDIACODEC"
    TrimHdrMode.INTERPRET_AS_SDR -> "HDR_FALLBACK_INTERPRET_AS_SDR"
    else -> null
  }
  else -> null
}

/** Only fixed tokens/numeric Media3 codes cross the diagnostics boundary. */
@UnstableApi
internal fun videoTrimErrorCode(error: Exception): String {
  if (error is ExportException) return "ERR_VIDEO_TRIM_MEDIA3_${error.errorCode}"
  val reason = when (error.message) {
    "Invalid video source" -> "INVALID_SOURCE"
    "Selection exceeds source" -> "INVALID_SELECTION"
    "Empty trim output" -> "EMPTY_OUTPUT"
    "Trim lost audio" -> "AUDIO_LOST"
    "Trim changed display aspect or orientation" -> "ASPECT_RATIO_CHANGED"
    "Trim enlarged source" -> "OUTPUT_UPSCALED"
    "Trim output is HDR" -> "HDR_NOT_SDR"
    "Trim added audio" -> "UNEXPECTED_AUDIO"
    "Video trim cancelled" -> "CANCELLED"
    else -> when {
      error.message?.startsWith("Inaccurate trim duration requested ") == true -> "DURATION_MISMATCH"
      error is SecurityException -> "PERMISSION"
      error is IOException -> "IO"
      else -> "UNKNOWN"
    }
  }
  return "ERR_VIDEO_TRIM_$reason"
}
