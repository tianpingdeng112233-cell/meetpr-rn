// 每次对外发包 +1。
const ANDROID_VERSION_CODE = 1;

/** @param {string | undefined} track */
function getAndroidBuildConfig(track) {
  return {
    package: track === 'china' ? 'com.meetpr.app' : 'com.meetpr.global',
    versionCode: ANDROID_VERSION_CODE,
  };
}

module.exports = { getAndroidBuildConfig };
