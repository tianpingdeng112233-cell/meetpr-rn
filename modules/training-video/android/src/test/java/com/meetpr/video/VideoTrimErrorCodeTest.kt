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
    assertEquals("ERR_VIDEO_TRIM_BITRATE_UNKNOWN", videoTrimErrorCode(IllegalArgumentException("Cannot preserve unknown source bitrate")))
    assertEquals("ERR_VIDEO_TRIM_AUDIO_LOST", videoTrimErrorCode(IllegalArgumentException("Trim lost audio")))
    assertEquals("ERR_VIDEO_TRIM_DURATION_MISMATCH", videoTrimErrorCode(IllegalArgumentException("Inaccurate trim duration requested 4000 ms from 1000 got 4300 ms")))
  }

  @Test fun arbitraryExceptionTextCannotEnterCodes() {
    assertEquals("ERR_VIDEO_TRIM_IO", videoTrimErrorCode(java.io.IOException("content://private.mp4?token=secret")))
    assertEquals("ERR_VIDEO_TRIM_PERMISSION", videoTrimErrorCode(SecurityException("private.mp4")))
    assertEquals("ERR_VIDEO_TRIM_UNKNOWN", videoTrimErrorCode(IllegalStateException("user supplied text")))
  }
}
