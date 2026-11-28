package com.meetpr.video

import org.junit.Assert.*
import org.junit.Test

class GalleryOrphansTest {
  @Test fun legacySweepRequiresPrivateOwnerHiddenSuffixAndOlderModification() {
    fun stale(name: String, modified: Long) = GalleryOrphans.staleHidden(name, "our-token", modified, 5000)
    assertTrue(stale(".meetpr-our-token-123.pending", 4999))
    assertFalse(stale(".meetpr-other-123.pending", 4999))
    assertFalse(stale(".meetpr-our-token-123.mp4", 4999))
    assertFalse(stale(".meetpr-our-token-123.pending", 5000))
  }

  @Test fun scopedRowsRequireOwnershipAndCreationBeforeProcessStart() {
    val id = "12345678-aaaa-4000-bbbb-123456789abc"
    fun stale(name: String, seconds: Long = 5, own: Boolean = true) =
      GalleryOrphans.staleRow(name, "our-token", seconds, 5500) { own }
    assertTrue(stale("MeetPR-our-token-5499-$id.mp4"))
    assertFalse(stale("MeetPR-our-token-5500-$id.mp4"))
    assertFalse(stale("MeetPR-other-5200-$id.mp4"))
    assertFalse(stale("MeetPR-$id.mp4", 4, false))
    assertFalse(stale("MeetPR-$id.mp4", 5))
    assertTrue(stale("MeetPR-$id.mp4", 4))
  }
}
