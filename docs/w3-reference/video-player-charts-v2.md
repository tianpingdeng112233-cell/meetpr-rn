# 共享播放器 · 打点标注 · 角标 · 图表 参照包 v2(iOS `release/1.0` @ 202e95db)

> 2026-09-05 只读侦察写成,供 RN Android W3 1:1 复刻。事实全部取自该 commit 的 iOS 源码,**不是 spec 的意图**——spec 与实装不一致处本文以实装为准并显式标注(§1 开头那条最重要)。不确定处标「现场核」并给路径。
> 文案一律按 **key** 引用 `docs/w0-reference/i18n/{ChatUI,StudentKit,CoachKit,DesignSystem}.json`,RN 走 `t(key)`;本文引号里的英文只为让 reviewer 认屏,**禁止当字面量抄进代码**。带 `%lld` / `%@` 的 key 是复数字典,用 i18next plural 形态。
> 路径均相对 `/Users/david/Projects/apps/MeetPR-release`。token 名同 `Modules/DesignSystem/Sources/DesignSystem/Tokens/{Spacing,Radius,Colors,VideoColors}.swift`;本文括号里的数字是该 token 的实测值,RN 用 token 名不抄数字。
> RN 已有的座位(**不重新规格化,只当接线口**):教练工作台 `meetpr-rn-wt-w2c-receiving/src/features/coach/video-feedback/{VideoFeedbackScreen,VideoWorkbenchPlayer}.tsx`(现 22 行,只有 react-native-video + 时间 chip 列表,无进度条/倍速/角标)、组内回看 `meetpr-rn-wt-w1h/src/features/training/video-upload/VideoPlayback.tsx`、成长 tab `meetpr-rn-wt-w1g/src/features/history/{GrowthE1RMCard,E1RMChart,VolumeIntensityChart}.tsx`。

---

## 0. 共享播放器解剖(`Modules/ChatUI/Sources/ChatUI/FeedbackVideoPlayerView.swift` 386 行 + 同目录 8 个协作文件)

**一个组件两种形态**,靠 `workbenchConfiguration: FeedbackVideoWorkbenchConfiguration?` 分流——那是个**空 struct**,纯开关,没有字段。nil ⇒ `.legacyFullScreen`(全屏 cover),非 nil ⇒ `.workbench`(卡片内嵌)。

### 0.1 公开入参(RN props 一比一)

| 参数 | 默认 | 说明 |
|---|---|---|
| `videoID: UUID` | — | 也是 `refreshURL` 的入参 |
| `url: URL` | — | 初始播放地址(短链) |
| `workbenchConfiguration` | nil | 形态开关 |
| `currentSeconds: Binding<Double>?` | nil | 外部读进度(工作台用来算打点时间) |
| `markers: [VideoMarker]?` | nil | **nil / [] / 非空 三态语义不同**,见 §1 |
| `badge: VideoBadgeInfo?` | nil | nil ⇒ 无角标、无压暗、**无导出按钮** |
| `requiresCoachExportConfirmation: Bool` | false | 教练三处调用点传 true,学员端全默认 |
| `markersFailed: Bool` | false | 非 404 错误,面板留着显示失败头 |
| `selectedAnnotationMarker: Binding<VideoMarker?>?` | nil | 给外部打点列表驱动覆盖层;nil 时用内部 `@State` |
| `onSeek: (Int) -> Void` | 空 | 毫秒回调 |
| `onAddMarker: (() -> Void)?` | nil | 仅工作台渲染「＋打点」 |
| `onMarkersRefresh: (() async -> Void)?` | nil | 标注图加载失败时重拉一次 |
| `refreshURL: (UUID) async throws -> URL` | — | 必填,重试/换短链 |

### 0.2 形态行为差(`FeedbackVideoPlaybackBehavior`,`FeedbackVideoPlayerMetrics.swift`)

| | fullScreen | workbench |
|---|---|---|
| onAppear | `player.play()`(**自动播**) | 只 `defaultRate = rate`(**不自动播**) |
| retry 成功后 | `play()` | `playImmediately(atRate:)` |
| 选倍速时是否立刻改 `player.rate` | 仅 `status == .playing` | `status != .paused` |
| 播放控制 | AVKit `VideoPlayer` **原生 transport**(app 自己不画播放/暂停) | `allowsHitTesting(false)` + 自绘 56×56 圆钮 |
| 关闭键 | 有(chrome 左) | 无 |
| 打点面板 | 有(叠在画面内) | 无(列表在 CoachKit 卡外) |
| 角标 | 可展开/收起 | 恒收起为 logo 圆标 |

> **RN 硬活**:iOS 全屏形态的播放/暂停/AirPlay/全屏铺满**全部来自 AVKit**,源码里一行都没有。安卓必须 `react-native-video` `controls={false}` + 自绘一套(至少 播放/暂停 + 中央大钮),否则学员端全屏会变成「只有进度条没有播放键」。同理:iOS 源码里**没有任何横屏/旋转锁定代码**,全屏 = `fullScreenCover`,方向跟系统。

### 0.3 倍速

- `static let rates: [Float] = [0.5, 1.0, 1.5, 2.0]`。
- `rateText`:`"0.5x" / "1x" / "1.5x" / "2x"`(ASCII 小写 x)——全屏 chrome 胶囊用它,**a11y identifier `feedback.video.speed.<rateText>` 也用它**。
- `workbenchRateText`:`"0.5× / 1× / 1.5× / 2×"`(乘号 U+00D7)——工作台分段器与 a11y value 用它。
- 两者 `default` 分支都回落 `1x` / `1×`(传入不在表内的速率时)。
- `cycleRate()`:`index = rates.firstIndex(of: rate) ?? 1`,`rates[(index+1) % 4]`,`2x → 0.5x` 回卷。全屏胶囊点一下走一档;工作台是四段直选(`selectRate`),`cycleRate` 在工作台形态下转调 `selectRate`,但工作台 UI 不接它。
- **零持久化**:`@State var rate = 1.0`,每次开播放器回 1x。会话内靠 `player.defaultRate` 在换 item(retry)后保住。

### 0.4 全屏布局(`fullScreenPlayer`)

`ZStack(alignment: .top)` 底 `SwiftUI.Color.black`:
1. `VideoPlayer(player:)` `.ignoresSafeArea()`。
2. `badge != nil` 时 `VideoBadgeScrim().ignoresSafeArea()`(§2.3)。
3. `FeedbackVideoPlayerChrome`(顶栏)。
4. 底部 `VStack(spacing: 0)`:**角标区**(有 badge 时是 `GeometryReader` 贪心且底对齐,`padding(.bottom, 13)`;无 badge 时退化成 `Spacer()`)→ **打点面板**(仅 `markersFailed || markers?.isEmpty == false` 时)→ **进度条**。源码注释点明:角标区贪心是为了「卡片永远贴在打点面板+进度条实际量出来的高度之上,不写死 inset」。
5. 标注帧覆盖层(§1.4),盖在所有之上。

**Chrome**(`FeedbackVideoPlayerChrome.swift`),横 padding `base`(16),top `sm`(8):
- 关闭:36×36 圆,`ultraThinMaterial` 底 + `white@0.18` 1px 边,xmark bold 白;a11y `chat.closePlayback`。
- `Eyebrow(chat.videoPlayback)`(en "VIDEO PLAYBACK //")白@0.85,leading padding `xs`(4)。
- `Spacer()`。
- 导出:同款 36×36 圆,icon `square.and.arrow.down` 14 semibold,导出中换 spinner 并 disabled;a11y `chat.videoExport.action` / 导出中 `chat.videoExport.exporting`,id `feedback.video.export`。**仅 `badge != nil` 时存在**。
- 倍速:胶囊高 36,横 padding `md`(12),mono 14 semibold 白,同款材质与描边;a11y = `chat.playbackSpeed` + rateText。

**进度条**(`FeedbackVideoScrubber.swift`)`HStack(spacing: space2=8)`:已播时间 mono 11 → `Slider` tint `gold500`(`durationSeconds <= 0` 时 disabled,上界 `max(duration, 1)`)→ 总时长 mono 11。
- fullScreen:横 `base`(16)/竖 `sm`(8) padding + `Rectangle().fill(.ultraThinMaterial)` 背景,时间字白@0.82。
- workbench:零 padding 零背景,时间字 `textDisabled`。
- a11y label `chat.playbackProgress`,value `"m:ss / m:ss"`,id `feedback.video.scrubber`。

`timeText(seconds)`:`floor` 到整秒,`{minutes}:{ss}`(秒补零到两位),**不做小时进位**——90 分钟视频显示 `90:00`。

### 0.5 时间轴与拖拽

- `.task` 死循环:`updateTimeline()` → `sleep 250ms`。**两种形态都跑**(spec 063 提到的 `guard workbenchConfiguration != nil` 现已不存在,现场核 `FeedbackVideoPlayerMetrics.swift:88-105` 确认无 guard)。
- `FeedbackVideoScrubState`:`begin/move/finish`,值 clamp 到 `[0, max(duration,0)]`,非有限值当 0;`displayedSeconds` 拖拽时返回拖拽位置,否则返回真实进度。拖拽期间 `updateTimeline` 不写 `currentSeconds`。
- 拖拽中节流 seek:每 80 ms 一次(`commitsPosition: false`,只回调 `onSeek`);松手一次终态 seek(`commitsPosition: true`,写回 `currentSeconds` 与 binding)。`scrubGeneration` 计数器丢弃过期任务。
- seek 容差固定 `CMTime(value: 50, timescale: 1000)` = ±50 ms。

### 0.6 错误 / 重试

- `playbackFailed = true` 的触发源两条:`AVPlayerItem.failedToPlayToEndTimeNotification`、`player.currentItem.status == .failed`。
- 覆盖层 `FeedbackVideoFailureCard`:三角 `exclamationmark.triangle.fill` 26 `amber` → `chat.playbackFailed` body `textPrimary` 居中 → 按钮文案 `chat.retry`(重试中换 `chat.refreshing` 且 disabled),高 44,`goldCTA` 底,radius `md`(10)。卡 maxWidth 280,padding `lg`(24),`surfaceCard` + `borderDefault` 1px,radius `lg`(12)。
- `retry()`:`refreshURL(videoID)` → **失败就静默返回**(失败卡留在原地,不弹二次错误)→ 成功则清 failed、**关闭标注覆盖层**(源码注释:换 item 后「暂停帧」契约不成立)、`replaceCurrentItem`、写回 `playbackURL`(导出用的也是它)、恢复 `defaultRate`、按形态播放、`isPlaying = true`。
- `onDisappear`:取消 scrub task 与 export task,`player.pause()`。

### 0.7 工作台形态(`FeedbackVideoWorkbenchPlayer.swift`)

外壳 `VStack(spacing: point11=11)`,padding `space3`(12),底 `Color.MeetPR.textPrimary`(近黑),radius `card`(16),整体 `accessibilityValue = chat.playbackSpeed + workbenchRateText`。
- **舞台**:固定 `height: 270`,底 `videoStageFill`(RGB 27/37/52),radius `inset`(10),边 `videoStageBorder`(RGB 42/54/70)1px。内含:`VideoPlayer`(不接触摸)→ 角标压暗 → 中央 56×56 圆钮(`white@0.14` 底,`pause.fill` 20 bold / `play.fill` 22 bold,a11y `chat.pausePlayback` / `chat.playPlayback`,id `feedback.video.playbackToggle`)→ 标注覆盖层 → 收起态角标(padding bottom 10)。
- `togglePlayback()`:已在末尾(`currentSeconds >= durationSeconds > 0`)时先 `seek(.zero)` 再 `playImmediately(atRate:)`。
- **进度条**(workbench layout)。
- **控制行** `HStack(spacing: space2=8)`:
  - 倍速分段器:四段等宽,容器 `white@0.08` + padding `point3`(3) + radius `inset`;选中段底 `textPrimary` radius 7 字白,未选 `textTertiary`;mono 11,竖 padding `point6`(6)。
  - `chat.addVideoMarker`(en "＋ Add marker")描边按钮:body 12 semibold 白,横 `space3`(12)/竖 `point7`(7),边 `videoStageBorder` radius `inset`,id `feedback.video.addMarker`;仅 `onAddMarker != nil` 时出现。
  - 导出按钮:同款描边,`Label(chat.videoExport.action, "square.and.arrow.down")`,导出中换 spinner + disabled。
- 存相册 toast:`chat.videoExport.saved`,body 13 semibold `textPrimary`,`bgInset@0.96` 胶囊 + `borderStrong` 1px,横 `space4`(16)/竖 `point10`(10),距顶 `point56`(56),`move(.top) + opacity` 转场,id `feedback.video.exportSaved`,**2.5 秒后自动消失**。挂在 `FeedbackVideoPlayerView` 顶层,两形态共用。

---

## 1. 打点层(specs 063 / 064)

### 1.1 ⚠️ 先纠正一条:**进度条上没有琥珀刻度**

spec 063 要求「progressTrack 叠琥珀刻度」,`w1-reference/video-chain-v2.md` §5 也写了「进度条琥珀刻度 + 打点列表」。**实装里没有**:`FeedbackVideoScrubber` 根本不收 `markers` 参数,全仓 grep 无任何 tick / 刻度绘制。打点的唯一视觉出口是 §1.2 的**面板列表**。RN 别去实现刻度,那是照着一份没兑现的 spec 做多余功。

### 1.2 打点面板(`FeedbackVideoMarkerOverlay.swift`,只在全屏形态)

- 容器:`black@0.72` 底,padding `base`(16),`VStack(alignment: .leading, spacing: sm=8)`。
- 头行:左 mono 11 semibold = `chat.videoMarkers`(en "Markers · {count}",客户端 `.replacing("{count}", …)`)或 failed 时 `chat.videoMarkersFailed`;右 mono 11 monospacedDigit `"m:ss / m:ss"`(当前/总时长);整行 `white@0.82`。
- 列表:`ScrollView` `maxHeight: 190`,隐藏滚动条。行 `HStack(spacing: sm=8)`:
  - 时间 mono 12 bold **`gold500`**;
  - 备注 body 14 白(`note` 为空时回落 `chat.videoMarker`),`maxWidth: .infinity` leading;
  - 有 `annotationURL` → `pencil` 11 semibold `gold500`(id `feedback.video.marker.annotationBadge`,a11y hidden);
  - `forward.fill` 11 `white@0.72`。
  - 行竖 padding `sm`(8),`contentShape(.rect)`,a11y label = (有标注时前缀 `"✏️ "`)+ `chat.seekToVideoMarker`(en "Jump to {time}")。
- **三态可见性(真值表,RN 必须照抄)**:`markers == nil` ⇒ 整块不渲染(端点 404 / 传输失败,静默隐藏);`markers == []` ⇒ 不渲染;`markersFailed == true` ⇒ 渲染,头行显失败文案,列表空;`markers` 非空 ⇒ 正常渲染。

### 1.3 level → 颜色:**没有映射,不要建**

`VideoMarkerLevel { info, warn, bad }` 解码存在,但**没有任何视图读它**;时间 chip 恒 `gold500`。教练编辑器写死 `level: .info`,源码注释是判据:

```
// Level stays single-tier in the UI (⚖️ 2026-07-31 David); the wire
// field remains and always carries the backend default.
```
(`Modules/CoachKit/Sources/CoachKit/Features/Receiving/VideoFeedbackDetailView.swift:270-272`)

RN:DTO 保留 `level`,创建时恒发 `'info'`,不做颜色表、不做级别选择器。

### 1.4 点击语义与标注帧(spec 064)

- `selectMarker(marker)`:无 `annotationURL` → 纯 `seek(timeMs)`;有 → `player.pause()` + `isPlaying = false` + seek + 打开覆盖层。若调用点没传 `selectMarker`(理论回落路径),一律纯 seek。
- `FeedbackVideoAnnotationOverlay.swift`:整屏一个 `Button(action: close)` 包 `AsyncImage`——`.empty` → 白 `ProgressView`(a11y `chat.refreshing`);`.success` → `resizable().scaledToFit()`(**contain**);`.failure` → `Color.clear` + `.task(id: url) { loadFailed() }`。底黑,`maxWidth/maxHeight: .infinity`,a11y `chat.closeAnnotation`,id `feedback.video.annotationOverlay`。
- **没有缩放、没有拖动、没有关闭按钮**——整个覆盖面就是唯一的关闭热区;关闭后**不自动续播**。
- `loadFailed`(签名过期最常见)→ 先 `closeAnnotation()`,再触发**一次** `onMarkersRefresh()` 重拉 markers 拿新的 900 s 短链;不自动重试图片。
- 选中态:工作台走外部 `Binding`(CoachKit 的列表能驱动它),全屏走内部 `@State`。`onChange` 只在 `id` 变化且新值非 nil 时 `pauseAndSeek`;`onAppear` 时若已有选中 marker 也立刻 `pauseAndSeek`。
- CoachKit 侧:`markers` 变化时把选中项**按 id 重新指向新实例**(删掉的自动落 nil),防止拿着旧签名 URL 不放。

### 1.5 教练独占(`VideoFeedbackDetailView.swift` 内的 `VideoMarkerList` / `VideoMarkerEditor`)

- 列表卡:头 mono 12 `textTertiary` `coach.videoFeedback.markerCount %lld`(复数);卡 `meetPRCardSurface(.card)`,行横 `space4`(16)/竖 `point13`(13),行间 1px `borderHairline`。
- 行内容 `VideoMarkerRowLabel`:时间 mono 12 bold `gold500` + 备注 body 14 `textPrimary`(空回落 `coach.videoFeedback.marker`)+ 有标注时 `pencil` `gold500`;右侧 destructive 垃圾桶按钮(a11y `coach.videoFeedback.deleteMarker`)。
- ⚠️ **教练侧列表行只有「有标注」的才是按钮**(id `coach.video.marker.annotation`,点开覆盖层);**无标注的行完全不可点,也不 seek**。学员端全屏列表则每行都能 seek。这是两端的真实差异,不是 bug,照抄。
- 新增打点 sheet:`Form` — `LabeledContent(coach.videoFeedback.markerTime, timeText)` + `TextField(coach.videoFeedback.markerNote)` 竖向 `lineLimit(3...6)`,`onChange` 里**硬截断到 500 字**;导航标题 `coach.videoFeedback.addMarker`,工具栏 `coach.videoFeedback.cancel` / `coach.videoFeedback.save`。`timeMs = max(0, round(currentSeconds * 1000))`。
- 「＋打点」入口**仅在 `markers != nil` 时提供**(端点不可用就没有按钮)。
- 失败行 body 12 `danger`:加载失败 `coach.videoFeedback.markersLoadFailed`,保存失败 `coach.videoFeedback.markerSaveFailed`,删除失败 `coach.videoFeedback.markerDeleteFailed`。
- 排序(`InMemoryVideoMarkerRepository` 参考实现,后端同口径):`timeMs` 升序 → `createdAt` → `id` 字符串。

---

## 2. 角标(spec 078,`VideoBadgeInfo.swift` / `VideoBadgeOverlay.swift` / `VideoBadgeCard.swift`)

### 2.1 数据与格式化

`VideoBadgeInfo { exerciseName: String?, weightKg: Double?, reps: Int?, rpe: Double?, setOrdinal: Int?, coachName: String? }`。`setOrdinal` **组件内绝不 +1**,调用点给 display-ready 的 1-based 值。

`VideoBadgePresentation`(纯函数,可测):字符串 trim 后为空 ⇒ nil;`weightKg` / `rpe` 走 `.number.grouping(.never).precision(.fractionLength(0...1)).locale(en_US_POSIX)` ⇒ `100`、`82.5`、`1000`(**无千分位**,非有限值 ⇒ nil);`hasLoad = weightText != nil || reps != nil`。

### 2.2 卡片几何(正典 `docs/design/video-badge/badge-01.html`,540×960 画布)

`VideoBadgeLayout`:`cardWidthRatio = 468/540 ≈ 0.8667`(**无宽度上限**,Pro Max 上按比例放大)、`referenceWidth = 468`、`bottomMarginRatio = 76/960 ≈ 0.07917`、`scrimHeightRatio = 0.44`。`scale = width / 468`,**卡内每个数字都乘 scale**。

`VideoBadgePalette`(固定值,**不跟随主题**,浮层与烧录必须一致):`text #F5F5F7` / `muted #8A8A90` / `dim #B6B6BC` / `gold #FFB800` / `amber #D97706` / `ink #F5F6F8` / `cardFill rgba(10,10,12,0.62)` / `cardStroke white 10%` / `scrim #050507`。

卡:`VStack(leading, spacing: 10·s)`,padding top 13·s / 横 14·s / bottom 14·s,固定宽,radius 14·s,描边 `cardStroke` 宽 `max(1, scale)`,`.environment(\.colorScheme, .dark)`。
- **头行**(spacing 7·s):logo 圆标 22·s + 字标 PNG `MeetPRWordmark` 高 16·s(a11y "MEETPR")+ `Spacer(min: 8·s)` + 组号块:`chat.videoBadge.setPrefix` mono 10·s muted + 数字 display 13·s extraBold text + `chat.videoBadge.setSuffix` mono 10·s muted(**suffix 在 en 是空串,代码显式判空跳过**;zh 是「组」)。en 渲染成 `Set 3`,zh 渲染成 `第3组`。
- **动作名**:body 14·s bold,tracking −0.14·s,单行,`minimumScaleFactor 0.75`。
- **数据行**(`HStack(alignment: .bottom, spacing: 9·s)`):重量 display 30·s extraBold tracking −0.6·s monospacedDigit + `"kg"` mono 14·s muted(bottom padding 3·s);`"× {reps}"` display 20·s extraBold **dim**(#B6B6BC)monospacedDigit(bottom padding 1·s);`Spacer(min: 8·s)`;RPE 胶囊:`"RPE"` mono 9·s tracking 0.9·s gold + 数值 display 15·s extraBold gold,内 spacing 5·s,横 padding 9·s,**高 22·s**,底 `gold@0.15`,描边 `gold@0.42` 宽 `max(1, scale)`。
- **署名行** `chat.videoBadge.coach %@`(en "Coach: %@")mono 10·s medium muted 单行——**只在 `includesCoachAttribution == true` 时渲染,即只有烧录版有**。
- 字段缺失即整块消失:无 RPE 无胶囊、无组号头行右侧空、`hasLoad == false && rpe == nil` 时整个数据行不渲染。

### 2.3 压暗 `VideoBadgeScrim`

画面底部 **44%** 高的线性渐变,`#050507` alpha 0(上)→ 0.72(下),`allowsHitTesting(false)`,a11y hidden。仅 `badge != nil` 时渲染;全屏形态 `ignoresSafeArea`,工作台形态在 270pt 舞台内。

### 2.4 定位与展开态(`VideoBadgeOverlay`)

`GeometryReader { VStack { Spacer; HStack { Spacer; content; Spacer } } }` = **底部居中**。
- 全屏:`badgeExpanded` 默认 **true**,点卡切换;收起态 = `VideoBadgeLogoMark(size: minimumHitTarget=44)` + 阴影 `black@0.38 radius 9 y 4`;a11y `chat.videoBadge.collapse` / `chat.videoBadge.expand`,id `feedback.video.badge.expanded` / `.collapsed`。**不持久化**。
- 工作台:`allowsExpansion: false` + `isExpanded: .constant(false)` ⇒ 恒 logo 圆标,`accessibilityHidden(true)`,bottom padding 10。源码注释:270pt 窗内展开卡必与中央播放钮抢点击,组数据在旁侧信息卡已常显。
- 硬约束(spec + 布局共同保证):角标不得遮挡打点面板与播放控制的可点区。

### 2.5 Logo 圆标(纯矢量,react-native-svg 可 1:1)

100 单位 viewBox,`unit = size/100`:琥珀圆盘 d=78 居中;轨道弧 圆心 (50,50) r=30,205°→290.1°,ink 描边 2.6u round;趋势折线 (31,60)→(45,60)→(64,39),ink 7u round cap/join;下划线 (46,60)→(62,60),`ink@0.42` 6.4u;实心点 d=12.8u 位于 (66,37)。字标是 PNG 资产(`Modules/ChatUI/Sources/ChatUI/Resources`),安卓需同步取一份。

### 2.6 导出:谁能导、怎么确认

- 导出按钮**只在 `badge != nil` 时存在**(`exportAction` 的 guard),两形态同规则。
- `requiresCoachExportConfirmation` 是调用点旗标:教练端 `VideoFeedbackPlayerCard`(工作台)与 `CoachVideoPlayerView`(StudentDetail 视频网格)传 **true**;学员端全部走默认 **false**。
- 确认框(仅首次,**按设备记忆**):`UserDefaults` key `meetpr.videoBadge.coachExportConsentConfirmed`;标题 `chat.videoExport.coachConfirmation.title`、正文 `chat.videoExport.coachConfirmation.message`(en "Before publishing externally, confirm that you have the student's consent.")、确认 `chat.videoExport.coachConfirmation.action`、取消 `chat.cancel`。**确认时才写 flag 并开始导出;取消不写**。
- ⚠️ 副作用:学员端在**收件箱全屏**和**组内回看**都拿得到 `badge != nil`,因此学员**可以无确认地把带角标的视频烧进自己相册**。这是现状,不是遗漏——RN 若要收紧需 David 拍板。

### 2.7 烧录算法(`VideoBadgeExporter.swift`,iOS 独有,安卓 ⚖️待拍板)

完整口径,便于安卓实现者判断成本:
1. `AVURLAsset(playbackURL)`——**直接拿当前那个短链**(不是本地副本);`duration` 非数值或 ≤0 ⇒ `invalidSource`;无视频轨 ⇒ `missingVideoTrack`。
2. `AVMutableComposition`:视频轨整段插入 `.zero`;**每一条**音频轨也插入。
3. `renderGeometry(naturalSize, preferredTransform)`:`transformedBounds = CGRect(size).applying(transform)`;`renderSize = (ceil|w|, ceil|h|)`;`transform = preferredTransform ∘ translate(-minX, -minY)`。这一步是竖拍视频不横倒的全部秘密。
4. `frameDuration = track.minFrameDuration`(数值且 >0)否则 `1 / max(1, round(nominalFrameRate))`。
5. 角标层:`ImageRenderer` 渲染 `ZStack(alignment: .bottom) { Color.clear; VideoBadgeScrim(); VideoBadgeCard(width: renderWidth × 0.8667, includesCoachAttribution: true).padding(.bottom, renderHeight × 0.07917) }`,`.frame(renderSize)`,dark scheme,`renderer.scale = 1`,`proposedSize = renderSize` → `cgImage` → `CALayer.contents`,frame = renderSize。挂载:`AVVideoCompositionCoreAnimationTool(additionalLayer:asTrackID: composition.unusedTrackID())`,且 **badge 的 layerInstruction 排在视频 layerInstruction 之前**。
6. `AVAssetExportSession(preset: AVAssetExportPresetHighestQuality)`,`shouldOptimizeForNetworkUse = true`;输出优先 `.mov` 否则 `.mp4`;文件名 `meetpr-badged-video-<UUID>.<ext>`,落 `FileManager.temporaryDirectory`;取消时 `cancelExport()`。
7. 存相册(`VideoBadgePhotoLibrary`):`PHPhotoLibrary` **addOnly** 权限(`notDetermined` 才请求),`authorized || limited` 放行;`creationRequestForAssetFromVideo`;成功后 `defer` 删临时文件。
8. 错误映射:`permissionDenied` → `chat.videoExport.photoPermissionDenied`;其他 → `chat.videoExport.failureMessage`;弹窗标题 `chat.videoExport.failed`,关闭 `chat.close`。成功 → toast 2.5 s。视图消失即 `exportTask.cancel()`。

> ⚖️**待拍板(Android v1)**:安卓没有 AVFoundation 等价物,FFmpegKit 已禁(见 `w1-reference/video-chain-v2.md` §0)。A. MediaCodec + OpenGL ES 自研合成原生模块(T3,含方向矩阵、音轨复制、进度回调);B. 引入第三方视频处理库(体积/许可证风险);C. **v1 只做浮层,不做烧录**。推荐 C,与 video-chain-v2 §0 的既有推荐一致。若走 C,**整个导出按钮隐藏**,不要渲染 disabled 态。

---

## 3. 学员端入口

| 入口 | 文件 | markers | badge | 导出 | 确认框 |
|---|---|---|---|---|---|
| 反馈收件箱(归档列表) | `StudentKit/Features/FeedbackInbox/FeedbackInboxView.swift` | 有 | 有 | 有 | 无 |
| 反馈详情 | `.../FeedbackDetailView.swift` | 有 | 有 | 有 | 无 |
| 组内回看(spec 070) | `.../VideoUpload/SetVideoPlaybackView.swift` | **显式 nil** | 有 | 有 | 无 |
| 聊天 set 卡视频 | `Dashboard/StudentBlackGoldChatView.swift` / `ChatUI/ConversationView.swift` | 无 | **无** | 无 | — |

- **收件箱/详情的打开顺序是硬契约**:`markRead` → `playbackURL(videoID)` → 立刻开 `fullScreenCover` → **之后**才 `refreshMarkers`。源码注释:「a slow or dead marker endpoint must never delay playback (optional-surface contract)」。短链取不到 ⇒ 不开播放器,列表内联一行 `exclamationmark.triangle` + `student.feedbackInboxView.copy002`(详情页 `student.feedbackDetailView.copy004`)body 12 `dangerMuted`。
- `viewModel.markers(videoID:)` → `VideoMarkerLoadOutcome`:`.loaded` / `.failed`(非 404,置 `markersFailed`)/ `.hidden`(`.unavailable` 或任务取消,markers 保持 nil)。回填前用 `playbackItem?.id == videoID` 守卫,防止串台。
- 列表头 `student.feedbackInboxView.copy001`(en "All feedback · {n}")mono 11 tracking 0.44 `textFaint`;详情页关联视频三态(`FeedbackVideoPresentation.association`):`.available` 播放卡 / `.unavailable` → `FeedbackVideoUnavailableCard`(`student.feedbackDetailView.copy009`)/ `.none` 空。
- **学员 badge 的 `coachName` 恒为 nil**(`FeedbackVideoPresentation.badge`),所以学员烧录出来的片子**没有署名行**;`setOrdinal = SetIndexDisplay.number(forZeroBasedIndex: video.setIndex)`(后端 `set_logs.set_index` 是 0-based,只在这一层转 1-based)。
- **组内回看(spec 070)与反馈回看的差**:①`markers: nil` 写死,纯回放,不出打点面板;②badge 取自 `SetEntrySheet.videoBadge` —— 用的是**当前输入框里的实时草稿值**(`draft.displayExerciseName` + `SetEntryValue.enteredWeight/Reps/RPE(text)` + `setNumber` + `coachName`),不是已落库的 set log;③`refreshURL` 走 `VideoAttachmentPlaybackSource.retryURL`:`.local` 先查文件是否还在(不在 ⇒ `unavailable`),`.remote` 每次现取新短链、**永不缓存**;④播放源选择纯函数 `VideoAttachmentPlaybackSourceSelector.select(localURL, localFileExists, remoteURL)`:本地优先 → 远端 → nil。⑤因为 badge 非 nil,**组内回看也带导出按钮**。
- 聊天调用点两端都传纯参数(无 markers 无 badge),是 `badge: nil` 回归基线——RN 改共享播放器时必须保住这条路径不变。

---

## 4. 图表

仓里有**五个各自独立的图表实现**,别以为只有「e1RM 折线 + 容量柱」两种:

| # | 组件 | 文件 | 技术 | 现调用点 |
|---|---|---|---|---|
| 1 | `E1RMChart` | `DesignSystem/Components/Charts/E1RMChart.swift` | Swift Charts | **教练** StudentDetail growth,每主项一张,`frame(height: 90)` |
| 2 | `GrowthE1RMChart` | `StudentKit/Features/TrainingHistory/GrowthE1RMCard.swift`(private) | 手绘 Canvas | **学员** 成长 tab 三张卡的 chart 态 |
| 3 | `GrowthFormingTrendChart` | `StudentKit/.../GrowthEmptyStates.swift` | 手绘 Canvas | 成长卡 formingProgress 态 + Dashboard e1RM rail |
| 4 | `VolumeIntensityChart` | `StudentKit/.../VolumeIntensityChart.swift` | 手绘 Canvas | 成长 tab「容量 / 强度」 |
| 5 | `Sparkline` | `DesignSystem/Components/Charts/Sparkline.swift` | 手绘 Path | **只有** Dashboard `DashboardE1RMRail.swift:141`(mature 态),**不在成长 tab** |

`CapacityIntensityChart.swift`(DesignSystem,Swift Charts 版容量/强度)**全仓无调用点**,是 #4 的死孪生。RN 别照它实现。

### 4.1 `E1RMChart`(教练端唯一图表)

- 两个 init:`(points:)` 让 `smoothed == rawEligible == 排序后的 points`(教练端走这条);`(smoothed:rawEligible:)` 分开给。插值 `.curve → .monotone`,`.step → .stepEnd`。
- **Y 值域**:`pad = max((max-min) * 0.15, 5)`,domain = `(min-pad)...(max+pad)`;无点 ⇒ `0...100`。
- Y 轴 leading:`AxisGridLine` `borderSubtle`,标签 `Int(kg)` mono 10 medium `textMuted`。X 轴 `desiredCount: 4`,**无网格线**,标签 `designSystem.date.monthDay %@ %@`(en `"%@/%@"`,zh `"%@月%@日"`)mono 10 medium `textMuted`。
- **线**:相邻两点一段 `LineMark`(`series` = 段号),段的样式取**终点的 origin**——`logged` = `chartLine@0.8` 实线宽 1.2 round;`imported` = `textTertiary@0.8` 宽 1.2 **dash [5,3]**。
- **记录点**:`marksRecord == true` 的点画 `PointMark` `chartLine` circle `symbolSize 46`,上方注解(spacing 4):默认只有**最后一个**记录点显示日期(mono 10 medium `textTertiary`);点任一记录点 → 该点换成 `"{M/D} · {kg}kg"` mono 10 semibold `textPrimary`,底 `surfaceKey` radius `sm`(12),padding 横 6 竖 3;再点取消。kg 格式:整数不带小数,否则一位。
- **散点**:全部 `rawEligible`,`confidence == .low` 用 diamond `symbolSize 24` 否则 circle 36;颜色 = 基色(logged `chartLine` / imported `textTertiary`),`low` ⇒ `@0.35`,`imported && normal` ⇒ `@0.65`。
- 点击层:`proxy.value(atX:)` 换日期,取最近点;传了 `onSelect` 就回调最近的 **smoothed** 点,否则切换最近**记录点**的 callout。
- 图例:仅当存在 imported 点时出现——22×1.5 虚线色块(`textTertiary`,dash [5,3])+ `designSystem.e1rm.importedHistoryLegend`(en "Dashed line = imported history")mono 10 medium。a11y `designSystem.e1rm.chartLabel %@`(单数 `chartLabelOne`)。

### 4.2 `GrowthE1RMChart`(学员成长卡,mockup 坐标制)

外框 `aspectRatio(320/118, .fit)`。**所有坐标是 320×118 的 mockup 单位**:`scaleX(v) = v/320 × width`,`scaleY(v) = v/118 × height`。
- **网格**:L 形轴线 (46,18)→(46,84)→(304,84),`textGhost` 1px;中线 (46,51)→(304,51) `borderSubtle` 1px **dash [3,4]**。
- **值域(非对称,曲线故意压在上 2/3)**:`values = samples ∪ rawEligible`;`span = max(max-min, 1)`;`low = min − span×0.35 − 1`;`high = max + span×0.12 + 1`。
- **映射**:`x = 46 + 254 × clamp(dateOffset/duration, 0, 1)`;`y = 84 − 64 × (value−low)/(high−low)`。`plotTop = y(20)`,`plotBottom = y(84)`。
- **面积**:折线下闭合区域,`gold500` 渐变 stops `0.22@0 → 0.04@0.72 → 0@1`,从 plotTop 到 plotBottom 竖向。
- **主线**:**直线段折线,不平滑**,`chartLine`,宽 `scaleX(2.5)`,round cap/join。
- **原始合格点**:菱形 半径 `scaleX(3)`,imported `textTertiary@0.35`,logged `chartLine@0.35`。
- **当前点**:向下虚线引导 `gold500@0.6` 宽 1 dash [2,3] 到 plotBottom;圆点半径 `scaleX(4.5)` 填 `gold500` + `surfaceCard` 描边 `scaleX(1.5)`;日期标签 `"{M}/{D}"` mono `scaleY(10)` bold `gold500`,底 `surfaceCard@0.9`,x clamp 到 `[scaleX(62), scaleX(286)]`,`y = max(scaleY(15), pointY − scaleY(8))`(源码注释:峰值收尾的曲线不能被自己的标签盖住)。
- **标签**:三个 Y 值 mono 9 medium —— 顶 (33,20) `textTertiary`、中 (33,52) **`textDim`**、底 (33,86) `textTertiary`,值 = `Int(high)` / `Int((high+low)/2)` / `Int(low)`。轴题 `student.growthE1Rmcard.copy006`(Weight / kg)旋转 −90° 于 (13,54)、`copy007`(Date)于 (175,114),mono `scaleY(8.5)` `textMuted`。日期轴:起止两个日期放在宽 `scaleX(254)`、中心 `scaleX(177)` 的框里左右对齐,y = `scaleY(98)`;**中点日期单独放在 x=173**(绘图区中点,源码注释明确说不是标签框中点)。日期 mono 9 `textMuted`,格式 `"{month}/{day}"`(裸整数,不补零)。
- `GrowthChartDateAxis`(纯值类型,可测):`start = min(日期)`,`end = max`(与 start 相同则 `start + 1s`),`middle = start + (end−start)/2`。
- **卡内各态高度**:zero `228`;formingProgress `126`;formingWindowSparse `126`;chart 态用上面的 aspectRatio。

### 4.3 `GrowthFormingTrendChart`(虚线「成形中」态)

坐标是**比例制**,不是 mockup 单位:`plotLeft .144w`、`plotRight .95w`、`plotTop .10h`、`plotMiddle .43h`、`plotBottom .76h`。
- L 形轴 `borderStrong` 1px;中线 `borderSubtle` 1px dash [3,4]。
- 幽灵曲线:首→尾**单条三次贝塞尔**,control1 `(first.x + 0.30Δx, first.y − 4)`,control2 `(first.x + 0.68Δx, last.y + 8)`;`borderStrong` 宽 2 round **dash [2,7]**。
- 已记录点(`index < min(recordedCount, points.count)`):9pt `gold500` 实心 + `surfaceCard` 1.5 描边;**最后一个**额外套 19pt 光环 `goldRGB@0.35` 1.5。
- 未来槽位:空心 7pt 圈 `borderStrong` 1.5。
- 整块 `accessibilityHidden`。

### 4.4 `VolumeIntensityChart`(成长 tab 容量/强度,双标度)

**不是普通柱状图**:金色柱(容量)+ 白色折线(平均 RPE,另一套标度)画在同一个 `Canvas` 里。
- 卡:padding 横 `point14`(14)/ 顶 `point15`(15)/ 底 `space3`(12),`surfaceCard`,radius `card`(16);`VStack(spacing: point9=9)`;`accessibilityElement(children: .combine)`,label = `student.volumeIntensityChart.copy004`(复数,带周数)或锁定时 `copy003`。
- 绘图区 `aspectRatio(320/172, .fit)`;`scaleX(v) = v/320×w`,`scaleY(v) = v/172×h`。
- **网格**:y=18 与 y=82 两条 `surfaceRaised` 1px(x 从 42 到 300);基线 y=146 `borderStrong` 1px。
- **柱**:中心从 x=58 到 x=278 均分(**只有一根时固定 x=168**);半宽 `scaleX(5)`;顶部两角圆角 `scaleX(4)`(二次曲线,底部不圆);`top = scaleY(146 − 128 × clamp(volume/volumeMax, 0, 1))`;填充线性渐变 `gold400 → goldBarDeep@0.28`,从 plotTop(18) 到 plotBottom(146)。
- **容量刻度**:`increment = max > 10000 ? 5000 : (max > 2000 ? 1000 : 500)`;`volumeMax = max(increment, ceil(max/increment) × increment)`。标签 mono 9 medium `textMuted`,位置 (30,21) / (30,85) / (30,149),值 = `compact(volumeMax)` / `compact(volumeMax/2)` / `"0"`;`compact`:<1000 取整数,否则 `{n}k`(整数不带小数,否则一位)。
- **RPE 折线**:只取 `avgRPE != nil` 的桶;`rpe = clamp(avg, 5, 10)`;`y = 92 − (rpe−5)/5 × 74`(RPE 5 ⇒ y=92,RPE 10 ⇒ y=18)。**画两遍**:先 `bgBase` 描边宽 `scaleX(3)` 当外发光,再 `chartLine` 宽 `scaleX(1.2)`,round cap/join,直线段。圆点半径 `scaleX(2.6)` 填 `chartLine` + `bgBase` 描边 `scaleX(1.2)`。右侧刻度 `"10" / "7.5" / "5"` 于 (309,21)/(309,58)/(309,95),mono 9 medium **`chartLine`**。
- **日期标签**:`"{DD}/{MM}"`(**日在前月在后**,各补零两位)置于每根柱中心,y=162,mono 8 medium `textMuted`;⚠️ **偶数下标 opacity 1、奇数 opacity 0**——是隐形不是删除,布局占位仍在。
- **图例**:`HStack(spacing: space4=16)`,色块 9×9(圆角矩形 `gold500` / 圆 `chartLine`),文案 `copy001`(Training volume kg)/ `copy002`(Average RPE)mono 11 `textMuted`,leading padding 2。
- **锁/空态**:`!isUnlocked || buckets.isEmpty` ⇒ `GrowthTrendEmptyState()` `minHeight 172`。
- **桶**:`GrowthScreenPresentation.chartBuckets(logs:) = ProgressMetrics.weeklyVolumeIntensity(logs).suffix(6)`;`weeklyVolumeIntensity` 只算 `completed && !assumed`,桶键 = `startOfDay(date(from: [yearForWeekOfYear, weekOfYear]))`,`volumeKg = Σ weight×reps`,`avgRPE` = 非空 RPE 均值(全空则 nil),按 weekStart 升序。`isUnlocked = trainingSessionCount >= 3`。

### 4.5 `Sparkline`

默认 viewBox 600×90;线 `chartLine` 宽 2.5 `lineJoin: .round`;可选每点 4pt 圆点 `lineColor@0.55`;末端 7pt `gold500` 圆点带 `gold500@0.5` radius 6 阴影;`accessibilityHidden`;静态 `parse("x,y x,y …")`。Dashboard 用它时把 `lineColor` 换成 `inkOnCTAFill`、外面再叠一层 `DashboardSparklineArea`,`frame(height: 48)`。**成长 tab 不用它**——RN w1g 若在成长 tab 里用了 Sparkline,应按 §4.2 换成 GrowthE1RMChart 几何。

---

## 5. 数据契约与值得抽的纯函数

### 5.1 打点端点(backend `feat/video-markers`,迁移 0054 + 0055)

- `GET|POST /videos/:videoId/markers`、`DELETE /videos/:videoId/markers/:markerId`。**无 PATCH,编辑 = 删了重建**。
- wire(snake_case,客户端 codec 自动转驼峰,**严禁手写 snake_case**):`{ id, video_id, coach_id, time_ms, level, note, created_at, attachment_id?, annotation_url?, annotation_expires_in? }`。`time_ms` 毫秒 Int ≥ 0;`level` 默认 `info`;`note` ≤500 且缺省是 `''` 不是 null;`annotation_url` 是 **900 s 签名**。列表按 `time_ms` 升序。
- 错误:`409 ATTACHMENT_NOT_READY` / `404 ATTACHMENT_NOT_FOUND` / `403 AUTHORIZATION_FORBIDDEN`。权限:GET 学员可读自己视频;POST/DELETE 仅教练(DELETE 另要 accepted bond + 作者本人)。
- 客户端错误分类(`VideoMarkerRepositoryError`,这是 UI 三态的来源):`404` 或传输失败 ⇒ `.unavailable`(**整块静默隐藏**);其他任何错误 ⇒ `.failed`(**面板留着显示失败头**);`.notFound` 仅 InMemory 删除用。
- **向后兼容硬要求**:后三个字段可缺省,老后端解码不失败(spec 064 单测锁死)。
- 标注图直接从 `annotation_url` 取,**不带鉴权头**;过期表现为图片加载失败 → 关覆盖层 + 重拉一次 markers。

### 5.2 播放地址

| 场景 | 取法 |
|---|---|
| 学员反馈收件箱/详情 | `FeedbackInboxViewModel.playbackURL(videoID:)` |
| 教练待反馈队列 | `CoachVideoQueueViewModel.playbackURL(videoID:)` |
| 组内回看(远端) | `GET /uploads/:attachmentId/url` |
| 聊天视频 | `videoPlaybackURL(messageID:forceRenewal:)` |

**一律不缓存**;`retry()` 换到的新 URL 会写回 `playbackURL`,**导出读的也是它**。

### 5.3 导出输入

`playbackURL`(可能已刷新过)+ `VideoBadgeInfo`。**零网络请求、零后端改动**。

### 5.4 建议抽成纯函数的清单(带 iOS 原名,便于对照测)

- `rateText` / `workbenchRateText` / `cycleRate` 的索引环绕。
- `timeText(seconds)`。
- `seekTime(milliseconds:durationSeconds:)` 与 `seekTime(seconds:durationSeconds:)` 的钳位。
- `FeedbackVideoScrubState`(begin/move/finish/displayedSeconds)+ 80 ms 节流 + generation 守卫。
- `VideoBadgePresentation`(字段隐藏 + 数字格式化)、`VideoBadgeLayout`(四个比例)。
- `VideoMarkerLoadOutcome` 映射(unavailable→hidden、取消→hidden、其他→failed)。
- `VideoAttachmentPlaybackSourceSelector.select`。
- `GrowthChartDateAxis`、`GrowthChartGeometry`(值域 + plotPoint + currentPointLabel 钳位)、`VolumeChartGeometry`(increment 阶梯 / volumeMaximum / compactVolume / RPE y 映射 / centerX)、`chartBuckets`、`ProgressMetrics.weeklyVolumeIntensity`。
- `E1RMChart` 的 `yDomain` padding、`lineSegments` 取终点 origin 的规则、`scatterColor`。

---

## 6. 不做 / 安卓 v1 偏差 / 分卡

### 6.1 不做

进度条刻度(§1.1,iOS 本就没有);打点级别 UI 与颜色表(§1.3);打点编辑(后端无 PATCH);标注帧的缩放/拖动/关闭按钮(§1.4);教练列表行 seek(iOS 就不可点);`CapacityIntensityChart`(死代码);成长 tab 的 Sparkline(iOS 只在 Dashboard 用);后台导出与导出队列;任何分享 SDK。

### 6.2 已知偏差(PARITY 记账)

1. **AVKit 原生 transport 缺失** → 全屏形态必须自绘播放/暂停(§0.2)。
2. `ultraThinMaterial` → `@react-native-community/blur` 或退化成 `rgba(0,0,0,0.35)` 平底;chrome 描边 `white@0.18` 照旧。
3. SwiftUI `Slider` 的 gold tint 在安卓无等价 → 用 Pressable/PanResponder 自绘轨道(轨道 `gold500`,底 `videoStageBorder`),同时保住 §0.5 的节流 + generation 语义。
4. `ImageRenderer` → 若将来需要静态角标图,用 react-native-svg + react-native-view-shot。
5. **烧录导出 ⚖️待拍板**(§2.7),推荐 v1 不做、按钮整体隐藏。

### 6.3 分卡(3 张,按可独立验收的交付单元)

**W3-a 共享播放器 + 打点 + 标注帧(§0 / §1 / §3)**
可独立验收:学员从收件箱点开 → 全屏播放、倍速四档、拖拽跟手、打点列表点击 seek、带 ✏️ 的点击暂停并盖标注帧、点一下关闭;教练工作台内嵌 270pt 舞台 + 分段倍速 + ＋打点 + 列表增删;短链过期 → 失败卡 → 重试换链继续播。
测试 seam(优先复用已有 `use-video-feedback-slice.ts` 边界):
- `player/rate.ts`:倍速文案两套 + 环绕表(含不在表内的速率回落 index 1)。
- `player/time.ts`:`timeText(7.9)="0:07"`、`timeText(74)="1:14"`、0、>3600s 不进位;seek 钳位(负数/0/超时长/非有限)。
- `player/scrub-state.ts`:clamp、displayedSeconds 拖拽/非拖拽分支。
- `video-markers/outcome.ts`:404→hidden、5xx→failed、取消→hidden;面板可见性真值表(nil / [] / failed / 非空)。
- `video-markers/select.ts`:有/无 annotationURL 的两条路径(pause+seek+overlay vs 纯 seek);loadFailed → 关闭 + 恰好一次 refresh。

**W3-b 角标浮层(§2,不含烧录)**
可独立验收:全屏默认展开、点卡收起为 logo、不遮打点面板与控制区;工作台恒 logo;字段缺失整块消失;组内回看/收件箱/教练两处四个调用点数据正确。
测试 seam:
- `badge/presentation.ts`:空串/空白 trim 成 nil;`100 → "100"`、`82.5 → "82.5"`、`1000 → "1000"`(无千分位);`hasLoad` 组合;`setOrdinal` 不做 +1。
- `badge/layout.ts`:`screenCardWidth(390) ≈ 338`、`exportBottomMargin(960) = 76`、scale 在 468 时为 1。
- 快照:en 下 `setSuffix` 为空不渲染尾块;浮层模式无署名行、烧录模式有。

**W3-c 图表(§4)**
可独立验收:学员成长三卡 chart 态与 forming 态几何对得上 iOS 截图;容量/强度双标度图 6 周桶正确;教练 StudentDetail 每主项 90pt e1RM 图。RN 用 react-native-svg 手绘(几何全在纯函数里,victory-native 只有在需要 Swift Charts 那套自动轴时才值得引)。
测试 seam(复用 `w1g/src/features/history/model.ts`):
- `charts/growth-geometry.ts`:值域非对称 padding、`plotPoint` 在域两端、单点时 duration 兜底、currentPointLabel 的 x/y 钳位。
- `charts/volume-geometry.ts`:increment 阶梯(max=400/2500/12000)、`compactVolume`(500 / 1k / 1.5k)、RPE y 映射(5→92、7.5→55、10→18)与越界钳位、单桶居中 168、日期标签奇偶 opacity。
- `charts/date-axis.ts`:首尾相同时 `end = start + 1s`、middle 取中。
- `model.ts`:`chartBuckets` 取尾 6、只算 `completed && !assumed`、周键按 ISO 周。

> 若 David 拍板要烧录导出,那是**独立的 T3 卡 + 原生模块**,不许塞进 W3-a/b。
