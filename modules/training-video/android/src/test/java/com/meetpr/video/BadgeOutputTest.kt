package com.meetpr.video

import org.junit.Assert.*
import org.junit.Test

class BadgeOutputTest {
  private val source = VideoTrimInfo(3000, 1, 1, 1919, 1079, 90, "video/avc", "audio/aac", null)
  @Test fun nativeBurnBudgetHasAMinimumAndScalesWithTheSource() {
    assertEquals(60_000L, badgeTimeoutMs(3000))
    assertEquals(480_000L, badgeTimeoutMs(120_000))
  }

  @Test fun rotationMayBeBakedIntoPixelsAndOddEdgesMayRound() {
    assertNull(badgeOutputError(source, source.copy(width = 1080, height = 1920, rotation = 0)))
    assertNull(badgeOutputError(source, source.copy(width = 1917, durationMs = 3100)))
  }
  @Test fun changedOrientationResolutionDurationOrAudioRejectsWithReason() {
    assertEquals("BADGE_ORIENTATION_CHANGED", badgeOutputError(source, source.copy(rotation = 0)))
    assertEquals("BADGE_RESOLUTION_CHANGED", badgeOutputError(source, source.copy(width = 1916)))
    assertEquals("BADGE_DURATION_CHANGED", badgeOutputError(source, source.copy(durationMs = 2899)))
    assertEquals("BADGE_AUDIO_CHANGED", badgeOutputError(source, source.copy(audioTrackCount = 0)))
  }
}
