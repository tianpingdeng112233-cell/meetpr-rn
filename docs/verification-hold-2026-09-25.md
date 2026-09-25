# Hold completion repair · 2026-09-25

User report: continuing to hold “Complete today’s workout” produces no response. Source base: `7716eb5`; T1 scope: the shared hold button and its interaction tests.

## Diagnosis and correction

- Stationary ADB hold, short tap followed by a hold, and a macOS mouse hold completed successfully against the dedicated Global QA day. Moving 30 device pixels (about 11dp) inside the button reproduced failure twice; the stationary control using identical DOWN/MOVE/UP injection passed.
- Temporary event instrumentation confirmed an in-bounds move at (189.7, 40.9), button bounds 379.4×57.9, immediately followed by native touch cancellation after approximately 0.12 seconds. Disabling JS responder termination alone passed a shallow check but still failed on Android. The final button owns the native responder through grant=true, rejects scroll transfer, and handles release/termination directly. Early release and leaving the button still cancel until a new gesture.
- A separate feedback probe captured zero interior gold pixels after a 0.5-second hold. The percentage-sized SVG inside the animated-width view did not paint. Measured pixel bounds now drive the clipped progress width and fixed SVG viewport; the same probe captured 34,907 gold pixels. The 1.1-second duration and theme colors are unchanged. See [before](evidence/hold-20260925/before-no-fill.png) and [after](evidence/hold-20260925/after-progress.png).

## Verification

- The responder regression failed before the fix (completion count 0; native interception not blocked) and passes after the fix. Existing early-release, leave/re-enter and unmount tests remain passing.
- Final Global arm64 Release APK installed on AVD `meetpr`, 1080×2400 / density 420 / font scale 1. Real native-event probes verified early release does not complete, leaving then re-entering does not rearm, and a subsequent in-bounds moving hold completes. [Completion screen](evidence/hold-20260925/after-completed.png).
- Used only the existing authorized synthetic QA account/day. Each test completion was undone through the app. Final D7 is pending, weekly progress 3/4, all logs preserved; [restored button](evidence/hold-20260925/restored.png).
- Standards and Spec received independent read-only review; both CLEAN after fixing one test-selector error and reviewing the fill delta. Device evidence belongs to the main agent; reviewers independently ran component/entry tests.
- TypeScript and targeted ESLint passed. Full regression: 131 suites / 909 tests passed. Android forced Global bundle and Release build passed. Temporary debug instrumentation removed. Cloud CI is separate. APK SHA-256: `ac2758636f1aa901d8e3e1a4335d705b27407c72a0a3873133cc4952fee581f5`.

## Remaining observation

The existing completion summary can show “0/1 set” alongside “All completed” for this attachment-only/unlogged QA day. This separate copy/count inconsistency is recorded here and is not fixed by the gesture change. This repair does not authorize pending W3 merges, production deployment or new completion rules.
