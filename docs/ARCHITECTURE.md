# Reelskin — architecture

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
    player/          floating toolbar, ambient light, cinema mode, capture, shortcuts
  background/      service worker: welcome page, commands, "every site" script registration
  popup/           toolbar popup (themes / player / layout tabs)
  options/         the studio (themes, theme maker, sites, player, auto switch, shortcuts, backup, about, welcome)
  ui/              shared React components, store hook, previews
  shared/          storage, i18n, messages, permission helpers
  i18n/            en.ts, vi.ts (vi must define every key — typed)
```

## 1. Styling a page

The content script runs at `document_start` on the supported sites. It reads `rs:settings` and `rs:themes`, picks the
theme (`activeThemeId`: site override → schedule → global) and writes two `<style>` elements at the end of `<head>`:

1. `#reelskin-engine` — the recolouring engine's overrides (below).
2. `#reelskin-main` — `buildPageCss`: theme tokens (`--rs-*` on `:root`), the backdrop, fonts, scrollbars, the site
   adapter's theme CSS (fixed token overrides, glass bars, rounded thumbnails, accent progress bar, search box…) and the
   layout options (which also apply when the user keeps the site's colours).

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
2. **Reads** current values with Reelskin's two style sheets disabled (synchronous, no paint in between).
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

## 4. Settings and storage

`chrome.storage.local`: `rs:settings` (validated by `parseSettings` on every read), `rs:themes` (custom themes,
`parseTheme`; pictures as WebP data URLs ≤ ~2.8 MB), `rs:speed`, `rs:engine:*`. Pages write through
`updateSettings(fn)` (read-modify-write); the React hook `useStore` updates optimistically and reloads on
`storage.onChanged`.

## 5. Permissions

| Permission                           | Why                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host access to the supported sites   | The content script restyles them and adds the player tools.                                                                                              |
| `storage`                            | Settings, themes and pictures, on this device only.                                                                                                      |
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
