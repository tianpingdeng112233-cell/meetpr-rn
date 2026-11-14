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
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues

/** Local video inspection and trim; upload compression remains in the existing JS pipeline. */
class TrainingVideoModule : Module() {
  private val trimExporter by lazy { VideoTrimExporter() }
  override fun definition() = ModuleDefinition {
    Name("TrainingVideo")
    AsyncFunction("trimInfo") { uri: String ->
      VideoTrimMedia.inspect(requireNotNull(appContext.reactContext), uri).toMap()
    }
    AsyncFunction("thumbnails") { uri: String, count: Int ->
      VideoTrimMedia.thumbnails(requireNotNull(appContext.reactContext), uri, count)
    }
    AsyncFunction("trim") { uri: String, startMs: Double, endMs: Double, promise: Promise ->
      trimExporter.trim(requireNotNull(appContext.reactContext), uri, startMs, endMs, promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelTrim") { uri: String -> trimExporter.cancel(uri) }.runOnQueue(Queues.MAIN)
    OnDestroy { trimExporter.close() }
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
          val rate = VideoTrimMedia.trackBitrate(extractor, index, format)
          if (mime.startsWith("video/")) {
            video = mapOf("codec" to mime, "width" to format.getInteger(MediaFormat.KEY_WIDTH),
              "height" to format.getInteger(MediaFormat.KEY_HEIGHT), "bitrate" to rate, "frameRate" to frameRate(format))
          } else {
            audio = mapOf("codec" to mime, "bitrate" to rate)
          }
        }
        requireNotNull(video) { "No video track" } + mapOf("audio" to audio)
      } finally { extractor.release() }
    }
  }

  private fun frameRate(format: MediaFormat): Double? {
    if (!format.containsKey(MediaFormat.KEY_FRAME_RATE)) return null
    return if (Build.VERSION.SDK_INT >= 29) {
      format.getNumber(MediaFormat.KEY_FRAME_RATE)?.toDouble()
    } else {
      try { format.getInteger(MediaFormat.KEY_FRAME_RATE).toDouble() }
      catch (_: ClassCastException) { format.getFloat(MediaFormat.KEY_FRAME_RATE).toDouble() }
    }
  }

}
