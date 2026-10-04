package com.meetpr.video

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import java.io.File
import java.nio.ByteBuffer
import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

internal data class VideoTrimInfo(
  val durationMs: Long,
  val videoTrackCount: Int,
  val audioTrackCount: Int,
  val width: Int,
  val height: Int,
  val rotation: Int,
  val videoMime: String?,
  val audioMime: String?,
  val videoBitrate: Int?,
) {
  val displayWidth get() = if (rotation % 180 == 0) width else height
  val displayHeight get() = if (rotation % 180 == 0) height else width
  fun toMap() = mapOf("durationMs" to durationMs, "videoTrackCount" to videoTrackCount)
}

/** Inspection and thumbnails run off the UI thread; no modification of the source. */
internal object VideoTrimMedia {
  fun inspect(context: Context, uri: String, measureBitrate: Boolean = false): VideoTrimInfo {
    val extractor = MediaExtractor()
    val retriever = MediaMetadataRetriever()
    try {
      val source = Uri.parse(uri)
      extractor.setDataSource(context, source, null)
      retriever.setDataSource(context, source)
      val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      var videoCount = 0
      var audioCount = 0
      var width = 0
      var height = 0
      var videoMime: String? = null
      var audioMime: String? = null
      var bitrate: Int? = null
      for (index in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(index)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("video/")) {
          videoCount++
          videoMime = mime
          width = format.getInteger(MediaFormat.KEY_WIDTH)
          height = format.getInteger(MediaFormat.KEY_HEIGHT)
          if (measureBitrate) bitrate = videoBitrate(extractor, index, format, durationMs)
        } else if (mime.startsWith("audio/")) {
          audioCount++
          audioMime = mime
        }
      }
      return VideoTrimInfo(durationMs, videoCount, audioCount, width, height, rotation, videoMime, audioMime, bitrate)
    } finally {
      extractor.release()
      retriever.release()
    }
  }

  fun thumbnails(context: Context, uri: String, count: Int): List<String> {
    require(count in 1..100) { "Invalid thumbnail count" }
    val retriever = MediaMetadataRetriever()
    val files = mutableListOf<File>()
    try {
      retriever.setDataSource(context, Uri.parse(uri))
      val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0
      require(durationMs > 0) { "Invalid duration" }
      for (index in 0 until count) {
        val timeUs = ((index + 0.5) / count * durationMs * 1000).toLong()
        val frame = requireNotNull(if (Build.VERSION.SDK_INT >= 27) {
          retriever.getScaledFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST, 320, 180)
        } else {
          retriever.getFrameAtTime(timeUs, MediaMetadataRetriever.OPTION_CLOSEST)
        }) { "No thumbnail frame" }
        try {
          val scale = minOf(1.0, 320.0 / frame.width, 180.0 / frame.height)
          val scaled = Bitmap.createScaledBitmap(frame, max(1, (frame.width * scale).roundToInt()), max(1, (frame.height * scale).roundToInt()), true)
          try {
            val file = File(context.cacheDir, "training-trim-${UUID.randomUUID()}.jpg")
            files.add(file)
            file.outputStream().use { check(scaled.compress(Bitmap.CompressFormat.JPEG, 85, it)) }
          } finally { if (scaled !== frame) scaled.recycle() }
        } finally { frame.recycle() }
      }
      return files.map { Uri.fromFile(it).toString() }
    } catch (error: Exception) {
      files.forEach { it.delete() }
      throw error
    } finally { retriever.release() }
  }

  private fun videoBitrate(extractor: MediaExtractor, index: Int, format: MediaFormat, durationMs: Long): Int? {
    if (format.containsKey(MediaFormat.KEY_BIT_RATE)) {
      val rate = format.getInteger(MediaFormat.KEY_BIT_RATE)
      if (rate > 0) return rate
    }
    val durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) format.getLong(MediaFormat.KEY_DURATION) else durationMs * 1000
    if (durationUs <= 0) return null
    extractor.selectTrack(index)
    try {
      extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
      var bytes = 0L
      val buffer = if (Build.VERSION.SDK_INT < 28) ByteBuffer.allocate(8 * 1024 * 1024) else null
      while (extractor.sampleTrackIndex >= 0) {
        if (Thread.currentThread().isInterrupted) throw InterruptedException()
        val size = if (Build.VERSION.SDK_INT >= 28) extractor.sampleSize else extractor.readSampleData(requireNotNull(buffer), 0).toLong()
        if (size < 0) break
        bytes += size
        if (!extractor.advance()) break
      }
      return (bytes * 8.0 * 1_000_000 / durationUs).takeIf { it > 0 && it <= Int.MAX_VALUE }?.roundToInt()
    } finally { extractor.unselectTrack(index) }
  }
}
