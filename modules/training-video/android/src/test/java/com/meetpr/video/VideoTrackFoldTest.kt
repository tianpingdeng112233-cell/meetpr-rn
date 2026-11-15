package com.meetpr.video

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VideoTrackFoldTest {
  private fun track(mime: String, width: Int = 1920, height: Int = 1080, isHdr: Boolean = false, bitrate: Double? = 19_000_000.0) =
    VideoTrackSummary(mime, width, height, isHdr, bitrate)

  @Test fun dolbyVisionAndItsBaseLayerCountAsOneHdrTrack() {
    // vivo X200 Pro, Dolby Vision profile 8.4: MediaExtractor lists the stream twice.
    val (count, video) = foldDolbyVisionTwin(listOf(track("video/dolby-vision", isHdr = true), track("video/hevc")))
    assertEquals(1, count)
    assertEquals("video/hevc", video?.mime)
    assertTrue(video?.isHdr == true)

    val (reversedCount, reversed) = foldDolbyVisionTwin(listOf(track("video/hevc"), track("video/dolby-vision", isHdr = true)))
    assertEquals(1, reversedCount)
    assertEquals("video/hevc", reversed?.mime)
  }

  @Test fun otherLayoutsKeepTheirTrackCount() {
    assertEquals(1, foldDolbyVisionTwin(listOf(track("video/avc"))).first)
    assertEquals(1, foldDolbyVisionTwin(listOf(track("video/dolby-vision", isHdr = true))).first)
    assertEquals(2, foldDolbyVisionTwin(listOf(track("video/avc"), track("video/avc", 640, 360))).first)
    assertEquals(2, foldDolbyVisionTwin(listOf(track("video/dolby-vision"), track("video/hevc", 1280, 720))).first)
    assertEquals(2, foldDolbyVisionTwin(listOf(track("video/dolby-vision"), track("video/dolby-vision"))).first)
    val (count, video) = foldDolbyVisionTwin(emptyList())
    assertEquals(0, count)
    assertNull(video)
  }
}
