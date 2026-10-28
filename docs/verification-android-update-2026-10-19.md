# 安卓 CN 版本更新提醒收货记录（2026-10-19）

结论：**收货通过。** PR #99（`2e95f3a`）已合 main，正式签名的 CN 0.1.0 (2) 已挂上线。唯一没验到的是真的从 2 升到 3：线上现在就是 2，要等下一个包才能在真机上看到更新弹窗。

范围：David 口头拍板（无 spec 编号），启动时检查版本 → 弹窗显示更新说明 → 点「下载更新」用浏览器下载 APK，由用户自己确认安装。不做强制更新、热更新、App 内安装器，也不改 Global 和 iOS。Codex 原始记录在 `docs/CODEX-JOURNAL.md` 2026-10-19 条与仓外 `~/Projects/scratch/android-update-20261019/`。

## Opus 收货实测（2026-10-19）

| 项目 | 结果 |
| --- | --- |
| 全量 diff 审读 | 13 个文件 +423/−11。Standards：无阻断项，文案走 i18n，失败一律静默放行不挡启动。Spec：拍板的几项都做了，没有多做 |
| 本地 `2e95f3a` 干净树 `npm ci` + `tsc --noEmit` + 全量 Jest | typecheck 通过；183 suites / 1756 tests 全绿 |
| `https://dl.meetpr.cn/android/latest.json` | 200，`application/json`，`Cache-Control: no-cache`，versionCode 2，下载地址指向 `releases/2` |
| 固定地址 `android/meetpr-cn.apk` 与归档 `android/releases/2/meetpr-cn.apk` | 两个都 200，SHA-256 都是 `b1f0624a…040859a4`，固定地址带 `no-cache` |
| 线上 APK 解包 | `com.meetpr.app`，versionCode 2，versionName 0.1.0；签名证书 SHA-256 `bef954dc…508b746`，和上一版公开包一样，可以覆盖安装 |

## 证据分层

- **工具实测（Opus 亲跑）**：上表各项。
- **工具实测（Codex 跑，Opus 审读过原始产物）**：模拟器上的 QA 包（debug 签名，不分发）用本地假数据验证了弹窗：显示更新说明、「稍后再说」和「下载更新」两个按钮，取消后切后台再回来不会重复弹，冷启动会再弹，点下载会在 Chrome 打开 `releases/3` 地址。只验到「能拉起浏览器打开地址」，**没验到下载和安装**。截图是 `update-dialog.png` / `update-cancel.xml` / `update-current.xml`。
- **David 人工确认（口头，无截图）**：真机覆盖安装 0.1.0 (2) 后能正常打开、登录，原账号数据还在。
- **未验**：线上真的从 2 升到 3（弹窗 → 下载 → 系统安装器覆盖）。下一个 CN 包上线时补。

## 下次发包必做

1. `plugins/build-track.js` 里 `CN_ANDROID_VERSION_CODE` +1，签名和包名都不能换。
2. `node scripts/prepare-android-update.cjs <新包> <上一版公开包> <更新说明> <输出目录>`。脚本会拒绝 debug 签名、换了签名、包名不对、版本号没涨的包。
3. 上传顺序：先传 `android/releases/<N>/meetpr-cn.apk`（已有的不覆盖）→ 下载回来核对 SHA → 替换固定地址 `android/meetpr-cn.apk` → **最后**才发 `android/latest.json`。两个会变的文件都要设 `Cache-Control: no-cache`（这次在控制台上传后漏设，事后补的）。
4. 用一台装着旧版的真机走一遍「弹窗 → 下载 → 覆盖安装 → 数据还在」，补上本文的未验项。

## 发版台账

| 包 | 日期 | 地址 | 证据 |
| --- | --- | --- | --- |
| CN 0.1.0 (1) | 2026-10-17 前 | 固定地址（已被 (2) 替换，原包留在仓外 `previous-public.apk`） | 证书 `bef954dc…`，spec 093 落地页指向它 |
| CN 0.1.0 (2) | 2026-10-19 | 固定地址 + `releases/2` | 本文 |
