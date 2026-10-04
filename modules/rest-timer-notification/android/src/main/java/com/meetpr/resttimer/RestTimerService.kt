package com.meetpr.resttimer

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

/** The coordinator owns state; this service supplies foreground lifetime and a main-thread clock. */
class RestTimerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val tick = Runnable { RestTimerNotifications.refreshService(this) }

  @Suppress("DEPRECATION")
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      // show prepared the channel and notification before requesting a service start.
      // Only unpack the argument here: no preferences, alarms or notification building before promotion.
      val notification = intent?.getParcelableExtra<Notification>("notification")
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(RestTimerNotifications.TIMER_ID, notification!!, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(RestTimerNotifications.TIMER_ID, notification!!)
      }
    } catch (_: RuntimeException) {
      RestTimerNotifications.serviceStartFailed(this, intent?.getStringExtra("token"), startId)
      return START_NOT_STICKY
    }
    RestTimerNotifications.serviceStarted(this, intent?.getStringExtra("token"), startId)
    return START_NOT_STICKY
  }

  internal fun refreshAfter(delayMs: Long) {
    handler.removeCallbacks(tick)
    handler.postDelayed(tick, delayMs)
  }

  internal fun finish(startId: Int? = null) {
    handler.removeCallbacks(tick)
    stopForeground(STOP_FOREGROUND_REMOVE)
    if (startId == null) stopSelf() else stopSelf(startId)
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    RestTimerNotifications.taskRemoved(this)
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    RestTimerNotifications.serviceDestroyed(this)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
