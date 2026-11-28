# 卡：安卓 CI 提速（PR 只编 arm64，合并后跑完整版）

级别 T1｜仓 meetpr-rn｜分支 `ci/android-speedup`（基于 origin/main f537fa7）｜worktree `/Users/david/Projects/apps/meetpr-rn-wt-ci-speed`

先读仓根 CONTEXT.md（有则读）。

## 目标
`.github/workflows/ci.yml` 的 `android-build` 现在每次约 20 分钟，其中 gradle 一步 21 分钟。日志显示原生 C++（expo-modules-core、react-native-nitro-modules、react-native-screens 等）给 arm64-v8a / armeabi-v7a / x86 / x86_64 四套架构各编一遍。改成：

- `pull_request`：gradle 命令加 `-PreactNativeArchitectures=arm64-v8a`，只编一套。
- `push` 到 `main`（合并后）：保持现状，四套架构完整构建。
- concurrency：PR 上新提交照旧取消旧运行；main 上每次合并都要跑完自己的完整构建，不互相取消（例如 `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`）。

## 文件范围
只改 `.github/workflows/ci.yml`。如果 `scripts/verify-video-player-apk.sh` 依赖 APK 里的架构目录，可以一并调整，否则不碰。

## 约束
- 不改 `check` job、单元测试命令、"Free disk space" 步骤、APK 校验步骤和上传产物步骤。
- 不改正式出包流程（`android/` 与签名相关的一律不碰）。
- 不加新的第三方 action。

## Out of Scope
ccache 等 C++ 编译缓存、gradle 构建缓存/configuration cache、保留 NDK 不删、按路径跳过安卓构建、换付费 runner。

## 验收标准
1. 本地用 actionlint（`brew install actionlint` 或 `go run github.com/rhysd/actionlint/cmd/actionlint@latest`）跑这个 workflow，零报错。
2. 在 JOURNAL 里写清楚 PR 和 push main 两种事件下，gradle 实际执行的完整命令各是什么。
3. 收货方（Opus）开 PR 后：PR 的 android-build 绿，日志里 `buildCMakeDebug[...]` 只出现 arm64-v8a，job 耗时明显低于 20 分钟。
4. 合并后：main 的 push 运行四套架构都编，绿。

## 测试 seam
GitHub Actions 运行本身就是 seam：PR 运行验证快速路径，合并后的 main 运行验证完整路径。本地只能做 actionlint 静态检查。

## 交付
- JOURNAL 写到 `docs/journal/2026-11-28-ci-android-speedup.md`。
- 沙箱里 commit/push 做不了，改完留在工作区即可，由 Opus 提交并开 PR。
