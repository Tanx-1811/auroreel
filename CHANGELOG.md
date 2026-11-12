# Changelog

## 1.0.0 — 2026-11-12

First release, as **Auroreel** (working name Reelskin).

- 24 built-in themes (15 dark, 9 light) with aurora, gradient or picture backdrops, glass bars, rounded corners and
  optional Vietnamese-ready fonts.
- Theme maker with live preview, contrast check, "from one colour", "from a picture" (palette extraction, picture
  backdrop) and "Surprise me"; theme export/import.
- Recolouring engine that maps a site's own colour tokens onto the theme (YouTube, Twitch; basic sites when they
  expose light/dark tokens), cached per site and mode.
- YouTube: accent logo and glowing progress bar, videos per row, blurred/B&W thumbnails, fade watched, hide Shorts,
  home feed, related, comments, end cards, chips, merch, Explore. Twitch: hide recommended channels, carousel,
  leaderboard.
- Player tools on every video: floating toolbar, speed (start speed, remember per site), picture filters with 8
  presets, ambient light, cinema mode, loop, frame capture, picture in picture; remappable shortcuts; browser
  commands (Alt+Shift+C/T/N).
- Streaming sites recoloured in depth (Netflix, Prime Video, Disney+, YouTube Music, FPT Play, VieON): literal
  colours and component design tokens follow the theme in the site's dark style; light themes show as their dark
  counterpart. YouTube live chat follows the theme.
- Auto switch (by time or with the system), per-site themes and switches, player tools on every site (optional
  permission), optional Chrome Sync of settings and themes, backup/restore, Vietnamese and English.
- Player extras: A–B loop, sleep timer (minutes or end of video, holds the next autoplay), volume boost up to 300%,
  wheel volume, "theme from this video", subtitle styling, YouTube default quality (480p–4K).
- Studio overview page, theme search and favourites, studio look (auto/dark/light), redesigned popup with quick
  actions, sleep timer and the current theme at a glance.
- Decorations: the YouTube progress-bar knob as one of 16 original drawings (heart, star, flame, rocket, cat, duck,
  ghost, fish, popcorn, film reel, music, moon, planet, cherry blossom, lotus, paw), a dot, any emoji or your own
  picture, with size, motion (bounce, spin, pulse, wiggle — only while playing, never with reduced motion), played
  colour (accent, icon colour, rainbow, custom) and bar thickness; an always-on thin progress bar while YouTube hides
  its controls; scrollbar styles (theme colour, thin, hidden); choose the toolbar's buttons (new A–B loop button) and
  its size.
- Flat look throughout: solid accent buttons, no gradients or glows in the popup and studio, no coloured edge strips,
  no tinted tiles behind icons, a flat logo.
- The floating toolbar follows the video when the site moves its player (YouTube lays it out after load) and only
  shows when enough of the video is on screen.
- UI/UX pass on the studio and popup: settings that only matter while their feature is on (ambient light, picture
  filters, subtitles, the toolbar's options, day/night themes) stay visible but are dimmed and locked while it's off;
  page shortcuts grouped (speed, viewing, loop and capture, theme) and Chrome's own commands named in the studio's
  language; auto switch explains each mode; sync is one row like the other backup actions; the editor's quick start,
  the overview's grids and the toolbar-button chips are clearer; toolbar settings live on the Player page only;
  readable status colours in the light look; same width for every drop-down.
- The welcome page now opens on install (it pointed at a page that doesn't exist).
- Site fixes found with the new `scripts/contrast-scan.mjs`: YouTube's playing row in playlists/mixes, key-moments
  and chapter boxes (colours YouTube picks from each video) and the channel handle now follow the theme; Twitch's
  light look (nav links, featured-stream panel and its fade, carousel arrows, category tiles, primary buttons) is
  themed; white text on a recoloured brand button (Netflix "Join now") takes the accent's own text colour.
