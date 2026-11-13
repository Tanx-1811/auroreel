# Auroreel — notes for AI assistants

Chrome extension (MV3) that restyles YouTube, Twitch and streaming sites with themes and adds player tools (ambient
light, cinema mode, speed, picture filters, capture, PiP, shortcuts). React 19 + TypeScript + Vite 8 for the popup and
the studio; plain TS for the content script and service worker. Read `docs/ARCHITECTURE.md` before touching the engine,
site adapters or player tools. The product owner speaks Vietnamese.

## Commands

- `npm run build` — typecheck + production build to `dist/`; `npm run dev` rebuilds on change.
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` (Vitest, `tests/unit/`).
- `npm run test:e2e` — builds `dist` + `dist-e2e`, runs Playwright on Chrome for Testing (`npx playwright install
chromium` once). Local test pages in `tests/e2e/site/`; `?rs-platform=<id>` maps a local page to a platform (e2e
  build only, `__RS_E2E__`).
- `npm run test:live` — real YouTube, Twitch, Netflix (public title page), FPT Play, VieON, Prime Video (network); run
  by hand after a site redesign, never in CI. Don't spoof the user agent (YouTube Music and Vimeo can't be checked
  headless).
- `npm run package` — zips `dist/` into `release/` (refuses the e2e build). `npm run store` — package + checks the
  store limits (image sizes, text lengths, name/summary match `_locales`) + `release/auroreel-<v>-store/` with the
  pictures and every dashboard field to paste (from `docs/STORE_LISTING.md`).
- `npm run icons`, `npm run brand`, `npm run screenshots` — toolbar icons, brand kit, store screenshots.
- Dev tools: `scripts/probe-site.mjs` (a site's custom properties / selector census), `scripts/live-shot.mjs` (real
  page + extension screenshot, `--theme=`, `--set='{json}'`, `--yt-dark`, `--eval=`), `scripts/ui-shot.mjs` (popup /
  studio screenshot), `scripts/contrast-scan.mjs` (real pages with a theme: lists hard-to-read text and leftover light
  boxes — run in both `--scheme=light` and `dark`, sites switch look with the system).

## Conventions

- Every UI string goes in `src/i18n/en.ts` **and** `src/i18n/vi.ts` (typed: vi must define every key). Manifest
  strings in `public/_locales/{en,vi}/messages.json` (description ≤ 132 chars). VI wording: "chủ đề" (theme),
  "ánh sáng nền" (ambient light), "chế độ rạp" (cinema mode), "bộ lọc màu hình" (picture filters), "màu nhấn" (accent).
- Pure logic lives in `src/core/` (no DOM, no `chrome.*`) and is unit-tested. Core imports use `.ts` extensions so Node
  scripts can import them with type stripping.
- Page CSS: everything `!important`; html-level rules use `ROOT` (`html:not(#rs-root)`) because sites style
  `html[dark]` with `!important`. Site-specific rules live in `src/core/sites/<site>.ts` — never in content code.
- Engine: only background-only properties may become transparent/see-through (`ColorRole`); anything used as text
  stays solid. Keep `exclude` patterns for colours drawn over video (`overlay`, `static`, `scrim`).
- Rewrite mode (streaming sites): rewritten copies are **not** `!important` — they win by order only, so keep the
  `Styles` elements last and keep copying later same-selector rules (`follows`/`keep`). Light themes there go through
  `adaptPalette` (`siteMode: 'dark'`). New CDN that blocks CORS → add it to the platform's `cssHosts` (it becomes a
  host permission; update the privacy docs).
- Chrome Sync: only `background/sync.ts` touches `chrome.storage.sync`; never sync pictures, `anySite`, `onboarded`
  or `sync`; deletions need tombstones (`planThemePush`).
- `content/youtube-main.ts` runs in YouTube's page world (MAIN): keep it tiny, read only `data-rs-quality`, never
  touch extension APIs or storage from it.
- Volume boost: never route a video through Web Audio unless its audio is readable and the context is running
  (`audio.ts`) — otherwise the video goes silent.
- Content-script DOM: no `innerHTML` (Trusted Types on YouTube) — use `el()`/`icon()` in `content/player/dom.ts`.
  Player UI stays inside its shadow root; stop event propagation so the site's player never sees our clicks.
- Data from storage, backups or pages is untrusted: `parseSettings`, `parseTheme`, `parseImport`. Custom backdrop
  pictures must be `data:image/(png|jpeg|webp|gif|avif)` and ≤ `MAX_IMAGE_CHARS`.
- New permission? Update `src/manifest.ts` (comment), `docs/PRIVACY.md`, `docs/STORE_LISTING.md` and
  `docs/ARCHITECTURE.md` §5.
- Design of Auroreel's own UI (popup, studio, brand art): **flat** — solid colours, one accent, no gradients, glows or
  glossy fills; no coloured edge strips (border-left/top accents, inset side bars) for state; no tinted tiles or
  bubbles behind icons. Show state with a full ring, a soft fill of the whole control, a dot or a tick. Theme
  backdrops (aurora/gradient) are user content and stay. Animations respect `prefers-reduced-motion`. Settings that only
  matter while a feature is on go in `<fieldset className="dep" disabled={!on}>` (shown dimmed and locked, not hidden);
  card titles carry no icons; group labels are plain uppercase text; drop-downs in a row share one width.
- Progress-bar decorations: site selectors go in the adapter's `progressBar`; knob drawings in `progressIcons.ts`
  (32×32, flat, facing right, `decor.icon.<id>` strings); the knob picture never goes to Chrome Sync.
- New built-in theme: add it to `BUILT_IN_THEMES` with `nameVi`; the unit tests check contrast (text ≥ 7:1, muted and
  links ≥ 4.5:1) and that the count in the tests/welcome copy still holds.

## CI / release

CI (`.github/workflows/ci.yml`) runs only on version tags `v*.*.*` or "Run workflow" — the owner pushes tags
themselves. Don't tag or run workflows; push branches only when the owner asks. Repo: github.com/Tanx-1811/auroreel.
