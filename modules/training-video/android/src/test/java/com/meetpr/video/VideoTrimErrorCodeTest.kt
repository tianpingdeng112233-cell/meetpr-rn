package com.meetpr.video

import androidx.media3.transformer.ExportException
import org.junit.Assert.assertEquals
import org.junit.Test

class VideoTrimErrorCodeTest {
  @Test fun fallbackDiagnosticsAreFixedTokensAndOnlyDescribeActualTransitions() {
    val initial = VideoTrimAttempt(1, TrimHdrMode.OPEN_GL, true)
    assertEquals(null, videoTrimFallbackCode(true, null, initial))
    assertEquals("AUDIO_DROPPED_NO_DECODER", videoTrimFallbackCode(true, null, initial.copy(retainAudio = false)))
    assertEquals(null, videoTrimFallbackCode(false, null, initial.copy(retainAudio = false)))
    val silent = initial.copy(number = 2, retainAudio = false)
    assertEquals("AUDIO_DROPPED_PROCESSING", videoTrimFallbackCode(true, initial, silent))
    val codec = silent.copy(number = 3, hdrMode = TrimHdrMode.MEDIA_CODEC)
    assertEquals("HDR_FALLBACK_MEDIACODEC", videoTrimFallbackCode(true, silent, codec))
    val interpreted = codec.copy(number = 4, hdrMode = TrimHdrMode.INTERPRET_AS_SDR)
    assertEquals("HDR_FALLBACK_INTERPRET_AS_SDR", videoTrimFallbackCode(true, codec, interpreted))
    assertEquals(null, videoTrimFallbackCode(true, interpreted, interpreted))
  }

  @Test fun audioAndHdrFailuresAreClassifiedWithoutInspectingPrivateCodecText() {
    for (code in listOf(3001, 3002, 3003, 4001, 4002, 4003)) {
      assertEquals(TrimFailure.AUDIO, videoTrimFailureCategory(code, false))
      assertEquals(TrimFailure.HDR, videoTrimFailureCategory(code, true))
      assertEquals(TrimFailure.OTHER, videoTrimFailureCategory(code, null))
    }
    assertEquals(TrimFailure.AUDIO, videoTrimFailureCategory(6001, null))
    assertEquals(TrimFailure.HDR, videoTrimFailureCategory(5001, null))
    for (code in listOf(1001, 2000, 2005, 7001, 7002)) {
      assertEquals(TrimFailure.OTHER, videoTrimFailureCategory(code, false))
      assertEquals(TrimFailure.OTHER, videoTrimFailureCategory(code, true))
    }
  }

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
