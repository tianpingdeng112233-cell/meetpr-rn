# Spec093 R-verify 原始证据（2026-10-17）

这些是 Android AVD + 本机合成 API 的开发自测证据，不代表真实 staging 持久化、真机或产品终验通过。

## 环境与来源

- 起点 `3697ca5`，来自 `origin/claude/blissful-curie-wk8cxa`，工作分支 `verify/093-android-invites`。
- AVD `meetpr` / `emulator-5554`，1080×2400，中文系统，SwiftShader；新建 Android 用户 `Spec093Verify`（id 10）隔离，未清理原 user 0 的账号或数据。
- China `com.meetpr.app` / Metro 8093；Global `com.meetpr.global` / Metro 8094。两轨均 CNG prebuild + debug 原生构建成功；未发包。
- 本机 `fixture-server.cjs` 仅监听 127.0.0.1:3093，通过既有 `EXPO_PUBLIC_API_BASE_URL` 接入。仅合成教练/学员、邀请码，登录请求也只到本机。日志只记 method/path，不记请求体或凭证。没有调用真实 staging API。
- 页面里的 `127.0.0.1:3093/i/ABCD234567` 是该 seam 生成的演示链接；不证明生产落地页部署或下载链路。

## 截图索引

| 文件 | 观察 |
| --- | --- |
| china-bind-empty.png | China 绑定页有粘贴邀请码按钮 |
| china-bind-paste-message.png | 按钮读取整段邀请消息，提取并分组显示码 |
| china-bind-paste-unrelated.png | 无关剪贴板显示错误，未误填为邀请码 |
| china-bind-longpress-menu.png | 系统长按菜单出现「粘贴」 |
| china-bind-longpress-result.png | 修复前：原生粘贴后码正确，但输入框膨胀且旧错误仍在 |
| china-bind-native-paste-fixed.png | 修复后：原生 Ctrl+V 回归，单行高度且有效码清旧错误 |
| china-bind-longpress-fixed.png | 修复后：再用长按菜单「粘贴」，码显示正常、输入框单行 |
| china-coach-profile.png | China 教练我的邀请码卡 |
| china-coach-profile-copied-message.png | 我的复制结果实际粘到 Chrome：完整消息、链接、分组码、合成教练名 |
| china-coach-invites.png | China 永久邀请码卡有复制/分享 |
| china-coach-invites-copied-message.png | 邀请码页复制结果实际粘到 Chrome：完整消息 |
| china-coach-share-sheet.png | 点击分享打开 Android 系统分享面板；未选收件人、未发出 |
| global-bind-no-paste.png | Global 绑定页无粘贴按钮 |
| global-coach-profile.png | Global 教练我的邀请码卡 |
| global-coach-profile-clipboard.png | 我的复制结果实际为纯 `ABCD234567` |
| global-coach-invites.png | Global 邀请码页无 China 分享入口 |
| global-coach-invites-clipboard.png | 邀请码页复制结果实际为纯 `ABCD234567` |

最终截图前仅点关闭开发警告浮条；未通过改代码屏蔽警告。警告源是原有 `onboarding/model.ts -> meet.ts -> model.ts` require cycle。Chrome 的「未连接到互联网」不影响通过 adb reverse 连接本机 fixture。

## 原生高度回归复现

1. 使用隔离用户；启动 fixture：`node docs/evidence/spec093-2026-10-17/fixture-server.cjs`。`adb reverse tcp:3093 tcp:3093`。
2. China Metro 用 `EXPO_NO_DOTENV=1 EXPO_PUBLIC_BUILD_TRACK=china EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3093 npx expo start --port 8093`；adb reverse 8093；把 debug host 指到 127.0.0.1:8093。
3. 仅本机 fixture 登录 `student@example.com`，密码任意合成值，进入绑定页。Chrome 打开 `http://127.0.0.1:3093/clipboard`，点击复制整段邀请消息，再返回 App，保持邀请码为空。
4. `python3 docs/evidence/spec093-2026-10-17/native-paste-height.py`。脚本用原生 Ctrl+V，关闭键盘，再取真实 EditText bounds，断言归一化值正确且高度没有膨胀。长按菜单另有截图。
5. 原始代码：164→529 px，失败。仅邀请码 TextField 加 `numberOfLines={1}`：164→160 px，通过。首次断言要求完全相等；空 placeholder 与实际字形有 4 px 差异，改为不得膨胀且不低于原高度 80%，旧 529 px 仍会失败。红日志保留原始失败断言，未改写。

## 测试日志与边界

- `banner-red.txt`：先加两条回归（直接输入/原生粘贴有效码清错误），2 failed / 9 passed；`banner-green.txt`：11 passed。
- `native-height-red.txt` / `native-height-green.txt`：真实原生测量，164→529 / 164→160。
- `jest-final.txt`：全量 180 suites / 1718 tests 通过（类型注解收窄前；收窄不改运行时代码，之后另外复跑该组件 11 tests）。
- `tsc-before-type-narrowing.txt`：Expo native prebuild 生成 `expo-env.d.ts` 引入 expo/types 后，暴露 AccessoryLogCard 的 3 处 TS2769；column 原返回整个 ViewStyle，把 Expo 扩展的 userSelect:string 带入 TextStyle。返回类型收窄为实际的 flex/minWidth 后，全量 tsc、expo lint 均 exit 0，组件 11 测试通过（`checks-after-type-narrowing.txt`）。初始 npm 安装期间的空 tsc 日志不能作为完整依赖基线证据。
- 未验证：真实 API 登录/绑定持久化、真实教练名、App 安装下载/生产链接、外部分享发送、物理安卓机、iOS。未点击绑定提交或邀请码重新生成；未造远端账号、未执行数据库写入。最终验收状态留主代理和 Opus。
