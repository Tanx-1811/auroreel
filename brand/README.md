# Auroreel brand kit

Everything here is generated — edit the sources, then run the scripts:

- `npm run brand` → `scripts/brand/render.mjs` (+ `scripts/brand/shared.mjs`): logos, Web Store icon and promo tiles,
  social images. Offline: the mark is rendered with resvg from `assets/icon.svg`; compositions with Playwright's
  Chromium and the fonts below embedded from `@fontsource`. Theme preview cards use the real theme data from
  `src/core/themes.ts` and the `.tp*` preview CSS from `src/styles/ui.css`, so they always match the extension.
- `npm run screenshots` → `tests/e2e/store-screenshots.spec.ts`: Web Store screenshots, captured from the real
  extension (e2e build) on the local made-up "Viewly" site (`tests/e2e/site/showcase.*`, themed through
  `?rs-platform=youtube`) and the studio, then framed with a caption by `tests/e2e/brand-frame.ts`. No network.

## Files

| File                                                  | Size       | Use                                                       |
| ----------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `logo/mark.svg`, `logo/mark-512.png`, `mark-1024.png` | square     | App icon / avatar (copy of `assets/icon.svg`)             |
| `logo/lockup-light.png`                               | @2x        | Mark + wordmark, light text, transparent — dark backdrops |
| `logo/lockup-dark.png`                                | @2x        | Mark + wordmark, dark text, transparent — light backdrops |
| `logo/lockup-on-night.png`                            | 1200 × 480 | Lockup on the night gradient (opaque)                     |
| `store/store-icon-128.png`                            | 128 × 128  | Web Store icon: 96 px art centred with transparent margin |
| `store/promo-small-440x280(-vi).png`                  | 440 × 280  | Web Store small promo tile (EN / VI)                      |
| `store/promo-marquee-1400x560(-vi).png`               | 1400 × 560 | Web Store marquee promo tile (EN / VI)                    |
| `store/screenshots/{en,vi}-N-<slug>.png`              | 1280 × 800 | Web Store screenshots (5 per language)                    |
| `social/github-social-1280x640.png`                   | 1280 × 640 | GitHub social preview                                     |
| `social/readme-banner-1600x500.png`                   | 1600 × 500 | README header                                             |

Screenshots: 1 themes on a video site + popup · 2 ambient light and the floating toolbar · 3 the studio's theme
gallery · 4 theme maker building a theme from a picture · 5 cinema mode with picture filters.

Promo images never show real sites' logos or screenshots — only Auroreel's own drawings and the made-up "Viewly" site.

## Colours

The extension UI tokens (`src/styles/ui.css`):

| Token                 | Value                                                 | Role                         |
| --------------------- | ----------------------------------------------------- | ---------------------------- |
| `--bg` (night)        | `#0b0a12`                                             | Background                   |
| `--bg-2` / `--panel`  | `#110f1b` / `#151320`                                 | Raised surfaces              |
| `--text`              | `#f4f2ff`                                             | Text on night                |
| `--muted`             | `#aaa5c2`                                             | Secondary text               |
| ink                   | `#18142b`                                             | Text on light backgrounds    |
| `--acc`               | `#8b5cf6` (violet; `#7c3aed` in light mode)           | Accent, focus, toggles       |
| `--acc-2` / `--acc-3` | `#ec4899` / `#f59e0b`                                 | Secondary accents            |
| `--grad`              | `linear-gradient(135deg,#8b5cf6,#d946ef 45%,#f97316)` | Primary buttons, brand glows |

The mark: a night tile (`#1d1533` → `#0b0a12`) with a play triangle cut into three bands of the brand gradient
(`#8b5cf6` → `#d946ef` → `#f97316`) — a "skin" of colour over the play button.

## Fonts

- **Fraunces** 600 italic (SIL OFL) — wordmark, headlines, page titles.
- **Be Vietnam Pro** 400–700 (SIL OFL) — everything else; full Vietnamese coverage.

Both ship with the extension UI from `@fontsource` (Latin + Vietnamese subsets only).
