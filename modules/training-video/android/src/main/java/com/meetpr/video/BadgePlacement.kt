package com.meetpr.video

internal data class BadgePlacement(val centerX: Float, val centerY: Float, val scale: Float)

/** Media3 uses oriented frame coordinates, with (-1, -1) at bottom left. */
internal fun badgePlacement(width: Int, height: Int, rotation: Int, bitmapWidth: Int, bitmapHeight: Int,
                            left: Double, bottom: Double, scale: Double): BadgePlacement {
  val rotated = rotation % 180 != 0
  val displayWidth = if (rotated) height else width
  val displayHeight = if (rotated) width else height
  require(displayWidth > 0 && displayHeight > 0 && bitmapWidth > 0 && bitmapHeight > 0 && scale.isFinite() && scale > 0)
  return BadgePlacement(
    ((2 * left + bitmapWidth * scale) / displayWidth - 1).toFloat(),
    ((2 * bottom + bitmapHeight * scale) / displayHeight - 1).toFloat(),
    scale.toFloat(),
  )
}
