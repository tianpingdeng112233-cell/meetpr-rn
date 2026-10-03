# 走查安卓小修九项 · 收货记录 · 2026-10-02

卡：[WALKTHROUGH-SMALL-FIXES-CARD](../specs/build22-parity/WALKTHROUGH-SMALL-FIXES-CARD.md)。RN 基线 `7574476`（PR #67 顶）。实装方 Codex，收货方 Opus。

环境：AVD `meetpr`（Android 15，1080×2400）+ 本地合成 API 与合成账号，debug 签名 fixture 包；另在 360×640 dp、字体 1.3× 下复看。Light / Dark 都看过。未做真机验证，未在 Global 真账号上验证。

## 逐项结论

| # | 走查编号 | 结论 | 证据 |
|---|---|---|---|
| 1 | D-10 金色竖条 | 通过（返修 1 轮）。竖条像素范围从卡片顶到底，含按钮行 | [截图](evidence/walkthrough-smallfix-20261002/training-card-accent-and-camera-button.png) |
| 2 | D-11 Log 与摄像机同一行 | 通过。点摄像机进入拍摄，点 Log 进入组录入 | 同上 |
| 3 | D-13 拍摄页全屏 | 通过（返修 1 轮）。取景与预览两态全屏黑底、不见 tab 栏；角上关闭按钮与系统返回都能关闭；录制 → 预览 → Use 回到组录入页并带上视频 | [录制中](evidence/walkthrough-smallfix-20261002/camera-fullscreen-recording.png)、[浅色主题下的预览](evidence/walkthrough-smallfix-20261002/camera-review-light-theme.png) |
| 4 | D-15 杠铃片说明 | 通过。说明独占一行，最长文案在两种屏宽下都是两行，Add collars 另起一行右对齐 | [截图](evidence/walkthrough-smallfix-20261002/set-sheet-plates-and-collars.png) |
| 5 | D-21 Change / Delete | 通过。文字完整；失败态下 Retry 与 Delete 各占一行 | [小屏大字](evidence/walkthrough-smallfix-20261002/video-row-360dp-1.3x.png) |
| 6 | D-02 密码占位提示 | 通过。注册页单行、正文字体；登录页无占位、未回归 | [截图](evidence/walkthrough-smallfix-20261002/register-password-placeholder.png) |
| 7 | D-07 中文日期 | 单测覆盖（"10月2日 · 周五"），未在中文界面实屏看 | `src/i18n/__tests__/t.test.ts` |
| 8 | D-27 开关颜色 | 通过。全仓三处开关都走 `BrandSwitch`，开启为金色，两种主题下开关状态可辨 | [Light](evidence/walkthrough-smallfix-20261002/switch-light-on.png)、[Dark 开 / 关](evidence/walkthrough-smallfix-20261002/switch-dark-on-off.png) |
| 9 | D-30 邀请码按钮 | 通过（返修 1 轮补了同屏的 Copy / Regenerate）。四个按钮文字完整，小屏大字下整键换行 | [截图](evidence/walkthrough-smallfix-20261002/invite-codes-360dp-1.3x.png) |

## 返修第 1 轮

- 第 1 项首轮没修好。实测竖条的原生视图高度正确（`0,0-8,948`，卡片高 950 px），但金色只画到 756 px：`GradientFill` 里按百分比尺寸的 Svg 在按钮行出现、容器变高后没有重绘。改为按实测尺寸给数值并在尺寸变化时重建，复测竖条到 1682 px（卡片底 1686 px）。
- 第 3 项首轮在浅色主题下，预览页的 Use 是深蓝底压在黑底上。拍摄页改为固定按深色方案取色，与 iOS 在黑底上固定用黄底黑字一致。
- 同屏的 Regenerate 在 360 dp、1.3× 字体下词中折行，补齐为整键换行。

## 没做的

- 找回密码页没有单独打开看（它没有密码框）。
- 上传在本地合成 API 上必然失败，视频行只看到 Sending 与失败态。
- 组录入页 RPE 刻度下的数字在 1.3× 字体下被裁掉下半截，默认字号正常；不在本卡范围，记入走查问题清单待后续卡处理。

## 自动检查

收货方复跑：`npx jest --runInBand` 137 suites / 995 tests、`npx tsc --noEmit`、`npm run lint` 通过。
