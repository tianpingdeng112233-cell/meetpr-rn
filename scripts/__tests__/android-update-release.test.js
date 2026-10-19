import { afterEach, expect, jest, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareAndroidUpdate } from '../prepare-android-update.cjs';

const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meetpr-update-')); dirs.push(root);
  const apk = path.join(root, 'new.apk'), previousApk = path.join(root, 'old.apk'), notes = path.join(root, 'notes.txt');
  fs.writeFileSync(apk, 'new-apk'); fs.writeFileSync(previousApk, 'old-apk'); fs.writeFileSync(notes, '新增版本更新提醒');
  const options = { apk, previousApk, notes, output: path.join(root, 'out'), sdk: '/sdk' };
  const run = jest.fn((tool, args) => {
    if (tool.endsWith('aapt')) return `package: name='com.meetpr.app' versionCode='${args.at(-1) === apk ? 2 : 1}' versionName='0.1.0'`;
    return `Signer #1 certificate DN: CN=MeetPR\nSigner #1 certificate SHA-256 digest: ${'a'.repeat(64)}`;
  });
  return { options, run };
}

test('release preparation derives metadata from the APK and bundles the immutable APK before its manifest', () => {
  const { options, run } = fixture();
  prepareAndroidUpdate(options, run, '/sdk/build-tools/36.0.0');
  const manifest = JSON.parse(fs.readFileSync(path.join(options.output, 'android/latest.json'), 'utf8'));
  expect(manifest).toEqual({ schemaVersion: 1, packageName: 'com.meetpr.app', versionCode: 2, versionName: '0.1.0', releaseNotes: '新增版本更新提醒', downloadUrl: 'https://dl.meetpr.cn/android/releases/2/meetpr-cn.apk' });
  expect(fs.readFileSync(path.join(options.output, 'android/releases/2/meetpr-cn.apk'), 'utf8')).toBe('new-apk');
  expect(fs.readFileSync(path.join(options.output, 'android/meetpr-cn.apk'), 'utf8')).toBe('new-apk');
});

test.each(['wrong-package', 'same-build', 'different-cert', 'debug-cert', 'invalid-signature', 'empty-notes'])('refuses %s without producing a publishable directory', reason => {
  const { options, run } = fixture();
  if (reason === 'empty-notes') fs.writeFileSync(options.notes, '  ');
  const changed = (tool, args, config) => {
    if (reason === 'invalid-signature' && tool.endsWith('apksigner')) throw new Error('signature invalid');
    let text = run(tool, args, config);
    if (reason === 'wrong-package') text = text.replace('com.meetpr.app', 'com.meetpr.global');
    if (reason === 'same-build') text = text.replace("versionCode='2'", "versionCode='1'");
    if (reason === 'debug-cert') text = text.replace('CN=MeetPR', 'CN=Android Debug');
    if (reason === 'different-cert' && args.at(-1) === options.apk) text = text.replace('a'.repeat(64), 'b'.repeat(64));
    return text;
  };
  expect(() => prepareAndroidUpdate(options, changed, '/sdk/build-tools/36.0.0')).toThrow();
  expect(fs.existsSync(options.output)).toBe(false);
});
