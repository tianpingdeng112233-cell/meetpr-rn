# Android build 22 集成验收记录

2026-09-21。当前结论：build 22 的 080–083 客户端增量已实装，代码审查收敛，训练/成长关键路径有定向 Android 模拟器证据。W3 全屏验收未闭环，W4 真机与海外分发未启动。

## 基线与范围

- RN：本地 `integration/w3@6429d50687e6942f6fac768b2a2b582bfa3a4a3a`，工作分支 `feat/build22-parity-acceptance`。
- iOS：`beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea`；080 顺延、081 补录、082 反馈、083 来源点按 shipped 代码复刻。
- [验收范围与测试 seam](../specs/build22-parity/SPEC.md)。保留四个 tab；训练历史使用 stack；未改 e1RM 公式/资格阈值；仅增兼容旧数据的可选来源元数据，无破坏性迁移。
- 远端 `integration/w3@8e6e037` 落后本地基线 22 个提交。本轮以新建冻结分支 `integration/build22-base@6429d50` 为 PR base，保留共享远端分支现状。该 PR 只审本轮增量；合入正式集成线仍须一并处理原有 W3 集成提交。

## 实现结果

| 范围 | 结果 |
|---|---|
| 080 | 推荐日期消费 `shifted_to_date`；四种计划通知校验、收到刷新、点击/冷启进训练页，账号切换/过期 session/重复 response 有守卫。仅客户端消费，未实现 FCM 注册或投递基础设施。 |
| 081 | 游标日快速补录、日期范围、全组编辑/排除/恢复、同步重量/下一格、RPE 半档、长按结算；串行保存保留成功项 ID，失败续写和完成重试避免重复。普通记录继续由服务端归日。 |
| 082 | 按压统一 .97/.85，禁用 .35；Reduce Motion 不缩放；动作与导航触感分类。长按、奖励动效和闪光组件接入；补录顶部金色 toast 2 秒，不触发休息/庆祝。 |
| 083 | 成长数据取本地持久 e1RM 点，缺失日志才回放补齐，保留已存值；历史每天真实节点可选、同值不同日不吞点、选中品牌金；来源详情区分 RPE/教练校准/导入/缺失/无法复算。 |
| 集成返修 | 修复 Dashboard 失效路由；实际补录日期进入历史，包括计划开始前；Android Back 先收数字面板再退出补录；历史 stack 返回保留训练页实例。 |

## 自动验证与审查

- `npx tsc --noEmit`、`npm run lint`、`git diff --check` 通过。
- 全量 Jest：**128 suites / 883 tests 通过**，覆盖补录日期/重试/重复提交、早期历史、持久来源/图表点选、按压/Reduce Motion、奖励生命周期和通知消费。
- Toast 2 秒修正后 design/quick-log 定向回归 **12 suites / 38 tests 通过**，类型与 lint 再次通过。
- `EXPO_PUBLIC_BUILD_TRACK=global EXPO_PUBLIC_API_BASE_URL=https://api.meetpr.app npx expo export --platform android` 通过；导出 bundle 含 Global API 地址且不含 fixture `localhost:39022`。仅证明 JS 构建配置，不证明生产登录或原生 manifest 已满足发布要求。
- Android `assembleDebug` 和 bundled `app:assembleRelease` 均构建成功；后者是 **debug 签名、localhost fixture API 的 QA 包**，不作为海外发布包。
- Standards：两轮收敛，提前补录历史消失、Android Back 丢草稿和导航误震已修；通知消费增量 CLEAN。
- Spec：两轮收敛，全 app 按压反馈、历史点金色选中与早期记录已修；通知消费和最终 2 秒 toast 增量通过。
- 独立审查记录在主机 `/Users/david/CodexConfig/reviews/2026-09-21-rn-build22.md`。Matt tracker 配置尚缺，本轮使用 `review-loop` 独立双轴收货；未伪称 tracker 工作流已完成。

## 模拟器证据与复现

Android：AVD `meetpr`、API 35 ARM64、1080×2400、dpi 420，ADB 经 David 明确授权。英文 UI。iOS：pinned DemoStudent 在 iPhone 17 Pro 模拟器运行，中文演示数据。两端角色、主题和内容层次对照，不以不同数据/语言截图宣称像素完全相同。

Android 使用本地合成 API `http://localhost:39022`；学员、计划、日志均为 fixture，没有改写 Global 数据。完整脚本及过程日志留在主机 `Projects/scratch/rn-build22-acceptance-20260921/`。模拟器通过 `adb reverse tcp:39022 tcp:39022` 接入；构建使用 `EXPO_PUBLIC_API_BASE_URL` 指向该地址。复验时先启动 fixture、安装 QA 包，再执行以下动作。

| 场景与操作 | 观察 | 截图 |
|---|---|---|
| Today → Training → Quick log | 日期卡、组表格、数值输入、绿色选择、吸底长按布局与 iOS 结构对照 | [Android 浅色](evidence/build22-20260921/android-quicklog-light.png)、[iOS 深色参照](evidence/build22-20260921/ios-quicklog-dark.jpg) |
| Quick log 选 9/20，长按完成 9 组 | 三项各 3 组写入所选日期；W3D1 完成并推进 W3D4，未出庆祝/休息 | [提交前日期](evidence/build22-20260921/android-quicklog-selected-date.png)、[历史 9/20 的 9/9 组](evidence/build22-20260921/android-history-backfill.png) |
| Growth → 点 9/14 历史节点 | 来源保留 184.6kg、144kg ×5 @8，RTS 复算信息；节点选中金色 | [浅色曲线](evidence/build22-20260921/android-growth-light.png)、[浅色来源](evidence/build22-20260921/android-source-light.png) |
| 冷启 → Profile 切 Dark → Growth | 补录日期点仍在；深色曲线与来源层级正常 | [深色曲线](evidence/build22-20260921/android-growth-dark.png)、[深色来源](evidence/build22-20260921/android-source-dark.png)、[iOS 曲线](evidence/build22-20260921/ios-growth-dark.jpg)、[iOS 来源](evidence/build22-20260921/ios-source-dark.jpg) |
| W3D4 普通记一组 → 休息 → 历史 → 系统返回 | W3D4/Set 2 保留；倒计时从 0:58 继续到 0:10，没有重置；历史全屏无 tab | [前](evidence/build22-20260921/android-rest-before-history.png)、[历史](evidence/build22-20260921/android-history-from-training.png)、[返回](evidence/build22-20260921/android-rest-after-history.png) |

本轮定向页面肉眼检查完成。没有运行完学员 36 项、教练 20 项全部状态，也没有把模拟器震动调用当作真机触感验收。

## 海外发布还差什么

| 优先级 | 待验收/待办 | 完成条件 |
|---|---|---|
| W3 | Global 实际账号端到端 | 获准测试账号的 Bitwarden 条目可用后：登录/刷新/绑定、教练顺延、补录回读、反馈、实时聊天/重连、视频多分片及冷启回填。 |
| W3 | 完整视觉与交互矩阵 | 学员 36 项/教练 20 项、空/错/加载/长文本、小屏/大字体、深浅色、系统返回和 Reduce Motion；新奖励动效逐态截图/录像。 |
| W4 | Google 与 FCM | OAuth client/签名指纹与后端 audience 实测；FCM 注册、token 生命周期、后端投递及通知冷启动真实到达。客户端通知 parser 已完成。 |
| W4 | 真机原生链路 | 至少目标 Android 设备验证录制/压缩/上传/播放/标注、权限拒绝、弱网、前后台和触感；现有上传仅进程内与冷启续传，原生前台服务未做。 |
| W4 | Global 发布配置 | 当前 app.json 和 app.config.ts 重复声明 build-properties，现场生成的 manifest 仍允许 cleartext；需清理并用干净 Global prebuild 验证关闭。QA 的 localhost/debug 签名不得进入发布候选。 |
| W4 | 签名与通道 | David 定稿长期签名与 Google Play closed testing / APK 下载页通道；若网页分发，需要版本检查/更新路径。 |
| W4 | 发布材料 | 启动屏 1×1 占位替换、版本号/隐私与 SDK 清单、分发页/商店材料；CI 与受审 SHA 对齐后再交付候选。 |

未恢复已封存评估、app 排计划、XLSX、视频烧录导出；未变更 backend 或生产数据，未提交 iOS Archive/ASC。
