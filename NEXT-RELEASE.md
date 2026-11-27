# 下个安卓 CN 包 — 进行中

> 本文件在 `main` 上，记录下一个安卓 CN 正式包（`com.meetpr.app`，dl.meetpr.cn）的候选内容与进度。
> 出包流程走 `/android-cn-release`；签名密码与 OSS 上传永远 David 手动。
> 已发布包的逐包证据在 `docs/journal/<日期>-release-cn<N>.md`，逐屏状态在 `PARITY.md`。

## 🎯 目标：CN 0.1.0 (15)
- 基底：已发布 CN 0.1.0(14)，签名来源 `main@022a27a`，2026-11-13 David 手动发布，公网 latest.json=14 已核（见 `docs/journal/2026-11-13-release-cn14.md`）。
- 当前 CN versionCode 仍为 14；15 是下一班目标，尚未升号。

## 本版将包含

- **完成日视频状态与回看（spec 096 / 107，T1 / P1）**：学员长按「完成今日训练」后，录过视频的组仍显示上传中黄 / 已送达绿 / 失败红，绿色可点开只读回看（教练已点评可跳反馈）；带视频的动作块各组行对齐。对齐 iOS meetpr#461。已合入 [#194](https://github.com/tianpingdeng112233-cell/meetpr-rn/pull/194)（`9c2ef0b`）。⚠️ 只在模拟器演示包上验过：切包后用真实账号录一组、完成、回看，核对真机播放画面。

## 在途（未合入，不算本班）

- 相册选视频单次导出（`fix/album-single-pass-export`）：另一会话在做，合入后再登记到上面。

## 📋 挂账（每次切包前复核）
- [ ] CN14 带的视频处理失败诊断（#188）真实后台入库仍待授权账号验收。

## 收尾约定
CN 包发布并完成线上核对后：把「本版将包含」写进该包的 `docs/journal/<日期>-release-cn<N>.md`，清空本节、目标号 +1、基底改成刚发布的包。新合入 main 的用户可见改动，合并当天在「本版将包含」登记一行（人话 + PR + 合并 SHA + 未验项）。
