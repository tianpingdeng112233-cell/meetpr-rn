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

已完成构建、安装、成长基线、长按完成和冷启动保留；教练双端与独立服务端读取仍待验，不以模拟器/Demo 或本地队列恢复冒充服务端持久化。

- [x] 成长页 e1RM 前置基线：合计 433.9 kg；深蹲 148.8 kg、卧推 110.7 kg、硬拉 174.4 kg；19 次训练、训练 1RM 合计 520 kg。截图为 `vivo-growth-before.png`、`vivo-e1rm-before.png` 及三张 `vivo-{squat,bench,deadlift}-before.png`。尚未观察到独立 PR 清单，不能将 e1RM 截图当作全部 PR 证据。
- [x] 添加热身组、填重量、长按完成；同步完成。相扑节奏硬拉 50 kg×4 / RPE 7；完成回顾为 8 动作 / 16 组 / 97 次 / 2,900 kg，热身未计入。见 `vivo-warmup-saved.png`、`vivo-completion.png`、`vivo-completion-review.png`。
- [x] 成长页 e1RM 不变：热身写入后与完成、冷启动后均为 433.9 kg；写入后训练 1RM 仍为 520 kg。见 `vivo-growth-after-warmup.png`、`vivo-e1rm-after-warmup.png`、`vivo-growth-after-completion.png`。完成次数由 19→20 是本次完成训练的正常变化。
- [ ] 独立 PR 清单前后对照（现有界面仅直接取证 e1RM 与训练 1RM，未冒充完整 PR 验收）。
- [ ] 教练 App 不显示该热身组。
- [x] 教练网页不显示该热身组。David 提供已登录国内网页的 11/14 W2D4 截图，开启「显示实际」，相扑节奏硬拉仅两组正式组（实际均 —×4 / RPE 6），没有 50×4 / RPE 7；主项 8 组、辅助项 8 组。见 `coach-web-warmup-hidden.png`。
- [x] 学员可见；force-stop 后重启，11/14 W2D4 相扑节奏硬拉仍显示 50 kg×4 / RPE 7，空热身草稿已在长按完成时丢弃。见 `vivo-warmup-after-restart.png`。
- [ ] 服务端读取保留热身标记（可由另一设备同账号新鲜读取交叉验证）。

当前训练页：W2D4，新计划第 2 周，8 个动作；相扑节奏硬拉处方 2×4 / RPE 6，重量空。已保存 `vivo-training-before.png`。David 已自行添加 50 kg×4 / RPE 7 热身组及 5 kg×4 / RPE 9 额外组，截图见 `vivo-delete-before.png`；尚未完成训练或验证远端持久化。

## 左滑删除返修包（已安装，后续视觉修正版见下）

- 源码：`53cf277` 上的本次左滑删除返修；取消热身/额外组行内删除图标，左滑露出删除，底部「＋ 加一组」。
- 同一构建轨、独立包名和构建命令，移走实际 bundle 与资源合并缓存后 `assembleRelease` 56 秒成功。
- APK SHA-256：`0d2994940673027924191a649c98b2d464cd94420c91a7d47416b99a61cf3cb2`。
- APK 内 bundle 与生成物逐字节相同、包含国内 IP；Hermes `Function<isDemoMode>` 的完整函数体仍为 `LoadConstFalse; Ret`。
- David 重新连接并允许安装，此包已安装。实屏发现手势根容器未裁剪列表圆角、按钮文案为「移除」，随后修正如下。

## 左滑视觉修正版与真机结果

- 源码：`b583049` 上的圆角与文案修正；普通 View 承担圆角裁剪，滑出按钮使用专门的 Delete / 删除 / 刪除文案。既有确认框保持原逻辑。
- 同轨同包名，仅 `assembleRelease`；构建 72 秒成功。APK SHA-256：`1aba87d47be4b0dd6b54bb4acaaa57abd8f428c545242bd15b9fc798fc548d64`；bundle 一致、国内 IP、Hermes isDemoMode=false 均已核验。vivo 覆盖安装返回 Success。
- 热身与额外组左滑均露出「删除」，相机保留，圆角恢复；见 `vivo-swipe-warmup.png`、`vivo-swipe-extra.png`。亲测点格可打开面板、纵向列表可滚动。
- 新增的空额外组被点击删除后移除，处方两组及热身保留：`vivo-extra-deleted.png`。已保存热身点击删除弹确认：`vivo-delete-confirmation.png`，随后取消，50 kg / RPE 7 保留并完成训练。
- David 报告过键盘开启时点击加热身组疑似新增两组，随后自行复测表示正常。单次 adb 探针独立运行得到 0→1、键盘开启时 1→2；中间一轮 2→4 与 David 同时试用的时间重叠，无法归因。新增真实训练页单次入口测试通过，未定位根因、未声称修复重复新增，记录为暂未稳定复现。
