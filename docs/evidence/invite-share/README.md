# CN 教练码分享：开发证据与 Opus 原生收货入口

本目录不含本轮模拟器截图。David 已将 CN 构建、运行和截图交给 Opus 在沙箱外收货；下列命令是交接步骤，尚未执行，不代表原生验证通过。真实微信发送及聊天中的链接识别须物理 Android 设备另验。

## 已有证据

- `red-behavior-final.log`：实现前 2 suites failed，11 failed / 23 passed；原生手势边界已 mock，失败是缺少新按钮、菜单、标题和链接末行。
- `green.log`：实现后上述 2 suites / 34 tests passed。
- 全量检查结果与最终日志见本轮 `docs/CODEX-JOURNAL.md` 续条。
- `install.log` / `jest-preflight-blocked.log` 是上一轮缺依赖的历史阻塞，不计作 TDD 红阶段。随后 David 在本 worktree 完成安装。

## CN release QA 构建与运行（Opus 在沙箱外执行）

从当前 worktree 构建，使用本地合成 API 和既有打包脚本，输出仅供模拟器收货的 debug-signed release APK。不要分发该包。这里没有真实账号或签名凭证；使用 Opus 的隔离 QA AVD，保留已有用户数据。

```bash
set -euo pipefail
cd /Users/david/Projects/apps/meetpr-rn-wt-invite-share
export PATH="/opt/homebrew/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export EXPO_NO_DOTENV=1
export EXPO_PUBLIC_BUILD_TRACK=china
export EXPO_ROUTER_APP_ROOT="$PWD/src/app"
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3093
export MEETPR_ANDROID_ARCHITECTURES=arm64-v8a
export MEETPR_FORCE_DEBUG_SIGNING=1
invite_evidence="$PWD/docs/evidence/invite-share"
mkdir -p "$PWD/dist/invite-share" "$PWD/node_modules/.cache/invite-share-native"
export TMPDIR="$PWD/node_modules/.cache/invite-share-native"

# 使用既有 fixture，仅监听本机；日志不记录请求体。
node docs/evidence/spec093-2026-10-17/fixture-server.cjs > "$invite_evidence/fixture.log" 2>&1 &
invite_fixture_pid=$!

# 走既有 pack 入口；屏蔽上传签名变量，确保只生成 QA 包。
env -u MEETPR_UPLOAD_STORE_FILE -u MEETPR_UPLOAD_STORE_PASSWORD \
  -u MEETPR_UPLOAD_KEY_ALIAS -u MEETPR_UPLOAD_KEY_PASSWORD \
  bash scripts/pack-android.sh china "$PWD/dist/invite-share" --allow-debug-signing \
  > "$invite_evidence/native-pack.log" 2>&1

# pack 会 prebuild --clean，因此强制重建必须在 pack 之后，不再重复 pack。
(
  cd android
  ./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks --no-build-cache \
    -PreactNativeArchitectures=arm64-v8a --console=plain
  ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
) > "$invite_evidence/native-rebundle.log" 2>&1

cp android/app/build/outputs/apk/release/app-release.apk dist/invite-share/meetpr-cn-invite-share-QA.apk
```

执行每条构建命令后检查 exit code；构建失败时停止，不能拿旧 APK 继续截图。`native-rebundle.log` 的第一轮 `:app:createBundleReleaseJsAndAssets` 必须实际执行，不能是 `UP-TO-DATE` / `FROM-CACHE` / `SKIPPED`，并有 `BUILD SUCCESSFUL`。RN 当前 Gradle 插件同时向 bundler 传 `--reset-cache`。

### Bundle 校验

以下路径按本 worktree 已安装的 RN Gradle 插件 `TaskConfiguration.kt` 核对。比对 APK 内的 Hermes bundle 与刚生成的 bundle，并通过该次 packager sourcemap 核对三份业务源码及文案确实来自当前 worktree。不要用“APK 时间变了”替代这一步。

```bash
python3 - <<'PY'
import hashlib, json, pathlib, zipfile
root = pathlib.Path.cwd()
apk = root / 'dist/invite-share/meetpr-cn-invite-share-QA.apk'
bundle = root / 'android/app/build/generated/assets/react/release/index.android.bundle'
maps = root / 'android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map'
with zipfile.ZipFile(apk) as archive:
    assert archive.read('assets/index.android.bundle') == bundle.read_bytes(), 'APK bundle differs'
mapping = json.loads(maps.read_text())
entries = dict(zip(mapping['sources'], mapping['sourcesContent']))
for relative in (
    'src/features/coach/profile/CoachMyProfileScreen.tsx',
    'src/features/coach/profile/InviteCodesScreen.tsx',
    'src/features/coach/profile/invite-message.ts',
    'src/i18n/catalog/RnExtras.json',
):
    matches = [content for source, content in entries.items() if source.replace('\\', '/').endswith(relative)]
    assert len(matches) == 1 and matches[0] == (root / relative).read_text(), f'Stale source: {relative}'
result = f'APK SHA256: {hashlib.sha256(apk.read_bytes()).hexdigest()}\nBundle SHA256: {hashlib.sha256(bundle.read_bytes()).hexdigest()}\nAPK bundle and current source map contents verified.\n'
(root / 'docs/evidence/invite-share/native-bundle-verification.txt').write_text(result)
print(result)
PY

# AVD 未启动时先运行；已启动则跳过这一行。
emulator -avd meetpr -no-snapshot-save > "$invite_evidence/emulator.log" 2>&1 &
adb -s emulator-5554 wait-for-device
adb -s emulator-5554 reverse tcp:3093 tcp:3093
adb -s emulator-5554 install -r dist/invite-share/meetpr-cn-invite-share-QA.apk
adb -s emulator-5554 shell am force-stop com.meetpr.app
adb -s emulator-5554 shell am start -n com.meetpr.app/.MainActivity
adb -s emulator-5554 shell dumpsys package com.meetpr.app > "$invite_evidence/installed-package.txt"
```

`installed-package.txt` 应为 `com.meetpr.app` / versionCode 2（当前仓基线），不是 Global 包。若目标 AVD 的 serial 不是 `emulator-5554`，先用 `adb devices -l` 核实并替换。fixture 登录可使用 `coach@example.com` 和任意合成字符串；应显示合成教练名「测试教练」、码 `ABCD234567`，不使用真实账号或密码。

## Opus 补验和截图

系统语言设为中文，分别用 light/dark app theme 观察：我的卡片、邀请码管理页、点主分享后的 Android 系统分享面板、「…」动作面板；另外确认管理入口和二次确认、复制后「已复制」。`ThemeProvider` 默认是 light；仅切系统深色不会自动改变明确保存为 light 的 App。应通过既有 `meetpr.appearance` 偏好 seam 或正常外观设置完成主题准备，不修改本次生产 UI。

每个状态使用实际点击打开，再截取当前屏幕；例如：

```bash
adb -s emulator-5554 exec-out screencap -p > "$invite_evidence/cn-light-profile.png"
# 对其余实际页面依次保存 cn-light-invites.png / cn-light-share.png / cn-light-menu.png；
# dark 主题对应 cn-dark-profile.png / cn-dark-invites.png / cn-dark-share.png / cn-dark-menu.png。
# 完成后只停止本次创建的 fixture，移除本次 reverse。
kill "$invite_fixture_pid"
adb -s emulator-5554 reverse --remove tcp:3093
```

模拟器系统分享面板不证明微信真机发出成功，也不证明微信聊天中链接可点击。fixture 链接不证明生产邀请落地页或安装链路。Opus 将实际原生构建日志、上述截图和观察结果补入本目录后再收货。
