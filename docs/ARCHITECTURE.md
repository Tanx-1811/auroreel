# Auroreel — architecture

Chrome extension, Manifest V3. React 19 + TypeScript + Vite 8 for the popup and the studio; plain TypeScript for the
content script and the service worker. No server, no state library.

```
src/
  core/            pure logic, unit-tested (no DOM, no chrome.*)
    color.ts         colour parsing, OKLab/OKLCH, mixing, WCAG contrast
    themes.ts        Theme model, 24 built-ins, resolvePalette, validation (parseTheme)
    remap.ts         the recolouring engine's maths + "which properties are themeable"
    css/             stylesheet builders: common.ts (tokens, backdrop, fonts), index.ts (buildPageCss)
    sites/           one adapter per site: engine config + theme CSS + layout-option CSS
    sync.ts          Chrome Sync merge rules
    platforms.ts     supported sites, tiers, layout options, manifest match patterns
    settings.ts      Settings model, defaults, parseSettings
    schedule.ts      day/night switching
    shortcuts.ts     on-page shortcuts (KeyboardEvent.code based)
    filters.ts       video picture filters
    imagePalette.ts  k-means palette from a picture
    backup.ts        backup / theme files
  content/         content script (classic script, document_start)
    main.ts          wires settings → styles, engine, player tools; storage.onChanged; messages
    styles.ts        the two <style> elements (engine, main)
    engine.ts        the recolouring engine's DOM half
    player/          floating toolbar, ambient light, cinema mode, capture, A–B loop, sleep timer, volume boost,
                     theme from video, shortcuts
    youtube-main.ts  page-world script for YouTube's default quality
  background/      service worker: welcome page, commands, "every site" script registration, CSS fetch, sync.ts
  popup/           toolbar popup (themes / player / layout tabs)
  options/         the studio (themes, theme maker, sites, player, auto switch, shortcuts, backup, about, welcome)
  ui/              shared React components, store hook, previews
  shared/          storage, i18n, messages, permission helpers
  i18n/            en.ts, vi.ts (vi must define every key — typed)
```

## 1. Styling a page

The content script runs at `document_start` on the supported sites. It reads `rs:settings` and `rs:themes`, picks the
theme (`activeThemeId`: site override → schedule → global) and writes two `<style>` elements at the end of `<head>`:

1. `#auroreel-engine` — the recolouring engine's overrides (below).
2. `#auroreel-main` — `buildPageCss`: theme tokens (`--rs-*` on `:root`), the backdrop, fonts, scrollbars, the site
   adapter's theme CSS (fixed token overrides, glass bars, rounded thumbnails, accent progress bar, search box…) and the
   layout options (which also apply when the user keeps the site's colours); then the decorations (`decor.ts`:
   progress-bar knob and fill, scrollbar style), which apply with or without a theme.

Everything is `!important` and the root selector is `html:not(#rs-root)` so site rules such as `html[dark]{…!important}`
lose. Elements inserted from a content script aren't subject to the page's CSP. Changes in storage re-apply live in
every tab.

The **backdrop** (aurora / gradient / picture) is painted on `html::before` (and `html::after` for the veil) at
`z-index:-1`; page containers are made transparent (`--rs-page`) so it shows through, and bars and menus use
`--rs-glass-bg` with `backdrop-filter`.

## 2. The recolouring engine

Sites keep their palettes in CSS custom properties (YouTube: `--yt-sys-color-baseline--*` and hashed `--t<16 hex>`
tokens; Twitch: `--color-*`). Hand-written overrides can't keep up with hashed names, so the engine:

1. **Scans** each stylesheet once (`CSSStyleSheet.cssRules`; ~20 ms for YouTube's 23 000 rules):
   - root-like rules (`html`, `[dark]`, `.tw-root--theme-dark`…) → properties declared with ≥ 2 different values are
     _themeable_ (they switch between the site's light and dark modes); single-valued ones (white text on video, ad
     yellow) are left alone;
   - every rule → which properties are used for text/icons (`color`, `fill`) and which only for backgrounds.
   - Sites that only load the active palette (Twitch's styled-components) declare everything once; the adapter's
     `semantic` pattern adds those names.
2. **Reads** current values with Auroreel's two style sheets disabled (synchronous, no paint in between).
3. **Remaps** each value (`core/remap.ts`):
   - greys are placed on the site's scale (background → surface → secondary text → text, from the adapter's anchor
     properties) and moved to the same spot on the theme's scale (OKLab interpolation, alpha kept);
   - the site's brand family (YouTube red, Twitch purple) becomes the accent, keeping each shade's relative lightness;
   - link blues become the theme's link colour; other colours (success green, warnings) stay;
   - with a backdrop, background-only colours at page level become `transparent` and surfaces see-through; anything
     used as text stays solid (a button's text often reuses the page colour).
4. **Writes** one rule for the root selectors seen in step 1.
5. **Caches** the site's values per site and mode (`rs:engine:<platform>:<dark|light>`) so the next visit is recoloured
   before the site's stylesheets have loaded. A MutationObserver on `<html>` attributes (`dark`, class…) re-reads on a
   mode switch; new `<link>`/`<style>` elements trigger a rescan.

Hard-coded colours outside custom properties are handled per site in `core/sites/*.ts` (e.g. YouTube's search box,
inline colours in descriptions, YouTube's own ambient-mode canvases, which are hidden while a theme is on).

### 2a. Rewrite mode (streaming sites)

Netflix, Prime Video, Disney+, FPT Play, VieON and YouTube Music hard-code colours, or keep design tokens on component
classes (`.hcw-…{--hcw--local-design--Button-Surface: …}` on Netflix, Tailwind v4 `oklch()` palettes on FPT Play).
Their adapters (`core/sites/streaming.ts`) set `rewrite: true`:

- every style rule with a literal colour in a colour property (`color`, `background-color`, gradients in
  `background-image`, border/outline colours, `fill`, `stroke`…) or in a custom property declared on **any** selector
  is copied with the colour remapped (`rewriteCss`), inside the same `@media`/`@supports`/`@container` conditions;
- custom properties get their role (text or background) from their name (`roleFromName`: `Foreground`, `Surface`…);
- the copies are **not** `!important` (unless the original was): they win over the original only by coming later, so a
  declaration that lost in the site's cascade still loses. A later rule for an already-rewritten selector is copied
  too (unchanged values included) so the order between them holds. `Styles` keeps our `<style>` elements last in
  `<head>` as the site adds stylesheets;
- anchors are the site's measured colours (`anchorColors`), and the palette is adapted to the site's fixed dark design
  (`siteMode` → `adaptPalette`): a light theme shows as its dark counterpart, so hard-coded overlays (white icons over
  video, dark scrims) keep working;
- cross-origin stylesheets (`fetchCss`) are fetched again: with CORS from the content script (Amazon's and Disney's
  CDNs allow it), or through the service worker for hosts in `CSS_HOSTS` (VieON) — it only fetches `text/css` from
  those hosts and only for its own content scripts — then parsed with `new CSSStyleSheet().replaceSync()`;
- CSS-in-JS adds rules to existing `<style>` elements without DOM changes: a throttled observer re-checks each sheet's
  rule count while the page changes, and rules are de-duplicated by content.

## 3. Player tools

`content/player/` works on any page with a `<video>`: the primary video is the last one that started playing or the
largest visible one. The UI is a custom element with a closed shadow root (open in the e2e build), positioned with
`position:fixed` from the video's rectangle; in fullscreen it moves into the fullscreen element. Clicks inside it never
reach the site's player.

- **Speed**: `playbackRate`, step and start speed from settings; remembered per site (`rs:speed`) when asked.
- **Filters**: CSS `filter` on the `<video>` element (works on DRM video too).
- **Ambient light**: a 64×36 canvas redrawn ~15×/s from the video, stretched, blurred and saturated behind the page
  (`z-index:-1`); page containers larger than the video get a transparent background while it runs (restored after).
  Protected video (`video.mediaKeys`) can't be drawn → accent-coloured glow.
- **Cinema mode**: a fixed overlay with a rounded hole cut by `clip-path: path(evenodd, …)`; the hole also lets clicks
  through to the player. In cinema mode the ambient canvas moves above the overlay with the same hole.
- **Capture**: draws the frame to a canvas and downloads PNG/JPEG (tainted/DRM → message).
- **Shortcuts**: `KeyboardEvent.code` based, ignored while typing; `Alt+T` pauses the theme in one tab (session only).
- **A–B loop** (`timers.ts`): `[`/`]` set the points, a `timeupdate` listener jumps back to A; cleared on a new video.
- **Sleep timer** (`timers.ts`, popup → `rs:sleep`): pauses after N minutes or when the current video ends, then holds
  playback that starts within 15 s (the next autoplayed video).
- **Volume boost** (`audio.ts`): Web Audio gain up to 300 %. A `<video>` can be routed through an AudioContext once and
  only if its audio is readable (same origin, CORS or a MediaSource `blob:` stream), else it would play silence — so
  other videos are skipped, and the context is created only when it can start (after a gesture), never muting a video.
- **Wheel volume**: optional; wheel over the video changes `volume` (Ctrl/⌘ + wheel is left to the browser).
- **Theme from this video** (`video-theme.ts`): draws the frame to canvases, extracts a palette (`paletteFromPixels`),
  saves a theme with the frame (WebP) as its backdrop and puts it to use. Protected/tainted video → message.
- **Subtitles** (`core/css/subtitles.ts`): colour, weight and box behind the text set directly; size by scaling the
  caption box (sites size captions inline); native tracks via `video::cue`.
- **Toolbar placement**: shown only when ≥ 300 × 120 px of the video is on screen (`visibleBox`); while shown it
  re-reads the video's rectangle every frame (`follow`), because sites move players without scrolling or resizing.
  Buttons and size come from `player.toolbarButtons` / `toolbarSize`.
- **Progress-bar decorations** (`core/css/decor.ts`, `core/progressIcons.ts`): for sites whose adapter describes its
  bar (`SiteAdapter.progressBar`: player root, knob, played part, track, "playing" and "controls hidden" classes —
  YouTube). The knob is drawn on the knob's `::before` (so the site's own transforms keep working), animated only
  under the root's "playing" class and inside `prefers-reduced-motion: no-preference`. The emoji knob is an SVG
  `<text>` image; a picture knob is a ≤ 96 px PNG/WebP data URL kept out of Chrome Sync. The **mini bar** is drawn by
  the player UI from `currentTime/duration` while the root has the "controls hidden" class (YouTube stops updating
  its own bar then).
- **YouTube default quality** (`content/youtube-main.ts`, a `world: "MAIN"` content script): YouTube's player API is
  only reachable from the page's world. The isolated script publishes the choice as `<html data-rs-quality>`; the
  page-world script only reads it and calls `setPlaybackQualityRange` with the best available level ≤ the choice.

## 4. Settings and storage

`chrome.storage.local`: `rs:settings` (validated by `parseSettings` on every read), `rs:themes` (custom themes,
`parseTheme`; pictures as WebP data URLs ≤ ~2.8 MB), `rs:speed`, `rs:engine:*`. Pages write through
`updateSettings(fn)` (read-modify-write); the React hook `useStore` updates optimistically and reloads on
`storage.onChanged`.

**Chrome Sync** (opt-in, `settings.sync`; `background/sync.ts`, rules in `core/sync.ts`): the service worker is the only
code that touches `chrome.storage.sync`. Local changes are pushed (debounced): `rs:sync:settings` (settings minus the
per-device `anySite`, `onboarded`, `sync`, tagged with this device's id so its own echo is ignored), one
`rs:sync:theme:<id>` item per theme without a picture (Chrome Sync allows 8 KB per item), and `rs:sync:deleted`
tombstones so a theme deleted on one computer doesn't come back. Changes from other computers are pulled into
`chrome.storage.local`. Switching sync on pulls first, then pushes. The last outcome is in `rs:sync-status`.

## 5. Permissions

| Permission                           | Why                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host access to the supported sites   | The content script restyles them and adds the player tools.                                                                                              |
| `storage`                            | Settings, themes and pictures on this device; Chrome Sync only when the user turns it on.                                                                |
| `*.vieon.vn` (`CSS_HOSTS`)           | The service worker re-downloads VieON's public stylesheets (its CDN blocks cross-origin reads) so the engine can read their colours.                     |
| `scripting`                          | Registers the content script for "player tools on every site", only after the user grants it.                                                            |
| Optional `https://*/*`, `http://*/*` | "Player tools on every site". Requested from a click; the service worker sets `anySite` and (un)registers the script on `permissions.onAdded/onRemoved`. |

New permission? Update `src/manifest.ts`, `docs/PRIVACY.md`, `docs/STORE_LISTING.md` and this table.

## 6. Adding or fixing a site

1. `node scripts/probe-site.mjs https://site --prefix=--color --sel='a,b'` lists the custom properties and counts
   elements for selectors.
2. Add the platform to `core/platforms.ts` (hosts, match pattern, tier, layout options + i18n keys
   `layout.<id>.<option>` in both languages).
3. Add an adapter in `core/sites/` (engine `accept`/`exclude`/`semantic`, `rootSelectors`, brand hue, anchors; theme
   CSS for hard-coded parts; layout CSS) and register it in `core/sites/index.ts`.
4. Check with `node scripts/live-shot.mjs <url> out.png --theme=<id>` and add a case to `tests/live/`.

## 7. Tests

- `tests/unit/` — core logic (colour maths, remapping, themes' contrast, settings, schedule, shortcuts, CSS builders).
- `tests/e2e/` — Chrome for Testing with the e2e build: local test pages (`tests/e2e/site/`, `?rs-platform=youtube`
  maps them to a platform), theming, engine, layout, player tools (toolbar, shortcuts, cinema, filters, capture,
  ambient), popup, every studio page with axe, theme maker, shortcut recorder, backup; `store-build.spec.ts` checks the
  production manifest.
- `tests/live/` — the real YouTube and Twitch; run by hand after a site changes.
