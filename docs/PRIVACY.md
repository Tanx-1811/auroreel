# Reelskin — Privacy policy

_Last updated: 2026-11-11_

Reelskin is a browser extension that restyles video sites and adds player tools. It is built to work entirely on your
computer.

## What Reelskin stores

- Your settings (chosen theme, per-site options, player preferences, shortcuts, language).
- Themes you create, including any picture you choose as a backdrop (resized and stored as an image inside the
  extension's storage).
- The last playback speed per site, if you turn on "Remember the last speed".
- A cache of the colour values a supported site uses, so the next visit is recoloured immediately.

All of this is kept in Chrome's local extension storage (`chrome.storage.local`) on this device. It is removed when
you uninstall Reelskin or use **Backup → Reset Reelskin**.

## What Reelskin does not do

- No account, no sign-in, no server: Reelskin never sends data anywhere.
- No analytics, tracking, advertising or telemetry.
- It does not read, record or transmit what you watch, your history, your messages or any page content. On the
  supported sites it only reads the page's style sheets (colours) and the video element (to change speed, filters,
  draw the ambient light and save a frame when you ask).
- Saved frames go straight to your Downloads folder through the browser; they are not uploaded.

## Permissions

| Permission                                                                                                                                            | Purpose                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Access to www.youtube.com, music.youtube.com, www.twitch.tv, www.netflix.com, www.primevideo.com, www.disneyplus.com, vimeo.com, fptplay.vn, vieon.vn | Apply your theme and the player tools on these sites.                                                                                |
| Storage                                                                                                                                               | Keep your settings and themes on this device.                                                                                        |
| Scripting                                                                                                                                             | Turn on the player tools for every other site — only if you allow it.                                                                |
| Optional: access to all sites                                                                                                                         | Asked only when you choose "Allow on all sites"; you can withdraw it any time (Sites → Turn off, or in Chrome's extension settings). |

## Backups

**Backup → Export** writes a JSON file with your settings and themes to your computer. Reelskin never uploads it.
Importing reads a file you pick and stores its contents locally.

## Contact

Questions about privacy: open an issue in the project's repository.
