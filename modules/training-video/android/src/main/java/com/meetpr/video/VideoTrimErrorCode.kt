package com.meetpr.video

import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.ExportException
import java.io.IOException

/** Only fixed tokens/numeric Media3 codes cross the diagnostics boundary. */
@UnstableApi
internal fun videoTrimErrorCode(error: Exception): String {
  if (error is ExportException) return "ERR_VIDEO_TRIM_MEDIA3_${error.errorCode}"
  val reason = when (error.message) {
    "Invalid video source" -> "INVALID_SOURCE"
    "Selection exceeds source" -> "INVALID_SELECTION"
    "Cannot preserve unknown source bitrate" -> "BITRATE_UNKNOWN"
    "Empty trim output" -> "EMPTY_OUTPUT"
    "Trim lost audio" -> "AUDIO_LOST"
    "Trim changed display dimensions" -> "DIMENSIONS_CHANGED"
    "Trim format fallback is not permitted" -> "FORMAT_FALLBACK"
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
