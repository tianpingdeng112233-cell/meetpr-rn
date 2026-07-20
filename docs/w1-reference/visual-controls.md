# iOS 控件级视觉参照(纠偏用,release/1.0 @3799f67 实抠)

> ⚠️ 核心纠错:iOS 主按钮 = **PrimaryButton:背景 fgPrimary(暗色下白)/文字 bg(反色)**;`BrandPrimaryButton`(红填充)全业务屏零引用。红色从不做常规主按钮大面积填充。按下态 = opacity 0.6(不换色);禁用 = opacity 0.35(不换背景色)。按钮通用:minHeight 44、padding 横 24 纵 14、圆角 12、bodyEmphasis(17/semibold)。

## 按钮组件规范
| 组件 | 背景 | 文字 | 边框 | 其他 |
|---|---|---|---|---|
| PrimaryButton(主按钮) | fgPrimary | bg(反色) | 无 | loading 顶 1px brandRed 线 |
| SecondaryButton | 透明 | fgPrimary | fgPrimary 1px | ghost |
| DangerButton | brandRed | white | 无 | 仅破坏性操作 |
| IconButton | surface2 | fgPrimary | border 1px | 44×44,圆角 8,icon 18 |
- Card=surface1+border 1px+padding16+圆角12;ElevatedCard=surface2 同上。

## 各屏按钮实况(逐处对齐)
- 登录「登录」= PrimaryButton 反色;hero 下有 48×3 brandRed accent 线。
- 隐私告知「知道了」= 系统 borderedProminent(继承红 accent)——**紧凑按钮右对齐**,非全宽大块。
- Readiness「下一步/完成」= borderedProminent **红底白字**(此处红是对的);「上一步」= bordered 描边灰(fgSecondary)。
- Onboarding footer 主钮 = PrimaryButton 反色;「上一步」= SecondaryButton;进度条填充 brandRed。
- SetEntrySheet「完成本组」= 反色填充(fgPrimary/bg,icon checkmark,高 52 圆角 12,16/semibold);「未完成/失败」= surface1 底+border 1px+fgSecondary 字,icon xmark;**步进器 +/− = 52×52 圆,brandRedSoft 底+brandRed 图标+brandRed@0.3 描边**。
- EnterCode「提交」= PrimaryButton;PendingBind「取消请求」= SecondaryButton ghost。
- MyProfile「退出登录」= **红色文字行**(15/semibold,brandRed 字+图标,无背景),非填充按钮。
- Dashboard 主 CTA(开始/继续)= **fgPrimary 反色**,高 50 圆角 12;「今天有事」= surface1+border ghost,fgSecondary 字;「撤销顺延」= **brandRedSoft 底+brandRed 字**,高 44 圆角 12。
- SlideToCompleteButton = **绿色**轨道(green)+白旋钮(内 chevron 绿)+白字;DayCompletionBanner = green@0.14 底+green@0.4 边+绿印章图标。
- 评估期「开始训练」(封存屏)= 全 app 唯一常规红填充 CTA,不在复刻范围。

## 红色合法使用清单(其余场合不许红)
1. tab 选中态图标+文字(全局 tint)。2. 图标 tint 点缀(反馈头像/rest 图标/视频区/仪表盘小图标等)。3. 错误/警告红字与登出红字行。4. 未读小圆点(6-8px)/PR 角标(PRBadge 红底白字 capsule)/周格完成红三角。5. 进度条填充(onboarding/训练日进度)。6. 图表:容量条 brandRed@0.32、Sparkline 线。7. 选中态:日历选中描边+brandRedSoft 底、onboarding 选择卡、collar 开启态 brandRed@0.4 描边、步进器软底。8. Readiness 红主钮、「撤销顺延」软红、DangerButton(注销类)。9. StatusBadge .live 态。
