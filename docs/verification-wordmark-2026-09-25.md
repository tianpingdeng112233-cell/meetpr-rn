# Header wordmark spacing · 2026-09-25

David supplied an Android crop and an iOS Training screenshot and requested a less compact wordmark. This T0 visual adjustment removes negative SVG tracking and the extra overlap before R, preserving the 16pt glyph size, 97×24 header slot, outline and theme colors. Progress and Profile now reuse the same component already used by Today and Training.

Verified on AVD `meetpr`, 1080×2400, density 420, font scale 1, with the Global Release APK. Visually inspected all four Light headers, plus Today and Profile in Dark: glyphs are wider, unclipped and consistently spaced. Restored Light and Today for the user. Account and training data were preserved.

Evidence: [Today Light](evidence/wordmark-20260925/light-today.png), [Training Light](evidence/wordmark-20260925/light-training.png), [Progress Light](evidence/wordmark-20260925/light-progress.png), [Profile Light](evidence/wordmark-20260925/light-profile.png), [Today Dark](evidence/wordmark-20260925/dark-today.png), [Profile Dark](evidence/wordmark-20260925/dark-profile.png).

Validation: TypeScript and ESLint passed; Jest 131 suites / 908 tests passed; forced Global JS bundle generation and Android arm64 Release build passed; APK installed and launched successfully. APK SHA-256: `ef2123ce6a3cc962ea55c5f9212369fe6dbc8d164db56b804638b78e686acaa1`.

Scope excludes authentication/video-overlay branding and iOS source. This evidence covers the local simulator build; cloud CI and the pending W3 merge/deployment gates remain separate.
