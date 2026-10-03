# Android build 22 parity acceptance

Read existing CONTEXT.md if present, AGENTS.md, PLAN.md and PARITY.md before implementation.

## Authority and baseline

David authorized integration acceptance, visual alignment and continued Android development to match build 22 on 2026-09-21. RN base is local integration/w3 `6429d50687e6942f6fac768b2a2b582bfa3a4a3a`; iOS reference is beta/1.0-22 `0748931563fefea14e7f50a7c9ee7330b5501bea`. iOS specs 080–083 and their shipped code define existing approved behavior. Preserve RN Android conventions and Global track.

## Delivery units

1. Training: honor coach-shifted dates; port quick-log cursor, actual-date summary submission and retry semantics; align completion press, numeric/RPE input and toast feedback with specs 080–082. Include the training history navigation affordance and spec 080 notification receive/tap consumption with account guards. FCM provisioning remains outside this unit.
2. History and growth: source chart selection from durable e1RM points, show actual daily eligible nodes and truthful calculation/source details; provide stack history navigation while preserving training state. Repair integration/type failures encountered along these paths.

Spec 082 applies across app buttons: migrate existing Pressable call sites to the shared feedback seam without changing navigation or feature behavior. Notification parsing/transport, Query invalidation and session lifecycle are tested through injected adapters.

Each unit has one writer in its own worktree. Reviewers are read-only.

## Public test seams

Use existing domain progression interfaces, training screen/view-model interactions and Repository contracts for submission/retry, plus history view-model and chart/detail user interaction. Use the existing e1RM calculator; do not duplicate formulas. Test behavior before implementation, one red/green slice at a time.

## Acceptance

- Coach-shifted recommendations match the shipped iOS date ordering; actual recorded date survives refetch.
- Quick-log starts on the cursor day before active training, supports all-set confirmation and explicit date, and retains failed work for retry without duplicate successful submissions.
- Training history is a stack destination; returning preserves selected day, draft and rest timer.
- Growth headline retains the existing rolling maximum. Chart nodes represent actual eligible daily source points, including equal values on different dates; low-confidence points retain existing eligibility.
- Selecting a node shows persisted value, date, actual weight/reps and available RPE source. Missing source logs/plans and irreproducible values are explicit; never guess provenance.
- Existing data without new optional metadata remains readable. No destructive migration.
- Typecheck, relevant behavior tests, full regression, lint and Android build pass. Android ADB screenshots and interaction evidence are recorded against the pinned iOS reference. Fixture/demo evidence is separately labeled from live backend persistence.
- Standards and Spec receive independent review; material issues fixed before PR delivery.

## Out of scope

New product behavior, new navigation tabs, changed e1RM/PR eligibility or formulas, evaluation unfreezing, XLSX import, video badge export, production data changes, Google credentials/provisioning, FCM delivery, store release and iOS Archive/ASC upload. Existing native-device/distribution blockers must remain visible in the report.
