# 安卓端 App 图标

同一个标记「片里的折线」，与 iOS 端共用一套几何。**图形真源与完整 SPEC 在 iOS 仓**:
`~/Projects/apps/MeetPR-release/docs/brand/README.md`。改图标先改那边，再照下面重出这边的 PNG。

## 这个目录

| 文件 | 出什么 |
|---|---|
| `app-icon.svg` | 与 iOS 完全同构的 1024 主图（`assets/images/icon.png` 的源） |
| `android-icon-foreground.svg` | 自适应前景：透明底，圆盘 + 盘内形状按 **.8** 收一档让开自适应遮罩 |
| `android-icon-monochrome.svg` | 主题图标层：同样 .8，圆盘实心 + 盘内挖空，系统自己上主题色 |

对应的 `assets/images/*.png` 都是从这三个 SVG 出的，不手改。
背景是纯色，没有 SVG——`android-icon-background.png` 是一张 432 的 `#F5F6F8`，
和 `app.json` 里 `android.adaptiveIcon.backgroundColor` 保持一致。

`android/app/src/main/res/mipmap-*/` 里的 webp 由 `expo prebuild` 从上面这些 PNG 生成，
**且 `android/` 已进 .gitignore**，所以换图标只需要改 `assets/images/`，下次 prebuild 自动带上。

## 重出 PNG

SVG 用了 `textPath` + 内嵌可变字体，只有浏览器引擎渲得准。在本目录下跑：

```bash
for pair in "android-icon-foreground 432" "android-icon-monochrome 432" "app-icon 1024"; do
  set -- $pair
  printf '<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}img{display:block;width:%spx;height:%spx}</style></head><body><img src="%s.svg"></body></html>' "$2" "$2" "$1" > /tmp/r.html
  cp "$1.svg" /tmp/
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
    --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
    --window-size="$2","$2" --screenshot="/tmp/$1.png" /tmp/r.html
done
magick /tmp/android-icon-foreground.png -strip ../../assets/images/android-icon-foreground.png
magick /tmp/android-icon-monochrome.png -strip ../../assets/images/android-icon-monochrome.png
magick /tmp/app-icon.png -background '#F5F6F8' -alpha remove -alpha off -colorspace sRGB \
  -strip -define png:color-type=2 ../../assets/images/icon.png
```

`icon.png` 必须 **无 alpha**（`magick identify -format '%[channels]'` 要是 `srgb 3.0`）；
前景与 monochrome 必须**带** alpha，遮罩才有东西可挖。

## 还没做

- **启动页**：`assets/images/splash-icon.png` 现在是个 1×1 占位，`app.json` 里 splash 底色为
  `#F5F6F8`。定稿附带的图标动效（圆盘淡入 → 折线画出 → 圆点弹入 → 上弧扫出）也没实装。
  两件都不在这波里。
