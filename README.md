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

当前处于 W3 集成验收，build 22 增量已实现并有定向模拟器证据；完整走查与 W4 真机、签名、分发仍待完成。测试、截图、复现步骤及发布门禁见 [build 22 验收记录](docs/verification-build22-2026-09-21.md)。
