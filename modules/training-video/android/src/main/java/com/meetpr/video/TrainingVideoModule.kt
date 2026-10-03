package com.meetpr.video

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer

/** Track facts absent from compressor's public metadata API. No encoding or upload here. */
class TrainingVideoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TrainingVideo")
    AsyncFunction("hasCamera") {
      val context = requireNotNull(appContext.reactContext)
      val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      manager.cameraIdList.any {
        manager.getCameraCharacteristics(it).get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
      }
    }
    AsyncFunction("readTracks") { uri: String ->
      val context = requireNotNull(appContext.reactContext)
      val extractor = MediaExtractor()
      try {
        extractor.setDataSource(context, Uri.parse(uri), null)
        var video: Map<String, Any?>? = null
        var audio: Map<String, Any?>? = null
        for (index in 0 until extractor.trackCount) {
          val format = extractor.getTrackFormat(index)
          val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
          if (!mime.startsWith("video/") && !mime.startsWith("audio/")) continue
          val rate = bitrate(extractor, index, format)
          if (mime.startsWith("video/")) {
            video = mapOf("codec" to mime, "width" to format.getInteger(MediaFormat.KEY_WIDTH),
              "height" to format.getInteger(MediaFormat.KEY_HEIGHT), "bitrate" to rate)
          } else {
            audio = mapOf("codec" to mime, "bitrate" to rate)
          }
        }
        requireNotNull(video) { "No video track" } + mapOf("audio" to audio)
      } finally { extractor.release() }
    }
  }

  private fun bitrate(extractor: MediaExtractor, index: Int, format: MediaFormat): Double? {
    if (format.containsKey(MediaFormat.KEY_BIT_RATE)) {
      val rate = format.getInteger(MediaFormat.KEY_BIT_RATE)
      if (rate > 0) return rate.toDouble()
    }
    if (!format.containsKey(MediaFormat.KEY_DURATION)) return null
    val duration = format.getLong(MediaFormat.KEY_DURATION)
    if (duration <= 0) return null
    extractor.selectTrack(index)
    try {
      extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
      var bytes = 0L
      val buffer = if (Build.VERSION.SDK_INT < 28) ByteBuffer.allocate(8 * 1024 * 1024) else null
      while (extractor.sampleTrackIndex >= 0) {
        val size = if (Build.VERSION.SDK_INT >= 28) extractor.sampleSize else extractor.readSampleData(requireNotNull(buffer), 0).toLong()
        if (size < 0) break
        bytes += size
        if (!extractor.advance()) break
      }
      return bytes * 8.0 * 1_000_000 / duration
    } finally { extractor.unselectTrack(index) }
  }
}
