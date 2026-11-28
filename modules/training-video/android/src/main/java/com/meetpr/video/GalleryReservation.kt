package com.meetpr.video

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.sharedobjects.SharedObject
import java.io.File
import java.io.OutputStream
import java.util.UUID

/** The original is fully staged before burn-in starts. Activity pause can publish it
 * even if Android stops scheduling JS. The monitor protects publication, never a video copy. */
internal class GalleryReservation(
  appContext: AppContext,
  context: Context,
  private val done: (GalleryReservation) -> Unit,
) : SharedObject(appContext) {
  val publication = GalleryPublication({ PendingVideo.copy(context, it) }) { done(this) }
}

internal class GalleryPublication(private val copy: (String) -> PendingVideo, private val done: () -> Unit) {
  private var cancelDeadline: (() -> Unit)? = null
  private var backup: PendingVideo? = null
  private var abandoned = false
  private var interrupted = false
  private var publishedBadge: Boolean? = null

  @Synchronized fun armDeadline(timeoutMs: Long, schedule: (Long, () -> Unit) -> (() -> Unit), cancelBurn: () -> Unit) {
    cancelDeadline = schedule(timeoutMs) {
      cancelBurn()
      interrupt()
    }
  }

  private fun complete() {
    cancelDeadline?.invoke()
    cancelDeadline = null
    done()
  }

  fun stage(source: String) {
    val original = copy(source)
    synchronized(this) {
      backup = original
      if (interrupted) publishOriginal()
    }
  }

  @Synchronized fun interrupt() {
    interrupted = true
    // A transient provider failure can still be retried by finish().
    if (backup != null && publishedBadge == null) runCatching { publishOriginal() }
  }

  private fun publishOriginal() {
    requireNotNull(backup).publish()
    publishedBadge = false
    backup = null
    complete()
  }

  fun finish(replacement: String?): Boolean {
    synchronized(this) {
      check(!abandoned) { "Gallery reservation retired" }
      publishedBadge?.let { return it }
      if (interrupted || replacement == null) {
        publishOriginal()
        return false
      }
    }
    val badged = runCatching { copy(requireNotNull(replacement)) }.getOrNull()
    synchronized(this) {
      if (abandoned) {
        badged?.discard()
        error("Gallery reservation retired")
      }
      publishedBadge?.let { badged?.discard(); return it }
      if (badged != null && !interrupted && runCatching { badged.publish() }.isSuccess) {
        publishedBadge = true
        backup?.discard()
        backup = null
        complete()
      } else {
        badged?.discard()
        publishOriginal()
      }
      return requireNotNull(publishedBadge)
    }
  }

  @Synchronized fun discardUnpublished(): Boolean {
    if (publishedBadge != null) return false
    abandoned = true
    backup?.discard()
    backup = null
    complete()
    return true
  }
}

/** A private pending MediaStore entry, or a hidden file on pre-scoped-storage Android. */
internal class PendingVideo(val publish: () -> Unit, val discard: () -> Unit) {
  companion object {
    fun copy(context: Context, source: String): PendingVideo {
      val resolver = context.contentResolver
      val owner = GalleryOrphans.owner(context)
      val id = UUID.randomUUID()
      val name = "MeetPR-$id.mp4"
      val collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI
      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, name)
        put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
      }
      fun write(out: OutputStream) = out.use { target ->
        requireNotNull(resolver.openInputStream(Uri.parse(source))).use { check(it.copyTo(target) > 0) }
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, "MeetPR-$owner-${System.currentTimeMillis()}-$id.mp4")
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DCIM)
        values.put(MediaStore.MediaColumns.IS_PENDING, 1)
        val uri = requireNotNull(resolver.insert(collection, values))
        val pending = PendingVideo(
          publish = {
            val ready = ContentValues().apply {
              put(MediaStore.MediaColumns.DISPLAY_NAME, name)
              put(MediaStore.MediaColumns.IS_PENDING, 0)
            }
            check(resolver.update(uri, ready, null, null) == 1)
          },
          discard = { runCatching { resolver.delete(uri, null, null) } },
        )
        try { write(requireNotNull(resolver.openOutputStream(uri))) }
        catch (e: Exception) { pending.discard(); throw e }
        return pending
      }
      @Suppress("DEPRECATION")
      val directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM)
      directory.mkdirs()
      val hidden = File.createTempFile(".meetpr-${owner}-", ".pending", directory)
      val visible = File(directory, name)
      try { write(hidden.outputStream()) }
      catch (e: Exception) { hidden.delete(); throw e }
      return PendingVideo(
        publish = {
          if (hidden.exists()) check(hidden.renameTo(visible))
          @Suppress("DEPRECATION")
          values.put(MediaStore.MediaColumns.DATA, visible.path)
          checkNotNull(resolver.insert(collection, values))
          runCatching { MediaScannerConnection.scanFile(context, arrayOf(visible.path), arrayOf("video/mp4"), null) }
        },
        discard = { hidden.delete(); visible.delete() },
      )
    }
  }
}
