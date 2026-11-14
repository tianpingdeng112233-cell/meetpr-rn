package com.meetpr.video

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.effect.Presentation
import androidx.media3.transformer.AudioEncoderSettings
import androidx.media3.common.util.UnstableApi
import androidx.media3.transformer.Codec
import androidx.media3.transformer.Composition
import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import androidx.media3.transformer.VideoEncoderSettings
import expo.modules.kotlin.Promise
import java.io.File
import java.io.IOException
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
    var cancelled = false
  }

  private val main = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor()
  private val jobs = mutableMapOf<String, Job>()

  fun trim(context: Context, uri: String, startMs: Double, endMs: Double, promise: Promise) {
    check(Looper.myLooper() == Looper.getMainLooper())
    if (!startMs.isFinite() || !endMs.isFinite() || startMs < 0 || endMs <= startMs || endMs - startMs > 120_000 || jobs.containsKey(uri)) {
      promise.reject("ERR_VIDEO_TRIM_INVALID_SELECTION", "Invalid or busy trim selection", null)
      return
    }
    val job = Job(File(context.cacheDir, "training-trim-${UUID.randomUUID()}.mp4"), promise)
    jobs[uri] = job
    job.work = worker.submit {
      try {
        val info = VideoTrimMedia.inspect(context, uri, measureBitrate = true)
        require(info.videoTrackCount == 1 && info.durationMs > 0 && info.width > 0 && info.height > 0) { "Invalid video source" }
        require(endMs <= info.durationMs && startMs < info.durationMs) { "Selection exceeds source" }
        if (canCopyTrimSource(info, startMs.toLong(), endMs.toLong())) {
          // A distinct export file belongs to TrimSession; never hand off its working source.
          context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
            if (input == null) throw IOException("Cannot open trim source")
            job.output.outputStream().use { output ->
              val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
              while (true) {
                if (Thread.currentThread().isInterrupted) throw InterruptedException()
                val count = input.read(buffer)
                if (count < 0) break
                output.write(buffer, 0, count)
              }
            }
          }
          complete(context, uri, startMs.toLong(), endMs.toLong(), info, job)
          return@submit
        }
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
    val spec = videoTrimExportSpec(info)
    val delegate = DefaultEncoderFactory.Builder(context)
      .setEnableFallback(true)
      .setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(spec.videoBitrate).build())
      .setRequestedAudioEncoderSettings(AudioEncoderSettings.Builder().setBitrate(spec.audioBitrate ?: 128_000).build())
      .build()
    // Decode from the preceding keyframe but encode only the selected frames. Never export
    // a preceding GOP or rely on a player honoring an MP4 edit list.
    val encoder = object : Codec.EncoderFactory by delegate {
      override fun videoNeedsEncoding() = true
    }
    val builder = Transformer.Builder(context)
      .setLooper(Looper.getMainLooper())
      .setEncoderFactory(encoder)
      .setVideoMimeType(spec.videoMime)
      .addListener(object : Transformer.Listener {
        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
          if (jobs[uri] !== job) { job.output.delete(); return }
          job.work = worker.submit {
            try {
              complete(context, uri, startMs, endMs, info, job)
            } catch (error: Exception) { main.post { fail(uri, job, error) } }
          }
        }

        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
          fail(uri, job, exportException)
        }

      })
    spec.audioMime?.let { builder.setAudioMimeType(it) }

    val transformer = builder.build()
    job.transformer = transformer
    val item = MediaItem.Builder().setUri(uri).setClippingConfiguration(
      MediaItem.ClippingConfiguration.Builder().setStartPositionMs(startMs).setEndPositionMs(endMs).build()
    ).build()
    val edited = EditedMediaItem.Builder(item).setEffects(Effects(emptyList(), listOf(
      Presentation.createForWidthAndHeight(spec.displayWidth, spec.displayHeight, Presentation.LAYOUT_SCALE_TO_FIT)
    ))).build()
    val sequence = if (spec.audioMime == null) EditedMediaItemSequence.withVideoFrom(listOf(edited))
      else EditedMediaItemSequence.withAudioAndVideoFrom(listOf(edited))
    val composition = Composition.Builder(sequence)
      .setHdrMode(if (spec.toneMapToSdr) Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL else Composition.HDR_MODE_KEEP_HDR)
      .build()
    transformer.start(composition, job.output.absolutePath)
  }

  /** Runs on the worker for both a byte copy and Transformer output. */
  private fun complete(context: Context, uri: String, startMs: Long, endMs: Long, source: VideoTrimInfo, job: Job) {
    if (Thread.currentThread().isInterrupted) throw InterruptedException()
    val output = VideoTrimMedia.inspect(context, Uri.fromFile(job.output).toString(), measureBitrate = true)
    require(output.videoTrackCount == 1 && output.durationMs > 0 && job.output.length() > 0) { "Empty trim output" }
    require(abs(output.durationMs - (endMs - startMs)) <= 100) { "Inaccurate trim duration requested ${endMs - startMs} ms from $startMs got ${output.durationMs} ms" }
    require(source.audioTrackCount == 0 || output.audioTrackCount > 0) { "Trim lost audio" }
    require(source.audioTrackCount > 0 || output.audioTrackCount == 0) { "Trim added audio" }
    require(!output.isHdr) { "Trim output is HDR" }
    require(output.displayWidth <= source.displayWidth && output.displayHeight <= source.displayHeight) { "Trim enlarged source" }
    // Even-edge rounding and encoder alignment may move the short edge by up to two pixels.
    val sameOrientation = source.displayWidth.compareTo(source.displayHeight) * output.displayWidth.compareTo(output.displayHeight) >= 0
    val aspectError = abs(output.displayWidth.toDouble() * source.displayHeight - output.displayHeight.toDouble() * source.displayWidth) /
      maxOf(source.displayWidth, source.displayHeight)
    require(sameOrientation && aspectError <= 2.0) { "Trim changed display aspect or orientation" }
    main.post {
      if (jobs[uri] === job) {
        jobs.remove(uri)
        job.promise.resolve(mapOf("uri" to Uri.fromFile(job.output).toString(), "durationMs" to output.durationMs))
      } else { job.output.delete() }
    }
  }

  private fun fail(uri: String, job: Job, error: Exception) {
    if (jobs[uri] !== job) {
      if (job.cancelled) job.output.delete()
      return
    }
    jobs.remove(uri)
    job.cancelled = true
    job.work?.cancel(true)
    runCatching { job.transformer?.cancel() }
    job.output.delete()
    job.promise.reject(videoTrimErrorCode(error), error.message ?: "Video trim failed", error)
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
