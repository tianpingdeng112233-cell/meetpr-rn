#!/usr/bin/env node
// Prepare locally; upload the versioned APK and verify it before publishing latest.json.
const { convert } = require('./generate-zh-hant.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

function prepareAndroidUpdate(options, run = execFileSync, buildTools) {
  const { apk, previousApk, notes, output, sdk = process.env.ANDROID_HOME } = options;
  if (!buildTools) {
    if (!sdk) throw new Error('Set ANDROID_HOME to the Android SDK.');
    const directory = path.join(sdk, 'build-tools');
    const version = fs.readdirSync(directory).filter(name => /^\d+\.\d+\.\d+$/.test(name))
      .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))[0];
    if (!version) throw new Error('Android build-tools are required.');
    buildTools = path.join(directory, version);
  }
  const badging = run(path.join(buildTools, 'aapt'), ['dump', 'badging', apk], { encoding: 'utf8' });
  const match = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
  if (!match) throw new Error('Cannot read APK metadata.');
  const [, packageName, code, versionName] = match;
  const versionCode = Number(code);
  const releaseNotes = fs.readFileSync(notes, 'utf8').trim();
  if (packageName !== 'com.meetpr.app' || !Number.isSafeInteger(versionCode) ||
      versionCode < 1 || versionCode > 2100000000 || !/^[\w.+-]{1,32}$/.test(versionName)) {
    throw new Error('A valid CN APK is required.');
  }
  if (!releaseNotes || releaseNotes.length > 1200) throw new Error('Release notes must be 1–1200 characters.');
  const previous = run(path.join(buildTools, 'aapt'), ['dump', 'badging', previousApk], { encoding: 'utf8' });
  const previousMatch = previous.match(/package: name='([^']+)' versionCode='(\d+)'/);
  if (!previousMatch || previousMatch[1] !== packageName || versionCode <= Number(previousMatch[2])) {
    throw new Error('The CN build code must increase over the previous public APK.');
  }
  const certificate = file => {
    const result = run(path.join(buildTools, 'apksigner'), ['verify', '--print-certs', file], { encoding: 'utf8' });
    const fingerprints = [...result.matchAll(/certificate SHA-256 digest: ([0-9a-f]{64})/gi)];
    if (fingerprints.length !== 1 || /CN=Android Debug/i.test(result)) throw new Error('A verified release signature is required.');
    return fingerprints[0][1].toLowerCase();
  };
  const certificateSha256 = certificate(apk);
  if (certificateSha256 !== certificate(previousApk)) throw new Error('Release signing identity changed.');
  const manifest = { schemaVersion: 1, packageName, versionCode, versionName, releaseNotes, releaseNotesZhHant: convert(releaseNotes),
    downloadUrl: `https://dl.meetpr.cn/android/releases/${versionCode}/meetpr-cn.apk` };
  fs.mkdirSync(output);
  const archive = path.join(output, 'android/releases', String(versionCode));
  fs.mkdirSync(archive, { recursive: true });
  fs.copyFileSync(apk, path.join(archive, 'meetpr-cn.apk'));
  fs.copyFileSync(apk, path.join(output, 'android/meetpr-cn.apk'));
  fs.writeFileSync(path.join(output, 'android/latest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({
    packageName, versionCode, versionName, certificateSha256,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),
  }, null, 2) + '\n');
  return manifest;
}

module.exports = { prepareAndroidUpdate };
if (require.main === module) {
  const [apk, previousApk, notes, output] = process.argv.slice(2);
  if (!apk || !previousApk || !notes || !output || process.argv.length !== 6) {
    console.error('Usage: node scripts/prepare-android-update.cjs <new.apk> <previous-public.apk> <notes.txt> <new-output-directory>');
    process.exitCode = 1;
  } else {
    try {
      const release = prepareAndroidUpdate({ apk, previousApk, notes, output });
      console.log(`Prepared CN ${release.versionName} (${release.versionCode}) in ${output}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
