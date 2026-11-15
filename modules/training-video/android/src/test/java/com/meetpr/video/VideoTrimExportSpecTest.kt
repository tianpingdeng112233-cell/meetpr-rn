package com.meetpr.video

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class VideoTrimExportSpecTest {
  private fun source(width: Int, height: Int, rotation: Int = 0, bitrate: Int? = 8_000_000) =
    VideoTrimInfo(8000, 1, 1, width, height, rotation, "video/hevc", "audio/eac3", bitrate?.toDouble())

  @Test fun exportTargetsUploadFormatInDisplayOrientationWithoutUpscaling() {
    val cases = listOf(
      source(1920, 1080) to (1280 to 720),
      source(1080, 1920) to (720 to 1280),
      source(1920, 1080, 90) to (720 to 1280),
      source(1920, 1080, 270) to (720 to 1280),
      source(3840, 2160, 180) to (1280 to 720),
      source(640, 480) to (640 to 480),
      source(641, 481) to (640 to 480),
      source(1920, 1082) to (1280 to 720),
    )
    for ((input, dimensions) in cases) {
      val spec = videoTrimExportSpec(input)
      assertEquals(dimensions.first, spec.displayWidth)
      assertEquals(dimensions.second, spec.displayHeight)
      assertEquals("video/avc", spec.videoMime)
      assertEquals(2_750_000, spec.videoBitrate)
      assertEquals("audio/mp4a-latm", spec.audioMime)
      assertEquals(96_000, spec.audioBitrate)
    }
    assertEquals(700_000, videoTrimExportSpec(source(640, 480, bitrate = 700_000)).videoBitrate)
    assertEquals(2_750_000, videoTrimExportSpec(source(640, 480, bitrate = null)).videoBitrate)
  }

  @Test fun hdrBecomesSdrAndSilentSourcesStaySilent() {
    val hdr = source(3840, 2160).copy(isHdr = true)
    assertTrue(videoTrimExportSpec(hdr).toneMapToSdr)
    assertFalse(videoTrimExportSpec(source(640, 480)).toneMapToSdr)
    val silent = videoTrimExportSpec(hdr.copy(audioTrackCount = 0, audioMime = null))
    assertNull(silent.audioMime)
    assertNull(silent.audioBitrate)
  }

  @Test fun onlyWholeEligibleSdrSourcesCanBeCopied() {
    val eligible = source(1280, 720, bitrate = 3_500_000).copy(
      videoMime = "video/avc", audioMime = "audio/mp4a-latm", audioBitrate = 128_000.0)
    assertTrue(canCopyTrimSource(eligible, 0, 8000))
    assertTrue(canCopyTrimSource(eligible.copy(rotation = 90), 0, 8000))
    assertTrue(canCopyTrimSource(eligible.copy(audioTrackCount = 0, audioMime = null, audioBitrate = null), 0, 8000))
    assertFalse(canCopyTrimSource(eligible, 1, 8000))
    assertFalse(canCopyTrimSource(eligible, 0, 7999))
    assertFalse(canCopyTrimSource(eligible, 0, 8001))
    val ineligible = listOf(
      eligible.copy(width = 1282), eligible.copy(videoMime = "video/hevc"),
      eligible.copy(videoBitrate = 3_500_001.0), eligible.copy(videoBitrate = null),
      eligible.copy(videoBitrate = 0.0), eligible.copy(audioMime = "audio/eac3"),
      eligible.copy(audioBitrate = 128_001.0), eligible.copy(audioBitrate = null),
      eligible.copy(isHdr = true), eligible.copy(videoTrackCount = 2),
      eligible.copy(durationMs = 0),
    )
    for (input in ineligible) assertFalse(canCopyTrimSource(input, 0, 8000))
  }
}
