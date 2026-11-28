package com.meetpr.video

import android.graphics.Bitmap
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.StaticOverlaySettings
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedRef

internal class BadgeBitmap(bitmap: Bitmap, appContext: AppContext) : SharedRef<Bitmap>(bitmap, appContext)

internal data class BurnInBadge(val bitmap: Bitmap, val left: Double, val bottom: Double, val scale: Double, val jobId: String) {
  @UnstableApi
  fun effect(info: VideoTrimInfo): OverlayEffect {
    val p = badgePlacement(info.width, info.height, info.rotation, bitmap.width, bitmap.height, left, bottom, scale)
    val settings = StaticOverlaySettings.Builder()
      .setBackgroundFrameAnchor(p.centerX, p.centerY)
      .setScale(p.scale, p.scale).build()
    return OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(bitmap, settings)))
  }
}
