package com.meetpr.video

import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import java.lang.ref.WeakReference
import org.junit.Assert.assertSame
import org.junit.Test
import org.objenesis.ObjenesisStd

class TrainingVideoDefinitionTest {
  @Test fun buildsTheExpoModuleDefinitionAtStartup() {
    // The DSL requires a context identity to register SharedObjects. No Android/JSI
    // runtime should be used until one of the registered functions is invoked.
    val context = ObjenesisStd().newInstance(AppContext::class.java)
    val module = TrainingVideoModule()
    Module::class.java.getDeclaredField("_appContextHolder").apply { isAccessible = true }
      .set(module, WeakReference(context))
    module.definition()
    assertSame(context, module.appContext)
  }
}
