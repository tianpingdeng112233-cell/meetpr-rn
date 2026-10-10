# 卡 C · 091 包名分轨、签名接线、出包脚本

先读仓根 `CONTEXT.md` 与 `AGENTS.md`（文件开头要求先读 Expo SDK 57 的版本化文档，照做），再读同目录 `SPEC.md` §1、§3。

- 工作树：`/Users/david/Projects/apps/meetpr-rn-wt-091c`，分支 `feat/091c-build-tracks`。**只在这棵树里写**；开工先试写一个临时文件确认可写，不可写立刻带原始报错返回。`node_modules` 是指向主仓的软链，不要重装依赖、不要改 `package.json` / lock。
- 不 commit、不 push、不开 PR。交付＝工作区改动 + `docs/CODEX-JOURNAL.md` 追加一段。
- **本卡不接触任何真实 keystore、口令或凭证**。不要生成、读取或写入任何 `.keystore` / `.jks` 文件到仓内，不要把任何口令写进文件。

## 背景事实

- `android/` 不在 git 里（`.gitignore` 有 `/android`），由 `expo prebuild` 按 `app.json` + `app.config.ts` 生成。所以包名与签名都必须落在 Expo 配置层（config plugin），不能去改生成物。
- 现状两轨共用 `app.json` 里的 `android.package = com.meetpr.app`；release 构建用的是调试签名。
- 分轨开关是环境变量 `EXPO_PUBLIC_BUILD_TRACK`（`china`｜其它＝`global`），`app.config.ts` 已在读它。

## 目标

1. **包名分轨（SPEC §1）**：`app.config.ts` 按轨产出 `android.package`——`china` → `com.meetpr.app`，`global` → `com.meetpr.global`。把「轨 → 包名」抽成一个可单测的纯函数（放 `app.config.ts` 旁的小模块，供配置与测试共用）。应用显示名两轨都保持 `MeetPR`。iOS 相关字段不动。
2. **签名接线（SPEC §3）**：新增一个本仓内的 config plugin（`plugins/with-release-signing.js` 或 `.ts`，跟仓内现有写法；仓内没有 `plugins/` 就新建），在 prebuild 生成的 `android/app/build.gradle` 里加入 `release` 签名配置，四个值全部从 Gradle 属性／环境变量读取：`MEETPR_UPLOAD_STORE_FILE`、`MEETPR_UPLOAD_STORE_PASSWORD`、`MEETPR_UPLOAD_KEY_ALIAS`、`MEETPR_UPLOAD_KEY_PASSWORD`。
   - 四个值齐备 → `release` 用它签名。
   - 任一缺失 → `release` 仍回落到调试签名（保持今天的行为，CI 与本地调试不受影响），并在构建日志里打一行醒目的警告说明这不是可分发的包。
   - plugin 对同一份 `build.gradle` 重复执行不得重复插入。
3. **出包脚本**：`scripts/pack-android.sh <china|global> [输出目录]`。
   - 设好 `EXPO_PUBLIC_BUILD_TRACK`，`china` 轨不显式设 API 地址（用代码里的默认值）。
   - 跑 `npx expo prebuild --platform android --clean`，再 `./gradlew assembleRelease`（默认只出 `arm64-v8a`，可用环境变量放开）。
   - 开头检查四个签名变量：缺失时直接失败退出并说明缺哪几个；加 `--allow-debug-signing` 才允许继续出调试签名包，且输出文件名带 `-DEBUGSIGNED`。
   - 产物复制为 `meetpr-<track>-<versionName>-<versionCode>.apk`，并打印包名、版本、签名证书 SHA-256 指纹（用 `apksigner verify --print-certs`，找不到 `apksigner` 就提示而不失败）。
   - 脚本里写明本机构建所需的 `JAVA_HOME` / `ANDROID_HOME`（见 `AGENTS.md`「本机 gotcha」），已设置则不覆盖。
   - 不把任何口令 echo 出来；`set -x` 之类会泄露环境变量的调试输出不要开。
4. **`.gitignore`**：确保 `*.keystore`、`*.jks`、`keystore.properties` 被忽略（已有的不重复加）。
5. **版本号**：`versionCode` 首版为 1，在 `app.config.ts` 里从一处常量读，注释写明「每次对外发包 +1」。`versionName` 沿用 `app.json` 的 `version`。

## 不在本卡

- `src/` 下任何文件（卡 B 在另一棵树做登录注册）。
- 真正出一个可分发的包（需要 David 的 keystore，Opus 陪跑时做）。
- Google OAuth client、后端、iOS、`AGENTS.md` / `PLAN.md` / `PARITY.md`。
- 推送、应用商店、下载页。

## 约束

- 不新增 npm 依赖（config plugin 用 `expo/config-plugins`，已随 Expo 提供）。
- `global` 轨除包名外的 Expo 配置产出与今天一致（Google scheme、明文流量开关等不变）。
- CI 只跑 ubuntu runner，不要加需要 macOS 或安卓 SDK 的 CI 步骤。

## 验收标准

- `SPEC.md`「验收清单」第 1 条的配置部分、第 10 条的仓内部分（仓内无 keystore、无口令）。
- 对 `china`、`global` 分别求值 Expo 配置（`npx expo config --type public --json`，设好环境变量），`android.package` 分别为 `com.meetpr.app`、`com.meetpr.global`。
- plugin 的 Gradle 改写有单测：给一段与 Expo 57 模板一致的 `build.gradle` 文本，断言改写结果含从环境读取的 `release` 签名、缺值回落调试签名、重复执行幂等。

## 测试 seam（先红后绿，只用这两处）

1. 「轨 → 包名／版本号」纯函数的单测（新文件，放 `src/config/__tests__/` 之外的合适位置，例如 `plugins/__tests__/` 或根部 `__tests__/`，以 jest 现有配置能收集到为准；若收集不到，说明原因并给出最小的 jest 配置调整）。
2. config plugin 的「Gradle 文本改写」函数的单测（把改写逻辑写成纯函数，plugin 只是薄包装）。

脚本不写自动化测试；在 JOURNAL 里写明你实际执行过的命令与结果。沙箱里若跑不了 `expo prebuild` 或 Gradle，如实写「未执行」及原始报错，不要写成通过——Opus 会在沙箱外实跑。

## 交付前自检

`npx tsc --noEmit`、`npm run lint`、`npm test` 全量；`bash -n scripts/pack-android.sh`。结果如实写进 JOURNAL。返回时给出改动文件列表、自检结果、以及任何需回到 Opus 决策的点。
