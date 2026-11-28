package com.meetpr.video

import org.junit.Assert.*
import org.junit.Test

class GalleryPublicationTest {
  private val published = mutableListOf<String>()
  private val discarded = mutableListOf<String>()
  private var duringCopy: () -> Unit = {}
  private val gallery = GalleryPublication({ uri ->
    if (uri == "badged") duringCopy()
    if (uri == "failed") error("copy failed")
    PendingVideo({ published.add(uri) }, { discarded.add(uri) })
  }) {}

  @Test fun successPublishesOnlyReplacementEvenAfterLatePause() {
    gallery.stage("original")
    assertTrue(gallery.finish("badged"))
    gallery.interrupt()
    assertTrue(gallery.finish(null))
    assertEquals(listOf("badged"), published)
    assertEquals(listOf("original"), discarded)
  }

  @Test fun failedExportAndFailedReplacementCopyPublishOnlyOriginal() {
    gallery.stage("original")
    assertFalse(gallery.finish("failed"))
    assertFalse(gallery.finish(null))
    assertEquals(listOf("original"), published)
  }

  @Test fun cancellationPublishesOriginalAndIgnoresLateSuccess() {
    gallery.stage("original")
    assertFalse(gallery.finish(null))
    assertFalse(gallery.finish("badged"))
    assertEquals(listOf("original"), published)
  }

  @Test fun pauseBeforeStagingCompletesPublishesOnce() {
    gallery.interrupt()
    gallery.stage("original")
    gallery.interrupt()
    assertFalse(gallery.finish("badged"))
    assertEquals(listOf("original"), published)
  }

  @Test fun failedOriginalWriteRetiresReservationBeforeLateReplacementReturns() {
    lateinit var job: GalleryPublication
    job = GalleryPublication({ source ->
      if (source == "badged") {
        assertTrue(runCatching { job.finish(null) }.isFailure)
        assertTrue(job.discardUnpublished())
      }
      PendingVideo({ if (source == "original") error("provider failed") else published.add(source) }, {})
    }) {}
    job.stage("original")
    runCatching { job.finish("badged") }
    assertTrue(published.isEmpty())
  }

  @Test fun watchdogDuringReplacementCopyWinsEvenWithLateSuccess() {
    gallery.stage("original")
    var cancelledBurns = 0
    var clearedTimers = 0
    gallery.armDeadline(60_000, schedule = { delay, expire ->
      assertEquals(60_000L, delay)
      duringCopy = expire
      val cancel = { clearedTimers++; Unit }
      cancel
    }, cancelBurn = { cancelledBurns++ })
    assertFalse(gallery.finish("badged"))
    assertEquals(listOf("original"), published)
    assertEquals(listOf("badged"), discarded)
    assertEquals(1, cancelledBurns)
    assertEquals(1, clearedTimers)
  }
}
