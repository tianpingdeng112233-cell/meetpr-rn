package com.meetpr.resttimer

import android.app.Notification
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import android.graphics.Color
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.UUID

/** All entry points share a lock, including the JS thread and Android's main-thread receiver. */
internal object RestTimerNotifications {
  const val OPEN_TRAINING = "com.meetpr.resttimer.OPEN_TRAINING"
  private const val SKIP = "com.meetpr.resttimer.SKIP"
  private const val ADD_30 = "com.meetpr.resttimer.ADD_30"
  private const val END = "com.meetpr.resttimer.END"
  private const val TIMER_CHANNEL = "rest-timer-v2"
  private const val PROMOTION_CHECK_DELAY_MS = 200L
  // Brand gold500 (light), matching src/design/tokens.ts.
  private val BRAND_GOLD = Color.rgb(217, 119, 6)
  private const val COMPLETE_CHANNEL = "rest-complete"
  private const val TIMER_ID = 16001
  private const val COMPLETE_ID = 16002
  // Mirrors TRAINING_LIMITS.restMaximumSeconds; the receiver must also work without JS.
  private const val MAX_REMAINING_MS = 900_000L
  private var foreground = false
  private val handler = Handler(Looper.getMainLooper())
  private var promotionCheck: Runnable? = null
  private var publication = 0L
  private fun prefs(context: Context) = context.getSharedPreferences("rest-timer-notification", Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun isPermissionGranted(context: Context) = NotificationManagerCompat.from(context).areNotificationsEnabled()

  @Synchronized fun enterForeground(context: Context) {
    foreground = true
    hide(context)
  }
  @Synchronized fun leaveForeground() { foreground = false }

  @Synchronized fun show(context: Context, endAt: Long, body: String, labels: Map<String, String>) {
    hide(context)
    if (foreground || !isPermissionGranted(context) || endAt <= System.currentTimeMillis()) return
    val editor = prefs(context).edit().clear()
      .putLong("endAt", endAt).putString("body", body)
      .putString("token", UUID.randomUUID().toString())
    labels.forEach { (key, value) -> editor.putString(key, value) }
    editor.commit()
    createChannels(context)
    schedule(context, endAt)
    publish(context)
  }

  /** Preserve pending button state until JS consumes it, even if Android resumes first. */
  @Synchronized fun hide(context: Context) {
    clearTimer(context)
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
        // A cold receiver must finish publication before onReceive returns.
        publish(context, checkPromotion = false)
      }
      END -> {
        // An already queued alarm for an earlier end cannot complete an extended rest.
        if (intent.getLongExtra("endAt", 0) != endAt) return
        if (System.currentTimeMillis() < endAt) { schedule(context, endAt); return }
        complete(context)
      }
    }
  }

  private fun cancelPromotionCheck() {
    publication += 1
    promotionCheck?.let { handler.removeCallbacks(it) }
    promotionCheck = null
  }

  private fun clearTimer(context: Context) {
    // Invalidate before publishing completion; all entry points share this monitor.
    cancelPromotionCheck()
    prefs(context).edit().remove("endAt").remove("body").remove("token").commit()
    alarms(context).cancel(receiverIntent(context, END, 3))
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
    manager(context).cancel(TIMER_ID)
  }

  private fun isPromoted(context: Context): Boolean = Build.VERSION.SDK_INT >= 36 &&
    manager(context).activeNotifications.any {
      it.id == TIMER_ID && it.tag == null &&
        (it.notification.flags and Notification.FLAG_PROMOTED_ONGOING) != 0
    }

  private fun publish(context: Context, checkPromotion: Boolean = true) {
    cancelPromotionCheck()
    if (foreground || !isPermissionGranted(context)) { hide(context); return }
    val state = prefs(context)
    val endAt = state.getLong("endAt", 0)
    val token = state.getString("token", null) ?: return
    if (endAt <= System.currentTimeMillis()) return
    if (Build.VERSION.SDK_INT < 36 || !checkPromotion) {
      notify(context, TIMER_ID, buildNotification(context, custom = !isPromoted(context)))
      return
    }

    // Probe actual system promotion, never the device brand or eligibility alone.
    notify(context, TIMER_ID, buildNotification(context, custom = false))
    val expectedPublication = publication
    val appContext = context.applicationContext
    val check = Runnable {
      synchronized(this) {
        val current = prefs(appContext)
        if (publication != expectedPublication || current.getString("token", null) != token ||
          current.getLong("endAt", 0) != endAt) return@synchronized
        promotionCheck = null
        if (foreground || !isPermissionGranted(appContext)) { hide(appContext); return@synchronized }
        if (endAt <= System.currentTimeMillis()) return@synchronized
        if (!isPromoted(appContext)) notify(appContext, TIMER_ID, buildNotification(appContext, custom = true))
      }
    }
    promotionCheck = check
    // A single short wait initiated by this publication, never a periodic refresh.
    handler.postDelayed(check, PROMOTION_CHECK_DELAY_MS)
  }

  private fun buildNotification(context: Context, custom: Boolean): Notification {
    val state = prefs(context)
    val endAt = state.getLong("endAt", 0)
    val remaining = (endAt - System.currentTimeMillis()).coerceAtLeast(1L)
    val builder = NotificationCompat.Builder(context, TIMER_CHANNEL)
      .setSmallIcon(R.drawable.ic_stat_meetpr)
      .setContentTitle(state.getString("title", ""))
      .setContentText(state.getString("body", "")?.takeIf { it.isNotBlank() })
      .setColor(BRAND_GOLD)
      .setRequestPromotedOngoing(!custom)
      .setWhen(endAt)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setTimeoutAfter(remaining)
      .setContentIntent(openIntent(context))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSound(null)
      .setVibrate(longArrayOf(0))
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .addAction(0, state.getString("skip", ""), receiverIntent(context, SKIP, 1))
      .addAction(0, state.getString("add", ""), receiverIntent(context, ADD_30, 2))
    if (custom) {
      val base = SystemClock.elapsedRealtime() + remaining
      builder.setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(contentView(context, R.layout.rest_timer_compact, base))
        .setCustomBigContentView(contentView(context, R.layout.rest_timer_expanded, base))
    }
    return builder.build()
  }

  private fun contentView(context: Context, layout: Int, base: Long): RemoteViews {
    val state = prefs(context)
    val body = state.getString("body", "").orEmpty()
    return RemoteViews(context.packageName, layout).apply {
      setTextViewText(R.id.rest_title, state.getString("title", ""))
      setTextViewText(R.id.rest_body, body)
      setViewVisibility(R.id.rest_body, if (body.isBlank()) View.GONE else View.VISIBLE)
      setChronometer(R.id.rest_countdown, base, null, true)
      setChronometerCountDown(R.id.rest_countdown, true)
    }
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
    val alarm = alarms(context)
    val intent = receiverIntent(context, END, 3)
    alarm.cancel(intent)
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarm.canScheduleExactAlarms()) {
        alarm.setAlarmClock(AlarmManager.AlarmClockInfo(endAt, openIntent(context)), intent)
        return
      }
    } catch (_: SecurityException) { /* Permission may have been revoked since the check. */ }
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, intent)
  }

  private fun notify(context: Context, id: Int, notification: android.app.Notification) {
    try { manager(context).notify(id, notification) }
    catch (_: SecurityException) { /* Notification permission was revoked; never request it here. */ }
  }
}
