package com.meetpr.resttimer

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.UUID

/** All entry points share a lock, including the JS thread and Android's main-thread receiver. */
internal object RestTimerNotifications {
  const val OPEN_TRAINING = "com.meetpr.resttimer.OPEN_TRAINING"
  private const val SKIP = "com.meetpr.resttimer.SKIP"
  private const val ADD_30 = "com.meetpr.resttimer.ADD_30"
  private const val END = "com.meetpr.resttimer.END"
  private const val TIMER_CHANNEL = "rest-timer"
  private const val COMPLETE_CHANNEL = "rest-complete"
  private const val TIMER_ID = 16001
  private const val COMPLETE_ID = 16002
  // Mirrors TRAINING_LIMITS.restMaximumSeconds; the receiver must also work without JS.
  private const val MAX_REMAINING_MS = 900_000L
  private var foreground = false
  private fun prefs(context: Context) = context.getSharedPreferences("rest-timer-notification", Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun isPermissionGranted(context: Context) = NotificationManagerCompat.from(context).areNotificationsEnabled()

  @Synchronized fun enterForeground(context: Context) {
    foreground = true
    hide(context)
  }
  @Synchronized fun leaveForeground() { foreground = false }

  @Synchronized fun show(context: Context, endAt: Long, labels: Map<String, String>) {
    if (foreground || !isPermissionGranted(context)) return
    hide(context)
    if (endAt <= System.currentTimeMillis()) return
    val editor = prefs(context).edit().clear()
      .putLong("endAt", endAt).putString("token", UUID.randomUUID().toString())
    labels.forEach { (key, value) -> editor.putString(key, value) }
    editor.commit()
    publish(context)
  }

  /** Preserve pending button state until JS consumes it, even if Android resumes first. */
  @Synchronized fun hide(context: Context) {
    manager(context).cancel(TIMER_ID)
    manager(context).cancel(COMPLETE_ID)
    alarms(context).cancel(receiverIntent(context, END, 3))
    prefs(context).edit().remove("endAt").remove("token").commit()
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
        publish(context)
      }
      END -> {
        // An already queued alarm for an earlier end cannot complete an extended rest.
        if (intent.getLongExtra("endAt", 0) != endAt) return
        if (System.currentTimeMillis() < endAt) { schedule(context, endAt); return }
        hide(context)
        if (!foreground && isPermissionGranted(context)) {
          val notification = NotificationCompat.Builder(context, COMPLETE_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
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
      }
    }
  }

  private fun publish(context: Context) {
    val state = prefs(context)
    val endAt = state.getLong("endAt", 0)
    val remaining = endAt - System.currentTimeMillis()
    if (remaining <= 0 || !isPermissionGranted(context)) { hide(context); return }
    createChannels(context)
    val notification = NotificationCompat.Builder(context, TIMER_CHANNEL)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(state.getString("title", ""))
      .setContentIntent(openIntent(context))
      .setWhen(endAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setTimeoutAfter(remaining)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(0, state.getString("skip", ""), receiverIntent(context, SKIP, 1))
      .addAction(0, state.getString("add", ""), receiverIntent(context, ADD_30, 2))
      .build()
    notify(context, TIMER_ID, notification)
    schedule(context, endAt)
  }

  private fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val state = prefs(context)
    manager(context).createNotificationChannels(listOf(
      NotificationChannel(TIMER_CHANNEL, state.getString("timerChannel", ""), NotificationManager.IMPORTANCE_LOW).apply {
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
    val alarm = alarms(context)
    val intent = receiverIntent(context, END, 3)
    alarm.cancel(intent)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
      try {
        alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, intent)
        return
      } catch (_: SecurityException) { /* Permission may have been revoked since the check. */ }
    }
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, intent)
  }

  private fun notify(context: Context, id: Int, notification: android.app.Notification) {
    try { manager(context).notify(id, notification) }
    catch (_: SecurityException) { /* Notification permission was revoked; never request it here. */ }
  }
}
