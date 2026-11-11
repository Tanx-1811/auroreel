# Contributing to Reelskin

Thanks for helping! Bug reports, site fixes, new themes and translations are all welcome.

## Getting started

```bash
npm install
npx playwright install chromium   # once, for the end-to-end tests
npm run dev                       # rebuilds dist/ on change; load it unpacked in chrome://extensions
```

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first — especially the recolouring engine (§2) before touching
`src/core/remap.ts`, `src/content/engine.ts` or a site adapter.

## Before you open a pull request

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e
```

- **Strings** go in `src/i18n/en.ts` and `src/i18n/vi.ts` (the Vietnamese file is typed: it must define every key).
- **Pure logic** belongs in `src/core/` with unit tests in `tests/unit/`.
- **Site fixes** (a site changed its design): find the new tokens or selectors with
  `node scripts/probe-site.mjs <url>`, change the adapter in `src/core/sites/`, check with
  `node scripts/live-shot.mjs <url> out.png --theme=aurora`, and run `npm run test:live`.
- **New built-in theme**: add it to `BUILT_IN_THEMES` with a Vietnamese name; the unit tests check its contrast.
- **New permission**: explain why in `src/manifest.ts`, `docs/PRIVACY.md`, `docs/STORE_LISTING.md` and
  `docs/ARCHITECTURE.md` §5. Keep permissions minimal.
- Update `CHANGELOG.md` for anything users will notice; add screenshots for UI changes.

## Releases

The maintainer releases by pushing a version tag (`vX.Y.Z`); CI builds and tests the package. See
[`docs/PUBLISHING.md`](docs/PUBLISHING.md).

---

**Tiếng Việt:** Rất hoan nghênh báo lỗi, sửa trang web, chủ đề mới và bản dịch. Trước khi gửi pull request, chạy đủ
lệnh kiểm tra ở trên; chuỗi giao diện phải có ở cả `en.ts` và `vi.ts`; logic thuần nằm trong `src/core/` kèm unit test.
