import { expect, test } from '@jest/globals';
import { rewriteReleaseSigning } from '../with-release-signing';

// Relevant block from Expo 57.0.7's template.tgz/android/app/build.gradle.
// Debug signing values are deliberately omitted: this fixture contains no credentials.
const expo57Gradle = `apply plugin: "com.android.application"
android {
    namespace "com.helloworld"
    defaultConfig {
        applicationId "com.helloworld"
        versionCode 1
        versionName "1.0"
    }
    signingConfigs {
        debug {
            // Template debug signing values intentionally omitted.
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
            shrinkResources enableShrinkResources.toBoolean()
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
            crunchPngs enablePngCrunchInRelease.toBoolean()
        }
    }
}
`;

test('release signing reads all four values at Gradle runtime and preserves the Expo template', () => {
  const result = rewriteReleaseSigning(expo57Gradle);
  expect(result.startsWith(expo57Gradle)).toBe(true);
  for (const key of ['STORE_FILE', 'STORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']) {
    expect(result).toContain(`System.getenv('MEETPR_UPLOAD_${key}')`);
    expect(result).toContain(`findProperty('MEETPR_UPLOAD_${key}')`);
  }
  expect(result).toContain('storeFile file(meetprUploadSigning.storeFile)');
  expect(result).toContain('storePassword meetprUploadSigning.storePassword');
  expect(result).toContain('keyAlias meetprUploadSigning.keyAlias');
  expect(result).toContain('keyPassword meetprUploadSigning.keyPassword');
  expect(result).toContain('android.buildTypes.release.signingConfig = android.signingConfigs.release');
});

test('any missing signing value selects debug signing and warns that the package is not distributable', () => {
  const result = rewriteReleaseSigning(expo57Gradle);
  expect(result).toContain('meetprUploadSigning.values().every { it != null && !it.toString().isEmpty() }');
  expect(result).toMatch(/if \(meetprHasUploadSigning\) \{[\s\S]*android\.signingConfigs \{/);
  expect(result).toMatch(/} else \{\s*android\.buildTypes\.release\.signingConfig = android\.signingConfigs\.debug/);
  expect(result).toContain('logger.warn(');
  expect(result).toContain('DEBUG SIGNING');
  expect(result).toContain('NOT FOR DISTRIBUTION');
});

test.each(['\n', '\r\n'])('repeated prebuild is byte-for-byte idempotent with %j line endings', (newline) => {
  const original = expo57Gradle.replace(/\n/g, newline);
  const once = rewriteReleaseSigning(original);
  expect(rewriteReleaseSigning(once)).toBe(once);
  expect(once.match(/def meetprUploadSigning =/g)).toHaveLength(1);
});

test('the packaging script can force debug signing even when Gradle properties supply missing values', () => {
  const result = rewriteReleaseSigning(expo57Gradle);
  expect(result).toContain("System.getenv('MEETPR_FORCE_DEBUG_SIGNING') != '1' && meetprUploadSigning.values().every");
});
