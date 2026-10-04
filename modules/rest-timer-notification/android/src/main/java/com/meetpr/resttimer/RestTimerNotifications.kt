package com.meetpr.resttimer

import android.app.Notification
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.graphics.Color
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.Locale
import java.util.UUID

/** All entry points share a lock, including the JS thread and Android's main-thread receiver. */
internal object RestTimerNotifications {
  const val OPEN_TRAINING = "com.meetpr.resttimer.OPEN_TRAINING"
  private const val SKIP = "com.meetpr.resttimer.SKIP"
  private const val ADD_30 = "com.meetpr.resttimer.ADD_30"
  private const val END = "com.meetpr.resttimer.END"
  private const val TICK = "com.meetpr.resttimer.TICK"
  private const val TIMER_CHANNEL = "rest-timer-v2"
  private const val TICK_INTERVAL_MS = 10_000L
  private const val PROGRESS_MAX = 1_000
  // Brand gold500 (light), matching src/design/tokens.ts.
  private val BRAND_GOLD = Color.rgb(217, 119, 6)
  private const val COMPLETE_CHANNEL = "rest-complete"
  const val TIMER_ID = 16001
  private const val COMPLETE_ID = 16002
  // Mirrors TRAINING_LIMITS.restMaximumSeconds; the receiver must also work without JS.
  private const val MAX_REMAINING_MS = 900_000L
  private var foreground = false
  // Never persist ownership: a receiver in a new process must be able to finish the rest.
  private var service: RestTimerService? = null
  private fun prefs(context: Context) = context.getSharedPreferences("rest-timer-notification", Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun isPermissionGranted(context: Context) = NotificationManagerCompat.from(context).areNotificationsEnabled()

  @Synchronized fun enterForeground(context: Context) {
    foreground = true
    hide(context)
  }
  @Synchronized fun leaveForeground() { foreground = false }

  @Synchronized fun show(context: Context, endAt: Long, startedAt: Long, body: String, labels: Map<String, String>) {
    if (foreground || !isPermissionGranted(context)) return
    hide(context)
    if (endAt <= System.currentTimeMillis()) return
    val editor = prefs(context).edit().clear()
      .putLong("endAt", endAt).putLong("startedAt", startedAt).putString("body", body)
      .putString("token", UUID.randomUUID().toString())
    labels.forEach { (key, value) -> editor.putString(key, value) }
    editor.commit()
    createChannels(context)
    val token = prefs(context).getString("token", null) ?: return
    val notification = buildNotification(context, serviceOwned = true)
    schedule(context, endAt)
    try {
      ContextCompat.startForegroundService(context, Intent(context, RestTimerService::class.java)
        .putExtra("token", token).putExtra("notification", notification))
    } catch (_: RuntimeException) {
      // Includes ForegroundServiceStartNotAllowedException and SecurityException.
      startFailed(context, token)
    }
  }

  /** Preserve pending button state until JS consumes it, even if Android resumes first. */
  @Synchronized fun hide(context: Context) {
    clearTimer(context)
    stopService(context)
    manager(context).cancel(TIMER_ID)
    manager(context).cancel(COMPLETE_ID)
  }

  @Synchronized fun consumeState(context: Context): Map<String, Any?> {
    val state = prefs(context)
    val result = mapOf<String, Any?>(
      "endAtEpochMs" to if (state.contains("changedEndAt")) state.getLong("changedEndAt", 0).toDouble() else null,
      "skipped" to state.getBoolean("skipped", false)
    )
    state.edit().remove("changedEndAt").remove("skipped").commit()
    return result
  }

  @Synchronized fun receive(context: Context, intent: Intent) {
    val state = prefs(context)
    val endAt = state.getLong("endAt", 0)
    val token = state.getString("token", null) ?: return
    if (intent.getStringExtra("token") != token || endAt == 0L) return
    when (intent.action) {
      SKIP -> {
        hide(context)
        state.edit().remove("changedEndAt").putBoolean("skipped", true).commit()
      }
      ADD_30 -> {
        val now = System.currentTimeMillis()
        if (endAt <= now) return
        val next = minOf(endAt + 30_000L, now + MAX_REMAINING_MS)
        state.edit().putLong("endAt", next).putLong("changedEndAt", next).putBoolean("skipped", false).commit()
        schedule(context, next)
        val owner = service
        if (owner != null) owner.refreshAfter(0) else publishFallback(context)
      }
      TICK -> {
        if (foreground) { hide(context); return }
        if (service != null) { cancelTick(context); return }
        // END owns completion, including when its inexact alarm arrives late.
        // Never cancel or replace END from a progress-only update.
        if (System.currentTimeMillis() >= endAt) { cancelTick(context); return }
        publishFallback(context)
      }
      END -> {
        // An already queued alarm for an earlier end cannot complete an extended rest.
        if (intent.getLongExtra("endAt", 0) != endAt) return
        if (System.currentTimeMillis() < endAt) { schedule(context, endAt); return }
        val owner = service
        if (owner != null) owner.refreshAfter(0) else complete(context)
      }
    }
  }

  /** Called only after onStartCommand has promoted its prebuilt notification. */
  @Synchronized fun serviceStarted(owner: RestTimerService, token: String?, startId: Int) {
    val state = prefs(owner)
    if (token == null || state.getString("token", null) != token || foreground || !isPermissionGranted(owner)) {
      // A queued start must neither revive a hidden timer nor stop a newer owner.
      val current = service
      if (current != null) refreshService(current) else {
        owner.finish(startId)
        manager(owner).cancel(TIMER_ID)
        // A newer start may already have fallen back. Removing this stale FGS also
        // removes the shared notification ID, so restore the current timer immediately.
        startFailed(owner, state.getString("token", null))
      }
      return
    }
    service = owner
    cancelTick(owner)
    refreshService(owner)
  }

  @Synchronized fun serviceStartFailed(owner: RestTimerService, token: String?, startId: Int) {
    val current = service
    if (prefs(owner).getString("token", null) != token && current != null) {
      refreshService(current)
      return
    }
    if (service === owner) service = null
    owner.finish(startId)
    startFailed(owner, prefs(owner).getString("token", null))
  }

  private fun startFailed(context: Context, token: String?) {
    if (token == null || prefs(context).getString("token", null) != token) return
    if (foreground || !isPermissionGranted(context)) { hide(context); return }
    if (System.currentTimeMillis() >= prefs(context).getLong("endAt", 0)) complete(context)
    else publishFallback(context)
  }

  @Synchronized fun refreshService(owner: RestTimerService) {
    if (service !== owner) return
    if (foreground || !isPermissionGranted(owner)) { hide(owner); return }
    val remaining = prefs(owner).getLong("endAt", 0) - System.currentTimeMillis()
    if (remaining <= 0) { complete(owner); return }
    notify(owner, TIMER_ID, buildNotification(owner, serviceOwned = true))
    // Align with ceil(remaining / 1000), including the exact endpoint.
    owner.refreshAfter(((remaining - 1) % 1000) + 1)
  }

  @Synchronized fun serviceDestroyed(owner: RestTimerService) {
    if (service === owner) service = null
    // Keep the persisted timer and END alarm available to a cold receiver.
  }

  @Synchronized fun taskRemoved(owner: RestTimerService) {
    if (service === owner) {
      service = null
      owner.finish()
      manager(owner).cancel(TIMER_ID)
    }
  }

  private fun stopService(context: Context) {
    val owner = service
    service = null
    if (owner != null) owner.finish()
    else context.stopService(Intent(context, RestTimerService::class.java))
  }

  private fun clearTimer(context: Context) {
    // Invalidate before publishing completion: service and END share this monitor.
    prefs(context).edit().remove("endAt").remove("startedAt").remove("body").remove("token").commit()
    alarms(context).cancel(receiverIntent(context, END, 3))
    cancelTick(context)
  }

  private fun complete(context: Context) {
    val state = prefs(context)
    if (state.getString("token", null) == null) return
    clearTimer(context)
    if (!foreground && isPermissionGranted(context)) {
      val notification = NotificationCompat.Builder(context, COMPLETE_CHANNEL)
        .setSmallIcon(R.drawable.ic_stat_meetpr)
        .setContentTitle(state.getString("completeTitle", ""))
        .setContentText(state.getString("completeBody", ""))
        .setContentIntent(openIntent(context))
        .setAutoCancel(true)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setSound(null)
        .setVibrate(longArrayOf(0, 80))
        .build()
      notify(context, COMPLETE_ID, notification)
    }
    stopService(context)
    manager(context).cancel(TIMER_ID)
  }

  private fun publishFallback(context: Context) {
    val endAt = prefs(context).getLong("endAt", 0)
    if (!isPermissionGranted(context)) { hide(context); return }
    if (endAt <= System.currentTimeMillis()) { cancelTick(context); return }
    notify(context, TIMER_ID, buildNotification(context, serviceOwned = false))
    scheduleTick(context, endAt)
  }

  private fun buildNotification(context: Context, serviceOwned: Boolean): Notification {
    val state = prefs(context)
    val endAt = state.getLong("endAt", 0)
    val now = System.currentTimeMillis()
    val remaining = (endAt - now).coerceAtLeast(0)
    val seconds = (remaining + 999) / 1000
    val time = String.format(Locale.ROOT, "%02d:%02d", seconds / 60, seconds % 60)
    val shortTime = String.format(Locale.ROOT, "%d:%02d", seconds / 60, seconds % 60)
    val startedAt = state.getLong("startedAt", now)
    val total = (endAt - startedAt).coerceAtLeast(1L)
    val progress = (((now - startedAt).coerceIn(0L, total).toDouble() / total) * PROGRESS_MAX).toInt()
    val builder = NotificationCompat.Builder(context, TIMER_CHANNEL)
      .setSmallIcon(R.drawable.ic_stat_meetpr)
      .setContentTitle(if (serviceOwned) state.getString("titleTemplate", "{0}")?.replace("{0}", time)
        else state.getString("title", ""))
      .setContentText(state.getString("body", "")?.takeIf { it.isNotBlank() })
      .setColor(BRAND_GOLD)
      .setRequestPromotedOngoing(true)
      .setStyle(NotificationCompat.ProgressStyle()
        .addProgressSegment(NotificationCompat.ProgressStyle.Segment(PROGRESS_MAX).setColor(BRAND_GOLD))
        .setProgress(progress))
      .setContentIntent(openIntent(context))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSound(null)
      .setVibrate(longArrayOf(0))
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .addAction(0, state.getString("skip", ""), receiverIntent(context, SKIP, 1))
      .addAction(0, state.getString("add", ""), receiverIntent(context, ADD_30, 2))
    if (serviceOwned) {
      builder.setShowWhen(false).setShortCriticalText(shortTime)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
    } else {
      builder.setWhen(endAt).setShowWhen(true).setUsesChronometer(true)
        .setChronometerCountDown(true).setTimeoutAfter(remaining)
    }
    return builder.build()
  }

  private fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val state = prefs(context)
    manager(context).deleteNotificationChannel("rest-timer")
    manager(context).createNotificationChannels(listOf(
      NotificationChannel(TIMER_CHANNEL, state.getString("timerChannel", ""), NotificationManager.IMPORTANCE_DEFAULT).apply {
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      },
      NotificationChannel(COMPLETE_CHANNEL, state.getString("completeChannel", ""), NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(null, null)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 80)
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      }
    ))
  }

  private fun receiverIntent(context: Context, action: String, request: Int): PendingIntent {
    val state = prefs(context)
    val intent = Intent(context, RestTimerReceiver::class.java).setAction(action)
      .putExtra("token", state.getString("token", null))
      .putExtra("endAt", state.getLong("endAt", 0))
    return PendingIntent.getBroadcast(context, request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun openIntent(context: Context): PendingIntent {
    val intent = requireNotNull(context.packageManager.getLaunchIntentForPackage(context.packageName))
      .putExtra(OPEN_TRAINING, true)
      .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, 16000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun schedule(context: Context, endAt: Long) {
    scheduleAlarm(context, endAt, receiverIntent(context, END, 3))
  }

  private fun cancelTick(context: Context) {
    alarms(context).cancel(receiverIntent(context, TICK, 4))
  }

  private fun scheduleTick(context: Context, endAt: Long) {
    cancelTick(context)
    val next = System.currentTimeMillis() + TICK_INTERVAL_MS
    if (next < endAt) scheduleAlarm(context, next, receiverIntent(context, TICK, 4))
  }

  private fun scheduleAlarm(context: Context, at: Long, intent: PendingIntent) {
    val alarm = alarms(context)
    alarm.cancel(intent)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
      try {
        alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
        return
      } catch (_: SecurityException) { /* Permission may have been revoked since the check. */ }
    }
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
  }

  private fun notify(context: Context, id: Int, notification: android.app.Notification) {
    try { manager(context).notify(id, notification) }
    catch (_: SecurityException) { /* Notification permission was revoked; never request it here. */ }
  }
}
