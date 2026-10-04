package com.meetpr.resttimer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Manifest receiver: alarms and buttons work without a React/JS process. */
class RestTimerReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    RestTimerNotifications.receive(context, intent)
  }
}
