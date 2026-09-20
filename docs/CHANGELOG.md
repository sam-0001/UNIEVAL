# Changelog

## [Unreleased]
### Added
- `docs/` folder containing `PROJECT_AUDIT.md`, `PROJECT_CONTEXT.md`, and this `CHANGELOG.md`.

### Fixed
- **Build**: Fixed missing `@daily-co/daily-js` dependency which blocked Vite builds.
- **Tests**: Fixed `liveClass.test.ts` auth middleware mocks to correctly set `req.currentUser`.
- **Tests**: Fixed `ai.service.test.ts` mock responses to route correctly based on URL (Groq vs Google).
- **Tests**: Fixed `cache.test.ts` TTL assertions to accommodate random jitter.
- **Security**: Fixed replay attack vulnerability in `/api/credits/verify-payment` by validating `cashfreeOrderId` against the `Purchase` collection.
- **Backend**: Fixed `createCreditOrder` returning an undefined `keyId` and mismapped order IDs from Cashfree.
- **Scheduler**: Fixed a critical bug in `scheduler.service.ts` where a renewed purchase could be revoked if the user had an older expired purchase record.
- **UI**: Replaced incorrect `object-cover` with `object-contain` for course thumbnails in `Profile.tsx` and `AdminDashboard.tsx`.
