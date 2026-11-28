# Android CI 提速 · 2026-11-28

## 两种事件下的完整命令

同一 PR 的运行共用 `github.ref` 并发组，新提交会取消旧运行。Gradle 只编译 `arm64-v8a`。

```sh
cd android && ./gradlew :expo-image-picker:testDebugUnitTest :training-video:testDebugUnitTest assembleDebug --no-daemon -PreactNativeArchitectures=arm64-v8a
```

每次 push 到 main 都以自己的 `github.run_id` 分组，连续合并时排队中的构建也能保留。Gradle 使用默认四套架构。

```sh
cd android && ./gradlew :expo-image-picker:testDebugUnitTest :training-video:testDebugUnitTest assembleDebug --no-daemon
```

## 本地验证

- actionlint 未能运行。`brew install actionlint` 退出 1，沙箱内的 `/opt/homebrew` 等安装目录不可写。`go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/ci.yml` 退出 127，报错为 `command not found: go`。
- PyYAML 6.0.3 解析通过。分别代入 PR 和 main 的参数值，核对了上面两条完整命令，并与基线 `f537fa7` 比对了其余 workflow 步骤。`git diff --check` 通过。
- APK 校验脚本读取 DEX 中的播放器方法，与 ABI 目录无关。

## 待 GitHub Actions 验收

- 开 PR 后，确认 `android-build` 通过，日志中 `buildCMakeDebug[...]` 只出现 `arm64-v8a`，并记录 job 耗时与原约 20 分钟的差值。
- 合并后，确认 main 的 push 构建通过，并在日志中核对 `arm64-v8a`、`armeabi-v7a`、`x86`、`x86_64` 四套架构。
