# Android 真后端验收包（2026-11-17）

- 源码：`eb3876c514f503c8a553e722b4ecccbba9924a02`，`feat/112-keypad-function-keys`。
- 设备：David 的 vivo V2405A，ADB `10AECF1CX90020R`。
- 构建：`EXPO_PUBLIC_BUILD_TRACK=china`，unset `EXPO_PUBLIC_DEMO_MODE`；`EXPO_ROUTER_APP_ROOT` 指向本工作树 `src/app`。仅运行 `./gradlew assembleRelease`，没有 `--rerun-tasks`。
- 包：`android/app/build/outputs/apk/release/app-release.apk`；未使用 `dist/meetpr-112-test.apk`。
- 包名：`com.meetpr.app.accept112`；版本 `0.1.0 (15)`；使用本地测试签名，与手机正式 CN 包并排。
- APK SHA-256：`6f8a10429f778ee87f2535f6fe698789518381419ddf9069e62b99ef860fd371`。
- APK 内 `assets/index.android.bundle` 与本次生成的 bundle 逐字节相同，包含 `121.40.160.241`。
- Hermes 反汇编确认 `isDemoMode` 函数为 `LoadConstFalse; Ret`，不是演示模式。
- 安装：`adb -s 10AECF1CX90020R install -r .../app-release.apk` 返回 `Success`；David 手动允许系统安装，随后启动 `com.meetpr.app.accept112/com.meetpr.app.MainActivity` 成功。
- 登录由 David 自行完成；未读取或输入凭证。

## 打包前检查发现与修正

交接指定的 `generated/{assets,res}/createBundleReleaseJsAndAssets` 目录现场不存在；当前 RN Gradle 插件实际输出为 `generated/{assets,res}/react/release`。旧生成物已移出构建目录，新 JS bundle 重打成功。

首轮 `assembleRelease` 成功，但 APK 不含 `assets/index.android.bundle`；普通重跑仍缺失。最小核验为用 Python `zipfile` 检查 APK 中该条目，两次均失败；不能仅凭 Gradle 成功判断包可用。

现场插件输出与 `mergeReleaseAssets/merger.xml` 输入路径一致，后者却将 bundle 源目录记录为空，`mergeReleaseAssets`、`compressReleaseAssets`、`packageRelease` 均显示 `UP-TO-DATE`。只移走本工作树资源合并输出与增量缓存后，再跑 `assembleRelease`：三项任务实际执行，13 秒成功；APK bundle 存在、与生成物一致，国内地址与演示开关检查通过。根因范围已确定为本机资源合并的过期缓存；最初形成原因未进一步证实。

仅调整 git 忽略的构建产物；未修改源码、依赖、包名或签名配置。原始构建日志和反汇编放本次 Codex 工作目录 `work/`，此文件保存永久摘要。

## 真账号验收

当前仅完成构建、安装、启动；下列项待实际操作与截图，不以模拟器/Demo 或本地队列恢复冒充服务端持久化。

- [ ] 成长页 e1RM/PR 前置基线。
- [ ] 添加热身组、填重量、长按完成；同步完成。
- [ ] 成长页 e1RM/PR 不受热身组影响。
- [ ] 教练 App 不显示该热身组。
- [ ] 教练网页不显示该热身组。
- [ ] 学员可见；重启后仍在。
- [ ] 服务端读取保留热身标记（可由另一设备同账号新鲜读取交叉验证）。
