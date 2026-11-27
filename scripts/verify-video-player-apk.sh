#!/usr/bin/env bash
# react-native-video 6.19.2 must use the Media3 builder supplied by our patch.
set -euo pipefail

apk=${1:?Pass the assembled APK}
analyzer=$(command -v apkanalyzer || true)
if [[ -z "$analyzer" ]]; then
  analyzer="${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK}/cmdline-tools/latest/bin/apkanalyzer"
fi
player=$("$analyzer" dex code --class com.brentvatne.exoplayer.ReactExoplayerView \
  --method 'initializePlayerCore(Lcom/brentvatne/exoplayer/ReactExoplayerView;)V' "$apk")
if [[ "$player" == *'ReactExoplayerView$RNVLoadControl;-><init>'* ||
      "$player" != *'DefaultLoadControl$Builder;->build()Landroidx/media3/exoplayer/DefaultLoadControl;'* ]]; then
  echo 'APK contains an incompatible video player. Run npm ci in this checkout and rebuild.' >&2
  exit 1
fi
echo 'Verified the Media3 video player in the assembled APK.'
