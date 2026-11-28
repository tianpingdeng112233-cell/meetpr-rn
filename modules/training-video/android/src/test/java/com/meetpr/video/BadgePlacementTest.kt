package com.meetpr.video

import org.junit.Assert.assertEquals
import org.junit.Test

class BadgePlacementTest {
  // A 200 x 100 bitmap, with margins and scale supplied by the RN export layout.
  private fun check(w: Int, h: Int, rotation: Int, left: Double, bottom: Double, scale: Double,
                    expectedX: Double, expectedY: Double) {
    val placement = badgePlacement(w, h, rotation, 200, 100, left, bottom, scale)
    assertEquals(expectedX, placement.centerX.toDouble(), 0.00001)
    assertEquals(expectedY, placement.centerY.toDouble(), 0.00001)
    assertEquals(scale, placement.scale.toDouble(), 0.00001)
  }
  @Test fun portrait() = check(1080, 1920, 0, 88.0, 428.0, 2.0, -0.4666667, -0.45)
  @Test fun landscape() = check(1920, 1080, 0, 49.5, 240.75, 1.125, -0.83125, -0.45)
  @Test fun rotatedCamera() = check(1920, 1080, 90, 88.0, 428.0, 2.0, -0.4666667, -0.45)
  @Test fun threeByFour() = check(1080, 1440, 0, 66.0, 321.0, 1.5, -0.6, -0.45)
}
