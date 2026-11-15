package com.meetpr.video

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VideoTrimAttemptTest {
  private val source = VideoTrimInfo(8000, 1, 1, 1920, 1080, 0, "video/avc", "audio/eac3", 8_000_000.0)

  @Test fun sdrKeepsDecodableAudioAndDropsUnsupportedAudioBeforeExport() {
    assertEquals(VideoTrimAttempt(1, TrimHdrMode.SDR, true), nextVideoTrimAttempt(source, true))
    assertEquals(VideoTrimAttempt(1, TrimHdrMode.SDR, false), nextVideoTrimAttempt(source, false))
    assertEquals(false, nextVideoTrimAttempt(source.copy(audioTrackCount = 0, audioMime = null), true)?.retainAudio)
  }

  @Test fun hdrTriesOpenGlThenMediaCodecThenInterpretationAndStops() {
    val hdr = source.copy(isHdr = true)
    val first = nextVideoTrimAttempt(hdr, true)!!
    assertEquals(TrimHdrMode.OPEN_GL, first.hdrMode)
    val second = nextVideoTrimAttempt(hdr, true, first, TrimFailure.HDR)
    assertEquals(VideoTrimAttempt(2, TrimHdrMode.MEDIA_CODEC, true), second)
    val third = nextVideoTrimAttempt(hdr, true, second, TrimFailure.HDR)
    assertEquals(VideoTrimAttempt(3, TrimHdrMode.INTERPRET_AS_SDR, true), third)
    assertNull(nextVideoTrimAttempt(hdr, true, third, TrimFailure.HDR))
    assertNull(nextVideoTrimAttempt(source, true, nextVideoTrimAttempt(source, true), TrimFailure.HDR))
  }

  @Test fun audioRetryIsOnceAndNeverRestoredByHdrFallback() {
    val hdr = source.copy(isHdr = true)
    val first = nextVideoTrimAttempt(hdr, true)!!
    val silent = nextVideoTrimAttempt(hdr, true, first, TrimFailure.AUDIO)
    assertEquals(VideoTrimAttempt(2, TrimHdrMode.OPEN_GL, false), silent)
    assertNull(nextVideoTrimAttempt(hdr, true, silent, TrimFailure.AUDIO))
    val codec = nextVideoTrimAttempt(hdr, true, silent, TrimFailure.HDR)!!
    val last = nextVideoTrimAttempt(hdr, true, codec, TrimFailure.HDR)!!
    assertEquals(VideoTrimAttempt(4, TrimHdrMode.INTERPRET_AS_SDR, false), last)
    assertNull(nextVideoTrimAttempt(hdr, true, last, TrimFailure.HDR))
    val sdr = nextVideoTrimAttempt(source, true)!!
    assertEquals(VideoTrimAttempt(2, TrimHdrMode.SDR, false), nextVideoTrimAttempt(source, true, sdr, TrimFailure.AUDIO))
  }

  @Test fun cancellationAttemptLimitAndUnrelatedFailuresStopTheSequence() {
    val hdr = source.copy(isHdr = true)
    assertNull(nextVideoTrimAttempt(hdr, true, cancelled = true))
    val first = nextVideoTrimAttempt(hdr, true)!!
    for (failure in TrimFailure.entries) {
      assertNull(nextVideoTrimAttempt(hdr, true, first, failure, cancelled = true))
      assertNull(nextVideoTrimAttempt(hdr, true, first.copy(number = 5), failure))
    }
    assertNull(nextVideoTrimAttempt(hdr, true, first, TrimFailure.OTHER))
  }

  @Test fun audioFailureAtEveryHdrStageKeepsTheWholeExportWithinFourAttempts() {
    val hdr = source.copy(isHdr = true)
    for (audioStage in 0..2) {
      var attempt = nextVideoTrimAttempt(hdr, true)!!
      for (stage in 0..2) {
        if (stage == audioStage) {
          attempt = nextVideoTrimAttempt(hdr, true, attempt, TrimFailure.AUDIO)!!
          assertEquals(false, attempt.retainAudio)
        }
        if (stage < 2) attempt = nextVideoTrimAttempt(hdr, true, attempt, TrimFailure.HDR)!!
      }
      assertEquals(VideoTrimAttempt(4, TrimHdrMode.INTERPRET_AS_SDR, false), attempt)
      for (failure in TrimFailure.entries) assertNull(nextVideoTrimAttempt(hdr, true, attempt, failure))
    }
  }
}
