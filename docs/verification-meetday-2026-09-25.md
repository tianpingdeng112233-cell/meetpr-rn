# Dashboard meet placeholder · 2026-09-25

Source base: `d401ede`. David reported the missing meet date card on Today. Fixed reference: iOS build 22 `0748931`, DashboardTodayScreen and DashboardProfileMetricsView.

## Correction

RN already rendered a future/current competition countdown when the profile contained an enabled competition date, but omitted the entire card otherwise. Today now retains the iOS “Meet in / Not scheduled / + Add a meet” placeholder. The adjacent empty weight card shows “Not entered / Add in Profile” with matching spacing, type, colors and accessibility labels. Existing countdown and populated weight rendering remain unchanged.

The reference placeholders are static views; this change does not introduce navigation or a standalone MeetDay workflow. Editing remains in Profile. No server data or training state was changed.

## Verification

- Regression failed before the change because “Meet in” was absent and passed afterward. All 131 suites / 910 tests passed; TypeScript and targeted ESLint passed.
- Forced Global JS bundle and arm64 Release build succeeded. Installed on AVD `meetpr` (1080×2400, density 420, font scale 1). Inspected both [Light](evidence/meetday-20260925/light.png) and [Dark](evidence/meetday-20260925/dark.png): the two equal-width cards are visible with no clipping. Returned to Today in Light, with existing W1D7 completed / 4 of 4 state preserved.
- Independent Standards: CLEAN. Independent Spec: CLEAN. One review round; both reviewers independently passed the three relevant tests.
- APK SHA-256: `0562842d2b2a71fef9614ac2fa3856372f7f2f349fa19cfd8d43a92788df3768`. Local build/verification does not imply cloud CI or production release.

## Requested copy update

David subsequently requested “Meet in” → “Meetday”. Updated the shared English title for both populated and empty cards, and its existing assertion. Three related tests and a fresh Global Release build passed; installed and visually verified [updated Today](evidence/meetday-20260925/renamed.png). Updated APK SHA-256: `e902c1eddc5e3d9de2ab4a612134572c1c1918290a87da7c16b9d41ec0b47878`.
