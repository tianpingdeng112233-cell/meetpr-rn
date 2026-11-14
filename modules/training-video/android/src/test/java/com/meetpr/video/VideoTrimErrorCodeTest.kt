package com.meetpr.video

import androidx.media3.transformer.ExportException
import org.junit.Assert.assertEquals
import org.junit.Test

class VideoTrimErrorCodeTest {
  @Test fun transformerFailureKeepsItsNumericCode() {
    val error = ExportException.createForUnexpected(IllegalStateException("file:///private.mp4"))
    assertEquals("ERR_VIDEO_TRIM_MEDIA3_1001", videoTrimErrorCode(error))
  }

  @Test fun validationFailuresRemainDistinguishable() {
    assertEquals("ERR_VIDEO_TRIM_ASPECT_RATIO_CHANGED", videoTrimErrorCode(IllegalArgumentException("Trim changed display aspect or orientation")))
    assertEquals("ERR_VIDEO_TRIM_OUTPUT_UPSCALED", videoTrimErrorCode(IllegalArgumentException("Trim enlarged source")))
    assertEquals("ERR_VIDEO_TRIM_HDR_NOT_SDR", videoTrimErrorCode(IllegalArgumentException("Trim output is HDR")))
    assertEquals("ERR_VIDEO_TRIM_UNEXPECTED_AUDIO", videoTrimErrorCode(IllegalArgumentException("Trim added audio")))
    assertEquals("ERR_VIDEO_TRIM_AUDIO_LOST", videoTrimErrorCode(IllegalArgumentException("Trim lost audio")))
    assertEquals("ERR_VIDEO_TRIM_DURATION_MISMATCH", videoTrimErrorCode(IllegalArgumentException("Inaccurate trim duration requested 4000 ms from 1000 got 4300 ms")))
  }

  @Test fun arbitraryExceptionTextCannotEnterCodes() {
    assertEquals("ERR_VIDEO_TRIM_IO", videoTrimErrorCode(java.io.IOException("content://private.mp4?token=secret")))
    assertEquals("ERR_VIDEO_TRIM_PERMISSION", videoTrimErrorCode(SecurityException("private.mp4")))
    assertEquals("ERR_VIDEO_TRIM_UNKNOWN", videoTrimErrorCode(IllegalStateException("user supplied text")))
  }
}
