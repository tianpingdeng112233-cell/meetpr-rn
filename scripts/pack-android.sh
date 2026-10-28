#!/usr/bin/env bash
# Local prerequisites (existing values are preserved):
# JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
# ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
# Supply the four MEETPR_UPLOAD_* values via an approved environment channel.
# MEETPR_UPLOAD_STORE_FILE must be an absolute path outside generated android/.
# Override MEETPR_ANDROID_ARCHITECTURES with e.g. arm64-v8a,x86_64 for an emulator.
# This script never writes signing values into files or command arguments.
set +x
set -euo pipefail

usage() {
  printf '%s\n' 'Usage: scripts/pack-android.sh <china|global> [output-directory] [--allow-debug-signing]' >&2
}

track=''
output_dir=''
allow_debug=false
for argument in "$@"; do
  case "$argument" in
    --allow-debug-signing) allow_debug=true ;;
    --*) usage; exit 2 ;;
    *)
      if [[ -z "$track" ]]; then
        track="$argument"
      elif [[ -z "$output_dir" ]]; then
        output_dir="$argument"
      else
        usage
        exit 2
      fi
      ;;
  esac
done
case "$track" in china|global) ;; *) usage; exit 2 ;; esac

missing=()
for variable in MEETPR_UPLOAD_STORE_FILE MEETPR_UPLOAD_STORE_PASSWORD MEETPR_UPLOAD_KEY_ALIAS MEETPR_UPLOAD_KEY_PASSWORD; do
  if [[ -z "${!variable:-}" ]]; then
    missing+=("$variable")
  fi
done

suffix=''
export MEETPR_FORCE_DEBUG_SIGNING=0
if (( ${#missing[@]} > 0 )); then
  printf 'Missing signing environment variables: %s\n' "${missing[*]}" >&2
  if [[ "$allow_debug" != true ]]; then
    printf '%s\n' 'Refusing to package. Use --allow-debug-signing only for a local, non-distributable APK.' >&2
    exit 1
  fi
  export MEETPR_FORCE_DEBUG_SIGNING=1
  suffix='-DEBUGSIGNED'
  printf '%s\n' 'WARNING: DEBUG SIGNING — NOT FOR DISTRIBUTION.' >&2
fi

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
if [[ "$MEETPR_FORCE_DEBUG_SIGNING" != 1 ]]; then
  case "$MEETPR_UPLOAD_STORE_FILE" in
    /*) ;;
    *) printf '%s\n' 'MEETPR_UPLOAD_STORE_FILE must be an absolute path outside android/.' >&2; exit 1 ;;
  esac
  # Resolve only the parent path; never read the keystore. --clean removes android/.
  store_parent=$(cd -- "$(dirname -- "$MEETPR_UPLOAD_STORE_FILE")" && pwd -P)
  case "$store_parent/" in
    "$repo_root/android/"*)
      printf '%s\n' 'The signing file must be outside android/: prebuild --clean deletes that directory.' >&2
      exit 1
      ;;
  esac
fi

output_dir=${output_dir:-"$repo_root/dist/android"}
case "$output_dir" in /*) ;; *) output_dir="$PWD/$output_dir" ;; esac
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}
export ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}
export EXPO_PUBLIC_BUILD_TRACK="$track"
# Keep credentials out of dotenv files and logs. API URL is not set here;
# china uses the existing default unless explicitly overridden by the caller.
export EXPO_NO_DOTENV=1
cd -- "$repo_root"

config_json=$(npx expo config --type public --json)
metadata=$(printf '%s' "$config_json" | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const config = JSON.parse(input);
  const { package: packageName, versionCode } = config.android;
  if (!/^[a-zA-Z0-9_.]+$/.test(packageName) ||
      !/^[a-zA-Z0-9_.-]+$/.test(config.version) ||
      !Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error("Invalid Android package/version metadata");
  }
  process.stdout.write([packageName, config.version, versionCode].join("\t"));
});
')
IFS=$'\t' read -r package_name version_name version_code <<< "$metadata"

# --no-install preserves the already-installed dependencies and lockfile.
npx expo prebuild --platform android --clean --no-install
(
  cd android
  ./gradlew assembleRelease "-PreactNativeArchitectures=${MEETPR_ANDROID_ARCHITECTURES:-arm64-v8a}"
)

apk="$repo_root/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$apk" ]]; then
  printf '%s\n' 'Release APK was not produced at android/app/build/outputs/apk/release/app-release.apk.' >&2
  exit 1
fi

apksigner_path=$(command -v apksigner || true)
if [[ -z "$apksigner_path" ]]; then
  # Pick the highest installed stable build-tools version, without GNU sort -V.
  apksigner_path=$(node - "$ANDROID_HOME" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(process.argv[2], 'build-tools');
if (fs.existsSync(directory)) {
  const versions = fs.readdirSync(directory).filter(v => /^\d+\.\d+\.\d+$/.test(v));
  versions.sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
  for (const version of versions) {
    const candidate = path.join(directory, version, 'apksigner');
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      process.stdout.write(candidate);
      break;
    } catch { /* Try the next installed version. */ }
  }
}
NODE
)
fi
if [[ -n "$apksigner_path" ]]; then
  # A verification failure stops packaging; only a missing tool is non-fatal.
  certificates=$("$apksigner_path" verify --print-certs "$apk")
  printf '%s\n' "$certificates" | sed -n '/certificate SHA-256 digest:/p'
else
  printf '%s\n' 'WARNING: apksigner not found; certificate SHA-256 was not verified. Verify before distribution.' >&2
fi

mkdir -p -- "$output_dir"
destination="$output_dir/meetpr-$track-$version_name-$version_code$suffix.apk"
cp -- "$apk" "$destination"
printf 'Package: %s\nVersion: %s (%s)\nAPK: %s\n' "$package_name" "$version_name" "$version_code" "$destination"
