package com.meetpr.video

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Codec
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.TransformationRequest
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import expo.modules.kotlin.Promise
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.Future
import kotlin.math.abs

/** Transformer and job ownership are confined to the main looper, including cancellation. */
@UnstableApi
internal class VideoTrimExporter {
  private class Job(val output: File, val promise: Promise) {
    var transformer: Transformer? = null
    var work: Future<*>? = null
  }

  private val main = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor()
  private val jobs = mutableMapOf<String, Job>()

  fun trim(context: Context, uri: String, startMs: Double, endMs: Double, promise: Promise) {
    check(Looper.myLooper() == Looper.getMainLooper())
    if (!startMs.isFinite() || !endMs.isFinite() || startMs < 0 || endMs <= startMs || endMs - startMs > 120_000 || jobs.containsKey(uri)) {
      promise.reject("ERR_VIDEO_TRIM", "Invalid or busy trim selection", null)
      return
    }
    val job = Job(File(context.cacheDir, "training-trim-${UUID.randomUUID()}.mp4"), promise)
    jobs[uri] = job
    job.work = worker.submit {
      try {
        val info = VideoTrimMedia.inspect(context, uri, measureBitrate = true)
        require(info.videoTrackCount == 1 && info.durationMs > 0 && info.width > 0 && info.height > 0) { "Invalid video source" }
        require(endMs <= info.durationMs && startMs < info.durationMs) { "Selection exceeds source" }
        requireNotNull(info.videoBitrate) { "Cannot preserve unknown source bitrate" }
        main.post {
          if (jobs[uri] === job) {
            try { start(context, uri, startMs.toLong(), endMs.toLong(), info, job) }
            catch (error: Exception) { fail(uri, job, error) }
          }
        }
      } catch (error: Exception) { main.post { fail(uri, job, error) } }
    }
  }

  private fun start(context: Context, uri: String, startMs: Long, endMs: Long, info: VideoTrimInfo, job: Job) {
    val delegate = DefaultEncoderFactory.Builder(context)
      .setEnableFallback(false)
      .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(requireNotNull(info.videoBitrate)).build())
      .build()
    // Decode from the preceding keyframe but encode only the selected frames. Never export
    // a preceding GOP or rely on a player honoring an MP4 edit list. No resize or bitrate downgrade.
    val encoder = object : Codec.EncoderFactory by delegate {
      override fun videoNeedsEncoding() = true
    }
    val builder = Transformer.Builder(context)
      .setLooper(Looper.getMainLooper())
      .setEncoderFactory(encoder)
      .setVideoMimeType(requireNotNull(info.videoMime))
      .addListener(object : Transformer.Listener {
        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
          if (jobs[uri] !== job) { job.output.delete(); return }
          job.work = worker.submit {
            try {
              val output = VideoTrimMedia.inspect(context, Uri.fromFile(job.output).toString())
              require(output.videoTrackCount == 1 && job.output.length() > 0) { "Empty trim output" }
              require(abs(output.durationMs - (endMs - startMs)) <= 100) { "Inaccurate trim duration requested ${endMs - startMs} ms from $startMs got ${output.durationMs} ms" }
              require(info.audioTrackCount == 0 || output.audioTrackCount > 0) { "Trim lost audio" }
              require(info.displayWidth == output.displayWidth && info.displayHeight == output.displayHeight) { "Trim changed display dimensions" }
              main.post {
                if (jobs[uri] === job) {
                  jobs.remove(uri)
                  job.promise.resolve(mapOf("uri" to Uri.fromFile(job.output).toString(), "durationMs" to output.durationMs))
                } else { job.output.delete() }
              }
            } catch (error: Exception) { main.post { fail(uri, job, error) } }
          }
        }

        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
          fail(uri, job, exportException)
        }

        override fun onFallbackApplied(composition: Composition, originalTransformationRequest: TransformationRequest, fallbackTransformationRequest: TransformationRequest) {
          fail(uri, job, IllegalStateException("Trim format fallback is not permitted"))
        }
      })
    // Preserve the audio format and let Transformer transmux it when possible.
    info.audioMime?.let { builder.setAudioMimeType(it) }
    val transformer = builder.build()
    job.transformer = transformer
    val item = MediaItem.Builder().setUri(uri).setClippingConfiguration(
      MediaItem.ClippingConfiguration.Builder().setStartPositionMs(startMs).setEndPositionMs(endMs).build()
    ).build()
    transformer.start(EditedMediaItem.Builder(item).build(), job.output.absolutePath)
  }

  private fun fail(uri: String, job: Job, error: Exception) {
    if (jobs[uri] !== job) return
    jobs.remove(uri)
    job.work?.cancel(true)
    runCatching { job.transformer?.cancel() }
    job.output.delete()
    job.promise.reject("ERR_VIDEO_TRIM", error.message ?: "Video trim failed", error)
  }

  fun cancel(uri: String) {
    check(Looper.myLooper() == Looper.getMainLooper())
    val job = jobs[uri] ?: return
    fail(uri, job, IllegalStateException("Video trim cancelled"))
  }

  fun close() {
    main.post {
      jobs.keys.toList().forEach { cancel(it) }
      worker.shutdownNow()
    }
  }
}
