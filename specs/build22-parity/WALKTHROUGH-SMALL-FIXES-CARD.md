# 任务卡：走查安卓小修九项

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、本卡。

- 级别：T1。来源：2026-10-02 David 真机走查（小米系 Android，英文界面）里根因明确的安卓缺陷与复刻缺口，David 已同意合成一张卡修。
- 基线：RN `fix/walkthrough-behavior`（PR #67 顶）。iOS 参照固定 `beta/1.0-22@0748931563fefea14e7f50a7c9ee7330b5501bea`，本机只读仓 `/Users/david/Projects/apps/MeetPR`，用 `git -C <仓> show <sha>:<path>` 读。
- 这是 Opus 派的实装卡：在当前分支 `fix/walkthrough-small-fixes` 的工作区改，**不 commit、不 push**；只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。
- 九项互不依赖，都是界面层的小改；合一张卡是因为同一次真机复验一起看。只复刻固定 iOS 已有的样子或修正明显的布局错误，不新增功能。

## 逐项

1. **训练页当前组卡片左侧的金色竖条没有贯穿整张卡**（D-10）。现状：竖条只到 "Last time…" 一行，下面的 Coach note 与按钮区没有。iOS：竖条从卡片顶到底。位置：`src/features/training/TodayWorkoutView.tsx` 的当前组卡片。要求：竖条高度随卡片内容，贯穿整张卡。
2. **Record this set 并到 Log this set 右侧**（D-11）。现状：上下两个整行大按钮。iOS（见 `docs/evidence/walkthrough-20261002/d11-ios-log-and-camera.png`，对应 `Features/TodayWorkout/TodayWorkoutView.swift` 当前组卡片的操作行）：一行内左侧是主按钮"记录此组 / Log this set"占满剩余宽度，右侧是一个与主按钮等高的方形描边按钮，里面是摄像机图标，点击行为与现在的 Record this set 相同。要求：按 iOS 的一行两键布局；摄像机按钮有无障碍标签（沿用现有 Record this set 的文案键）；命中区域不小于 44dp。
3. **拍摄页没有占满屏幕，Close camera 是顶部一个整行按钮，底部透出 tab 栏**（D-13）。iOS：`Features/VideoUpload/Camera/CameraRecorderView.swift` 及其 `RecorderCaptureView` / `RecorderReviewView`——全屏黑底，取景画面铺满，关闭是角上的图标按钮，不显示 tab 栏。要求：拍摄与预览两态都全屏（含状态栏区域的黑底），关闭入口的位置与形态对齐 iOS，系统返回键仍能关闭；录制、预览、Retry / Use、Save to Photos 的行为不变（含刚修的"预览态切后台不丢"）。
4. **组录入页杠铃片说明文字挤成三行**（D-15）。现状：`25kg × 1 · 5kg × 1 · 1.25kg × 1 + 2.5 kg competition collars` 用等宽字体挤在 Add collars 按钮左侧窄栏里折行。先对照 iOS 组录入页（`Features/TodayWorkout` 下的 set entry / plate 视图）这段说明与 Add collars 的排布，按 iOS 的排布做；若 iOS 也是同一行并排，则让说明文字独占一行、Add collars 另起一行右对齐，保证 360dp 宽下不超过两行。
5. **组录入页视频行的 Change / Delete 按钮文字折成 "Chang e" / "Delet e"**（D-21）。要求：两个按钮文字不折行、不截断；空间不够时按钮整体换到下一行。这一行后续会按新设计重做，本项只做最小修正。
6. **注册页密码框占位提示样式错乱**（D-02）。现状：`src/features/auth/GlobalAuthField.tsx` 给密码输入用了等宽字体 + 加宽字距，占位提示 "At least 8 characters" 继承了这套样式，又宽又折成两行。要求：占位提示用正文字体、正常字距、单行；已输入的密码字符样式不变。登录页、找回密码页的密码框同步受益，不得回归。
7. **中文界面 Today 页头日期显示"星期周五"**（D-07）。原因：中文模板 `student.dashboardTodayPresentation.copy004` 是 "{0} · 星期{1}"，传入的星期已是"周五"。要求：中文下显示为"10月2日 · 周五"这样的形式（改模板或改传入值，取对其他调用方影响最小的一种）；英文不变。
8. **开关控件是系统默认的青绿色**（D-27）。位置：训练提醒页的开关、拍摄预览页的 Save to Photos 开关，以及全仓其他用到 `Switch` 的地方。要求：统一用 `src/design` 的品牌色 token（开启态轨道与滑块对齐 iOS 的开关观感：金色系，不出现青绿色），Light / Dark 都可辨。
9. **教练邀请码页的 "Time Limited Code" 按钮文字被截成 "Time Limited ..."**（D-30）。位置：教练 Profile → My Invite Codes 的 Single-use / Time-limited 两个按钮。要求：两行内完整显示，不出现省略号；360dp 宽与 1.3 倍字体下也完整。

## 约束

- 颜色、字号、间距只用 `src/design` 现有 token；不加依赖；文案优先用现有翻译键，确需新增时中英文目录同步并过 i18n 守卫。
- 不改导航结构、数据与请求；不动本卡未列出的界面。
- 守仓内 eslint 与 TypeScript 配置。

## 测试 seam

界面层小改，按现有约定不写镜像样式的测试。只在有行为的地方加或改测试：
- 第 2 项：训练页点击摄像机按钮触发与原 Record this set 相同的回调（复用现有训练页测试）。
- 第 3 项：拍摄页的关闭入口与系统返回仍调用关闭逻辑（复用 `camera-review.test.tsx` 的挂载方式）。
- 第 7 项：中文日期格式的纯函数或模板输出。
其余项由 Opus 实屏验收。

## 验收清单（Opus 收货，模拟器 Light / Dark + 360×640 dp @1.3×）

- [ ] 1：金色竖条从卡片顶到底，含 Coach note 与按钮区。
- [ ] 2：Log this set 与摄像机按钮同一行；点摄像机进入拍摄；点 Log 进入组录入。
- [ ] 3：拍摄页全屏黑底、不见 tab 栏；关闭入口位置与 iOS 一致；系统返回可关闭；录制 → 预览 → Use 流程照常。
- [ ] 4：杠铃片说明不超过两行，与 Add collars 互不挤压。
- [ ] 5：Change / Delete 文字完整。
- [ ] 6：三个认证页的密码占位提示单行、正文字体；输入后的密码样式不变。
- [ ] 7：中文下日期为"10月2日 · 周五"形式；英文不变。
- [ ] 8：全仓开关无青绿色，两种主题下开 / 关状态可辨。
- [ ] 9：邀请码两个按钮文字完整。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。

## Out of Scope

视频行的新设计（原地播放）、Ask coach 选组、聊天卡片、休息说明弹层、周条翻周与 Plan summary（均等设计稿定稿后另卡）；W#D# 序号口径等双端 spec 084 的内容；视频剪辑；休息计时常驻通知；注册页顶部的系统标题栏（已核对 iOS 同样有 "Create account" 导航标题，不是缺陷）。

## 返修第 1 轮（Opus 模拟器验收，2026-10-02）

九项里 2、4、5、6、8、9 实屏通过（Light / Dark，默认尺寸与 360×640 dp @1.3×），7 由单测覆盖。以下三处返修，其余不要动。

1. **第 1 项未修好：金色竖条仍只画到 "Last time…" 一行。** 实测（1080×2400 模拟器）：当前组卡片高 950px，竖条的原生 `SvgView` 边界是 `0,0-8,948`（高度是对的），但屏幕上金色像素只到卡片顶起 756px 处，Light / Dark 相同。结论：容器高度没问题，是 `GradientFill` 里用 `width="100%" height="100%"` 的 Svg 在首次布局（按钮行出现前）画过一次后，容器变高时**没有重绘**。所以 `onLayout` 量卡片高度这条路不解决问题，原来的 `top: 0, bottom: 0` 本身也没错。要求：让这条竖条在卡片高度变化后重绘到满高（例如按实测像素尺寸给 Svg / Rect 传数值并在尺寸变化时重建，或这条竖条改用不依赖 Svg 重绘的画法；保持现有三段金色渐变观感）。若在 `GradientFill` 内统一修，确认不改变其他调用点的外观。去掉不再需要的 `heroHeight` 状态。验收：竖条像素范围 = 卡片顶到底（含按钮行），按钮行晚于首帧出现时也成立。
2. **第 3 项预览态在浅色主题下按钮看不清。** 拍摄页恒为黑底，但 Retry / Use 跟随应用主题：Light 下 Use 是深蓝底压在黑底上，几乎看不出按钮形状。iOS（`CameraRecorderComponents.swift` 的 `RecorderReviewView`）在黑底上固定用：Use = 黄色底黑字，其余按钮与文字白色。要求：拍摄页（取景与预览两态）的控件颜色固定按深色方案取 token，不随应用主题变化；Dark 下现状（Use 金底深字、Retry 深底浅字）即目标观感。
3. **邀请码页同屏的 Regenerate 在 360dp @1.3× 下折成 "Regenerat / e"。** 与第 9 项同类：Copy / Regenerate 两个按钮文字不得在词中间断开；放不下时按钮整体换行（与你给 Single Use / Time Limited 做的处理一致）。

返修后同样跑全量 jest、tsc、lint，JOURNAL 本卡一节追加返修记录。仍不 commit、不 push。
