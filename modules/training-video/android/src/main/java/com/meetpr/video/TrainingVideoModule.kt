package com.meetpr.video

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import android.util.Log
import android.view.View
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import android.os.Handler
import android.os.Looper
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext

/** Local video inspection and trim; upload compression remains in the existing JS pipeline. */
class TrainingVideoModule : Module() {
  private val reservations = ConcurrentHashMap.newKeySet<GalleryReservation>()
  private val watchdog = ScheduledThreadPoolExecutor(1).apply { removeOnCancelPolicy = true }
  @Volatile private var backgrounded = false
  private val trimExporter by lazy {
    VideoTrimExporter { uri, code -> sendEvent("onTrimDiagnostic", mapOf("uri" to uri, "code" to code)) }
  }
  override fun definition() = ModuleDefinition {
    Name("TrainingVideo")
    Events("onTrimDiagnostic")
    OnCreate {
      appContext.reactContext?.applicationContext?.let { context ->
        Thread { runCatching { GalleryOrphans.clean(context) } }.start()
      }
    }
    Class(GalleryReservation::class) {
      Constructor { -> throw IllegalStateException("Use reserveGalleryOriginal to stage a video") }
      AsyncFunction("finish") Coroutine { reservation: GalleryReservation, replacement: String? ->
        withContext(Dispatchers.IO) {
          try { reservation.publication.finish(replacement) }
          catch (e: Exception) { if (reservation.publication.discardUnpublished()) throw e else reservation.publication.finish(null) }
        }
      }
    }
    AsyncFunction("reserveGalleryOriginal") Coroutine { uri: String, timeoutMs: Long, jobId: String ->
      val reservation = GalleryReservation(appContext, requireNotNull(appContext.reactContext)) { reservations.remove(it) }
      reservations.add(reservation)
      reservation.publication.armDeadline(timeoutMs.coerceAtLeast(1), schedule = { delay, expire ->
        val timer = watchdog.schedule(expire, delay, TimeUnit.MILLISECONDS)
        val cancel = { timer.cancel(false); Unit }
        cancel
      }, cancelBurn = { Handler(Looper.getMainLooper()).post { trimExporter.cancelBadge(uri, jobId) } })
      if (backgrounded) reservation.publication.interrupt()
      // Once accepted, complete staging even if the JS caller goes away during the copy.
      try { withContext(NonCancellable + Dispatchers.IO) { reservation.publication.stage(uri) } }
      catch (e: Exception) {
        reservation.publication.interrupt()
        if (reservation.publication.discardUnpublished()) throw e
      }
      reservation
    }
    Class(BadgeBitmap::class) {}
    AsyncFunction("captureBadge") { tag: Int ->
      val view = logBadgeStage("CAPTURE_VIEW") { requireNotNull(appContext.findView<View>(tag)) { "Badge view unavailable" } }
      logBadgeStage("CAPTURE_DIMENSIONS") { require(view.width > 0 && view.height > 0) }
      logBadgeStage("CAPTURE_BITMAP") {
        val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        view.draw(Canvas(bitmap))
        BadgeBitmap(bitmap, appContext)
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("burnBadge") { uri: String, bitmap: BadgeBitmap, left: Double, bottom: Double, scale: Double, jobId: String, promise: Promise ->
      logBadgeStage("BURN_ENTRY") {
        check(!backgrounded) { "Badge export interrupted" }
        trimExporter.export(requireNotNull(appContext.reactContext), uri, 0.0, null, promise, BurnInBadge(bitmap.ref, left, bottom, scale, jobId))
      }
    }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground {
      backgrounded = true
      reservations.forEach { it.publication.interrupt() }
      trimExporter.interruptBadges()
    }
    OnActivityEntersForeground { backgrounded = false }
    AsyncFunction("trimInfo") { uri: String ->
      logBadgeStage("INSPECT_SOURCE") { VideoTrimMedia.inspect(requireNotNull(appContext.reactContext), uri).toMap() }
    }
    AsyncFunction("thumbnails") { uri: String, count: Int ->
      VideoTrimMedia.thumbnails(requireNotNull(appContext.reactContext), uri, count)
    }
    AsyncFunction("trim") { uri: String, startMs: Double, endMs: Double, promise: Promise ->
      trimExporter.export(requireNotNull(appContext.reactContext), uri, startMs, endMs, promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelBadge") { uri: String, jobId: String -> trimExporter.cancelBadge(uri, jobId) }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelTrim") { uri: String -> trimExporter.cancel(uri) }.runOnQueue(Queues.MAIN)
    OnDestroy {
      backgrounded = true
      reservations.forEach { it.publication.interrupt() }
      watchdog.shutdownNow()
      trimExporter.close()
    }
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

  private inline fun <T> logBadgeStage(stage: String, action: () -> T): T {
    try { return action() }
    catch (e: Exception) {
      Log.w("TrainingVideo", stage)
      throw e
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
