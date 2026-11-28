package com.meetpr.video

import android.content.Context
import android.media.MediaCodecList
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.media3.common.Effect
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

internal fun badgeTimeoutMs(durationMs: Long) = maxOf(60_000L, 4 * durationMs)

internal fun badgeOutputError(source: VideoTrimInfo, output: VideoTrimInfo): String? = when {
  source.displayWidth.compareTo(source.displayHeight) * output.displayWidth.compareTo(output.displayHeight) < 0 -> "BADGE_ORIENTATION_CHANGED"
  abs(source.displayWidth - output.displayWidth) > 2 || abs(source.displayHeight - output.displayHeight) > 2 -> "BADGE_RESOLUTION_CHANGED"
  abs(source.durationMs - output.durationMs) > 100 -> "BADGE_DURATION_CHANGED"
  source.audioTrackCount != output.audioTrackCount -> "BADGE_AUDIO_CHANGED"
  else -> null
}

private class InvalidBadgeOutput(val code: String) : IllegalStateException(code)

/** Transformer and job ownership are confined to the main looper, including cancellation. */
@UnstableApi
internal class VideoTrimExporter(private val onDiagnostic: (String, String) -> Unit) {
  private class Job(var output: File, val promise: Promise, val badge: BurnInBadge?) {
    var watchdog: Runnable? = null
    var transformer: Transformer? = null
    var work: Future<*>? = null
    var cancelled = false
    var attempt: VideoTrimAttempt? = null
  }

  private val main = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor()
  private val jobs = mutableMapOf<String, Job>()

  fun export(context: Context, uri: String, startMs: Double, requestedEndMs: Double?, promise: Promise, badge: BurnInBadge? = null) {
    check(Looper.myLooper() == Looper.getMainLooper())
    val invalidSelection = badge == null && (requestedEndMs == null || !requestedEndMs.isFinite() ||
      !startMs.isFinite() || startMs < 0 || requestedEndMs <= startMs || requestedEndMs - startMs > 120_000)
    if (invalidSelection || jobs.containsKey(uri)) {
      if (badge != null) Log.w("TrainingVideo", "BURN_BUSY")
      promise.reject("ERR_VIDEO_TRIM_INVALID_SELECTION", "Invalid or busy trim selection", null)
      return
    }
    val job = Job(File(context.cacheDir, "training-trim-${UUID.randomUUID()}.mp4"), promise, badge)
    jobs[uri] = job
    if (badge != null) {
      job.watchdog = Runnable { fail(uri, job, InvalidBadgeOutput("BADGE_TIMEOUT")) }.also {
        main.postDelayed(it, badgeTimeoutMs(0))
      }
    }
    job.work = worker.submit {
      try {
        val info = VideoTrimMedia.inspect(context, uri, measureBitrate = badge == null)
        require(info.videoTrackCount == 1 && info.durationMs > 0 && info.width > 0 && info.height > 0) { "Invalid video source" }
        val endMs = requestedEndMs ?: info.durationMs.toDouble()
        require(endMs <= info.durationMs && startMs < info.durationMs) { "Selection exceeds source" }
        if (badge == null && canCopyTrimSource(info, startMs.toLong(), endMs.toLong())) {
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
          complete(context, uri, startMs.toLong(), endMs.toLong(), info, job, job.output, info.audioTrackCount > 0)
          return@submit
        }
        val audioDecoderAvailable = badge != null || info.audioMime?.let { mime ->
          MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos.any { codec ->
            !codec.isEncoder && codec.supportedTypes.any { it.equals(mime, ignoreCase = true) }
          }
        } ?: false
        main.post {
          if (jobs[uri] === job) {
            job.watchdog?.let {
              main.removeCallbacks(it)
              main.postDelayed(it, badgeTimeoutMs(info.durationMs))
            }
            val attempt = nextVideoTrimAttempt(info, audioDecoderAvailable, cancelled = job.cancelled) ?: return@post
            videoTrimFallbackCode(info.audioTrackCount > 0, null, attempt)?.let { onDiagnostic(uri, it) }
            start(context, uri, startMs.toLong(), endMs.toLong(), info, job, attempt)
          }
        }
      } catch (error: Exception) { main.post { fail(uri, job, error) } }
    }
  }

  private fun start(context: Context, uri: String, startMs: Long, endMs: Long, info: VideoTrimInfo, job: Job, attempt: VideoTrimAttempt) {
    if (jobs[uri] !== job || job.cancelled) return
    job.attempt = attempt
    // Each attempt owns its file: stale callbacks must never delete a newer export.
    val output = job.output
    // Keep the handler body trivial: with the retry call inside the catch block, R8 emitted a
    // start() that ART's verifier rejected in release builds, so the whole class failed to load.
    val startFailure: Exception? = try {
      startTransformer(context, uri, startMs, endMs, info, job, attempt, output)
      null
    } catch (error: Exception) { error }
    if (startFailure != null) retryOrFail(context, uri, startMs, endMs, info, job, attempt, output, startFailure)
  }

  private fun startTransformer(context: Context, uri: String, startMs: Long, endMs: Long, info: VideoTrimInfo, job: Job, attempt: VideoTrimAttempt, output: File) {
    val spec = videoTrimExportSpec(info)
    val delegate = DefaultEncoderFactory.Builder(context)
      .setEnableFallback(true)
      .apply {
        if (job.badge == null) setRequestedVideoEncoderSettings(VideoEncoderSettings.Builder().setBitrate(spec.videoBitrate).build())
      }
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
          if (jobs[uri] !== job || job.attempt !== attempt) { output.delete(); return }
          job.work = worker.submit {
            try {
              complete(context, uri, startMs, endMs, info, job, output, attempt.retainAudio, attempt)
            } catch (error: Exception) {
              main.post { retryOrFail(context, uri, startMs, endMs, info, job, attempt, output, error) }
            }
          }
        }

        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
          retryOrFail(context, uri, startMs, endMs, info, job, attempt, output, exportException)
        }

      })
    if (attempt.retainAudio && job.badge == null) spec.audioMime?.let { builder.setAudioMimeType(it) }

    val transformer = builder.build()
    job.transformer = transformer
    val item = MediaItem.Builder().setUri(uri).apply {
      if (job.badge == null) setClippingConfiguration(
        MediaItem.ClippingConfiguration.Builder().setStartPositionMs(startMs).setEndPositionMs(endMs).build()
      )
    }.build()
    val effects: List<Effect> = job.badge?.let { listOf(it.effect(info)) } ?: listOf(
      Presentation.createForWidthAndHeight(spec.displayWidth, spec.displayHeight, Presentation.LAYOUT_SCALE_TO_FIT)
    )
    val edited = EditedMediaItem.Builder(item).setRemoveAudio(!attempt.retainAudio)
      .setEffects(Effects(emptyList(), effects)).build()
    val sequence = if (!attempt.retainAudio) EditedMediaItemSequence.withVideoFrom(listOf(edited))
      else EditedMediaItemSequence.withAudioAndVideoFrom(listOf(edited))
    val composition = Composition.Builder(sequence)
      .setHdrMode(when (attempt.hdrMode) {
        TrimHdrMode.SDR -> Composition.HDR_MODE_KEEP_HDR
        TrimHdrMode.OPEN_GL -> Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_OPEN_GL
        TrimHdrMode.MEDIA_CODEC -> Composition.HDR_MODE_TONE_MAP_HDR_TO_SDR_USING_MEDIACODEC
        TrimHdrMode.INTERPRET_AS_SDR -> Composition.HDR_MODE_EXPERIMENTAL_FORCE_INTERPRET_HDR_AS_SDR
      })
      .build()
    transformer.start(composition, output.absolutePath)
  }

  private fun retryOrFail(context: Context, uri: String, startMs: Long, endMs: Long, info: VideoTrimInfo, job: Job, attempt: VideoTrimAttempt, output: File, error: Exception) {
    if (jobs[uri] !== job || job.attempt !== attempt) { output.delete(); return }
    val failure = when {
      error is ExportException -> videoTrimFailureCategory(error.errorCode, error.codecInfo?.isVideo)
      error.message == "Trim output is HDR" -> TrimFailure.HDR
      error.message == "Trim lost audio" -> TrimFailure.AUDIO
      else -> TrimFailure.OTHER
    }
    val next = nextVideoTrimAttempt(info, true, attempt, failure, job.cancelled)
    if (next == null || (job.badge != null && info.audioTrackCount > 0 && !next.retainAudio)) { fail(uri, job, error); return }
    // Invalidate this listener before cancellation; callbacks can arrive after cancel().
    job.attempt = next
    runCatching { job.transformer?.cancel() }
    job.transformer = null
    output.delete()
    job.output = File(context.cacheDir, "training-trim-${UUID.randomUUID()}.mp4")
    main.post {
      if (jobs[uri] !== job || job.cancelled || job.attempt !== next) return@post
      videoTrimFallbackCode(info.audioTrackCount > 0, attempt, next)?.let { onDiagnostic(uri, it) }
      start(context, uri, startMs, endMs, info, job, next)
    }
  }

  /** Runs on the worker for both a byte copy and Transformer output. */
  private fun complete(context: Context, uri: String, startMs: Long, endMs: Long, source: VideoTrimInfo, job: Job, file: File, retainAudio: Boolean, attempt: VideoTrimAttempt? = null) {
    if (Thread.currentThread().isInterrupted) throw InterruptedException()
    val output = VideoTrimMedia.inspect(context, Uri.fromFile(file).toString(), measureBitrate = job.badge == null)
    require(output.videoTrackCount == 1 && output.durationMs > 0 && file.length() > 0) { "Empty trim output" }
    if (job.badge != null) {
      badgeOutputError(source, output)?.let { throw InvalidBadgeOutput(it) }
    } else {
      require(abs(output.durationMs - (endMs - startMs)) <= 100) { "Inaccurate trim duration requested ${endMs - startMs} ms from $startMs got ${output.durationMs} ms" }
      require(!retainAudio || output.audioTrackCount > 0) { "Trim lost audio" }
      require(retainAudio || output.audioTrackCount == 0) { "Trim added audio" }
      require(output.displayWidth <= source.displayWidth && output.displayHeight <= source.displayHeight) { "Trim enlarged source" }
    }
    require(!output.isHdr) { "Trim output is HDR" }
    // Even-edge rounding and encoder alignment may move the short edge by up to two pixels.
    val sameOrientation = source.displayWidth.compareTo(source.displayHeight) * output.displayWidth.compareTo(output.displayHeight) >= 0
    val aspectError = abs(output.displayWidth.toDouble() * source.displayHeight - output.displayHeight.toDouble() * source.displayWidth) /
      maxOf(source.displayWidth, source.displayHeight)
    require(sameOrientation && aspectError <= 2.0) { "Trim changed display aspect or orientation" }
    main.post {
      if (jobs[uri] === job && job.attempt === attempt) {
        jobs.remove(uri)
        job.watchdog?.let(main::removeCallbacks)
        job.promise.resolve(mapOf("uri" to Uri.fromFile(file).toString(), "durationMs" to output.durationMs))
      } else { file.delete() }
    }
  }

  private fun fail(uri: String, job: Job, error: Exception) {
    if (jobs[uri] !== job) {
      if (job.cancelled) job.output.delete()
      return
    }
    jobs.remove(uri)
    job.watchdog?.let(main::removeCallbacks)
    job.cancelled = true
    job.work?.cancel(true)
    runCatching { job.transformer?.cancel() }
    job.output.delete()
    val code = (error as? InvalidBadgeOutput)?.code ?: videoTrimErrorCode(error)
    if (job.badge != null) Log.w("TrainingVideo", "BURN_FAILED $code")
    job.promise.reject(code, error.message ?: "Video trim failed", error)
  }

  fun cancel(uri: String) {
    check(Looper.myLooper() == Looper.getMainLooper())
    val job = jobs[uri] ?: return
    fail(uri, job, IllegalStateException("Video trim cancelled"))
  }

  fun cancelBadge(uri: String, jobId: String) {
    if (jobs[uri]?.badge?.jobId == jobId) cancel(uri)
  }

  fun interruptBadges() {
    jobs.filterValues { it.badge != null }.keys.toList().forEach(::cancel)
  }

  fun close() {
    main.post {
      jobs.keys.toList().forEach { cancel(it) }
      worker.shutdownNow()
    }
  }
}
