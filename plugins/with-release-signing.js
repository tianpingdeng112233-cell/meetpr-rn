const { withAppBuildGradle } = require('expo/config-plugins');

const signingBlock = `// @generated begin meetpr-release-signing
// Resolve at Gradle runtime; never serialize signing values into Expo config.
// Environment takes precedence so pack-android.sh and Gradle use the same inputs.
def meetprUploadSigning = [
    storeFile: System.getenv('MEETPR_UPLOAD_STORE_FILE') ?: findProperty('MEETPR_UPLOAD_STORE_FILE'),
    storePassword: System.getenv('MEETPR_UPLOAD_STORE_PASSWORD') ?: findProperty('MEETPR_UPLOAD_STORE_PASSWORD'),
    keyAlias: System.getenv('MEETPR_UPLOAD_KEY_ALIAS') ?: findProperty('MEETPR_UPLOAD_KEY_ALIAS'),
    keyPassword: System.getenv('MEETPR_UPLOAD_KEY_PASSWORD') ?: findProperty('MEETPR_UPLOAD_KEY_PASSWORD')
]
def meetprHasUploadSigning = System.getenv('MEETPR_FORCE_DEBUG_SIGNING') != '1' && meetprUploadSigning.values().every { it != null && !it.toString().isEmpty() }
if (meetprHasUploadSigning) {
    android.signingConfigs {
        release {
            storeFile file(meetprUploadSigning.storeFile)
            storePassword meetprUploadSigning.storePassword
            keyAlias meetprUploadSigning.keyAlias
            keyPassword meetprUploadSigning.keyPassword
        }
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.release
} else {
    android.buildTypes.release.signingConfig = android.signingConfigs.debug
    logger.warn('*** MEETPR: DEBUG SIGNING — missing upload signing values or explicitly forced; NOT FOR DISTRIBUTION ***')
}
// @generated end meetpr-release-signing`;

/** @param {string} contents */
function rewriteReleaseSigning(contents) {
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  const block = signingBlock.replace(/\n/g, newline);
  const generated = /\/\/ @generated begin meetpr-release-signing\r?\n[\s\S]*?\/\/ @generated end meetpr-release-signing/g;
  if (generated.test(contents)) {
    return contents.replace(generated, () => block);
  }
  return `${contents}${newline}${block}${newline}`;
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('MeetPR release signing requires a Groovy app/build.gradle.');
    }
    mod.modResults.contents = rewriteReleaseSigning(mod.modResults.contents);
    return mod;
  });
}

module.exports = withReleaseSigning;
module.exports.rewriteReleaseSigning = rewriteReleaseSigning;
