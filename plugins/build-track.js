// 每次对外发包 +1。
const CN_ANDROID_VERSION_CODE = 3;
const GLOBAL_ANDROID_VERSION_CODE = 1;

/** @param {string | undefined} track */
function getAndroidBuildConfig(track) {
  return {
    package: track === 'china' ? 'com.meetpr.app' : 'com.meetpr.global',
    versionCode: track === 'china' ? CN_ANDROID_VERSION_CODE : GLOBAL_ANDROID_VERSION_CODE,
  };
}

module.exports = { getAndroidBuildConfig };
