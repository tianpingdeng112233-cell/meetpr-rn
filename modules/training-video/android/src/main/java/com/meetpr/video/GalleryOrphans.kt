package com.meetpr.video

import android.content.ContentUris
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.Process
import android.os.SystemClock
import android.provider.MediaStore
import java.util.UUID

/** The private installation token distinguishes side-by-side packages even on shared DCIM. */
internal object GalleryOrphans {
  @Synchronized fun owner(context: Context): String {
    val prefs = context.getSharedPreferences("gallery-reservations", Context.MODE_PRIVATE)
    return prefs.getString("owner", null) ?: UUID.randomUUID().toString().also {
      check(prefs.edit().putString("owner", it).commit())
    }
  }

  fun staleHidden(name: String, token: String, modified: Long, start: Long) =
    name.startsWith(".meetpr-$token-") && name.endsWith(".pending") && modified in 1 until start

  private val oldName = Regex("MeetPR-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}[.]mp4")

  fun staleRow(name: String, token: String, addedSeconds: Long, start: Long, ownsLegacy: () -> Boolean): Boolean {
    val prefix = "MeetPR-$token-"
    if (name.startsWith(prefix)) {
      val created = name.removePrefix(prefix).substringBefore('-').toLongOrNull() ?: return false
      return created in 1 until start
    }
    return oldName.matches(name) && addedSeconds in 1 until start / 1000 && ownsLegacy()
  }

  @Suppress("DEPRECATION")
  fun clean(context: Context) {
    val start = System.currentTimeMillis() - (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime())
    val token = owner(context)
    if (Build.VERSION.SDK_INT < 29) {
      val dcim = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM)
      dcim.listFiles()?.filter { it.isFile && staleHidden(it.name, token, it.lastModified(), start) }?.forEach { it.delete() }
      return
    }
    val resolver = context.contentResolver
    val collection = MediaStore.setIncludePending(MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
    val byOwner = if (Build.VERSION.SDK_INT >= 30)
      "(${MediaStore.MediaColumns.DISPLAY_NAME} LIKE ? AND ${MediaStore.MediaColumns.OWNER_PACKAGE_NAME} = ?)" else "${MediaStore.MediaColumns.DISPLAY_NAME} LIKE ?"
    val args = mutableListOf((start / 1000).toString(), "${Environment.DIRECTORY_DCIM}/")
    if (Build.VERSION.SDK_INT >= 30) args.addAll(listOf("MeetPR-%.mp4", context.packageName))
    else args.add("MeetPR-%.mp4")
    val where = "${MediaStore.MediaColumns.IS_PENDING} = 1 AND ${MediaStore.MediaColumns.DATE_ADDED} <= ? AND ${MediaStore.MediaColumns.RELATIVE_PATH} = ? AND $byOwner"
    resolver.query(collection, arrayOf("_id", MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.DATE_ADDED), where, args.toTypedArray(), null)?.use { rows ->
      while (rows.moveToNext()) {
        val uri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, rows.getLong(0))
        // Android 10 has no public OWNER_PACKAGE_NAME column. Only the owner can
        // open a pending item. Recheck the pending predicate when deleting.
        val stale = staleRow(rows.getString(1), token, rows.getLong(2), start) {
          Build.VERSION.SDK_INT >= 30 || runCatching {
            resolver.openFileDescriptor(uri, "r")?.use { true } ?: false
          }.getOrDefault(false)
        }
        if (!stale) continue
        resolver.delete(uri, where, args.toTypedArray())
      }
    }
  }
}
