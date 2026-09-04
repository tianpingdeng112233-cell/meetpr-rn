# 设计 tokens v3 参照包(iOS `release/1.0` @ 202e95db,Modules/DesignSystem)

> ⚖️2026-09-04 重 pin 基线后提取。iOS 7 月底「v3 浅色 + 品牌金」重做了整套 DesignSystem(75 文件 +9k 行);本仓 W0-A 移植的红/黑 tokens 在 iOS 已降为 `LegacyColors`,**iOS 业务代码零引用**(StudentKit/AppShell/CoachKit/ChatUI 全部走新 token 与 `.MeetPR.display/body/mono(size:)` 字体 API,406 处)。本仓必须整体切换。
> 数值单位 pt = RN dp。颜色 `light / dark` 两套,iOS 默认 **light**(`MeetPRAppearance.defaultPreference = .light`,用户可在「我的」切 system/light/dark,存储 key `meetpr.appearance`);安卓同构,`app.json userInterfaceStyle` 改 `automatic`,由 app 内偏好决定。

## 1. 颜色(rgb;单值 = 两模式同色)

### 品牌金
| token | light | dark |
|---|---|---|
| goldCTA | 180,83,9 | 255,184,0 |
| gold500(= goldRGB = accent) | 217,119,6 | 245,166,35 |
| gold400 | 245,158,11 | 251,191,62 |
| gold300 | 255,212,112 | 同 |
| gold200 | 254,243,199 | 255,226,142 |
| goldText | 154,74,6 | 245,166,35 |
| gold700 / gold800 / gold900 | 184,121,26 / 154,100,19 / 122,78,14 | 同 |
| goldMuted | 184,147,90 | 同 |
| goldGradientStart → End | 217,119,6 → 245,185,60 | 224,143,15 → 255,201,60 |
| goldBarDeep | 169,115,28 | 同 |
| goldSoft | gold500 @ 0.14 | |

### 底与面
| token | light | dark |
|---|---|---|
| bgBase(页面底) | 245,246,248 | 10,10,12 |
| bgInset(输入框底/inset 卡) | 250,250,251 | 16,16,20 |
| bgStack(进度轨) | 238,240,243 | 18,18,23 |
| bgDeep | 237,238,241 | 5,5,6 |
| surfaceCard(卡片) | 255,255,255 | 20,20,22 |
| surfaceElevated(modal/浮层) | 255,255,255 | 22,22,24 |
| surfaceKey(键面/中性 badge 底) | 243,244,246 | 28,28,32 |
| surfaceRaised | 238,240,243 | 35,35,39 |
| surfaceFocus | 15,15,18 | 同 |
| reviewHeroTop | 247,240,228 | 23,18,10 |
| medalStatTile | 255,255,255 @0.55 | 0,0,0 @0.35 |

### 边框
| token | light | dark |
|---|---|---|
| borderHairline | 233,235,238 | 23,23,26 |
| borderSubtle | 229,231,235 | 30,30,34 |
| borderDefault | 229,231,235 | 38,38,41 |
| borderStrong | 209,213,219 | 46,46,50 |

### 文字
| token | light | dark |
|---|---|---|
| textPrimary(= textHeading) | 17,24,39 | 237,237,237 |
| textSecondary(= textBody) | 75,85,99 | 200,200,204 |
| textTertiary | 92,99,113 | 161,161,166 |
| textMuted / textFaint / textDim | 92,99,113 | 138,138,144 |
| textDisabled | 156,163,175 | 85,85,92 |
| textGhost | 209,213,219 | 62,62,68 |
| coachNoteText | 75,85,99 | 196,196,200 |

### 语义
| token | light | dark |
|---|---|---|
| success(= successRGB) | 21,128,61 | 94,158,120 |
| successSoft | 21,128,61 | 159,199,174 |
| successTint | success @0.14 | |
| danger(= dangerRGB) | 229,72,77 | 同 |
| dangerMuted | 163,59,64 | 200,136,136 |
| dangerFill(= unread) | 192,52,58 | 同 |
| dangerSoft | danger @0.14 | |
| chartLine | 154,164,176 | 220,227,234 |
| inkOnGold | 255,255,255 | 20,20,20 |
| **ctaBackground**(主 CTA 底) | 17,24,39 | 255,184,0 |
| **ctaText** | 255,255,255 | 20,20,20 |
| ctaFill(选中 DayChip 底) | 17,24,39 | 同 |
| inkOnCTAFill | 255,255,255 | 同 |
| cardShadow | 17,24,39 @0.06 | 透明 |
| modalShadow | 0,0,0 @0.5 | 同 |
| chatPlanBadgeFill | 230,190,85 @0.14 | 同 |
| desk1 / desk2 | 233,233,238 / 210,210,217 | 26,26,30 / 5,5,6 |
| ctaTopHighlight / ctaBottomShade | 255,255,255 / 0,0,0 | 同 / 120,60,0 |
| bezel / bezelEdge | 28,28,30 / 42,42,45 | 同 |

`SemanticTone`:action/inProgress → gold500;notCompleted/danger → danger;completed → success;neutral → textTertiary;unreadBadge → dangerFill。
杠铃片/杠 gradient(PlateVisual 专用)与 celebration/shimmer 色见 iOS `Colors.swift` 末段,W3 图表/奖励线再移植,本卡不做。

### Legacy(仅为老屏过渡保留,新代码禁用)
brandRed 229,34,30;brandRedPress 184,26,23;brandRedSoft(light @0.08 / dark @0.12);green 31,179,88;amber 224,168,16;bg / surface1-3 / border / fgPrimary-Tertiary / fgDisabled 值见现 `tokens.ts`。

## 2. 字体

- 三族:**display** = Archivo(ExtraBold 默认 / Black);**body** = IBM Plex Sans(Regular/Medium/SemiBold/Bold);**mono** = IBM Plex Mono(Regular/Medium/SemiBold/Bold)。iOS 打包 `Archivo-VF.ttf`、`IBMPlexSans-VF.ttf`(可变字体)与 IBM Plex Mono 四个静态字重;字体缺失回落系统同字重。
- RN/Android:可变字体轴在 RN 不可控,**改用 Google Fonts 的静态实例**(Archivo ExtraBold/Black,IBM Plex Sans Regular/Medium/SemiBold/Bold,IBM Plex Mono Regular/Medium/SemiBold/Bold,共 10 个 ttf,OFL 许可),`expo-font` 在 root layout 预加载,加载前 splash 不放行。
- 尺寸表 `MeetPRFontMetrics`:8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 26 27 28 30 32 34 36 38 40 44 46 48 50 54 64。
- 角色(全部经三族 API 生成):

| 角色 | 族/字重/尺寸 | 备注 |
|---|---|---|
| displayHero | display ExtraBold 54 | |
| title1 | display ExtraBold 34 | LargeTitleBar 用 Black 34,tracking −0.7 |
| title2 | display ExtraBold 28 | |
| headline | display ExtraBold 20 | |
| body | body Regular 17 | |
| bodyEmphasis | body SemiBold 17 | |
| footnote | body Regular 13 | |
| caption | body Medium 11 | |
| monoLabel | mono SemiBold 12,tracking 0.6 | |
| displayNumeral | display ExtraBold 54 | |
| displayUnit | mono Bold 24,tracking 0.8 | |

业务代码大量直接调用 `display(size:)` / `body(size:, weight:)` / `mono(size:, weight:)`,RN 需暴露同形 API:`font.display(size, weight?)`、`font.body(size, weight?)`、`font.mono(size, weight?)` 返回 TextStyle。

## 3. 间距 / 圆角

- `spacing`:space1=4 space2=8 space3=12 space4=16 space5=20 space6=24;别名 xs=4 sm=8 md=12 base=16 lg=24 xl=32 xxl=48 xxxl=64;pageHorizontal=20,compactPageHorizontal=16,cardHorizontal=16,minimumHitTarget=44,completionControlHeight=58;零散 point1…point64 按数值直用。
- `radius`:micro=4 inset=10 control=12(=chip) card=16 modal=20 pill=999;别名 sm=control(12) md=inset(10) lg=control(12) xl=card(16)。**注意现 RN `radius.lg=12 / xl=16` 恰好一致,`radius.sm` 从 4→12、`md` 8→10 会变。**

## 4. 基础组件规格(RN 需提供的对应件)

| iOS | 规格要点 | RN 对应 |
|---|---|---|
| **GoldCTA**(主行动) | variant primary/secondary/danger/link。primary:底 ctaBackground、字 ctaText、display 16 tracking(contract 值)、pill、minHeight 52(有 sub 行 62,sub = mono Bold 12 tracking 0.72 @0.72 opacity)、可选 play/logout 图标;secondary:底 surfaceCard + 1px borderDefault、字 textSecondary;danger:底 surfaceCard + 1px borderStrong、字 dangerMuted、body SemiBold 14、radius card(16);link:透明、字 textMuted body Medium 13 + chevron、minHeight 44。按压:scale 0.97 + 轻触感。dark 模式的顶部高光/底部阴影/shimmer/held glow 属装饰动效,**不移植**(spec 082 口径) | `AppButton` 重写为 GoldCTA 语义,variant 名对齐 |
| PrimaryButton | 底 surfaceCard、1px borderDefault、pill、字 textSecondary body SemiBold 16、minHeight 44、loading 顶部 1px gold500 线 | = GoldCTA secondary |
| SecondaryButton | 同上但字 15 | 合并进 secondary |
| DangerButton | 字 danger、边 danger@0.4、radius card | = GoldCTA danger |
| BrandPrimaryButton | 底 ctaBackground、字 ctaText body Bold 16、pill、minHeight 52 | = GoldCTA primary(icon none) |
| IconButton | 44×44 圆、底 surfaceCard、图标 18 textPrimary | 新增 |
| **Card** | padding v14/h16(inset 版 v10/h12);accent 版左侧 3px gold500 竖条;surface = `CardSurface(.card)`:底 surfaceCard、radius card、无边框、**light 模式阴影 cardShadow r9 y4,dark 无阴影** | `Card` 重写;`inset` prop |
| CardSurface(.inset) | 底 bgInset、radius chip(12)、1px surfaceKey 边、无阴影 | |
| CardSurface(.modal) | 底 surfaceElevated、radius modal(20)、1px borderDefault、阴影 modalShadow r30 y30 | |
| ElevatedCard | padding 16、fill surfaceElevated | `Card variant="elevated"` |
| **MeetPRListRow** | 行高 ≥52、padding h12/v8、底 surfaceCard;左 20×20 图标 gold500(无则 1.5px borderStrong 空圆);title body SemiBold 14 textPrimary 单行;subtitle body 12 textTertiary;右侧可选 PRBadge/StatusBadge/chevron 14 textMuted | `ListRow` 重写 |
| **MeetPRTextField** | 上方 label 大写 mono SemiBold 11 tracking 0.7 textMuted(错误时 danger);输入框底 bgInset、1px 边(默认 borderDefault / 聚焦 gold500 / 错误 danger)、radius md(10)、minHeight 44、padding 12、字 body 17(mono 版 mono Medium 17 tracking 0.8)、光标 gold500;下方 helper footnote textTertiary / error danger | 新增 `TextField` |
| StatTile | label mono 11 tracking 0.66 textMuted;值 mono Bold 28(accent 决定色:neutral textPrimary / gold / success / danger)+ 单位 body Medium 12 textMuted;delta mono Bold 12(以 - 开头 danger、+ 开头 success);padding h16/v14、surfaceCard、radius card、cardShadow | 新增 |
| Eyebrow | 大写 mono Bold 11 tracking 0.8 gold500 + 右侧 32×1 同色横线 | 新增 |
| LargeTitleBar | eyebrow? + 标题 display Black 34 tracking −0.7 textPrimary + subtitle footnote textSecondary;padding h20 top4 bottom12 | 新增 |
| **MeetPRTabBar** | 底 surfaceCard,顶 1px borderSubtle;项 = 24×24 线性图标(2px round stroke,自绘 path,见 iOS 源)+ 标题 system 11;选中 goldCTA / 未选 textTertiary;未读徽标 mono Bold 9 白字、底 dangerFill、minSize 16、偏移 (+10,−6);行高 44 + 顶 5 | 自定义 `tabBar` 组件替换 expo-router 默认;图标用 react-native-svg 按 24 网格移植 house/message/students/training/growth/profile/today 七个 path |
| MeetPRDayChip | 52×44,radius control;底 surfaceCard(选中 filled → ctaFill,outlined → surfaceElevated)+ 选中 1.5px gold500 边;weekday system Medium 10 / date mono Bold 13;状态点 5px(done success / missed danger / today gold500)右上;未选中 cardShadow | 新增(W1-d 周历用) |
| StatusBadge | 文字大写 mono Bold 11 tracking 0.72;tone gold/success/danger/neutral → 字色 gold500/success/danger/textTertiary,底 goldSoft/successTint/dangerSoft/surfaceElevated,1px 同色 @0.32 边,capsule,padding h8/v4 | 新增 |
| GoldProgressBar | 高 4,轨 bgStack,填充 goldGradientStart→End 横向渐变,capsule | 新增 |

## 5. 页面骨架口径
- 页面底 bgBase;内容区横向 padding pageHorizontal=20(紧凑 16);卡片间距 space3=12;区块间距 space6=24。
- 标题用 LargeTitleBar;区块小标题用 Eyebrow。
- 主行动用 GoldCTA primary(黑底白字 light / 金底黑字 dark),次行动 secondary,破坏性 danger;**红色只剩 danger 语义**,不再是品牌色。
- 状态条:light 模式深色文字;dark 模式浅色。
