# 学员端外围屏参照包 C(RN Android W1)

> 源:MeetPR-release @3799f67,2026-07-19 只读侦察。行号为快照。文案均照抄源码,实装 1:1 用。

## 0. 路由衔接总览

- 注册屏角色三选:「教练」/「学员 · 有教练」(副标题「接收计划 · 记录训练 · 上传视频」)/「学员 · 自己练」。
- 两种学员都先过 **E1RMCompetitionLiftGate**(§6);之后 coached → BindGate → 4 tab;self_train → 直接 4 tab。
- BindGate 注入:`isOnboardingComplete`=onboarding profile 的 completed(fetch 失败读作未完成,最坏多走一次向导);`onLogout` 必须在门内可达(防账号困死)。
- **根 tab 实际 4 个**:今日(house)/训练(dumbbell)/成长(chart-line-up)/我的(person);「我的」tab badge = pendingPRCount + 评估摘要未读。**无反馈 tab**。

## 1. Onboarding(7 步向导)

### 外壳
- BindGate `.needsOnboarding` 先渲染 interstitial:「完成资料填写,教练才能开始评估」/「已填的内容都已保存,可随时继续」/按钮「继续填写」;随即全屏弹向导。
- 标题 `Step N of 7`;左上「保存并退出」(editing 态才可点,含 flow_cancel 埋点);不可下拉关闭。
- 结构:3pt 红色进度条(宽=step/7)→ 步标题(title1)→ 步内容 → 可选 saveBanner → footer(「上一步」+主按钮:末步「完成,开始训练!」否则「下一步」,`!canAdvance` 禁用)。
- 步标题:`基础信息 / 训练背景 / 你的三大项极限是多少? / 训练环境 / 恢复能力 / 训练资料 / 补充信息`。

### 各步字段与门
1. **基础信息**:单位 segmented「公斤 · 厘米」/「磅 · 英寸」(仅换显示,底层公制);性别 男/女/其他;生日 wheel(1930→今,默认 2000-01-01,onAppear 预填默认);身高/体重数字栏(kg 占位 178/83)。门=五项全填。
2. **训练背景**:训练年限 Slider 0-10(标签 <1 年/N 年/10+ 年,默认 0);深蹲杠位 高杠/低杠;硬拉 传统/相扑/两种都练;卧推握距**选填**(窄/标准/宽,选后出「跳过此项」)。门=年限+杠位+硬拉。
3. **三大项 1RM**:顶部「⚠️ 1RM 一旦填写,完成后只有教练能改」;深蹲/卧推/硬拉 1RM(kg,占位 0),每栏配 🧮 估算器 sheet:「用近期训练估算 1RM」重量+次数+RPE Slider 6-10(0.5 步);RPE 说明「RPE = 这组做完有多吃力:10=力竭、9=还能多做 1 次、8=还能多做 2 次。」;结果「估算 1RM ≈ X kg」+「填入估算值」/「保守填入 90% (Y kg)」;空态「输入重量与次数后显示估算结果」。门=三项全填。
4. **训练环境**:「每周哪几天能练?」chip(max 6;<2 提示「已选 N 天/周 — 至少选 2 天」);场馆三选卡 家庭(含深蹲架)/商业健身房/专业力量馆(副标题照源码);选后出「器械微调」区(按场馆预填);换场馆确认弹窗「切换场馆类型?」→「切换并重置器械清单」/「取消」。门=天数 2-6 + 场馆。
5. **恢复能力**:四个 1-5 刻度——学习/工作强度(脚注「按身体消耗选择 — 久坐 ≠ 低消耗…」)/生活压力/练后恢复时长(脚注「…拿不准就选 3」)/睡眠时长(≤5h…9h+)。门=四项全填。
6. **训练资料**:两张上传卡**禁用**显「即将开放」(uploadsEnabled=false 硬编码);「想增强的肌群(最多 3 个,可选)」chip。门=恒真。
7. **补充信息**:伤病记录 text(占位「如:左肩撞击综合征,深蹲低杠位时疼」);伤病部位 chip(肩/肘/腕/腰/髋/膝/踝/其他,max8);「是否在备赛?」没有/有比赛计划→(比赛日期 DatePicker 今起 + 目标体重级别占位「例:IPF 83kg / WP -82.5kg」);「想对教练说什么?(可选)」占位「目标、习惯、顾虑都可以写」。门=isCompeting 已答且(未备赛或有日期)。

### 保存/校验机制(RN 等价复刻)
- resumeStep=首个未完成步;load=server ⊕ 本地草稿合并(server 为基,本地 savedAt>server.updatedAt-60s 才覆盖);server 已 completed → 清草稿直接跑 handoff(防 ONE_RM_LOCKED)。
- 每步「下一步」= 存本地草稿 + best-effort PUT patch(失败仅 banner「本步资料已暂存本机,提交完成时会自动补传」不阻塞)。
- patch 语义:required unset→不发;nullable→null;文本 trim 空→null;step4 天数<2 整个字段不发;**只有 step3 的 patch 会带 1RM 字段**(结构性锁)。
- 完成:①全量 PUT(失败:ONE_RM_LOCKED→「1RM 已锁定,请联系教练修改」;其它→「网络异常,资料未能提交,请重试」)②complete(422→missing_fields 高亮+跳最早缺失步)③清草稿→handoff。
- 本地草稿:JSON 文件按 studentId(RN 用 MMKV/文件等价),损坏读 nil。

### handoff 与 stash
- 完成后看 stash(暂存邀请码):无→needsReload;有→自动 POST bind-request:成功清 stash→requestSent;INVITE_CODE_INVALID 清 stash→回输码屏(onboarding 保持完成,不重跑向导);already-pending/bound→needsReload;传输失败→handoffFailed(stash 保留)。
- CompletionHandoffView:「资料已提交」;completing「正在发送绑定请求」;失败「绑定请求发送失败,请检查网络后重试」+「重试发送」。

## 2. Bind 屏

### BindGate 状态机(接 wire-contracts §7)
- load 失败→failed(绝不落 tab);accepted→bound(evaluationSealed=true);pending→pendingAcceptance;none/rejected/expired/cancelled→resolveUnbound。
- resolveUnbound:无 stash→needsCode(带 notice);有 stash+未完成 onboarding→needsOnboarding;有 stash+已完成→**自动重提交**(结局同 handoff)。
- 前台恢复(scenePhase active)且 pending → refresh。

### 中性 notice 文案(拒绝态原文,永不出现「拒绝」)
- rejected→「教练当前不接收新学员,请输入新邀请码或稍后再试」
- expired→「上次请求 7 天未响应已自动过期,可重新发送或换教练」
- invalidCode→「邀请码无效或已失效,请输入新邀请码」
- network→「网络异常,绑定请求暂未发出,可下拉重试」

### EnterCodeView
- 标题「输入教练邀请码」副「没有教练?请向你的教练索取邀请码」;码栏占位「XXXXXXXXXX」(monospace 大写,10 位字母表**不含 I/O/0/1**,hint「邀请码为 10 位字母数字(不含 I/O/0/1)」,有效时分组回显「XK7M PQ2 RVT」);「你的姓名」占位「填你自己的名字」helper「教练会在学员列表里看到这个名字」;网络错误 banner「网络异常,请重试」;「提交」。
- submit:onboarding 未完成→stash 暂存进向导;已完成→直接 POST(错误处理同上)。
- 埋点:screen bind_enter_code + bind_coach_action invite_open/submitted。

### PendingBindView
- 「已发送绑定请求」/「等待教练 X 接收」;等待卡(clock,「已等待: N 天 M 小时|N 小时 M 分|N 分钟」,每 60s 刷新);资料卡「你已提交给教练的资料」(onboarding 完整资料/N 份上传资料,无内容隐藏);说明「教练通常在 24-48 小时内响应;7 天未响应自动过期,可重新输码。」;「取消请求」→确认弹窗「取消绑定请求?」「取消后可重新输入邀请码。」。
- cancel:成功→清 stash 回输码;409/404(教练已响应)→静默重读;其它→「取消失败,请重试」。
- 下拉刷新(无轮询无 push);screen=pending_bind。

### gate 通用件
- 右上「登出」按钮(enter-code/pending/failed 三态都有);loading「正在检查绑定状态」;failed「无法获取绑定状态」+「重试」。

## 3. 反馈(⚠️ 无独立 tab)

- FeedbackInboxView 仅存在于封存的评估期屏——**4-tab 学员端不可达,W1 不复刻该屏**。
- 实际曝光三处,**共享同一 FeedbackInboxViewModel**(未读数=read_at null 计数):
  1. **今日内联卡**:eyebrow「教练反馈」(或+周几);正文 3 行截断;footer「教练 · <时间> · 在「成长」查看全部反馈 →」;未读红点;点击切「成长」tab。
  2. **今日通知铃**:有未读 bell.badge+红点;sheet「通知」(右上「完成」):新计划行「教练发布了新计划」/「第 N 周计划已可查看」;未读反馈行「N 条未读反馈」/「查看教练最近的训练反馈」→打开反馈;评估完成行;空态「暂无新通知」/「新的反馈和计划会在这里出现」。
  3. **成长 tab 反馈段**:「教练反馈记录」列表,行=未读点+正文 2 行+日期+chevron;点开详情即 markRead。
- 详情屏:person 图标+「教练反馈」+日期;有 day_date 显「关联训练日 <日期>」;正文卡;title「反馈」。

## 4. 视频上传(只在组卡 SetEntrySheet 的「视频」块)

### 关联与前置
- 附视频前先懒建 set log(先冲刷已输数字再 ensureLoggedSetID——防旧 draft 覆盖 gotcha);一组一视频(新选覆盖旧件)。
- **隐私同意**:首次附视频弹 alert「视频上传须知」:「你上传的训练视频将仅你绑定的教练可见。MeetPR 不会向其他人公开你的视频。」→「同意上传」(本地记 key video_upload_consent_v1)/「不上传」。(源注:文案 PLACEHOLDER 公测前法务 review;仅本地记录。)

### UI 态
- 无附件:「拍摄」+「相册」chip(brandRed)。pending「处理中…」+spinner+取消;uploading 进度条+「N%」+取消;uploaded ✅「已上传」+「删除」;failed ⚠️「上传失败」+「重试」+「删除」;preparing「准备中…」。
- 错误文案:「视频超过 N 秒上限,请截短后再上传」/「视频转码失败,请重试」/「视频处理失败,请重试」。
- 组行内指示器:恒 video 字形只变色——未附灰/上传中按进度双色扫/已传绿/失败红。

### 管线(RN 对应件)
- 相册选片(expo-image-picker videos)→可修剪则进系统修剪→attach;拍摄(系统相机,上限 120s 自动停,拍完**先存相册留底再上传**——素材不能丢)。
- **压缩策略(1080p passthrough 拍板,必须对齐)**:codec=H.264 且显示尺寸(算 transform)长边≤1920 短边≤1080 → **免重编码 remux**(保源码率);remux 失败回落 1920×1080 转码一次;不合格直接转码。输出 mp4+faststart。RN 用 react-native-compressor 等价实现,达不到 passthrough 语义时在卡内明示降级方案。
- 上传:5MB 分片,并发 3,每片重试 2 次(1s 间隔);initiate(kind=set_video,filename `setlog-<setLog>-<id>.mp4`,带 set_log_id)→PUT 各分片→complete;成功后**删本地文件**(播放走 15min 短链);失败标 failed+best-effort abort(complete 409 不 abort);重试=全新 initiate;App 启动把中断的 pending/uploading 标 failed 可重试。
- 埋点 media_upload started/succeeded/failed。

## 5. MyProfile(我的,分组 reskin 版为准)

- 外壳:大标题「我的资料」,下拉刷新;三态 loading/loaded/empty(404:「完成资料填写后解锁」)/failed(「加载失败,点击重试」)。**empty/failed 也必须保留 偏好+登出 段**(防账号困死,P0)。
- 分组:
  1. **训练基线 · 教练管理**:「当前 1RM」🔒 只读卡(说明「教练设定的训练基准 · 与「成长」里按训练自动估算的 E1RM 不是同一个值」;三大项 30pt mono,缺省 —;底「训练周期中无法修改 · 联系教练」)。
  2. **恢复与伤病 · 改动通知教练**:「恢复评估」「伤病记录」行(带「通知教练」红框 badge)→卡片编辑。
  3. **偏好与基础信息**:想增强肌群/休息计时器/比赛日期/身高体重(缺省「未填写」)。
  4. **训练背景 · 环境**。
  5. **更多**:「成长曲线」/「评估总结」(红点=未读,点开 markRead;仅 summary 存在时显示)/「退出登录」。
  6. **账号与安全**:「改密码」「导出训练数据」「注销账号」。
- 行编辑:复用向导同款 section 组件,显式「保存」;patch 复用 step patch 且 **patchStep 永不为 3**(1RM 物理不可能出现在编辑 PUT)。
- 改密码 sheet:旧/新(≥8)/重复;错误「旧密码不正确」等;成功 toast「密码已更新,其他设备将退出登录」。
- 导出 CSV:「正在整理你的全部训练数据…」→「CSV 已生成」「包含全部训练组:日期/动作/重量/次数/RPE。」+分享;文件 `meetpr-training-log-<stamp>.csv`。
- 注销:全屏确认「账号与全部训练数据将永久删除,无法恢复。」+四条 bullets;输入「注销」才启用「永久删除我的账号」;成功→登出。
- 「1RM 登记」只在 onboarding step3;MyProfile 无编辑口。「未确认 PR」曝光=「我的」tab badge,明细在今日/成长。

## 6. E1RMCompetitionLiftGate(性质:一次性迁移门)

- 不是选主项 UI。包住所有已认证学员目的地;按 UserDefaults key `e1rm-migration.competition-lift-resolver-v1.<uuid>` 判断是否已跑。
- UI:migrating「正在校准实力记录…」;failed「实力记录校准失败」+「请重试,校准完成前不会使用旧的 e1RM 或 PR 基线。」+「重试」。
- **主项解析算法**(spec 050,客户端镜像后端):exercise.mainLiftFamily null→nil;competitionStance null→isCompetitionLift?family:nil;有 stance 按 family 取 onboarding 站位(squat→squatStance,deadlift→deadliftStyle,bench 不分);站位 nil→family;deadlift 学员选 both→计入;否则 stance 相等才计入。
- 迁移=拉 profile+catalog+全量 set logs,按 loggedAt 重放(只取 completed && !assumed),经 E1RMRecorder 重建本地 e1RM 历史并一次性替换;历史 PR 事件丢弃。
- e1RM 引擎常量:minEligibleRPE 7.0;maxReps 10(deadlift 5);rolling 28d;minPRImprovement 0.5kg;noiseBand 3%;softJump 10%/hardJump 18%;异常带存 low confidence。**别硬编码进 UI,集中常量文件**。
- ⚠️ RN 端 v1 判断:安卓是全新客户端、无旧本地 e1RM 历史 → 迁移门可实现为「首启直接 markCompleted 的空门」+ e1RM 引擎从零累积;但 resolver 算法与引擎常量必须完整移植(成长曲线/PR 判定用)。拆卡时按此口径。

## 7. 埋点补充

- screen 枚举(学员端):today_workout / dashboard / plan / progress_history / onboarding_wizard / bind_enter_code / pending_bind / account。**无 feedback screen**。
- 打点位:tab 切换(今日→dashboard,训练→today_workout+workout_log_start,成长→progress_history,我的→account);向导 onboarding_wizard+onboarding_step(name:goal/experience/lifts/schedule/competition/equipment/review);输码/等待屏各自 screen+bind_coach_action(invite_open/submitted/accepted)。
- **隐私门 sheet**(冷启动首启弹,不可下拉关):标题「使用数据说明」;正文全文:「为改进训练流程,MeetPR 会收集产品交互、匿名设备标识,以及你主动填写的反馈文本。数据仅用于产品功能,留存在境内自建阿里云,不接入第三方统计 SDK、不出境,也不用于追踪或广告。数据保留 90 天;卸载会清除匿名安装标识,你可通过删除账号或联系我们请求删除。」+ 链接「隐私政策」(https://meetpr.app/privacy)+「知道了」。确认前 flusher 不上送;确认存 key `meetpr.analytics.privacy_notice_confirmed`。

## 附:对 W1 拆卡的结构性修正
1. 无反馈 tab/屏卡——反馈功能并入 Dashboard 卡 + 通知铃 + 成长列表(一个共享数据源)。
2. 评估期屏不复刻(封存)。
3. E1RM 门=空门+算法移植,无 UI 选择流。
4. MyProfile 以分组 reskin 版为准。
5. Onboarding step6 上传禁用态照抄(「即将开放」),不接上传。

## 附 B:Onboarding 线值枚举(⚖️2026-09-04 补,权威 = backend `src/db/types.ts` + iOS CoreModels/Enums @ release/1.0)

> 参照包 v1 只列了字段名没列枚举值,w1i 首版因此自造了中文/自定义线值。**线值一律用下表 token,UI 标签只做显示映射。**

| 字段 | 线值(逐字) | 备注 |
|---|---|---|
| `unit_preference` | `kg` / `lb` | 不是 metric/imperial |
| `gender` | `male` / `female` / `other` | |
| `squat_stance` | `high_bar` / `low_bar` | |
| `deadlift_style` | `conventional` / `sumo` / `both` | |
| `bench_grip` | `narrow` / `standard` / `wide` / null | 选填 |
| `training_days` | `mon` `tue` `wed` `thu` `fri` `sat` `sun`(字符串数组) | 不是 1-7 整数 |
| `gym_tier` | `home_with_rack` / `commercial` / `professional` | UI 标签 家庭(含深蹲架)/商业健身房/专业力量馆 |
| `equipment_overrides` | 见下表 token 数组 | 换场馆时 prefill = 所有 `tiers` 含该场馆的 token |
| `daily_life_intensity` `life_stress` `recovery_speed` `sleep_hours` | 1–5 整数 notch | sleep 标签 ≤5h/6h/7h/8h/9h+ 仅显示,线上传 notch |
| `muscle_groups_to_strengthen` | `quad` `hamstring` `glute` `back` `chest` `shoulder` `triceps` `biceps` `core` `calf` | iOS 向导只提供这 10 个,max 3 |
| `injury_areas` | `shoulder` `elbow` `wrist` `lower_back` `hip` `knee` `ankle` `other` | max 8 |

器械 catalog(token · 分组 · 出现在哪些场馆;prefill(tier) = tiers 含 tier 的全部 token):

| token | group | tiers |
|---|---|---|
| `barbell_dumbbell` | basics | 全部 |
| `squat_bench_rack` | basics | 全部 |
| `pullup_bar` | basics | 全部 |
| `db_max_20` | dumbbellMax | home_with_rack |
| `db_max_40` | dumbbellMax | commercial, professional |
| `db_max_40_plus` | dumbbellMax | (无预填,可选) |
| `smith_machine` | machines | commercial |
| `cable_crossover` `lat_pulldown` `leg_press_machine` `leg_curl_extension` `seated_row` `landmine` | machines | commercial, professional |
| `seal_row` `hack_squat` | machines | professional |
| `power_bar_stiff` `deadlift_bar` `safety_bar` `fractional_plates` `lifting_platform` `rack_pins_blocks` `chains_bands` `ghr` `belt_squat` | powerlifting | professional |

- dumbbellMax 组在 iOS 是单选(三档互斥),其余组多选 chip;器械区按 基础 / 哑铃最大重量 / 固定器械 / 力量举专项 四段展示。**四段始终展示该组全部 token,不按场馆过滤**(`EquipmentCatalog.items(in: group)`);`tiers` 只决定换场馆时的预填(⚖️2026-09-04 勘误:首版附 B 误写为「只展示 tiers 含当前场馆的 token」)。
- 显示未知 token(老数据 `heavy_dumbbells` `blocks_chains_bands` `reverse_hyper` `cable_lat_pulldown`)时回落 token 原文,不丢弃。
- **1RM 估算器**:iOS `OneRMEstimator` = `E1RMCalculator.calculate(weightKg, reps, rpe)`(RTS 表)→ 0.5 kg 取整;保守值 = 原值×0.9 再 0.5 取整。RN 必须复用 `@/domain/e1rm` 的 `calculateE1RM`,禁止另写 Epley。
