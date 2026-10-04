package com.meetpr.resttimer

import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RestTimerNotificationModule : Module() {
  private var openRequested = false
  private val context get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("RestTimerNotification")
    Events("onOpenTraining")

    // Loading JS on a cold launch never restores an old in-page rest.
    OnCreate { RestTimerNotifications.enterForeground(context) }
    OnActivityEntersForeground { RestTimerNotifications.enterForeground(context) }
    OnActivityEntersBackground { RestTimerNotifications.leaveForeground() }
    OnNewIntent { intent ->
      if (takeOpenRequest(intent)) {
        openRequested = true
        sendEvent("onOpenTraining")
      }
    }
    Function("consumeOpenRequest") {
      val fromLaunch = takeOpenRequest(appContext.currentActivity?.intent)
      val requested = openRequested || fromLaunch
      openRequested = false
      requested
    }
    Function("isPermissionGranted") { RestTimerNotifications.isPermissionGranted(context) }
    Function("show") { endAtEpochMs: Double, body: String, labels: Map<String, String> ->
      RestTimerNotifications.show(context, endAtEpochMs.toLong(), body, labels)
    }
    Function("hide") { RestTimerNotifications.hide(context) }
    Function("consumeState") { RestTimerNotifications.consumeState(context) }
  }

  private fun takeOpenRequest(intent: Intent?): Boolean {
    if (intent?.getBooleanExtra(RestTimerNotifications.OPEN_TRAINING, false) != true) return false
    intent.removeExtra(RestTimerNotifications.OPEN_TRAINING)
    return true
  }
}
