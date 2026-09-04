# 「我的」参照包 v2(iOS `release/1.0` @ 202e95db,`StudentKit/Features/MyProfile` + Readiness/RestTimer/TrainingReminder/AccountSecurity)

> 取代 `peripheral-screens.md` §5。文案 key 指 `docs/w0-reference/i18n/StudentKit.json`(省略 `student.` 前缀)。Global 轨差异:密码规则 8–72 字节;「改密码」对 Global 邮箱账号同样走 `/me/password`(现场核 backend 是否区分通道);外观三档是 Global 轨新增行。

## 0. 屏幕(`MyProfileView`,隐藏导航栏,下拉刷新)
- **Header** `MyProfileHeader`:`myProfileView.copy016` 我的资料(display 34)+ eyebrow `copy017` 训练基线 · 教练管理 + 右上 `HeaderChatButton`(a11y `copy015`)。
- 三态:loading → `MyProfileSkeleton`(a11y `copy024`);404/empty → `MyProfileStateCard(copy001 完成资料填写后解锁)`;failed → `MyProfileStateCard(copy002 加载失败 · 点击重试)`(点卡重试)。**empty/failed 也渲染 `MyProfileFallbackRows`**:偏好段(外观 / 组间休息 / 训练提醒)+ 账号与安全段 + 退出登录——防账号困死(P0 沿旧口径)。
- loaded 自上而下:
  1. **`MyProfileOneRMCard`**(🔒):`copy018` 当前 1RM + ⓘ(`copy019`,弹说明 `copy020` "教练设定的训练基准 · 与「成长」按训练自动估算的 E1RM 不是同一个值");三主项 30pt mono(缺 "—");`copy021` SBD 总和;底行 `Label(copy022 训练周期中无法修改 · 联系教练, lock)`。
  2. **`MyProfileRecoveryCard`**:最近 readiness(`myProfileV3Presentation.copy001/002/003` "睡眠 {n}/5 / 状态 {n}/5 / 压力 {n}/5")+ 「通知教练」徽标 `copy023`;点开 readiness sheet(`showsReadiness`,复用训练 tab 的两步 sheet)。
  3. `MyProfileSectionLabel(copy003 恢复与伤病 · 改动通知教练)` → `MyProfileGroupCard`:`copy004` 恢复评估(值 = 强度/压力/恢复 `myProfileV3Presentation.copy004–006` 摘要)/ `copy005` 伤病记录(值 = `copy007` 无伤病记录 / `copy009` "{n}部伤病" / `copy008` 其他伤病)→ 各进编辑页(复用向导同款 section 组件,显式「保存」`profileCardsSection.copy013`,patch 复用 step patch,**patchStep 永不为 3**)。
  4. `MyProfileSectionLabel(copy006 偏好与基础信息)` → 组卡:`copy007` 想增强肌群(值 = 标签列表 / `copy010` 未填写)/ **`AppearancePreferenceRow`**(`appearancePreferenceRow.copy001` 外观 + 当前档名;右侧三个 chip 系统/浅色/深色,选中 gold 底;写 `meetpr.appearance`)/ **`RestTimerPreferenceRow`**(`restTimerPreferenceRow.copy001` 组间休息 + 摘要:自动 `studentRestTimerSettings.copy002` 或 `自定义 2:00/3:00/4:00` 形制)→ 设置页 / **`TrainingReminderPreferenceRow`**(`trainingReminderPreferenceRow.copy001` 训练提醒 + 摘要 `trainingReminderCopy.copy001` 关 / "一·三·五 20:00" / `copy002` 未选择星期)→ 设置页 / `copy008` 比赛日期 / `copy009` 身高 / 体重(值缺省 `copy010` 未填写)。
  5. `MyProfileSectionLabel(copy010 训练背景 · 环境)` → `copy011` 训练背景 / `copy012` 训练环境。
  6. `accountSecuritySection`:`MyProfileSectionLabel(copy014 账号与安全)` → `AccountSecuritySection`:`accountSecuritySheets.copy001` 改密码 / `copy002` 导出训练数据 / `copy003` 注销账号。
  7. 底部 `copy013` 退出登录(GoldCTA danger 或 link 形制,现场核 `MyProfileView.swift:210`)。
- 行形制 `MyProfileValueRow`:标题 body 11 textMuted + 值 body 16 semibold textPrimary + chevron;组卡 `MyProfileGroupCard` = surfaceCard 圆角 16,行间 `MyProfileDivider` hairline。

## 1. 组间休息设置(`RestTimerSettingsView`,`StudentRestTimerPreference`)
- 两档:`automatic`(默认;标题 `studentRestTimerSettings.copy001`,摘要 `copy002`)与 `custom(low, mid, high)`(标题 `copy003`)。
- 页面:导航标题 `restTimerSettingsView.copy004` 组间休息;顶部模式选择(`copy008` 默认行为 = 自动 / `copy001` 按实际 RPE 设置 = 自定义);自定义时三档行 `copy005` RPE 低于 7 / `copy006` RPE 7 至 9 以下 / `copy007` RPE 9 及以上,各带时长选择器(可展开/收起 `copy009/010`;范围 30…600 s,步长 15;默认 120/180/240 = `copy011/012/013` 2/3/4 分钟);说明 `copy002` 自动规则 + `copy003` "教练在计划中指定的休息时长始终优先。此设置只改变没有教练设定时的默认行为。"
- 取值:`customSeconds(forRPE)`:rpe<7 → low;<9 → mid;否则 high;rpe 为空 → mid。automatic → `RestDefaults.seconds(forRPE:)`(v1 常量)。按 studentId 存本地;首次出现休息计时时的说明弹层 `hasAcknowledgedExplanation`(沿 v1 `RestTimerExplanationView`)。

## 2. 训练提醒(spec 079,`TrainingReminderSettingsView`)
- 行摘要:关 → `trainingReminderCopy.copy001`;开 → 周几短名(`trainingReminderWeekday.copy001–007` 一…日,用「·」连)+ ` HH:mm`;开但无星期 → `copy002`。
- 设置页:标题 `trainingReminderSettingsView.copy001`;`copy002` 开启训练提醒 Toggle;`copy003` 提醒时间 段:`copy004` 星期(七个 chip 多选,一…日,开关开启时可用)+ `copy005` 时间(时分选择);权限被拒 → 行内 `copy006` 通知权限未开启 + `copy007` 去设置(跳系统通知设置);排程失败 toast `copy008`。
- 默认:关;首次预选星期 = onboarding `training_days`(缺 → 一/三/五),时间 20:00;未开启不排程不持久化;保存后以保存值为准。
- 排程:每个选中 weekday 一条重复本地通知(`identifier = "training-reminder-" + weekday`,weekday 1=日…7=六),**任何变更先删该前缀全部再重排**;登出清空该前缀;文案 `trainingReminderCopy.copy003` 训练日到了 / `copy004` 该练了,今天的安排在等你;前台不弹。安卓:`expo-notifications` 本地计划通知 + 通知渠道 "training-reminder";权限走 `requestPermissionsAsync`(Android 13+);「去设置」用 `Linking.openSettings()`。
- 存储 `UserDefaults` → AsyncStorage,不上后端。

## 3. 账号与安全(`AccountSecuritySheets` / `AccountSecurityViewModels`)
- **改密码** sheet:`accountSecuritySheets.copy014` 旧密码 / `copy015` 新密码(至少 8 位)/ `copy016` 再输一次新密码;校验 `copy017` 新密码至少 8 位、两次不一致提示(`accountSecurityViewModels.copy003/004` 现场核文案);提交 `copy018/019`;旧密码错 → `accountSecurityViewModels.copy005`;其它 → `copy006`;成功 toast `copy004` "密码已更新,其他设备将退出登录"。端点 `PUT /me/password`(以 backend 为准现场核)。
- **导出训练数据** sheet(`ExportDataSheet`):标题 `exportDataSheet.copy007`;进行中 `copy002` "正在整理你的全部训练数据…";成功 `copy004` CSV 已生成 + `copy005` 说明 + `copy006` 分享 / 存储(系统分享);失败 `copy001` + `copy003` 重试。CSV(`TrainingLogCSVExporter`):header `date,exercise,exercise_en,set_index,weight_kg,reps,rpe,completed,failed,adhoc`;date = 设备日历 `YYYY-MM-DD`;字段含逗号/引号/换行时加引号转义;文件名 `meetpr-training-log-<YYYYMMDD>.csv`。
- **注销账号**(全屏确认):`copy005` "账号与全部训练数据将永久删除,无法恢复。" + 四条 bullets `copy006–009`;`copy010` "输入「{注销}」以确认"(`accountSecurityViewModels.copy001` = 要求输入的词);输入匹配才启用 `copy012` 永久删除我的账号;`copy011` 删除中…;失败 `accountSecurityViewModels.copy002`;成功 → 登出。端点 `DELETE /me`(现场核)。

## 4. RN 影响面
- 新增 `features/profile/`(屏、行编辑、三张 sheet)、`features/settings/rest-timer`、`features/settings/training-reminder`(expo-notifications 新依赖,T2)、`features/settings/appearance`(接 G0-a `useTheme().setAppearance`)。
- 复用:onboarding 的 section 组件与 patch(`OnboardingSteps` 抽出可复用 step 段)、readiness sheet、`onboardingRepository.upsert`。
- 测试 seam:`profile/__tests__/model.test.ts`(recovery 摘要/伤病计数/1RM 合计/未填写回落)、`settings/__tests__/rest-timer.test.ts`(customSeconds 三带 + 空 RPE → mid、范围/步长 clamp)、`settings/__tests__/training-reminder.test.ts`(requests 生成:选中集合 → identifier/weekday/时分;变更先清再排;登出清空;默认预选来自 training_days)、`profile/__tests__/csv.test.ts`(header 逐字、转义、文件名)。
