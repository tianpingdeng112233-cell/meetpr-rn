# W3 acceptance completion

Read existing CONTEXT.md if present, AGENTS.md, SPEC.md and PARITY.md.

David authorized completion of remaining W3 work on 2026-09-23. Fixed starting
point: RN 7c0597c; iOS beta/1.0-22@0748931. Preserve the existing Global product,
navigation and visual design. W4 native-device/distribution work remains separate.

## Delivery units

1. RN: finish role/state acceptance, compare pinned iOS screens, test cross-date
   quick log/partial retries, multipart interruption/resume and chat reconnect;
   record and repair concrete findings, then repeat affected checks.
2. P-31 backend/client contract: add optional last_message.preview_kind with
   text/image/training_plan/training_share semantics from stored kind/set_ref.
   Localize only explicit system kinds; preserve ordinary text and legacy
   responses. Canonical message body, visibility and push semantics stay intact.

## Public test seams

Use existing screen interactions/repository contracts for RN, upload transport
and persistence adapters for network interruption, realtime transport for socket
reconnect, and authenticated conversation HTTP responses plus inbox view-model
for preview semantics. These extend the seams in SPEC.md and the existing P-31
acceptance card; test behavior red → green before each implementation slice.

## Evidence and completion

Separate synthetic local fixtures from Global dedicated-account evidence.
Retain screenshots plus UI hierarchy for screen checks. Record each required
state as passed/failed/blocked; never count a unit test as a device observation.
New Global writes are limited to the previously authorized dedicated QA pair.
Existing completed QA logs must not be submitted again. Production backend
migration/deployment requires a reviewed concrete rollout and David's approval.

Acceptance requires no unresolved W3 defect, complete declared coverage,
regression/type/lint/build gates and independent Standards/Spec review.
If production access/deployment prevents a remaining item, document the exact
blocking step and deliver all independently completable work first.

## Out of scope

RN iOS replacement, CN rollout, new product behavior, credential provisioning,
Google/FCM production setup, physical-device certification, signing/distribution,
unrelated migrations, changing other users or their production plans.

## Observed repair cards

- W3-V02: pinned iOS rest/reminder settings use an inline title, grouped rows,
  compact mode/weekday choices, and expandable editors. RN instead shows a large
  Cancel header, ungrouped content and a stale custom-mode label; custom mode
  also hides the automatic-rules reference. Match the existing iOS content and
  hierarchy using Android Back and the existing modal navigation contract.
  Preserve preference storage, timing rules and permission/scheduling behavior.
  Screen tests cover custom selection/persistence, always-visible reference
  rules, editor expansion and Back; screenshots cover both themes/small text.
- W3-G05: first Record entry invokes consent before its native Modal is shown,
  leaving the prompt behind the sheet. Wait for Modal onShow before automatic
  camera entry. Public seam: SetEntrySheet lifecycle → visible consent prompt;
  retain once-per-entry behavior and verify decline, re-entry and denied camera.
