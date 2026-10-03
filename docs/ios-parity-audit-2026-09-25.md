# iOS build 22 → Android RN 全面复刻核对

基线 = iOS `beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea` / 新隔离 worktree、DemoStudent 与 Demo / 学员、教练 walkthrough；Android RN `d818bf8` / Global QA 与本地合成 fixture / AVD meetpr。

**结论：尚未通过完整复刻验收。** 四个学员 Tab、四个教练 Tab 及主要二级流程已有实现；本轮发现 **3 处功能遗漏、2 处界面差异**。Google、FCM、真机录制等仍有独立门禁。此前“主页面结构通过”不能外推为“所有字段、所有状态均已复刻”。

[逐项走查清单](walkthrough-checklist-2026-09-25.md)可用于修复后的复验；它目前是一份带缺口的验收清单，不是全绿证明。

## 核对方法与范围

- 核查全部 RN 路由及相应 feature 入口，对照固定 iOS 活跃调用路径，排除死代码与封存功能。
- 本轮重新构建固定 iOS 两个 Demo，Android 重新构建同一代码 SHA 的本地 fixture 包。亲验学员 Today、训练、历史、readiness、成长、资料/偏好/账号入口、组录入、补录、聊天/关联回放；教练四 Tab、学员详情五段及邀请码。
- 首轮及恢复后使用 Global 专用 QA 学员，只读查看；本轮没有向 Global 提交训练、资料或聊天。其余填写/选择为本地合成数据，比赛编辑取消，组录入未完成提交。
- 认证/绑定七步向导的全状态、训练写入/失败恢复、视频工作台、权限、小屏深色等沿用明确注明日期的旧证据，**不算本轮重新跑通**。本轮只重新打开注册/找回密码页面。
- 两端种子、日期和逻辑尺寸不同，比较功能入口、字段、顺序、层级与状态语义，不能据此声明同数据像素一致。Android 系统返回、选择器、字体渲染保留平台实现。
- iOS Coach Demo 的名单 ID 与训练种子不一致，学员详情本轮显示无计划/无成长数据；不把它误报为缺失，也不据空态宣布有数据页面完全对等。
- 这是固定基线的观察报告，未修改业务代码。缺口拆成下方修复卡；本次采用的 walkthrough 要求“只观察不改代码”，防止检查过程中基线漂移。

## 已确认差异

学生编号续接历史 P1-6 / P2-11；教练编号续接 P-32。这里的 P1/P2 是问题严重程度，与发布节奏 P 档无关。

| 编号 | 作为用户我想做什么 → 阻力 | iOS 与 RN 的实际差异 | 证据 / 复现 |
|---|---|---|---|
| **P1-7** 视频剪辑 | 选一个训练视频，只上传有效动作片段 → 无剪辑入口 | iOS 相册与录制结束均进入 `VideoTrimView`；RN 相册 `allowsEditing: false` 后直接返回整段，录制确认也没有时间范围选择/导出 | 源码双向核实，见下方固定 SHA；本轮没有用模拟器录像或上传来冒充剪辑 E2E |
| **P2-12** 比赛备注 | 在 Profile 告诉教练本次备赛目标 → 找不到备注输入框 | iOS `Meet / notes` 含 `Anything to tell your coach?`；RN CompetitionSection 仅备赛选择、日期、级别，提交 allowlist 也少 `note_to_coach` | Profile → Meet date；[iOS](evidence/parity-20260925/ios-meet-edit.jpg) / [RN](evidence/parity-20260925/fixture-meet-expanded.png) |
| **P2-13** 基础资料 | 入组后修正单位、性别或生日 → 编辑页只有身高体重 | iOS `.basics` 复用完整 Step1；RN 仅 BodyMeasurementsSection，提交也仅 height/weight | Profile → Height / Body weight；[iOS](evidence/parity-20260925/ios-basics-edit.jpg) / [RN](evidence/parity-20260925/fixture-basics.png) |
| **P2-14** 历史入口 | 在训练页找历史记录 → 可用但位置与文字提示变化 | iOS 页头下方独立金色 `Training history >`；RN 放进页头图标组，只有时钟图标。历史页可打开，属于可发现性/视觉差异 | [iOS](evidence/parity-20260925/ios-training.jpg) / [RN](evidence/parity-20260925/student-training.png) |
| **P-33** 教练角标 | 不打开收件箱就知道待处理数量 → 只能看到红点 | 固定 iOS 底栏显示数字，RN CoachTabs 显式传 `badgeDot` 隐藏数字；内部 count 已有 | [iOS](evidence/parity-20260925/ios-coach-messages.jpg) / [RN](evidence/parity-20260925/fixture-coach-messages.png)；旧 coach-v2 参照包误写“圆点”，应以固定 iOS 现场为准 |

### 源码定位

- P1-7：iOS [相册调用](https://github.com/tianpingdeng112233-cell/meetpr/blob/0748931563fefea14e7f50a7c9ee7330b5501bea/Modules/StudentKit/Sources/StudentKit/Features/VideoUpload/VideoAttachmentSection.swift#L169)、[录制调用](https://github.com/tianpingdeng112233-cell/meetpr/blob/0748931563fefea14e7f50a7c9ee7330b5501bea/Modules/StudentKit/Sources/StudentKit/Features/VideoUpload/Camera/CameraRecorderView.swift#L130)；RN [native.ts](../src/features/training/video-upload/native.ts)、`CameraRecorder.tsx`。两条 active path 均缺 trim；“没有烧录导出”不是这项遗漏的解释。
- P2-12 / P2-13：iOS `Features/MyProfile/ProfileCardsSection.swift:221–232` 分别调用 Step1BasicsSection / CompetitionFieldsSection；RN [ProfileEditor](../src/features/profile/ProfileEditor.tsx) 的 sections 映射、[model](../src/features/profile/model.ts) 的 profilePatch allowlist，以及 [OnboardingSteps](../src/features/onboarding/OnboardingSteps.tsx) 的字段归属。
- P2-14：RN [TodayWorkoutView](../src/features/training/TodayWorkoutView.tsx) 的 history Pressable；源代码中入口存在，问题不应写成“缺历史功能”。
- P-33：RN `src/app/(coach)/(tabs)/_layout.tsx:15`；固定 iOS `Modules/DesignSystem/Sources/DesignSystem/Components/Navigation/MeetPRTabBar.swift:63` 使用 TabUnreadBadge，310 行输出数字/99+。

## 修复卡

先修资料编辑和界面差异，再独立补视频剪辑。只有后者跨原生媒体链，不能与三个小显示改动混成一张卡。

### R1：补齐 Profile 两个编辑面的字段（T1）

开工读已有 CONTEXT（如存在）、AGENTS、build22 SPEC。本卡只处理 P2-12/P2-13：让入组后的编辑面与 iOS 的字段集合一致；保留结构性 1RM 锁定。

- 范围：ProfileEditor、profilePatch、已有向导控件及对应测试；优先复用现有组件和翻译。
- 约束：只提交该分区字段；不能把其他分区空值、三项 1RM 或旧资料覆盖掉；单位切换保留值语义。
- 测试 seam：ProfileEditor 用户输入 → 捕获 onboarding mutation；profilePatch 边界保留 1RM 禁写测试。
- 验收：备注和单位/性别/生日均可编辑、保存、重开回读；失败保留输入；取消不写；身高体重、旧资料和 1RM 无回归。Light/Dark 实屏。
- Out of Scope：训练算法、教练权限、后端 schema、资料迁移。

### R2：恢复历史入口与教练数字角标（T0）

开工读已有 CONTEXT（如存在）、固定 iOS 截图与活跃源码。本卡处理 P2-14/P-33。

- 范围：训练页 history affordance、CoachTabs badge 表现；不改导航目标、计数来源或 Tab 顺序。
- 验收：训练页恢复可读文字入口；进入/返回保留当前训练组和计时；教练角标 0 隐藏、1/多位/99+ 正常，不遮图标。默认及小屏、大字体、Dark 实屏。
- 测试 seam：现有路由/计数公开行为；纯布局不新增镜像样式测试。
- Out of Scope：收件箱排序、后端消息协议、Tab 重构。

### R3：补齐选片与录制后的剪辑（T2，独立卡）

开工读已有 CONTEXT（如存在）、video-chain-v2、iOS VideoTrimSession/View 与两条调用链。目标是复刻已有行为，不新增视频产品能力。

- 范围：本地工作副本 → 范围选择/预览 → 成功导出 → 已有压缩/上传管线；相册和录制复用一次剪辑流程。
- 约束：禁 FFmpegKit；先确认当前 Expo/Android 媒体 API；不改原始素材；取消、导出失败不得替换原附件或上传半成品；离开页面清理本次临时产物。
- 测试 seam：纯时间区间状态与确认/取消契约；媒体适配器按真实时长回读验证导出结果。至少一个真实 Android 设备验证音画、旋转、重选和失败恢复。
- 验收：完整片段、裁掉头尾、短片、拖动边界、取消、失败重试都与 iOS 行为对应；只把确认后的素材交上传队列，训练日志不重复。
- Out of Scope：烧录角标导出、后台导出、视频特效、生产部署。

## 不应混进“已通过”的项目

| 项目 | 当前结论 |
|---|---|
| 烧录角标并导出到相册 | RN 未实现；[参照包 §2.7 / §6.2](w3-reference/video-player-charts-v2.md)仍写“待拍板”，推荐 v1 隐藏。旧报告称“既定范围”证据不足，本轮改为待明确范围，不能算 1:1 通过 |
| Google 登录 / Android Apple 登录取舍 | Google 代码存在，client/audience 全链验收仍缺；Apple 省略在 PLAN 中仍有待拍标记 |
| FCM 与真实通知送达 | 计划事件路由有实现和测试，不等于 token 注册、后台送达、点通知冷启已验收 |
| 后台视频上传、休息通知 | 当前证明的是进程内上传、分片持久化和重启续传；没有证明 Android 真后台服务或 iOS Live Activity 的等价通知体验 |
| 真机相机/音轨/触感/提醒/无障碍 | 模拟器截图和减少动画证据不能代替真机验收 |
| Global 教练改期与 P31 新服务 | 9/23 留存的生产预检为未部署/改期 gate 未开；本轮没有重新部署或读取生产 SHA，不能把历史状态当作今日部署实证 |
| 存量 iOS 用户跨 Android | 复用同一后端身份有代码与部分 QA 回读依据；全部旧用户、第三方登录绑定、本地独有数据、完整升级路径仍需专项验收 |
| 发布准备 | W4 keystore、启动屏、分发、自更新、隐私清单等未完成，不属于页面有入口即可关闭的项目 |

完成页“0/1”同时显示“All completed”是 [9/25 长按报告](verification-hold-2026-09-25.md)已有待办；奖牌出现前的服务端完成/刷新等待也不因本次静态核对而消失。本轮未重复完成或撤销 Global 训练，不把这两项写成已修。

## 排除的误报与明确范围

- 图片消息：固定 iOS 学员会话没有发图入口；教练使用 compactPill composer，也没有发图入口。通用组件里的 PhotosPicker 不是当前入口，不能据此报 RN 漏发图。已有图片显示另按现有实现核对。
- Onboarding 第六步材料上传：两端当前均关闭/Coming soon，不作为 RN 新增功能。
- Evaluation、App 内排计划、XLSX 导入：当前冻结或由 plan-web 承担，明确不复刻这些入口。
- `Meetday` 是 David 本日明确要求的文案变更；相对 iOS 的 `Meet in` 属已授权差异，不回改。
- iOS Demo 无持久化/教练详情缺种子不作为 RN 缺陷；泛用图表里的 TODO 未被当前活跃路径使用，也不凭关键词报缺失。

## 本轮实屏覆盖

截图和语义快照见 [证据目录](evidence/parity-20260925/manifest.json)。Android PNG 有同名 XML；iOS JPG 有同名 JSON，训练/readiness 两张仅保留截图，其语义路径另外核实，未冒充双证齐全。

| 用户意图 | 本轮观察 | 边界 |
|---|---|---|
| 学员看今天安排、Meetday 和进度 | 顺：Global W1D7 Completed、4/4，Meetday 空态入口显示 | 修改比赛日期的入口完整性见 P2-12；不重写 Global 数据 |
| 开练、记组、补录、找历史 | 组录入/补录字段及两种训练状态可达，readiness 可打开；历史可达 | P2-14 入口样式；完成提交/失败恢复引用旧证据 |
| 查成长、看来源 | RN 当前 forming、iOS 成熟种子图可展示；主项分区存在 | 全状态/缺来源/容量引用 9/23 证据 |
| 维护资料与设置 | 七分区、休息/提醒/改密入口存在 | P2-12、P2-13 说明“七块存在”不等于字段齐全 |
| 看教练消息和视频 | 合成聊天混排、全屏回放、角标、打点入口可见 | 不新发消息；工作台写入与失败重试引用旧证据 |
| 教练分诊、找学员、读详情 | Today、收件箱、名单、详情五段及 Profile 均可达 | P-33；iOS 本轮详情为 Demo 空态，非同数据全量比对 |
| 教练管理邀请码 | 永久码、复制、重生成、单次/时限入口均可达 | 本轮不创建/撤销；写入异常沿用 9/23 证据 |

## 验证与环境恢复

- 本轮没有业务代码变更，不新增实现镜像测试；iOS 两个固定配置构建成功，Android fixture Release 构建成功。
- RN `d818bf8` [CI](https://github.com/tianpingdeng112233-cell/meetpr-rn/actions/runs/36111316860)的 check 与 Android build 均通过。它证明构建/自动检查结果，不能抵消以上复刻遗漏。
- 已覆盖安装审计前保存的 Global APK，核实 bundle 指向 `api.meetpr.app` 且无本轮 fixture origin；重新登录专用学员，保留 W1D7 / 4/4，停在 Light Today。[恢复截图](evidence/parity-20260925/global-restored.png)。本轮 localhost fixture 服务和 39025 reverse 已停止。
- Android 原生构建生成物没有纳入提交；凭证、APK、服务脚本、调试误拍未进入证据目录。

关闭验收的条件：R1–R3 逐项复验，待拍范围形成明确结论，真机/Global 门禁各自有证据，再更新清单。不能只凭主流程可点或 CI 绿宣布全部复刻完成。
