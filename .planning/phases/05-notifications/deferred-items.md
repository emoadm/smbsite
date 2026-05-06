# Plan 05-13 — deferred items (pre-existing, out of scope)

## tests/unit/payload-newsletters.test.ts UploadFeature mismatch (pre-existing)

- File: `tests/unit/payload-newsletters.test.ts:68`
- Issue: test asserts `UploadFeature(` is present in `src/collections/Newsletters.ts`, but the source has a comment at line 98-99 explicitly noting `UploadFeature was originally listed but removed: payload.config.ts has no upload-target collection`.
- Status on entry to Plan 05-13: failing (1 of 324 unit tests).
- Caused by: NOT this plan. The Newsletters.ts source was edited in a prior plan to remove `UploadFeature()`, but the source-grep test was not updated.
- Decision: out of scope per execute-plan deviation Rule "scope boundary". Logged here, NOT fixed by 05-13.
