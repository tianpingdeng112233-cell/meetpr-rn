# meetpr-rn

MeetPR 安卓端(React Native / Expo SDK 57,Android-only)。目标:1:1 复刻 iOS 端 `beta/1.0-22@0748931` 的 Global 轨,详见 [PLAN.md](./PLAN.md)(施工蓝图)与 [PARITY.md](./PARITY.md)(逐屏复刻台账)。协作纪律见 [AGENTS.md](./AGENTS.md)。

## 开发

```bash
npm ci
npm run android   # 需要本机 Android SDK 与模拟器/真机
npm run lint
npx tsc --noEmit
npm test
```

后端默认指向 Global `https://api.meetpr.app`(可用 `EXPO_PUBLIC_API_BASE_URL` 覆盖)。CI 在 ubuntu runner 上跑 lint/tsc/jest/assembleDebug。

App icon 与 adaptive icon 已有品牌资产；启动屏图片仍为 1×1 占位。

W3 可独立完成的六流程验收、弱网恢复和固定 iOS 结构对照已完成，结果及证据统一见 [9/23 验收矩阵](docs/verification-w3-2026-09-23.md)。W3 尚待 Global 后端候选上线后验证 P-31 预览与教练改期；生产迁移/部署未经授权。W4 的 Google/FCM、真机、签名、启动屏和分发仍未完成。历史增量与范围见 [build 22 记录](docs/verification-build22-2026-09-21.md)。
